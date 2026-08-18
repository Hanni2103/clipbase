import { Sparkles } from 'lucide-react'

export default function InsightCard({
  insight,
}: {
  insight: { found: boolean; aTitle: string; bTitle: string; similarity: number }
}) {
  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-secondary/20 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles size={18} />
        <span className="text-sm font-medium">AI 洞察</span>
      </div>
      {insight.found ? (
        <>
          <h3 className="mt-4 text-xl font-semibold">发现新的知识连接</h3>
          <p className="mt-3 leading-relaxed text-white/60">
            你收藏的 <span className="text-white">{insight.aTitle || '（无标题）'}</span> 与{' '}
            <span className="text-white">{insight.bTitle || '（无标题）'}</span> 存在{' '}
            <span className="font-bold text-secondary">{insight.similarity}%</span> 关联。
          </p>
          <button className="mt-5 rounded-full bg-white/10 px-5 py-2 transition hover:bg-white/20">
            查看连接
          </button>
        </>
      ) : (
        <p className="mt-3 text-white/60">继续收藏，AI 会帮你发现知识之间的隐藏关联。</p>
      )}
    </div>
  )
}
