import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchItem } from '../api/memory'
import { similarAction } from '../api/similar'
import type { Item } from '../types/brain'
import { PLATFORM_LABELS, INTENT_LABELS, ATOM_TYPE_LABELS, DIGEST_LABELS } from '../lib/labels'
import AuroraBackground from '../components/background/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import { Skeleton } from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'
import MemoryRelation from '../components/memory/MemoryRelation'

const ACTIONS = [
  { key: 'review', label: '复习' },
  { key: 'create_scene', label: '建场景' },
  { key: 'keep', label: '保留' },
  { key: 'mute', label: '静音' },
] as const

export default function MemoryDetail() {
  const { id } = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [error, setError] = useState(false)
  const [feedback, setFeedback] = useState<{ similarId: string; label: string } | null>(null)

  function load() {
    setError(false)
    fetchItem(id!)
      .then(setItem)
      .catch(() => setError(true))
  }
  useEffect(load, [id])

  async function act(similarId: string, action: string, label: string) {
    setFeedback({ similarId, label: `${label}中...` })
    try {
      await similarAction(id!, action, similarId)
      setFeedback({ similarId, label: `已${label}` })
    } catch {
      setFeedback({ similarId, label: `${label}失败` })
    }
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/memory" className="text-sm text-white/50">
          ← 返回记忆
        </Link>

        {!item && !error && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        )}
        {error && <ErrorState onRetry={load} />}

        {item && (
          <div className="mt-4 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-white">{item.title || '(无标题)'}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="neutral">{PLATFORM_LABELS[item.sourcePlatform] || item.sourcePlatform}</Badge>
                {item.category && <Badge tone="secondary">{item.category}</Badge>}
                {item.intent && <Badge tone="neutral">动机：{INTENT_LABELS[item.intent] || item.intent}</Badge>}
              </div>
            </div>

            {item.summary && <GlassCard className="p-4 text-sm text-white/70">{item.summary}</GlassCard>}

            {item.atoms.length > 0 && (
              <section>
                <SectionHeader title="原子知识" />
                <GlassCard className="space-y-2 p-4">
                  {item.atoms.map((a, i) => (
                    <div key={i} className="flex gap-2 text-sm text-white/80">
                      <span className="shrink-0 text-xs text-secondary">
                        [{ATOM_TYPE_LABELS[a.type] || a.type}]
                      </span>
                      {a.content}
                    </div>
                  ))}
                </GlassCard>
              </section>
            )}

            <section>
              <SectionHeader title="知识生命周期" />
              <GlassCard className="p-4 text-sm text-white/60">
                <div className="flex justify-between py-1">
                  <span>状态</span>
                  <span className="text-white">{DIGEST_LABELS[item.digestState] || item.digestState}</span>
                </div>
                {item.halfLife && (
                  <div className="flex justify-between py-1">
                    <span>半衰期</span>
                    <span className="text-white">{item.halfLife} 天</span>
                  </div>
                )}
                {item.createdAt && (
                  <div className="flex justify-between py-1">
                    <span>收藏时间</span>
                    <span className="text-white">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </GlassCard>
            </section>

            <section>
              <SectionHeader title="记忆能量" />
              <GlassCard className="p-4 text-sm text-white/60">
                <div className="flex items-center justify-between py-1">
                  <span>记忆强度</span>
                  <span className="text-white">{Math.round((item.memoryStrength ?? 0) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (item.memoryStrength ?? 0) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between py-1">
                  <span>复习次数</span>
                  <span className="text-white">{item.reviewCount}</span>
                </div>
                {item.lastRecalledAt && (
                  <div className="flex justify-between py-1">
                    <span>最近复习</span>
                    <span className="text-white">{new Date(item.lastRecalledAt).toLocaleDateString()}</span>
                  </div>
                )}
                {item.nextReviewAt && (
                  <div className="flex justify-between py-1">
                    <span>下次复习</span>
                    <span className="text-white">{new Date(item.nextReviewAt).toLocaleDateString()}</span>
                  </div>
                )}
              </GlassCard>
            </section>

            <MemoryRelation items={item.similarItems} />

            {item.similarItems.length > 0 && (
              <section>
                <SectionHeader title="照镜子行动" />
                <div className="space-y-2">
                  {item.similarItems.map((s) => (
                    <GlassCard key={s.id} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-white/70">{s.title || '(无标题)'}</span>
                        <span className="shrink-0 text-xs text-secondary">
                          {s.level === 'exact' ? '完全重复' : s.level === 'high' ? '高度相似' : '主题相关'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ACTIONS.map((a) => (
                          <button
                            key={a.key}
                            onClick={() => act(s.id, a.key, a.label)}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-white/20"
                          >
                            {a.label}
                          </button>
                        ))}
                        {feedback?.similarId === s.id && (
                          <span className="self-center text-xs text-primary">{feedback.label}</span>
                        )}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
