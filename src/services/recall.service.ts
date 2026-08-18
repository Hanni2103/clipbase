import { applyReview, getItem, getPrefs, insertRecallEvent, listItemsForSimilarity } from '../db.js';
import { daysSince, recallScore } from '../halflife.js';
import type { Item, RecallFeedback } from '../types.js';

function isMuted(item: { category: string | null; tags: string[] }, mutedTopics: string[]): boolean {
  if (mutedTopics.length === 0) return false;
  if (item.category && mutedTopics.includes(item.category)) return true;
  return item.tags.some((t) => mutedTopics.includes(t));
}

/** 召回队列：recall_score（排序快照）与 memory_strength（被修正强度）分开，不混用 */
export function buildRecallQueue(userId: string, limit: number) {
  const muted = getPrefs(userId).muted_topics;
  return listItemsForSimilarity(userId)
    .filter(
      (it) =>
        it.status === 'completed' &&
        (it.digest_state === 'unread' || it.digest_state === 'read') &&
        !isMuted(it, muted),
    )
    .map((it) => {
      const hl = it.half_life ?? 30;
      const days = Math.floor(daysSince(it.created_at));
      return {
        id: it.id,
        title: it.title,
        category: it.category,
        intent: it.intent,
        digest_state: it.digest_state,
        half_life: it.half_life,
        recall_score: Number(recallScore(it.created_at, hl).toFixed(3)),
        memory_strength: it.memory_strength,
        trigger_reason: `半衰期 ${hl} 天 · 已 ${days} 天未复习`,
        created_at: it.created_at,
      };
    })
    .sort((a, b) => b.recall_score - a.recall_score)
    .slice(0, limit);
}

/** 复习反馈：只调 memory_strength，不改 half_life；写 recall_event */
export function reviewMemory(userId: string, memoryId: string, feedback: RecallFeedback) {
  const item = getItem(memoryId);
  if (!item) return null;
  const hl = item.half_life ?? 30;
  const cur = item.memory_strength ?? recallScore(item.created_at, hl);

  let strength: number;
  let nextDays: number;
  let reason: string;
  if (feedback === 'again') {
    strength = Math.max(0.1, cur * 0.6);
    nextDays = 1;
    reason = '标记为「忘了」，强度下调';
  } else if (feedback === 'good') {
    strength = 0.9;
    nextDays = Math.max(1, Math.round(hl * 0.5));
    reason = '标记为「记住了」，强度恢复到 0.9';
  } else {
    strength = 1.0;
    nextDays = Math.max(1, Math.round(hl));
    reason = '标记为「太简单」，强度置满';
  }

  const nextReviewAt = new Date(Date.now() + nextDays * 86400000).toISOString();
  applyReview(memoryId, strength, nextReviewAt);
  insertRecallEvent({
    userId,
    memoryId,
    triggeredBy: 'manual',
    triggerReason: reason,
    recallScore: Number(recallScore(item.created_at, hl).toFixed(3)),
    feedback,
  });

  return {
    memory_strength: Number(strength.toFixed(3)),
    next_review_at: nextReviewAt,
    review_count: item.review_count + 1,
  };
}

/** 供 dashboard/其他处取当前强度（item 可能未带 memory_strength） */
export function strengthOf(item: Item): number {
  return item.memory_strength ?? recallScore(item.created_at, item.half_life ?? 30);
}
