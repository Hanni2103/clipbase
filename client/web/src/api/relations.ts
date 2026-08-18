import { get, userId } from './client'
import type { Graph, GraphEdge, GraphNode, Relation } from '../types/brain'

export async function fetchRelations(memoryId?: string): Promise<Relation[]> {
  const params = new URLSearchParams({ user_id: userId() })
  if (memoryId) params.set('memory_id', memoryId)
  const data = await get<any>(`/api/relations?${params}`)
  return (data.relations || []).map((r: any) => ({
    id: r.id,
    sourceId: r.source_id,
    targetId: r.target_id,
    type: r.type,
    score: r.score,
    confidence: r.confidence,
    source: r.source,
    evidence: r.evidence || {},
  }))
}

export async function fetchGraph(): Promise<Graph> {
  const data = await get<any>(`/api/graph?user_id=${userId()}`)
  return {
    nodes: (data.nodes || []).map(
      (n: any): GraphNode => ({ id: n.id, title: n.title, category: n.category, strength: n.strength }),
    ),
    edges: (data.edges || []).map(
      (e: any): GraphEdge => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        score: e.score,
        confidence: e.confidence,
        sourceType: e.source_type,
        evidence: e.evidence || {},
      }),
    ),
  }
}
