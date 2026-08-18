import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchExpired } from '../api/expired'
import type { ExpiredItem } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import GlassCard from '../components/ui/GlassCard'

export default function Expired() {
  const [items, setItems] = useState<ExpiredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetchExpired()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/memory" className="text-sm text-white/50">
          ← 返回记忆
        </Link>
        <div className="mt-4">
          <PageHeader title="沉睡知识" subtitle="有些知识已经完成了它的使命" />
        </div>

        <div className="mt-4 space-y-3">
          {loading && <SkeletonList count={3} />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && items.length === 0 && (
            <EmptyState icon="✨" title="没有沉睡的知识" description="你的记忆库都很活跃" />
          )}
          {!loading &&
            !error &&
            items.map((it) => (
              <Link key={it.id} to={`/memory/${it.id}`} className="block transition hover:opacity-80">
                <GlassCard className="p-4">
                  <div className="font-semibold text-white">{it.title || '(无标题)'}</div>
                  {it.summary && <div className="mt-1 text-sm text-white/50">{it.summary}</div>}
                  <div className="mt-2 flex items-center text-xs text-white/50">
                    {it.category && <span className="text-secondary">{it.category}</span>}
                    <span className="ml-auto text-gray-400">衰减到 {it.recallScore}</span>
                  </div>
                </GlassCard>
              </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
