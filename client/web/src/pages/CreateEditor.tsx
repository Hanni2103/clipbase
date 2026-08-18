import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { compose, fetchComposeTypes } from '../api/create'
import type { ComposeType } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import MemorySelector from '../components/create/MemorySelector'
import SelectedMemories from '../components/create/SelectedMemories'

export default function CreateEditor() {
  const { type } = useParams()
  const [typeLabel, setTypeLabel] = useState(type || '')
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchComposeTypes()
      .then((types: ComposeType[]) => {
        const found = types.find((t) => t.key === type)
        if (found) setTypeLabel(`${found.emoji} ${found.label}`)
      })
      .catch(() => {})
  }, [type])

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function run() {
    setCreating(true)
    setResult('⏳ 正在创作，请稍候...')
    try {
      setResult(await compose(type!))
    } catch {
      setResult('创作失败，请重试')
    }
    setCreating(false)
  }

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <Link to="/create" className="text-sm text-white/50">
          ← 返回创造
        </Link>
        <div className="mt-4">
          <PageHeader title={typeLabel} subtitle="先选择要用的记忆，再让 AI 基于它们创作" />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <SelectedMemories count={selected.length} />
        </div>

        <div className="mt-3">
          <MemorySelector selected={selected} onToggle={toggle} />
        </div>

        <button
          onClick={run}
          disabled={creating}
          className="mt-5 w-full rounded-xl bg-primary/80 px-4 py-3.5 text-white transition hover:bg-primary disabled:opacity-50"
        >
          {creating ? '创作中...' : '开始创作'}
        </button>

        <p className="mt-3 text-xs text-white/40">
          ⚠️ 当前后端 /compose 暂未支持 item_ids 过滤，选择仅用于记录来源记忆，生成内容仍基于全部知识库。
        </p>

        {result && (
          <GlassCard className="mt-4 whitespace-pre-wrap p-4 text-sm leading-relaxed text-white/80">
            {result}
          </GlassCard>
        )}
      </main>
    </div>
  )
}
