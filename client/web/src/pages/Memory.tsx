import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchItems } from '../api/memory'
import type { Item } from '../types/brain'
import { CATEGORIES } from '../lib/labels'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import ItemCard from '../components/ItemCard'

export default function Memory() {
  const [items, setItems] = useState<Item[]>([])
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    fetchItems(category || undefined, q || undefined)
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [category, q])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        <PageHeader title="我的记忆" subtitle="你沉淀的所有知识，AI 已帮你理解、整理、连接" />

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索记忆..."
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 backdrop-blur-xl outline-none"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={`rounded-full px-3 py-1 text-xs transition ${
              !category ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                category === c ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {loading && <SkeletonList count={3} />}
          {!loading && error && <ErrorState onRetry={load} />}
          {!loading && !error && items.length === 0 && (
            <EmptyState title="还没有记忆" description="去首页沉淀第一条知识吧" />
          )}
          {!loading &&
            !error &&
            items.map((it) => (
              <Link key={it.id} to={`/memory/${it.id}`} className="block transition hover:opacity-80">
                <ItemCard item={it} />
              </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
