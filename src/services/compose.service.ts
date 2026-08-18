import { getAtomsForItems, listItemsForSimilarity } from '../db.js';
import { composeDocument, type ComposeItem, type ComposeType } from '../composer.js';
import { ngramSimilarity } from '../similar.js';
import { daysSince, recallScore } from '../halflife.js';
import type { Item } from '../types.js';

const TOKEN_BUDGET = 6000;

export interface ComposeRequest {
  userId: string;
  type: ComposeType;
  memoryIds?: string[];
  topic?: string;
  tone?: string;
  audience?: string;
  length?: string;
}

function estimateTokens(s: string): number {
  return Math.ceil((s || '').length / 1.5);
}

function relevance(item: Item, topic?: string): number {
  const q = (topic ?? '').trim();
  if (!q) return 0.5;
  const titleSim = ngramSimilarity(q, item.title ?? '');
  const summarySim = ngramSimilarity(q, item.summary ?? '');
  const tagSim = ngramSimilarity(q, item.tags.join(' '));
  return Math.max(titleSim, summarySim, tagSim);
}

const TYPE_INTENT: Record<string, string[]> = {
  article: ['insight', 'material'],
  copywriting: ['material', 'inspiration'],
  xiaohongshu: ['material', 'inspiration'],
  video_script: ['material', 'inspiration', 'fun'],
  weekly: ['insight', 'do_it'],
  business: ['insight', 'material'],
  mindmap: ['insight', 'do_it', 'material'],
};

function intentMatch(item: Item, type: ComposeType): number {
  const prefs = TYPE_INTENT[type] ?? [];
  if (!item.intent) return 0.5;
  return prefs.includes(item.intent) ? 1 : 0.3;
}

function recency(item: Item): number {
  return 1 / (1 + daysSince(item.created_at) / 30);
}

/** Context Score = 0.4 relevance + 0.3 strength + 0.2 recency + 0.1 intent_match */
export function contextScore(item: Item, req: ComposeRequest): number {
  const strength = item.memory_strength ?? recallScore(item.created_at, item.half_life ?? 30);
  return 0.4 * relevance(item, req.topic) + 0.3 * strength + 0.2 * recency(item) + 0.1 * intentMatch(item, req.type);
}

export interface BuiltContext {
  memoryIds: string[];
  selectedAtoms: { memory_id: string; title: string; context_score: number; atoms: { type: string; content: string }[] }[];
  citedAtoms: { memory_id: string; atom_type: string; content: string }[];
  composeItems: ComposeItem[];
  tokenEstimate: number;
  truncated: boolean;
}

/** 唯一的 Context Builder：/compose/context（预览）与 /compose（生成）共用 */
export function buildContext(req: ComposeRequest): BuiltContext {
  let items = listItemsForSimilarity(req.userId).filter((it) => it.status === 'completed');
  if (req.memoryIds && req.memoryIds.length > 0) {
    const ids = new Set(req.memoryIds);
    items = items.filter((it) => ids.has(it.id));
  }
  const atomsMap = getAtomsForItems(items.map((i) => i.id));

  const scored = items
    .map((it) => {
      const atoms = (atomsMap[it.id] ?? []).map((a) => ({ type: a.type, content: a.content }));
      return { item: it, atoms, score: contextScore(it, req) };
    })
    .sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  let tokens = 0;
  let truncated = false;
  for (const s of scored) {
    const text = [s.item.title ?? '', s.item.summary ?? '', ...s.atoms.map((a) => a.content)].join('');
    const cost = estimateTokens(text);
    if (tokens + cost > TOKEN_BUDGET && selected.length > 0) {
      truncated = true;
      break;
    }
    selected.push(s);
    tokens += cost;
  }

  return {
    memoryIds: selected.map((s) => s.item.id),
    selectedAtoms: selected.map((s) => ({
      memory_id: s.item.id,
      title: s.item.title ?? '(无标题)',
      context_score: Number(s.score.toFixed(3)),
      atoms: s.atoms,
    })),
    citedAtoms: selected.flatMap((s) =>
      s.atoms.map((a) => ({ memory_id: s.item.id, atom_type: a.type, content: a.content })),
    ),
    composeItems: selected.map((s) => ({
      title: s.item.title,
      category: s.item.category,
      summary: s.item.summary,
      tags: s.item.tags,
      atoms: s.atoms,
    })),
    tokenEstimate: tokens,
    truncated,
  };
}

/** 生成：调用同一 builder，返回溯源字段（used_memory_ids + cited_atoms） */
export async function generateCompose(req: ComposeRequest) {
  const ctx = buildContext(req);
  if (ctx.composeItems.length === 0) {
    return {
      title: req.topic || '我的知识整理',
      type: req.type,
      content: '（没有可整理的内容）',
      used_memory_ids: [] as string[],
      cited_atoms: [] as { memory_id: string; atom_type: string; content: string }[],
      token_estimate: 0,
    };
  }
  const content = await composeDocument(ctx.composeItems, req.type, req.topic, {
    tone: req.tone,
    audience: req.audience,
    length: req.length,
  });
  return {
    title: req.topic || '我的知识整理',
    type: req.type,
    content,
    used_memory_ids: ctx.memoryIds,
    cited_atoms: ctx.citedAtoms,
    token_estimate: ctx.tokenEstimate,
  };
}
