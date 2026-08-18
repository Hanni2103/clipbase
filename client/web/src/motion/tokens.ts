// 统一动效 token：calm intelligence，不做游戏感动画
export const motionTokens = {
  duration: {
    fast: 0.2,
    base: 0.3,
    slow: 0.5,
  },
  easing: [0.16, 1, 0.3, 1] as const,
  fadeUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
}
