import { get, post, userId } from './client'
import type { RecallEvent, RecallItem } from '../types/brain'

export async function fetchRecall(): Promise<RecallItem[]> {
  const data = await get<any>(`/api/recall?user_id=${userId()}`)
  return (data.items || []).map((o: any) => ({
    id: o.id,
    title: o.title || null,
    category: o.category || null,
    intent: o.intent || null,
    recallScore: o.recall_score ?? 0,
    halfLife: o.half_life ?? null,
    createdAt: o.created_at || '',
    memoryStrength: o.memory_strength ?? null,
    triggerReason: o.trigger_reason || '',
  }))
}

export async function reviewMemory(
  memoryId: string,
  feedback: 'again' | 'good' | 'easy',
): Promise<{ memoryStrength: number; nextReviewAt: string; reviewCount: number }> {
  const data = await post<any>(`/api/recall/${memoryId}/review`, { user_id: userId(), feedback })
  return {
    memoryStrength: data.memory_strength ?? 0,
    nextReviewAt: data.next_review_at || '',
    reviewCount: data.review_count ?? 0,
  }
}

export async function fetchRecallEvents(memoryId?: string): Promise<RecallEvent[]> {
  const params = new URLSearchParams({ user_id: userId() })
  if (memoryId) params.set('memory_id', memoryId)
  const data = await get<any>(`/api/recall/events?${params}`)
  return (data.events || []).map((e: any) => ({
    id: e.id,
    memoryId: e.memory_id,
    triggeredBy: e.triggered_by,
    triggerReason: e.trigger_reason,
    recallScore: e.recall_score ?? 0,
    feedback: e.feedback || null,
    createdAt: e.created_at || '',
  }))
}
