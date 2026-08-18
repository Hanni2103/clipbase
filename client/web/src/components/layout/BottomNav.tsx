import { NavLink } from 'react-router-dom'
import { Brain, Library, Sparkles, RefreshCw, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV: { key: string; label: string; icon: LucideIcon; to: string }[] = [
  { key: 'brain', label: '大脑', icon: Brain, to: '/' },
  { key: 'memory', label: '记忆', icon: Library, to: '/memory' },
  { key: 'recall', label: '回顾', icon: RefreshCw, to: '/recall' },
  { key: 'create', label: '创造', icon: Sparkles, to: '/create' },
  { key: 'me', label: '我的', icon: User, to: '/me' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-white/10 bg-[#050816]/90 backdrop-blur-xl">
      {NAV.map((it) => {
        const Icon = it.icon
        return (
          <NavLink
            key={it.key}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
                isActive ? 'text-primary' : 'text-white/50'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{it.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
