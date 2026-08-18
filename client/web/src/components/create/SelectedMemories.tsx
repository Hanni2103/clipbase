export default function SelectedMemories({ count }: { count: number }) {
  return (
    <div className="text-xs text-white/50">
      已选择 <span className="text-white">{count}</span> 条记忆
    </div>
  )
}
