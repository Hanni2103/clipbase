import { get, userId } from './client'
import type { ExpiredItem } from '../types/brain'

export async function fetchExpired(): Promise<ExpiredItem[]> {
  const data = await get<any>(`/api/expired?user_id=${userId()}`)
  return (data.items || []).map((o: any) => ({
    id: o.id,
    title: o.title || null,
    category: o.category || null,
    summary: o.summary || null,
    recallScore: o.recall_score ?? 0,
  }))
}
