import { get, userId } from './client'
import type { RecallItem } from '../types/brain'

export async function fetchRecall(): Promise<RecallItem[]> {
  const data = await get<any>(`/api/recall?user_id=${userId()}`)
  return (data.items || []).map((o: any) => ({
    id: o.id,
    title: o.title || null,
    category: o.category || null,
    intent: o.intent || null,
    recallScore: o.recall_score ?? 0,
    halfLife: o.half_life ?? null,
  }))
}
