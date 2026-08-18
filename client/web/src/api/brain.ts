import type { BrainState } from '../types/brain'

function userId(): string {
  let id = localStorage.getItem('clipbase_user')
  if (!id) {
    id = 'u' + Math.random().toString(36).slice(2, 10)
    localStorage.setItem('clipbase_user', id)
  }
  return id
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** 拉取 AI 大脑状态（映射后端 /dashboard + /insight 的 snake_case 字段） */
export async function fetchBrainState(): Promise<BrainState> {
  const uid = userId()
  const [dash, insight] = await Promise.all([
    get<any>(`/api/dashboard?user_id=${uid}`),
    get<any>(`/api/insight?user_id=${uid}`),
  ])
  return {
    health: dash.brain_health ?? 0,
    total: dash.total ?? 0,
    todayIngested: dash.today_ingested ?? 0,
    todayAwaken: dash.today_awaken ?? 0,
    expiringSoon: dash.expiring_soon ?? 0,
    todayReview: dash.today_review ?? 0,
    active: dash.lifecycle?.active ?? 0,
    fading: dash.lifecycle?.review ?? 0,
    sleeping: dash.lifecycle?.expired ?? 0,
    insight: insight.found
      ? {
          found: true,
          aTitle: insight.item_a?.title ?? '',
          bTitle: insight.item_b?.title ?? '',
          similarity: insight.similarity ?? 0,
        }
      : { found: false, aTitle: '', bTitle: '', similarity: 0 },
  }
}
