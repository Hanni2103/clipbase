import type { Item } from '../types/brain'
import { PLATFORM_LABELS, INTENT_LABELS, ATOM_TYPE_LABELS } from '../lib/labels'

export default function ItemCard({ item }: { item: Item }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="font-semibold text-white">{item.title || '(无标题)'}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/60">
          {PLATFORM_LABELS[item.sourcePlatform] || item.sourcePlatform}
        </span>
        {item.category && (
          <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-xs text-secondary">{item.category}</span>
        )}
        {item.intent && (
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {INTENT_LABELS[item.intent] || item.intent}
          </span>
        )}
      </div>
      {item.summary && <div className="mt-2 text-sm text-white/60">{item.summary}</div>}
      {item.atoms.length > 0 && (
        <div className="mt-3 space-y-1.5 border-l-2 border-secondary/30 pl-3">
          {item.atoms.map((a, i) => (
            <div key={i} className="flex gap-2 text-sm text-white/80">
              <span className="shrink-0 text-xs text-secondary">[{ATOM_TYPE_LABELS[a.type] || a.type}]</span>
              {a.content}
            </div>
          ))}
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
