import type { Item } from '../../types/brain'

/** 已选记忆：数量 + 可移除的标签 */
export default function SelectedMemories({
  items,
  onRemove,
}: {
  items: Item[]
  onRemove?: (id: string) => void
}) {
  return (
    <div>
      <div className="text-xs text-white/50">
        已选择 <span className="text-white">{items.length}</span> 条记忆
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onRemove?.(it.id)}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-surface-ai px-3 py-1 text-xs text-white/80 transition hover:bg-primary/20"
            >
              <span className="max-w-[8rem] truncate">{it.title || '(无标题)'}</span>
              <span className="text-white/50">✕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
