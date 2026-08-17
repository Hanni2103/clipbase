import type { ExtractedContent, IngestInput } from '../types.js';
import { detectPlatform } from './detect.js';
import { extractWeb } from './web.js';
import { extractWechat } from './wechat.js';
import { extractDouyin } from './douyin.js';
import { extractXiaohongshu } from './xiaohongshu.js';
import { extractBilibili } from './bilibili.js';
import { extractImage } from './image.js';

/**
 * 提取器入口：识别内容形态 → 路由到对应提取器 → 归一化成一段文本。
 * 支持：公众号 / 通用网页 / 纯文字 / 图片 OCR / 抖音 / 小红书 / B站。
 */
export async function runExtractor(input: IngestInput): Promise<ExtractedContent> {
  const url = input.url?.trim();
  let platform = url ? detectPlatform(url) : 'unknown';

  if (!url) {
    if (input.text && input.text.trim().length > 0) platform = 'text';
    else if (input.images && input.images.length > 0) platform = 'image';
  }

  switch (platform) {
    case 'text':
      return {
        title: input.title?.trim() || '',
        text: (input.text ?? '').trim(),
        sourcePlatform: 'text',
      };
    case 'image':
      return extractImage(input);
    case 'wechat':
      return extractWechat(input);
    case 'douyin':
      return extractDouyin(input);
    case 'xiaohongshu':
      return extractXiaohongshu(input);
    case 'bilibili':
      return extractBilibili(input);
    case 'web':
      return extractWeb(input, 'web');
    case 'unknown':
    default:
      throw new Error('无法识别分享内容的类型');
  }
}
