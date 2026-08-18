import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchBrainState } from '../api/dashboard'
import type { BrainState } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import BrainCore from '../components/brain/BrainCore'
import MemoryStatus from '../components/brain/MemoryStatus'
import InsightCard from '../components/brain/InsightCard'
import CapturePortal from '../components/CapturePortal'

const STATS = [
  { key: 'total', label: '知识容量', color: 'text-white' },
  { key: 'todayIngested', label: '今日吸收', color: 'text-secondary' },
  { key: 'todayAwaken', label: '今日唤醒', color: 'text-warning' },
] as const

export default function Home() {
  const [brain, setBrain] = useState<BrainState | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchBrainState()
      .then(setBrain)
      .catch(() => setError(true))
  }, [])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        {!brain && !error && (
          <div className="flex flex-col items-center justify-center py-40 text-white/50">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl"
            >
              🧠
            </motion.div>
            <p className="mt-4">正在同步记忆...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center py-40 text-center">
            <div className="text-6xl">🧠</div>
            <p className="mt-4 text-white/70">AI 暂时无法同步记忆</p>
            <p className="mt-1 text-sm text-white/40">本地数据仍然安全</p>
            <button
              onClick={() => location.reload()}
              className="mt-6 rounded-full bg-white/10 px-6 py-2"
            >
              重新连接
            </button>
          </div>
        )}

        {brain && (
          <>
            <div className="text-center">
              <h1 className="bg-gradient-to-r from-white to-primary bg-clip-text text-3xl font-bold text-transparent">
                你的 AI 大脑正在成长
              </h1>
              <p className="mt-3 text-white/50">Clipbase · AI 记忆系统</p>
            </div>

            <div className="mt-10">
              <BrainCore health={brain.health} />
            </div>

            <CapturePortal />

            <div className="mt-10 grid grid-cols-3 gap-4">
              {STATS.map((s) => (
                <div
                  key={s.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl"
                >
                  <div className={`text-xl font-bold ${s.color}`}>{brain[s.key]}</div>
                  <div className="mt-1 text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </div>

            <MemoryStatus active={brain.active} fading={brain.fading} sleeping={brain.sleeping} />

            <InsightCard insight={brain.insight} />
          </>
        )}
      </main>
    </div>
  )
}
