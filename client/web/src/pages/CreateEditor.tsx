import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Eye, FileText, Sparkles } from 'lucide-react'
import { compose, fetchComposeContext, fetchComposeTypes } from '../api/create'
import { fetchItems } from '../api/memory'
import { useAIState } from '../hooks/useAIState'
import type { ComposeContext, ComposeResult, ComposeType, Item } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import MemorySelector from '../components/create/MemorySelector'
import SelectedMemories from '../components/create/SelectedMemories'

const STEPS = ['选择记忆', '上下文预览', 'AI 创作']

export default function CreateEditor() {
  const { type } = useParams()
  const { setState } = useAIState()
  const [typeLabel, setTypeLabel] = useState(type || '')
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [context, setContext] = useState<ComposeContext | null>(null)
  const [result, setResult] = useState<ComposeResult | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchComposeTypes()
      .then((types: ComposeType[]) => {
        const found = types.find((t) => t.key === type)
        if (found) setTypeLabel(`${found.emoji} ${found.label}`)
      })
      .catch(() => {})
    fetchItems()
      .then(setItems)
      .catch(() => setItems([]))
  }, [type])

  const selectedItems = items.filter((it) => selected.includes(it.id))
  const titleOf = (id: string) => selectedItems.find((it) => it.id === id)?.title || items.find((it) => it.id === id)?.title || '(无标题)'

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function preview() {
    setPreviewing(true)
    setError(null)
    try {
      setContext(await fetchComposeContext(type!, selected))
    } catch {
      setError('上下文预览失败，请重试')
    } finally {
      setPreviewing(false)
    }
  }

  async function run() {
    setCreating(true)
    setState('creating')
    setError(null)
    setResult(null)
    try {
      setResult(await compose(type!, selected))
    } catch {
      setError('创作失败，请重试')
    } finally {
      setCreating(false)
      setState('idle')
    }
  }

  const atomCount = context?.selectedAtoms.reduce((n, s) => n + s.atoms.length, 0) ?? 0

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/create" className="text-sm text-white/50">
          ← 返回创造
        </Link>
        <div className="mt-4">
          <PageHeader title={typeLabel} subtitle="先选记忆，再让 AI 基于它们创作" />
        </div>

        {/* 步骤 */}
        <div className="mt-5 flex items-center gap-2 text-xs text-white/50">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={i === 1 ? 'text-secondary' : ''}>
                {i + 1}. {s}
              </span>
              {i < STEPS.length - 1 && <span className="text-white/20">→</span>}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <SelectedMemories items={selectedItems} onRemove={toggle} />
        </div>

        <div className="mt-3">
          <MemorySelector items={items} selected={selected} onToggle={toggle} />
        </div>

        {error && <p className="mt-3 text-xs text-warning">{error}</p>}

        {/* 上下文预览 */}
        <button
          onClick={preview}
          disabled={previewing}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <Eye size={16} />
          {previewing ? '分析中...' : '预览 AI 上下文'}
        </button>

        {context && (
          <GlassCard variant="secondary" className="mt-3 p-4">
            <div className="flex items-center gap-2 text-secondary">
              <FileText size={15} />
              <span className="text-sm font-medium">AI Context</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-white/60">
              <div>
                <div className="text-lg font-semibold text-white">{context.memoryIds.length}</div>
                Memories
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{atomCount}</div>
                Atoms
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{context.tokenEstimate}</div>
                Tokens
              </div>
            </div>
            {context.truncated && <p className="mt-2 text-xs text-warning">⚠️ 已按 Context Score 截断超预算的记忆</p>}
            <div className="mt-3 space-y-1">
              {context.selectedAtoms.map((s) => (
                <div key={s.memoryId} className="flex items-center justify-between text-xs text-white/50">
                  <span className="truncate">{s.title}</span>
                  <span className="shrink-0 text-secondary">score {s.contextScore}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <button
          onClick={run}
          disabled={creating}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/80 px-4 py-3.5 text-white transition hover:bg-primary disabled:opacity-50"
        >
          <Sparkles size={16} />
          {creating ? '创作中...' : selected.length ? `基于 ${selected.length} 条记忆创作` : '直接创作（全库）'}
        </button>

        {/* 创作结果 + 溯源 */}
        {result && (
          <div className="mt-4 space-y-3">
            <GlassCard variant="ai" className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-white/80">
              {result.content}
            </GlassCard>

            {result.usedMemoryIds.length > 0 && (
              <GlassCard className="p-4">
                <div className="text-xs font-medium text-white/50">本次创作依据</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.usedMemoryIds.map((id) => (
                    <Link
                      key={id}
                      to={`/memory/${id}`}
                      className="rounded-full bg-surface-ai px-3 py-1 text-xs text-white/80 transition hover:bg-primary/20"
                    >
                      {titleOf(id)}
                    </Link>
                  ))}
                </div>
                {result.citedAtoms.length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="text-xs font-medium text-white/50">引用原子（{result.citedAtoms.length}）</div>
                    <ul className="mt-2 space-y-1 text-xs text-white/60">
                      {result.citedAtoms.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 text-secondary/70">{i + 1}</span>
                          <span>{c.content}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.tokenEstimate > 0 && (
                  <div className="mt-2 text-xs text-white/40">上下文 {result.tokenEstimate} tokens</div>
                )}
              </GlassCard>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
