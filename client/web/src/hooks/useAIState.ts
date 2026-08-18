import { useState } from 'react'

export type AIState =
  | 'idle'
  | 'thinking'
  | 'reading'
  | 'understanding'
  | 'connecting'
  | 'recalling'
  | 'creating'
  | 'complete'
  | 'error'

/** 全局 AI 状态机：未来 BrainCore 根据 state 切换动效，此处提供统一状态源 */
export function useAIState() {
  const [state, setState] = useState<AIState>('idle')
  return { state, setState }
}
