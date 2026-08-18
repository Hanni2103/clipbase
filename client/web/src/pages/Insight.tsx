import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Layers, Link2, Sparkles, Target, TrendingUp, X, type LucideIcon } from 'lucide-react'
import { fetchInsights, generateInsights, updateInsightStatus } from '../api/insights'
import type { Insight } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'

const TYPE_META: Record<string, { icon: LucideIcon; label: string }> = {
  connection: { icon: Link2, label: '连接' },
  pattern: { icon: Layers, label: '模式' },
  trend: { icon: TrendingUp, label: '趋势' },
  opportunity: { icon: Target, label: '机会' },
}

const IMPACT_STYLE: Record<string, string> = {
  high: 'text-warning',
  medium: 'text-secondary',
  low: 'text-white/40',
}

export default function Insight() {
  const [items, setItems] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  async function refresh() {
    try {
      setItems(await fetchInsights())
    } catch {
      /* 静默，避免覆盖已有数据 */
    }
  }

  function load() {
    setLoading(true)
    setError(false)
    fetchInsights()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function generate() {
    setGenerating(true)
    setFeedbackError(null)
    try {
      await generateInsights()
      await refresh()
    } catch {
      setFeedbackError('生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  async function act(id: string, status: 'accepted' | 'dismissed') {
    const prev = items
    setItems((s) => s.map((i) => (i.id === id ? { ...i, status } : i)))
    setFeedbackError(null)
    try {
      await updateInsightStatus(id, status)
    } catch {
      setItems(prev)
      setFeedbackError('操作失败，请重试')
    }
  }

  const active = items.filter((i) => i.status === 'active')

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/" className="text-sm text-white/50">
          ← 返回
        </Link>
        <div className="mt-4">
          <PageHeader title="AI 洞察" subtitle="AI 从你的记忆关系中发现的模式与机会" />
        </div>

        <button
          onClick={generate}
          disabled={generating}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/80 px-4 py-3 text-white transition hover:bg-primary disabled:opacity-50"
        >
          <Sparkles size={16} />
          {generating ? '生成中...' : '生成洞察'}
        </button>
        {feedbackError && <p className="mt-2 text-xs text-warning">{feedbackError}</p>}

        <div className="mt-4 space-y-3">
          {loading && <SkeletonList count={2} />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && active.length === 0 && (
            <EmptyState
              icon={<Sparkles className="mx-auto mb-3 text-primary" size={40} strokeWidth={1.5} />}
              title="暂无新的 AI Insight"
              description="当你的记忆之间形成足够强的连接，这里会出现新的发现。"
            />
          )}
          {!loading &&
            !error &&
            active.map((it) => {
              const meta = TYPE_META[it.type] ?? { icon: Sparkles, label: it.type }
              const Icon = meta.icon
              return (
                <GlassCard key={it.id} variant="ai" className="p-5">
                  <div className="flex items-center gap-2 text-primary">
                    <Icon size={16} />
                    <span className="text-xs font-medium uppercase tracking-wide">AI {meta.label}</span>
                    <span className={`ml-auto text-xs ${IMPACT_STYLE[it.impactScore] ?? 'text-white/40'}`}>
                      影响 {it.impactScore}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-white">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{it.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {it.relatedIds.map((rid) => (
                      <Link
                        key={rid}
                        to={`/memory/${rid}`}
                        className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 transition hover:bg-white/20"
                      >
                        相关记忆
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => act(it.id, 'accepted')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success/15 px-3 py-2 text-sm text-success transition hover:bg-success/25"
                    >
                      <Check size={15} /> 认可
                    </button>
                    <button
                      onClick={() => act(it.id, 'dismissed')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/20"
                    >
                      <X size={15} /> 忽略
                    </button>
                  </div>
                </GlassCard>
              )
            })}
        </div>
      </main>
    </div>
  )
}
