import { getItem, setMemoryStrength } from '../db.js';
import { recallScore } from '../halflife.js';
import type { Item } from '../types.js';

/** 当前强度：优先 memory_strength，NULL 回退 recall_score（不写库） */
export function currentStrength(item: Item): number {
  if (item.memory_strength !== null && item.memory_strength !== undefined) return item.memory_strength;
  return recallScore(item.created_at, item.half_life ?? 30);
}

/** 初始化强度：若未初始化，用当前 recall_score 写入（幂等） */
export function initStrength(itemId: string): number {
  const item = getItem(itemId);
  if (!item) return 0;
  if (item.memory_strength !== null && item.memory_strength !== undefined) return item.memory_strength;
  const s = recallScore(item.created_at, item.half_life ?? 30);
  setMemoryStrength(itemId, s);
  return s;
}
