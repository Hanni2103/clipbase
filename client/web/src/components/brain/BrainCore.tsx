import { motion, useReducedMotion } from 'framer-motion'
import { useAIState, type AIState } from '../../hooks/useAIState'

interface BrainConfig {
  orbit: number
  glow: number
  pulse: number
  particles: boolean
  label: string
}

const CONFIG: Record<AIState, BrainConfig> = {
  idle: { orbit: 30, glow: 5, pulse: 4, particles: false, label: '稳定' },
  thinking: { orbit: 6, glow: 1.6, pulse: 1.2, particles: false, label: '思考中' },
  recalling: { orbit: 12, glow: 3, pulse: 3, particles: true, label: '唤醒记忆' },
  creating: { orbit: 8, glow: 1.8, pulse: 1.5, particles: false, label: '创造中' },
}

export default function BrainCore({ health }: { health: number }) {
  const reduceMotion = useReducedMotion()
  const { state } = useAIState()
  const c = CONFIG[state]

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      {/* 外层旋转轨道 */}
      <motion.div
        animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
        transition={{ duration: c.orbit, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-dashed border-primary/25"
      />
      {/* 光晕 */}
      <motion.div
        animate={reduceMotion ? { opacity: 0.5 } : { scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: c.glow, repeat: Infinity }}
        className="absolute h-44 w-44 rounded-full bg-primary/20 blur-3xl"
      />
      {/* 唤醒记忆粒子 */}
      {c.particles && (
        <motion.div
          animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute h-52 w-52"
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_8px_#06B6D4]" />
          <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_#8B5CF6]" />
          <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-success shadow-[0_0_8px_#10B981]" />
        </motion.div>
      )}
      {/* 核心球 */}
      <motion.div
        animate={reduceMotion ? {} : { scale: [1, 1.05, 1] }}
        transition={{ duration: c.pulse, repeat: Infinity }}
        className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-primary via-indigo-500 to-secondary shadow-[0_0_90px_rgba(139,92,246,0.7)]"
      >
        <div className="absolute inset-4 rounded-full bg-black/30 backdrop-blur-xl" />
        <div className="relative text-center">
          <div className="text-5xl">🧠</div>
          <div className="mt-2 text-2xl font-bold">{health}%</div>
          <div className="text-xs text-white/60">记忆健康度</div>
        </div>
      </motion.div>
      {/* 状态标签 */}
      <div className="absolute -bottom-1 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-secondary backdrop-blur-xl">
        {c.label}
      </div>
    </div>
  )
}
