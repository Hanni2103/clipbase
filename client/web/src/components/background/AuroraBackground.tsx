import { useMemo } from 'react'

function makeStars(count: number, seed = 7): { id: number; x: number; y: number; r: number; o: number }[] {
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: rand() * 100,
    y: rand() * 100,
    r: 0.4 + rand() * 1.1,
    o: 0.18 + rand() * 0.5,
  }))
}

/** 全局背景：星野 + 极光（深空 AI 宇宙） */
export default function AuroraBackground() {
  const stars = useMemo(() => makeStars(80), [])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* 星野 */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        {stars.map((st) => (
          <circle key={st.id} cx={`${st.x}%`} cy={`${st.y}%`} r={st.r} fill="#fff" opacity={st.o} />
        ))}
      </svg>

      {/* 极光 */}
      <div className="absolute -left-[120px] -top-[220px] h-[560px] w-[560px] rounded-full bg-primary/25 blur-[130px]" />
      <div className="absolute -bottom-[160px] -right-[120px] h-[480px] w-[480px] rounded-full bg-secondary/20 blur-[120px]" />
      <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[110px]" />

      {/* 底部渐隐 */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050816] to-transparent" />
    </div>
  )
}
