import * as cheerio from 'cheerio';
import type { ExtractedContent, IngestInput, Platform } from '../types.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 通用网页提取器：拉取 HTML，抽取标题 + 描述 + 正文文本 */
export async function extractWeb(input: IngestInput, platform: Platform): Promise<ExtractedContent> {
  const url = input.url!;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`网页请求失败：HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    input.title?.trim() ||
    '';

  const desc =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';

  const coverUrl = $('meta[property="og:image"]').attr('content') || undefined;

  $('script,style,noscript,nav,header,footer,aside,form,button').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  const text = [title, desc, input.text ?? '', bodyText]
    .filter((s) => s && s.trim().length > 0)
    .join('\n')
    .slice(0, 2000);

  return {
    title: title || url,
    text,
    coverUrl,
    sourcePlatform: platform,
  };
}
