import type { ExtractedContent, IngestInput } from '../types.js';
import { extractMetaPage } from './meta.js';

/** 小红书：短链跳转后读网页 title + 描述（不登录时只能拿到标题/摘要级） */
export async function extractXiaohongshu(input: IngestInput): Promise<ExtractedContent> {
  return extractMetaPage(input, 'xiaohongshu');
}
