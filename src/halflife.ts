/** 按分类预设半衰期（天）：资讯快衰减，方法长效 */
export function halfLifeForCategory(category: string | null): number {
  switch (category) {
    case '新闻资讯':
      return 3;
    case '财经商业':
    case '搞笑娱乐':
      return 7;
    case '美食':
    case '科技':
    case '学习成长':
    case '职场':
    case '生活方式':
    case '健康':
      return 60;
    default:
      return 30;
  }
}

/** 距现在多少天（可为小数） */
export function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

/** 召回得分：随天数指数衰减（0.5 的 days/half_life 次方） */
export function recallScore(createdAt: string, halfLife: number): number {
  return Math.pow(0.5, daysSince(createdAt) / halfLife);
}
