import type { Item } from '../types/brain'
import { PLATFORM_LABELS, INTENT_LABELS } from '../lib/labels'

function daysSince(iso: string): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

type Stage = 'active' | 'fading' | 'sleeping'

function lifecycle(item: Item): { stage: Stage; remaining: number; ratio: number } {
  const hl = item.halfLife ?? 30
  const days = daysSince(item.createdAt)
  const remaining = Math.max(0, hl - days)
  const ratio = hl > 0 ? Math.min(1, remaining / hl) : 0
  let stage: Stage = 'active'
  if (item.digestState === 'unread' || remaining <= 0) stage = 'sleeping'
  else if (remaining <= hl * 0.3) stage = 'fading'
  return { stage, remaining: Math.round(remaining), ratio }
}

const STAGE: Record<Stage, { label: string; icon: string; bar: string; text: string }> = {
  active: { label: '活跃记忆', icon: '🔥', bar: 'bg-success', text: 'text-success' },
  fading: { label: '正在遗忘', icon: '🌘', bar: 'bg-warning', text: 'text-warning' },
  sleeping: { label: '沉睡知识', icon: '💤', bar: 'bg-white/25', text: 'text-white/40' },
}

export default function ItemCard({ item }: { item: Item }) {
  const lc = lifecycle(item)
  const st = STAGE[lc.stage]

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-memory p-4 backdrop-blur-xl">
      {/* 生命周期 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className={st.text}>
            {st.icon} {st.label}
          </span>
          <span className="text-white/40">还剩 {lc.remaining} 天</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${lc.ratio * 100}%` }} />
        </div>
      </div>

      <div className="font-semibold text-white">{item.title || '(无标题)'}</div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.category && (
          <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-xs text-secondary">{item.category}</span>
        )}
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/60">
          {PLATFORM_LABELS[item.sourcePlatform] || item.sourcePlatform}
        </span>
      </div>

      {item.summary && <div className="mt-2 text-sm text-white/60">{item.summary}</div>}

      {/* AI 提炼 */}
      {item.atoms.length > 0 && (
        <div className="mt-3 border-l-2 border-secondary/30 pl-3">
          <div className="mb-1.5 text-xs font-medium text-secondary">✨ AI 提炼</div>
          <ol className="space-y-1.5">
            {item.atoms.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/80">
                <span className="shrink-0 text-xs font-semibold text-secondary/70">{i + 1}</span>
                <span>{a.content}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 保存原因 */}
      {item.intent && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-white/70">
          <span className="shrink-0 text-primary">保存原因</span>
          <span>{INTENT_LABELS[item.intent] || item.intent}</span>
        </div>
      )}

      {item.similarItems.length > 0 && (
        <div className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          📌 你存过 {item.similarItems.length} 条类似内容
        </div>
      )}
    </div>
  )
}
