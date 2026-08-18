import { get, patch, post, userId } from './client'
import type { Insight } from '../types/brain'

export async function fetchInsights(status?: string): Promise<Insight[]> {
  const params = new URLSearchParams({ user_id: userId() })
  if (status) params.set('status', status)
  const data = await get<any>(`/api/insights?${params}`)
  return (data.insights || []).map((i: any) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    body: i.body,
    relatedIds: i.related_ids || [],
    confidence: i.confidence,
    impactScore: i.impact_score,
    status: i.status,
  }))
}

export async function generateInsights(): Promise<number> {
  const data = await post<any>('/api/insights/generate', { user_id: userId() })
  return data.created ?? 0
}

export async function updateInsightStatus(id: string, status: 'accepted' | 'dismissed'): Promise<void> {
  await patch(`/api/insights/${id}`, { status })
}
