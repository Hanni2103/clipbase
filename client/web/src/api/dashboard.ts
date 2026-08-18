import { get, userId } from './client'
import type { BrainState, Insight } from '../types/brain'

function mapInsight(o: any): Insight {
  return o.found
    ? {
        found: true,
        aTitle: o.item_a?.title ?? '',
        bTitle: o.item_b?.title ?? '',
        similarity: o.similarity ?? 0,
      }
    : { found: false, aTitle: '', bTitle: '', similarity: 0 }
}

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
    insight: mapInsight(insight),
  }
}

export async function fetchInsight(): Promise<Insight> {
  const data = await get<any>(`/api/insight?user_id=${userId()}`)
  return mapInsight(data)
}
