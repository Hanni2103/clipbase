import { useState } from 'react'
import type { Item } from '../../types/brain'

/** 记忆选择器：受控组件，按关键词过滤传入的记忆列表 */
export default function MemorySelector({
  items,
  selected,
  onToggle,
}: {
  items: Item[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = q
    ? items.filter(
        (it) =>
          (it.title || '').toLowerCase().includes(q.toLowerCase()) ||
          (it.summary || '').toLowerCase().includes(q.toLowerCase()),
      )
    : items

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索记忆..."
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 backdrop-blur-xl outline-none"
      />
      <div className="mt-3 space-y-2">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-white/40">没有匹配的记忆</div>
        )}
        {filtered.map((it) => {
          const isSel = selected.includes(it.id)
          return (
            <button
              key={it.id}
              onClick={() => onToggle(it.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                isSel ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-white">{it.title || '(无标题)'}</span>
                {isSel && <span className="shrink-0 text-xs text-primary">已选</span>}
              </div>
              {it.category && <div className="mt-1 text-xs text-secondary">{it.category}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
