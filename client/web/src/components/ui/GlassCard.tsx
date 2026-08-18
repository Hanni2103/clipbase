import type { ReactNode } from 'react'

type SurfaceVariant = 'glass' | 'primary' | 'secondary' | 'ai' | 'memory'

const VARIANTS: Record<SurfaceVariant, string> = {
  glass: 'bg-white/5',
  primary: 'bg-surface-primary',
  secondary: 'bg-surface-secondary',
  ai: 'bg-surface-ai',
  memory: 'bg-surface-memory',
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  variant = 'glass',
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: SurfaceVariant
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/10 backdrop-blur-xl ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </div>
  )
}
