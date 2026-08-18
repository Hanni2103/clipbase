export interface BrainState {
  health: number
  total: number
  todayIngested: number
  todayAwaken: number
  expiringSoon: number
  todayReview: number
  active: number
  fading: number
  sleeping: number
  insight: ConnectionInsight
}

/** 首页单条「知识连接」洞察（旧 /api/insight） */
export interface ConnectionInsight {
  found: boolean
  aTitle: string
  bTitle: string
  aId: string
  bId: string
  similarity: number
}

export interface Atom {
  type: string
  content: string
}

export interface SimilarItem {
  id: string
  title: string | null
  level: string
}

export interface Item {
  id: string
  title: string | null
  category: string | null
  tags: string[]
  summary: string | null
  atoms: Atom[]
  similarItems: SimilarItem[]
  sourcePlatform: string
  intent: string | null
  digestState: string
  halfLife: number | null
  createdAt: string
  memoryStrength: number | null
  reviewCount: number
  nextReviewAt: string | null
  lastRecalledAt: string | null
}

export interface RecallItem {
  id: string
  title: string | null
  category: string | null
  intent: string | null
  recallScore: number
  halfLife: number | null
  createdAt: string
  memoryStrength: number | null
  triggerReason: string
}

export interface ExpiredItem {
  id: string
  title: string | null
  category: string | null
  summary: string | null
  recallScore: number
}

export interface Prefs {
  mutedTopics: string[]
  remindFrequency: string
  timezone: string
}

export interface ComposeType {
  key: string
  label: string
  emoji: string
}

// ===== Phase 7 智能层类型（对应 Phase 6 后端 contract，camelCase） =====

export interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: string
  score: number
  confidence: number
  source: string
  evidence: Record<string, unknown>
}

export interface GraphNode {
  id: string
  title: string
  category: string | null
  strength: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: string
  score: number
  confidence: number
  sourceType: string
  evidence: Record<string, unknown>
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Insight {
  id: string
  type: string
  title: string
  body: string
  relatedIds: string[]
  confidence: number
  impactScore: string
  status: string
}

export interface RecallEvent {
  id: string
  memoryId: string
  triggeredBy: string
  triggerReason: string
  recallScore: number
  feedback: string | null
  createdAt: string
}

export interface ComposeAtom {
  memoryId: string
  atomType: string
  content: string
}

export interface ComposeContext {
  memoryIds: string[]
  selectedAtoms: { memoryId: string; title: string; contextScore: number; atoms: Atom[] }[]
  tokenEstimate: number
  truncated: boolean
}

export interface ComposeResult {
  title: string
  type: string
  content: string
  usedMemoryIds: string[]
  citedAtoms: ComposeAtom[]
  tokenEstimate: number
}
