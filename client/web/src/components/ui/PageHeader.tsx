export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      <h1 className="bg-gradient-to-r from-white to-primary bg-clip-text text-2xl font-bold text-transparent">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm text-white/50">{subtitle}</p>}
    </header>
  )
}
