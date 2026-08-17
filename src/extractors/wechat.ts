import * as cheerio from 'cheerio';
import type { ExtractedContent, IngestInput } from '../types.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 公众号文章提取器：正文在 #js_content 里，标题在 #activity-name */
export async function extractWechat(input: IngestInput): Promise<ExtractedContent> {
  const url = input.url!;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`公众号请求失败：HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $('#activity-name').text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    input.title?.trim() ||
    '';

  const author = $('#js_name').text().trim();

  const content =
    $('#js_content').text().replace(/\s+/g, ' ').trim() ||
    $('.rich_media_content').text().replace(/\s+/g, ' ').trim() ||
    $('body').text().replace(/\s+/g, ' ').trim();

  const coverUrl = $('meta[property="og:image"]').attr('content') || undefined;

  const text = [title, author ? `作者：${author}` : '', input.text ?? '', content]
    .filter((s) => s && s.trim().length > 0)
    .join('\n')
    .slice(0, 2000);

  return {
    title: title || url,
    text,
    coverUrl,
    sourcePlatform: 'wechat',
  };
}
