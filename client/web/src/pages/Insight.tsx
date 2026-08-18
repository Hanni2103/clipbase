import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { fetchInsight } from '../api/dashboard'
import type { Insight } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import GlassCard from '../components/ui/GlassCard'

export default function Insight() {
  const [insight, setInsight] = useState<Insight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetchInsight()
      .then(setInsight)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/" className="text-sm text-white/50">
          ← 返回
        </Link>
        <div className="mt-4">
          <PageHeader title="AI 洞察" subtitle="你未曾察觉的知识连接" />
        </div>

        <div className="mt-4">
          {loading && <Skeleton className="h-40" />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && insight && !insight.found && (
            <EmptyState
              icon="✨"
              title="还没有发现连接"
              description="继续沉淀知识，AI 会帮你发现它们之间的隐藏关系"
            />
          )}
          {!loading && !error && insight?.found && (
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles size={18} />
                <span className="text-sm font-medium">发现新的知识连接</span>
              </div>
              <p className="mt-4 leading-relaxed text-white/60">
                你收藏的 <span className="text-white">{insight.aTitle || '（无标题）'}</span> 与{' '}
                <span className="text-white">{insight.bTitle || '（无标题）'}</span> 存在{' '}
                <span className="font-bold text-secondary">{insight.similarity}%</span> 关联。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {insight.aId && (
                  <Link
                    to={`/memory/${insight.aId}`}
                    className="rounded-full bg-white/10 px-5 py-2 text-sm transition hover:bg-white/20"
                  >
                    查看 {insight.aTitle || '知识 A'}
                  </Link>
                )}
                {insight.bId && (
                  <Link
                    to={`/memory/${insight.bId}`}
                    className="rounded-full bg-white/10 px-5 py-2 text-sm transition hover:bg-white/20"
                  >
                    查看 {insight.bTitle || '知识 B'}
                  </Link>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  )
}
