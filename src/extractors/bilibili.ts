import type { ExtractedContent, IngestInput } from '../types.js';
import { extractMetaPage } from './meta.js';

/** B站：短链跳转后读网页 title + 简介 */
export async function extractBilibili(input: IngestInput): Promise<ExtractedContent> {
  return extractMetaPage(input, 'bilibili');
}
