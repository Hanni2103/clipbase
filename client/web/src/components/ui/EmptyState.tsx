import type { ReactNode } from 'react'

export default function EmptyState({
  icon = '🧠',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="text-5xl">{icon}</div>
      <div className="mt-4 text-white/80">{title}</div>
      <div className="mt-1 text-sm text-white/40">{description}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
