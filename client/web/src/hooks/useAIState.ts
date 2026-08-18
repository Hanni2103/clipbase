import { createContext, createElement, useContext, useState, type ReactNode } from 'react'

export type AIState = 'idle' | 'thinking' | 'recalling' | 'creating'

interface AIStateValue {
  state: AIState
  setState: (s: AIState) => void
}

const AIStateContext = createContext<AIStateValue>({
  state: 'idle',
  setState: () => {},
})

/** 全局 AI 状态机：BrainCore 根据 state 切换动效，任何页面可驱动 */
export function AIStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIState>('idle')
  return createElement(AIStateContext.Provider, { value: { state, setState } }, children)
}

export function useAIState(): AIStateValue {
  return useContext(AIStateContext)
}
