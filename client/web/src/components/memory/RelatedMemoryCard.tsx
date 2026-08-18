import { Link } from 'react-router-dom'
import type { SimilarItem } from '../../types/brain'

const LEVEL_LABELS: Record<string, string> = {
  exact: '完全重复',
  high: '高度相似',
  related: '主题相关',
}

export default function RelatedMemoryCard({ item }: { item: SimilarItem }) {
  return (
    <Link to={`/memory/${item.id}`} className="w-40 shrink-0 transition hover:opacity-80">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
        <div className="line-clamp-2 text-sm font-medium text-white">{item.title || '(无标题)'}</div>
        <div className="mt-1 text-xs text-secondary">{LEVEL_LABELS[item.level] || item.level}</div>
      </div>
    </Link>
  )
}
