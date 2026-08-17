import * as cheerio from 'cheerio';
import type { ExtractedContent, IngestInput } from '../types.js';
import { fetchHtml } from './fetch.js';
import { metaFields } from './meta.js';

/**
 * 抖音：短链跳转后读网页 title + 文案。
 * 抖音对非浏览器请求会返回反爬 JS 挑战页（`_$jsvmprt` 混淆 VM），
 * 纯 HTTP 抓取拿不到正文；此时若有分享文案则用文案兜底，否则提示用户补充。
 */
export async function extractDouyin(input: IngestInput): Promise<ExtractedContent> {
  const { html } = await fetchHtml(input.url!);

  if (html.includes('_$jsvmprt')) {
    const text = input.text?.trim() ?? '';
    return {
      title: input.title?.trim() || input.url!,
      text,
      sourcePlatform: 'douyin',
      note: text
        ? undefined
        : '抖音页面需 JS 渲染（反爬），仅链接无法提取正文，请附带分享文案或截图',
    };
  }

  const $ = cheerio.load(html);
  const { title, desc, cover } = metaFields($, input.title ?? '');
  $('script,style,noscript,nav,header,footer').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  const text = [title, desc, input.text ?? '', bodyText]
    .filter((s) => s && s.trim().length > 0)
    .join('\n')
    .slice(0, 2000);

  return {
    title: title || input.url!,
    text,
    coverUrl: cover,
    sourcePlatform: 'douyin',
  };
}
