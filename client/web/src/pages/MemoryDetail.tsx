import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchItem } from '../api/memory'
import type { Item } from '../types/brain'
import { PLATFORM_LABELS, INTENT_LABELS, ATOM_TYPE_LABELS, DIGEST_LABELS } from '../lib/labels'
import AuroraBackground from '../components/background/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import { Skeleton } from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'

export default function MemoryDetail() {
  const { id } = useParams()
  const [item, setItem] = useState<Item | null>(null)
  const [error, setError] = useState(false)

  function load() {
    setError(false)
    fetchItem(id!)
      .then(setItem)
      .catch(() => setError(true))
  }
  useEffect(load, [id])

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

            {item.similarItems.length > 0 && (
              <section>
                <SectionHeader title="相关知识" />
                <div className="space-y-2">
                  {item.similarItems.map((s) => (
                    <Link key={s.id} to={`/memory/${s.id}`} className="block transition hover:opacity-80">
                      <GlassCard className="p-3 text-sm text-white/70">{s.title || '(无标题)'}</GlassCard>
                    </Link>
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
