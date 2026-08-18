import { get, userId } from './client'
import type { Item } from '../types/brain'

export function mapItem(o: any): Item {
  return {
    id: o.id,
    title: o.title || null,
    category: o.category || null,
    tags: o.tags || [],
    summary: o.summary || null,
    atoms: (o.atoms || []).map((a: any) => ({ type: a.type, content: a.content })),
    similarItems: (o.similar_items || []).map((s: any) => ({ id: s.id, title: s.title, level: s.level })),
    sourcePlatform: o.source_platform || '',
    intent: o.intent || null,
    digestState: o.digest_state || 'unread',
    halfLife: o.half_life ?? null,
    createdAt: o.created_at || '',
    memoryStrength: o.memory_strength ?? null,
    reviewCount: o.review_count ?? 0,
    nextReviewAt: o.next_review_at ?? null,
    lastRecalledAt: o.last_recalled_at ?? null,
  }
}

export async function fetchItems(category?: string, q?: string): Promise<Item[]> {
  const params = new URLSearchParams({ user_id: userId() })
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const data = await get<any>(`/api/items?${params}`)
  return (data.items || []).map(mapItem)
}

export async function fetchItem(id: string): Promise<Item> {
  return mapItem(await get<any>(`/api/items/${id}`))
}
