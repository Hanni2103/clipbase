import type { SimilarItem } from '../../types/brain'
import SectionHeader from '../ui/SectionHeader'
import RelatedMemoryCard from './RelatedMemoryCard'

/** 相关知识：横向卡片（关系数据来自后端真实 similar_items，不伪造边） */
export default function MemoryRelation({ items }: { items: SimilarItem[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <SectionHeader title="相关知识" />
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2">
        {items.map((it) => (
          <RelatedMemoryCard key={it.id} item={it} />
        ))}
      </div>
    </section>
  )
}
