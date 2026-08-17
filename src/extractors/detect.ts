import type { Platform } from '../types.js';

/** 根据链接域名识别平台（确定性路由，不是 AI 猜） */
export function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes('mp.weixin.qq.com')) return 'wechat';
  if (u.includes('douyin.com') || u.includes('iesdouyin.com')) return 'douyin';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) return 'xiaohongshu';
  if (u.includes('bilibili.com') || u.includes('b23.tv')) return 'bilibili';
  if (u.startsWith('http://') || u.startsWith('https://')) return 'web';
  return 'unknown';
}
