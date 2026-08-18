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
  insight: Insight
}

export interface Insight {
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
}

export interface RecallItem {
  id: string
  title: string | null
  category: string | null
  intent: string | null
  recallScore: number
  halfLife: number | null
  createdAt: string
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
