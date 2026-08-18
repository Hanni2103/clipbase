import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPrefs, updatePrefs } from '../api/preferences'
import type { Prefs } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import Badge from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

const FREQ_OPTIONS = [
  { key: 'low', label: '低频' },
  { key: 'medium', label: '中频' },
  { key: 'high', label: '高频' },
]

export default function Preferences() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)

  useEffect(() => {
    fetchPrefs()
      .then(setPrefs)
      .catch(() => {})
  }, [])

  async function setFrequency(f: string) {
    const updated = await updatePrefs({ remindFrequency: f }).catch(() => null)
    if (updated) setPrefs(updated)
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/me" className="text-sm text-white/50">
          ← 返回
        </Link>
        <div className="mt-4">
          <PageHeader title="偏好设置" subtitle="控制你的 AI 记忆系统" />
        </div>

        <div className="mt-4 space-y-4">
          {!prefs && <Skeleton className="h-40" />}

          {prefs && (
            <>
              <GlassCard className="p-4">
                <div className="text-sm font-medium text-white">提醒频率</div>
                <div className="mt-3 flex gap-2">
                  {FREQ_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setFrequency(o.key)}
                      className={`rounded-full px-4 py-1.5 text-xs transition ${
                        prefs.remindFrequency === o.key
                          ? 'bg-primary text-white'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="text-sm font-medium text-white">时区</div>
                <div className="mt-2 text-sm text-white/50">{prefs.timezone}</div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="text-sm font-medium text-white">静音主题</div>
                {prefs.mutedTopics.length === 0 ? (
                  <div className="mt-2 text-sm text-white/40">还没有静音的主题</div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {prefs.mutedTopics.map((t) => (
                      <Badge key={t} tone="warning">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </GlassCard>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
