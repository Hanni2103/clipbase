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
  insight: {
    found: boolean
    aTitle: string
    bTitle: string
    similarity: number
  }
}
