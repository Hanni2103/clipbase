const NAV = [
  { key: 'brain', label: 'Brain', icon: '🧠' },
  { key: 'memory', label: 'Memory', icon: '📚' },
  { key: 'recall', label: 'Recall', icon: '🔮' },
  { key: 'create', label: 'Create', icon: '✨' },
  { key: 'me', label: 'Me', icon: '👤' },
]

export default function BottomNav({ active = 'brain' }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-white/10 bg-[#050816]/90 backdrop-blur-xl">
      {NAV.map((it) => (
        <button
          key={it.key}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
            it.key === active ? 'text-primary' : 'text-white/50'
          }`}
        >
          <span className="text-lg">{it.icon}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  )
}
