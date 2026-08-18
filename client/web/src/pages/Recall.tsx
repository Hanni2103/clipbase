import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecall } from '../api/recall'
import type { RecallItem } from '../types/brain'
import { INTENT_LABELS } from '../lib/labels'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import GlassCard from '../components/ui/GlassCard'
import RecallReason from '../components/recall/RecallReason'

export default function Recall() {
  const [items, setItems] = useState<RecallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetchRecall()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        <PageHeader title="今日回顾" subtitle="AI 根据记忆半衰期，为你挑选需要复习的内容" />

        <div className="mt-4 space-y-3">
          {loading && <SkeletonList count={3} />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && items.length === 0 && (
            <EmptyState icon="🎉" title="暂无待回顾内容" description="你的记忆状态很好" />
          )}
          {!loading &&
            !error &&
            items.map((it) => (
              <Link key={it.id} to={`/memory/${it.id}`} className="block transition hover:opacity-80">
                <GlassCard className="p-4">
                  <div className="font-semibold text-white">{it.title || '(无标题)'}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                    {it.category && <span className="text-secondary">{it.category}</span>}
                    {it.intent && <span>· {INTENT_LABELS[it.intent] || it.intent}</span>}
                    {it.halfLife && <span>· 半衰期 {it.halfLife} 天</span>}
                    <span className="ml-auto text-warning">召回分 {it.recallScore}</span>
                  </div>
                  <RecallReason item={it} />
                </GlassCard>
              </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
