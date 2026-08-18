import { NavLink } from 'react-router-dom'

const NAV = [
  { key: 'brain', label: '大脑', icon: '🧠', to: '/' },
  { key: 'memory', label: '记忆', icon: '📚', to: '/memory' },
  { key: 'recall', label: '回顾', icon: '🔮', to: '/recall' },
  { key: 'create', label: '创造', icon: '✨', to: '/create' },
  { key: 'me', label: '我的', icon: '👤', to: '/me' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-white/10 bg-[#050816]/90 backdrop-blur-xl">
      {NAV.map((it) => (
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
          <span className="text-lg">{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
