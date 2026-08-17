import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { ExtractedContent, IngestInput, Platform } from '../types.js';
import { fetchHtml } from './fetch.js';

/** 从网页 meta 标签抽取标题/描述/封面（抖音、小红书、B站通用） */
export function metaFields($: CheerioAPI, fallbackTitle = ''): { title: string; desc: string; cover?: string } {
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    fallbackTitle;
  const desc =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';
  const cover = $('meta[property="og:image"]').attr('content') || undefined;
  return { title, desc, cover };
}

/** 锁定平台通用提取：拉取 → 解析 meta → 拼接文本（M2 兜底实现，后续可专项增强） */
export async function extractMetaPage(input: IngestInput, platform: Platform): Promise<ExtractedContent> {
  const { html } = await fetchHtml(input.url!);
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
    sourcePlatform: platform,
  };
}
