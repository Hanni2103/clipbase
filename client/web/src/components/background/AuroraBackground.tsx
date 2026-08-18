export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-[100px] -top-[200px] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -bottom-[150px] -right-[100px] h-[400px] w-[400px] rounded-full bg-secondary/20 blur-[100px]" />
    </div>
  )
}
