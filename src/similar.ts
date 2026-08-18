import { createHash } from 'node:crypto';
import type { SimilarItem } from './types.js';

/** 归一化文本：去空白、小写 */
export function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 内容哈希（精确去重）：url + 文本 归一化后 sha256 */
export function hashContent(url?: string, text?: string): string {
  const base = normalize([url ?? '', text ?? ''].join('\n'));
  return createHash('sha256').update(base).digest('hex');
}

/** 字符 n-gram（3-gram），中文友好 */
function charNGrams(s: string, n = 3): Set<string> {
  const norm = normalize(s);
  const set = new Set<string>();
  if (norm.length === 0) return set;
  if (norm.length <= n) {
    set.add(norm);
    return set;
  }
  for (let i = 0; i <= norm.length - n; i++) {
    set.add(norm.slice(i, i + n));
  }
  return set;
}

/** Jaccard 相似度 */
export function ngramSimilarity(a: string, b: string): number {
  const ga = charNGrams(a);
  const gb = charNGrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

/** 标签/分类重合度 */
export function tagOverlap(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 || tagsB.length === 0) return 0;
  const setB = new Set(tagsB);
  let hit = 0;
  for (const t of tagsA) if (setB.has(t)) hit++;
  return hit / Math.min(tagsA.length, tagsB.length);
}

/** 综合相似度：文本 n-gram 主导「高度相似」，标签重合主导「主题相关」 */
export function combinedSimilarity(a: { title: string; summary: string; tags: string[] }, b: { title: string; summary: string; tags: string[] }): number {
  const t = ngramSimilarity(a.title, b.title);
  const s = ngramSimilarity(a.summary, b.summary);
  const tag = tagOverlap(a.tags, b.tags);
  const textSim = Math.max(t, s);
  return Math.min(1, Math.max(textSim, tag * 0.85));
}

/** 三级判定：exact / high / related */
export function classifyLevel(similarity: number): SimilarItem['level'] {
  if (similarity >= 0.9) return 'high';
  return 'related';
}

/** 在候选条目中找相似的（照镜子） */
export function findSimilar(
  candidates: { id: string; title: string | null; summary: string | null; tags: string[]; category: string | null }[],
  current: { title: string; summary: string; tags: string[] },
  minSimilarity = 0.5,
  limit = 3,
): SimilarItem[] {
  return candidates
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      similarity: combinedSimilarity(current, { title: c.title ?? '', summary: c.summary ?? '', tags: c.tags }),
    }))
    .filter((c) => c.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      similarity: Number(c.similarity.toFixed(2)),
      level: classifyLevel(c.similarity),
    }));
}
