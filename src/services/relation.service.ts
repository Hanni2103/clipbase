import { getItem, insertRelation, listItemsForSimilarity, listRelations } from '../db.js';
import { combinedSimilarity, tagOverlap } from '../similar.js';
import type { Item } from '../types.js';

const SIMILAR_THRESHOLD = 0.5;
const TOPIC_THRESHOLD = 0.5;

function round3(n: number): number {
  return Number(n.toFixed(3));
}

/** 两条记忆间建关系：similar（keyword）+ topic（tag）。V1 禁 LLM。 */
function relatePair(userId: string, a: Item, b: Item): void {
  const sim = combinedSimilarity(
    { title: a.title ?? '', summary: a.summary ?? '', tags: a.tags },
    { title: b.title ?? '', summary: b.summary ?? '', tags: b.tags },
  );
  if (sim >= SIMILAR_THRESHOLD) {
    insertRelation({
      userId,
      leftId: a.id,
      rightId: b.id,
      type: 'similar',
      score: round3(sim),
      confidence: round3(sim),
      source: 'keyword',
      evidence: { ngram: round3(sim) },
    });
  }

  const tag = tagOverlap(a.tags, b.tags);
  if (tag >= TOPIC_THRESHOLD) {
    insertRelation({
      userId,
      leftId: a.id,
      rightId: b.id,
      type: 'topic',
      score: round3(tag),
      confidence: round3(tag),
      source: 'tag',
      evidence: { shared_tags: a.tags.filter((t) => b.tags.includes(t)) },
    });
  }
}

/** 增量：新条目入库后，与存量比对建关系 */
export function relateNewItem(userId: string, itemId: string): void {
  const item = getItem(itemId);
  if (!item || item.status !== 'completed') return;
  const candidates = listItemsForSimilarity(userId).filter((x) => x.id !== itemId && x.status === 'completed');
  for (const c of candidates) relatePair(userId, item, c);
}

/** 全库重建（仅回填/修复时用，O(n²)） */
export function buildRelations(userId: string): number {
  const items = listItemsForSimilarity(userId).filter((it) => it.status === 'completed');
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      relatePair(userId, items[i], items[j]);
    }
  }
  return items.length;
}

/** 图谱：真实节点 + 真实边（只 active，无 source 不出边） */
export function buildGraph(userId: string) {
  const items = listItemsForSimilarity(userId).filter((it) => it.status === 'completed');
  const nodes = items.map((it) => ({
    id: it.id,
    title: it.title ?? '(无标题)',
    category: it.category,
    strength: it.memory_strength ?? 0,
  }));
  const relations = listRelations(userId, { status: 'active' });
  const edges = relations.map((r) => ({
    id: r.id,
    source: r.source_id,
    target: r.target_id,
    type: r.type,
    score: r.score,
    confidence: r.confidence,
    source_type: r.source,
    evidence: r.evidence,
  }));
  return { nodes, edges };
}
