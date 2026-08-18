export default function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="text-5xl">🧠</div>
      <div className="mt-4 text-white/80">暂时无法同步记忆</div>
      <div className="mt-1 text-sm text-white/40">本地数据仍然安全</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-6 rounded-full bg-white/10 px-6 py-2 text-sm text-white/80">
          重新连接
        </button>
      )}
    </div>
  )
}
