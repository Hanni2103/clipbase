import { getItem, insertInsight, listInsights, listRelations } from '../db.js';
import type { InsightImpact } from '../types.js';

const TOP_K = 5;

function pairKey(ids: string[]): string {
  return [...ids].sort().join('|');
}

function impactOf(score: number): InsightImpact {
  if (score >= 0.85) return 'high';
  if (score >= 0.65) return 'medium';
  return 'low';
}

/**
 * 从真实关系生成 connection 洞察。
 * 规则：没有关系 → 不生成洞察；同一对关系只生成一次（幂等）。
 */
export function generateConnections(userId: string): number {
  const relations = listRelations(userId, { status: 'active' });
  if (relations.length === 0) return 0;

  const existingPairs = new Set(listInsights(userId).map((i) => pairKey(i.related_ids)));

  const top = relations
    .filter((r) => r.type === 'similar' || r.type === 'topic')
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  let created = 0;
  for (const r of top) {
    const a = getItem(r.source_id);
    const b = getItem(r.target_id);
    if (!a || !b) continue;
    const key = pairKey([a.id, b.id]);
    if (existingPairs.has(key)) continue;

    const typeLabel = r.type === 'similar' ? '内容相似' : '同主题';
    insertInsight({
      userId,
      type: 'connection',
      title: `${a.title ?? '(无标题)'} ↔ ${b.title ?? '(无标题)'}`,
      body: `你存的《${a.title ?? '(无标题)'}》与《${b.title ?? '(无标题)'}》存在${typeLabel}关系（相似度 ${Math.round(r.score * 100)}%，来源：${r.source}）`,
      relatedIds: [a.id, b.id],
      confidence: r.confidence,
      impactScore: impactOf(r.score),
    });
    existingPairs.add(key);
    created++;
  }
  return created;
}
