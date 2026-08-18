import type { ReactNode } from 'react'

type Tone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning'

const TONES: Record<Tone, string> = {
  neutral: 'bg-white/10 text-white/60',
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
}

export default function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}
