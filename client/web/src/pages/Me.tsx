import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBrainState } from '../api/dashboard'
import type { BrainState } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'

export default function Me() {
  const [brain, setBrain] = useState<BrainState | null>(null)

  useEffect(() => {
    fetchBrainState()
      .then(setBrain)
      .catch(() => {})
  }, [])

  const uid = localStorage.getItem('clipbase_user') || ''

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        <PageHeader title="我的" subtitle="你的 AI 记忆系统" />

        <div className="mt-4 space-y-3">
          <GlassCard className="p-4 text-sm text-white/60">用户 ID：{uid}</GlassCard>

          {brain && (
            <GlassCard className="p-4">
              <div className="text-white">
                知识容量 {brain.total} · 需复习 {brain.fading} · 已过期 {brain.sleeping}
              </div>
              <div className="mt-2 text-sm text-white/50">大脑健康度 {brain.health}%</div>
            </GlassCard>
          )}

          <Link to="/prefs" className="block transition hover:opacity-80">
            <GlassCard className="flex items-center justify-between p-4 text-sm text-white/80">
              <span>偏好设置</span>
              <span className="text-white/40">→</span>
            </GlassCard>
          </Link>

          <Link to="/insight" className="block transition hover:opacity-80">
            <GlassCard className="flex items-center justify-between p-4 text-sm text-white/80">
              <span>AI 洞察</span>
              <span className="text-white/40">→</span>
            </GlassCard>
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-white/40">
          Clipbase · AI 记忆系统
          <br />
          收藏不是终点，让知识持续产生价值
        </div>
      </main>
    </div>
  )
}
