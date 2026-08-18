import type { RecallItem } from '../../types/brain'

function daysSince(iso: string): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** 结构化「Why Now」解释：只基于后端真实字段（half_life / created_at / recall_score），不虚构 AI 理由 */
export default function RecallReason({ item }: { item: RecallItem }) {
  const days = daysSince(item.createdAt)
  const reasons: string[] = []

  if (item.halfLife) reasons.push(`半衰期 ${item.halfLife} 天`)
  if (days > 0) reasons.push(`收藏于 ${days} 天前`)
  if (item.recallScore >= 0.8) reasons.push('召回优先级较高')
  else if (item.recallScore >= 0.5) reasons.push('记忆正在衰减，建议复习')
  else reasons.push('记忆已明显衰减')

  return <div className="mt-2 text-xs text-white/50">{reasons.join(' · ')}</div>
}
