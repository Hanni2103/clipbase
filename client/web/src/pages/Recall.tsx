import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RotateCcw, Zap } from 'lucide-react'
import { fetchRecall, reviewMemory } from '../api/recall'
import type { RecallItem } from '../types/brain'
import { INTENT_LABELS } from '../lib/labels'
import { useAIState } from '../hooks/useAIState'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import GlassCard from '../components/ui/GlassCard'

const FEEDBACK = [
  { key: 'again', label: '忘了', icon: RotateCcw },
  { key: 'good', label: '记住了', icon: Check },
  { key: 'easy', label: '太简单', icon: Zap },
] as const

export default function Recall() {
  const [items, setItems] = useState<RecallItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [justReviewed, setJustReviewed] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const { setState } = useAIState()

  async function refresh() {
    try {
      setItems(await fetchRecall())
    } catch {
      /* 静默 */
    }
  }

  function load() {
    setLoading(true)
    setError(false)
    setState('recalling')
    fetchRecall()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false)
        setState('idle')
      })
  }
  useEffect(load, [])

  async function feedback(it: RecallItem, f: 'again' | 'good' | 'easy') {
    setBusy((s) => ({ ...s, [it.id]: true }))
    setFeedbackError(null)
    try {
      await reviewMemory(it.id, f)
      setJustReviewed(it.id)
      await refresh()
    } catch {
      setFeedbackError('反馈失败，请重试')
    } finally {
      setBusy((s) => ({ ...s, [it.id]: false }))
    }
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        <PageHeader title="今日回顾" subtitle="AI 根据记忆半衰期，为你挑选需要复习的内容" />

        {feedbackError && <p className="mt-3 text-xs text-warning">{feedbackError}</p>}

        <div className="mt-4 space-y-3">
          {loading && <SkeletonList count={3} />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && items.length === 0 && (
            <EmptyState icon="🎉" title="今天没有需要唤醒的记忆" description="你的记忆状态良好。" />
          )}
          {!loading &&
            !error &&
            items.map((it) => {
              const done = justReviewed === it.id
              return (
                <GlassCard key={it.id} className={`p-4 ${done ? 'ring-1 ring-success/40' : ''}`}>
                  <Link to={`/memory/${it.id}`} className="block font-semibold text-white hover:opacity-80">
                    {it.title || '(无标题)'}
                  </Link>

                  <div className="mt-2 space-y-1 text-xs text-white/50">
                    <div className="flex items-center justify-between">
                      <span>召回分</span>
                      <span className="text-warning">{it.recallScore}</span>
                    </div>
                    {it.memoryStrength !== null && it.memoryStrength !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>记忆强度</span>
                        <span className="text-white">{Math.round(it.memoryStrength * 100)}%</span>
                      </div>
                    )}
                    {it.halfLife && (
                      <div className="flex items-center justify-between">
                        <span>半衰期</span>
                        <span>{it.halfLife} 天</span>
                      </div>
                    )}
                    {it.category && <div>分类 · {it.category}</div>}
                    {it.intent && <div>动机 · {INTENT_LABELS[it.intent] || it.intent}</div>}
                  </div>

                  <div className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60">
                    {it.triggerReason ? `💡 ${it.triggerReason}` : '暂无唤醒原因'}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {FEEDBACK.map((f) => {
                      const Icon = f.icon
                      return (
                        <button
                          key={f.key}
                          onClick={() => feedback(it, f.key)}
                          disabled={!!busy[it.id]}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-xs text-white/80 transition hover:bg-white/20 disabled:opacity-50"
                        >
                          <Icon size={14} /> {f.label}
                        </button>
                      )
                    })}
                  </div>
                </GlassCard>
              )
            })}
        </div>
      </main>
    </div>
  )
}
