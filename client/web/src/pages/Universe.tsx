import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Link2, Orbit } from 'lucide-react'
import { fetchGraph } from '../api/relations'
import type { Graph, GraphEdge, GraphNode } from '../types/brain'
import AuroraBackground from '../components/background/AuroraBackground'
import PageHeader from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'

const RELATION_LABELS: Record<string, string> = { similar: '内容相似', topic: '同主题' }

type NodePos = GraphNode & { x: number; y: number }

function strengthColor(s: number): string {
  if (s >= 0.6) return '#8B5CF6'
  if (s >= 0.25) return '#F59E0B'
  return '#475569'
}

export default function Universe() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hoverNode, setHoverNode] = useState<NodePos | null>(null)
  const [hoverEdge, setHoverEdge] = useState<GraphEdge | null>(null)

  function load() {
    setLoading(true)
    setError(false)
    fetchGraph()
      .then(setGraph)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const layout = useMemo<NodePos[]>(() => {
    if (!graph) return []
    const n = graph.nodes.length
    if (n === 0) return []
    const cx = 260
    const cy = 220
    const r = n === 1 ? 0 : Math.min(150, 60 + n * 11)
    return graph.nodes.map((node, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
      return { ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
  }, [graph])

  const posById = useMemo(() => {
    const m = new Map<string, NodePos>()
    layout.forEach((l) => m.set(l.id, l))
    return m
  }, [layout])

  const realEdges = useMemo(
    () => (graph ? graph.edges.filter((e) => e.sourceType && Object.keys(e.evidence).length > 0) : []),
    [graph],
  )

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <main className="relative mx-auto max-w-md px-6 pb-16 pt-8">
        <button onClick={() => navigate(-1)} className="text-sm text-white/50">
          ← 返回
        </button>
        <div className="mt-4">
          <PageHeader title="记忆宇宙" subtitle="每一条线都是 AI 真实发现的知识关系" />
        </div>

        {loading && <Skeleton className="mt-6 h-80" />}
        {!loading && error && <ErrorState onRetry={load} />}
        {!loading && !error && realEdges.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<Orbit className="mx-auto mb-3 text-primary" size={40} strokeWidth={1.5} />}
              title="你的记忆宇宙还没形成连接"
              description="继续沉淀一些内容，AI 会开始发现它们之间的关系。"
            />
          </div>
        )}
        {!loading && !error && graph && realEdges.length > 0 && (
          <>
            <motion.svg viewBox="0 0 520 440" className="mt-2 w-full">
              {/* 装饰轨道环（慢速旋转，尊重 reduced-motion） */}
              <motion.g
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                style={{ originX: '260px', originY: '220px' }}
              >
                <circle cx="260" cy="220" r="196" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" strokeDasharray="2 7" />
                <circle cx="260" cy="220" r="206" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="1" strokeDasharray="1 9" />
              </motion.g>

              {/* 关系线 */}
              {realEdges.map((e) => {
                const a = posById.get(e.source)
                const b = posById.get(e.target)
                if (!a || !b) return null
                const active = hoverEdge?.id === e.id || hoverNode?.id === e.source || hoverNode?.id === e.target
                return (
                  <line
                    key={e.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={active ? '#8B5CF6' : 'rgba(139,92,246,0.28)'}
                    strokeWidth={active ? 2 : 1}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoverEdge(e)}
                    onMouseLeave={() => setHoverEdge(null)}
                  />
                )
              })}

              {/* 节点 */}
              {layout.map((n) => (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverNode(n)}
                  onMouseLeave={() => setHoverNode(null)}
                  onClick={() => navigate(`/memory/${n.id}`)}
                >
                  <circle cx={n.x} cy={n.y} r={16 + n.strength * 10} fill={strengthColor(n.strength)} opacity={0.18} />
                  <circle cx={n.x} cy={n.y} r={7 + n.strength * 5} fill={strengthColor(n.strength)} />
                  <circle cx={n.x} cy={n.y} r={7 + n.strength * 5} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
                  <text x={n.x} y={n.y + 26 + n.strength * 5} textAnchor="middle" className="fill-white/60 text-[10px]">
                    {(n.title || '(无标题)').slice(0, 8)}
                  </text>
                </g>
              ))}
            </motion.svg>

            {/* 悬浮信息面板 */}
            <div className="mt-4 min-h-[72px] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              {hoverNode ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{hoverNode.title || '(无标题)'}</span>
                    <span className="text-xs text-white/50">强度 {Math.round(hoverNode.strength * 100)}%</span>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {hoverNode.category && <span className="text-secondary">{hoverNode.category}</span>}
                    <span className="ml-2">点击查看详情</span>
                  </div>
                </div>
              ) : hoverEdge ? (
                <div>
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Link2 size={14} className="text-primary" />
                    {RELATION_LABELS[hoverEdge.type] || hoverEdge.type}
                    <span className="text-xs text-white/50">置信度 {Math.round(hoverEdge.confidence * 100)}%</span>
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    来源：{hoverEdge.sourceType}
                    {Object.entries(hoverEdge.evidence).map(([k, v]) => (
                      <span key={k} className="ml-2">
                        {k}: {JSON.stringify(v)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-white/40">悬停节点查看记忆 · 悬停连线查看关系证据</div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
