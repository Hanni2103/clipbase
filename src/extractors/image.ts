import { config } from '../config.js';
import type { ExtractedContent, IngestInput } from '../types.js';

/** 图片 OCR（M3）：配置了多模态大模型则识别图中文字，否则返回 needs_review 提示 */
export async function extractImage(input: IngestInput): Promise<ExtractedContent> {
  if (!config.useVision) {
    return {
      title: input.title?.trim() || '',
      text: '',
      sourcePlatform: 'image',
      note: '未配置 VISION_MODEL，图片 OCR 不可用',
    };
  }

  const imageUrl = input.images?.[0] ?? '';
  if (!imageUrl) {
    return { title: input.title?.trim() || '', text: '', sourcePlatform: 'image', note: '未收到图片数据' };
  }

  const res = await fetch(`${config.llm.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
    body: JSON.stringify({
      model: config.vision.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '请识别这张图片中的文字，只输出识别到的文字内容，不要任何解释。' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`图片 OCR 失败：HTTP ${res.status}`);
  const data = (await res.json()) as any;
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
  return { title: input.title?.trim() || '', text, sourcePlatform: 'image' };
}
