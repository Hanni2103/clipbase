import { get, patch, userId } from './client'
import type { Prefs } from '../types/brain'

export async function fetchPrefs(): Promise<Prefs> {
  const data = await get<any>(`/api/prefs?user_id=${userId()}`)
  return {
    mutedTopics: data.muted_topics || [],
    remindFrequency: data.remind_frequency || 'low',
    timezone: data.timezone || 'Asia/Shanghai',
  }
}

export async function updatePrefs(p: Partial<Prefs>): Promise<Prefs> {
  const data = await patch<any>(`/api/prefs`, { user_id: userId(), ...p })
  return {
    mutedTopics: data.muted_topics || [],
    remindFrequency: data.remind_frequency || 'low',
    timezone: data.timezone || 'Asia/Shanghai',
  }
}
