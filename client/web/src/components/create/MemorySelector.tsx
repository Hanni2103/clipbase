import { useEffect, useState } from 'react'
import { fetchItems } from '../../api/memory'
import type { Item } from '../../types/brain'

/** 记忆选择器：为 Memory-first Create 选择来源记忆 */
export default function MemorySelector({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchItems(undefined, q || undefined)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q])

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索记忆..."
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 backdrop-blur-xl outline-none"
      />
      <div className="mt-3 space-y-2">
        {loading && <div className="py-8 text-center text-sm text-white/40">加载中...</div>}
        {!loading &&
          items.map((it) => {
            const isSel = selected.includes(it.id)
            return (
              <button
                key={it.id}
                onClick={() => onToggle(it.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  isSel ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="text-sm text-white">{it.title || '(无标题)'}</div>
                {it.category && <div className="mt-1 text-xs text-secondary">{it.category}</div>}
              </button>
            )
          })}
      </div>
    </div>
  )
}
