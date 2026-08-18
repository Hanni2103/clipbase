const ITEMS = [
  { key: 'active', label: '活跃记忆', desc: 'AI 认为：当前最有价值', color: 'text-success', dot: '🟢' },
  { key: 'fading', label: '即将遗忘', desc: '建议：重新阅读', color: 'text-warning', dot: '🟡' },
  { key: 'sleeping', label: '沉睡知识', desc: '等待重新激活', color: 'text-gray-400', dot: '⚫' },
] as const

export default function MemoryStatus({
  active,
  fading,
  sleeping,
}: {
  active: number
  fading: number
  sleeping: number
}) {
  const counts = { active, fading, sleeping }
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">记忆状态</h2>
      <div className="space-y-3">
        {ITEMS.map((it) => (
          <div
            key={it.key}
            className="relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
          >
            <div>
              <div className="text-sm text-white/60">
                {it.dot} {it.label}
              </div>
              <div className="mt-1 text-xs text-white/40">{it.desc}</div>
            </div>
            <div className={`text-3xl font-bold ${it.color}`}>{counts[it.key]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
