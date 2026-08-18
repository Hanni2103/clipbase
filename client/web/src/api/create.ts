import { get, post, userId } from './client'
import type { ComposeType } from '../types/brain'

export async function compose(type: string): Promise<string> {
  const data = await post<any>('/api/compose', { user_id: userId(), type })
  return data.content || data.error || ''
}

export async function fetchComposeTypes(): Promise<ComposeType[]> {
  const data = await get<any>(`/api/compose-types`)
  return data.types || []
}
