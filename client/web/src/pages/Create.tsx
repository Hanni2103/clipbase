import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchComposeTypes } from '../api/create'
import type { ComposeType } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonList } from '../components/ui/Skeleton'

const FALLBACK: ComposeType[] = [
  { key: 'article', label: '深度文章', emoji: '📄' },
  { key: 'copywriting', label: '文案写作', emoji: '✍️' },
  { key: 'xiaohongshu', label: '小红书笔记', emoji: '📕' },
  { key: 'video_script', label: '视频脚本', emoji: '🎬' },
  { key: 'weekly', label: '周报总结', emoji: '📊' },
  { key: 'business', label: '商业分析', emoji: '📈' },
  { key: 'mindmap', label: '思维导图', emoji: '🧠' },
]

export default function Create() {
  const [types, setTypes] = useState<ComposeType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  useEffect(() => {
    fetchComposeTypes()
      .then((t) => setTypes(t.length ? t : FALLBACK))
      .catch(() => setTypes(FALLBACK))
      .finally(() => setLoadingTypes(false))
  }, [])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-28 pt-10">
        <PageHeader title="创作工作室" subtitle="先选记忆，再让 AI 基于它们创作优质内容" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          {loadingTypes && <SkeletonList count={4} className="h-24" />}
          {!loadingTypes &&
            types.map((t) => (
              <Link
                key={t.key}
                to={`/create/${t.key}`}
                className="glass rounded-2xl p-5 shadow-glow-card transition hover:-translate-y-0.5 hover:shadow-glow-primary"
              >
                <div className="text-3xl">{t.emoji}</div>
                <div className="mt-3 text-sm font-medium text-white">{t.label}</div>
              </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
