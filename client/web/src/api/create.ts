import { get, post, userId } from './client'
import type { ComposeContext, ComposeResult, ComposeType } from '../types/brain'

export async function compose(
  type: string,
  memoryIds?: string[],
  opts?: { topic?: string; tone?: string; audience?: string; length?: string },
): Promise<ComposeResult> {
  const body: Record<string, unknown> = { user_id: userId(), type }
  if (memoryIds && memoryIds.length > 0) body.memory_ids = memoryIds
  if (opts?.topic) body.topic = opts.topic
  if (opts?.tone) body.tone = opts.tone
  if (opts?.audience) body.audience = opts.audience
  if (opts?.length) body.length = opts.length
  const data = await post<any>('/api/compose', body)
  return {
    title: data.title || '',
    type: data.type || type,
    content: data.content || data.error || '',
    usedMemoryIds: data.used_memory_ids || [],
    citedAtoms: (data.cited_atoms || []).map((a: any) => ({
      memoryId: a.memory_id,
      atomType: a.atom_type,
      content: a.content,
    })),
    tokenEstimate: data.token_estimate ?? 0,
  }
}

export async function fetchComposeContext(
  type: string,
  memoryIds?: string[],
  topic?: string,
): Promise<ComposeContext> {
  const params = new URLSearchParams({ user_id: userId(), type })
  if (memoryIds && memoryIds.length > 0) params.set('memory_ids', memoryIds.join(','))
  if (topic) params.set('topic', topic)
  const data = await get<any>(`/api/compose/context?${params}`)
  return {
    memoryIds: data.memory_ids || [],
    selectedAtoms: (data.selected_atoms || []).map((s: any) => ({
      memoryId: s.memory_id,
      title: s.title,
      contextScore: s.context_score ?? 0,
      atoms: (s.atoms || []).map((a: any) => ({ type: a.type, content: a.content })),
    })),
    tokenEstimate: data.token_estimate ?? 0,
    truncated: data.truncated ?? false,
  }
}

export async function fetchComposeTypes(): Promise<ComposeType[]> {
  const data = await get<any>(`/api/compose-types`)
  return data.types || []
}
