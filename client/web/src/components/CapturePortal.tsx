export default function CapturePortal() {
  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="text-lg font-semibold">📥 Capture Knowledge</div>
      <p className="mt-2 text-sm text-white/50">网页、公众号、视频、图片，交给 AI 自动理解</p>
      <div className="mt-5 flex h-14 items-center rounded-2xl border border-white/10 bg-black/20 px-5 text-white/40">
        粘贴链接或文字...
      </div>
      <button className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-secondary font-semibold">
        开始沉淀
      </button>
    </div>
  )
}
