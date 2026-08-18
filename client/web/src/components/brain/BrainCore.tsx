import { motion } from 'framer-motion'

export default function BrainCore({ health }: { health: number }) {
  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      {/* 外层旋转轨道 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border border-dashed border-primary/25"
      />
      {/* 光晕 */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute h-44 w-44 rounded-full bg-primary/20 blur-3xl"
      />
      {/* 核心球 */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-primary via-indigo-500 to-secondary shadow-[0_0_90px_rgba(139,92,246,0.7)]"
      >
        <div className="absolute inset-4 rounded-full bg-black/30 backdrop-blur-xl" />
        <div className="relative text-center">
          <div className="text-5xl">🧠</div>
          <div className="mt-2 text-2xl font-bold">{health}%</div>
          <div className="text-xs text-white/60">记忆健康度</div>
        </div>
      </motion.div>
    </div>
  )
}
