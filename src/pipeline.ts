import { getItem, listItemsForSimilarity, setResult, setSimilarItems, setStatus, storeAtoms } from './db.js';
import { runExtractor } from './extractors/index.js';
import { classify } from './classifier/index.js';
import { findSimilar } from './similar.js';
import { halfLifeForCategory } from './halflife.js';
import { relateNewItem } from './services/relation.service.js';

/** 极简内存队列：ingest 立即返回，Worker 异步做「提取 + 分类」 */
const queue: string[] = [];
let running = 0;
const MAX_CONCURRENCY = 3;

export function enqueue(id: string): void {
  queue.push(id);
  drain();
}

function drain(): void {
  while (running < MAX_CONCURRENCY && queue.length > 0) {
    const id = queue.shift()!;
    running += 1;
    process(id)
      .catch(() => {})
      .finally(() => {
        running -= 1;
        drain();
      });
  }
}

async function process(id: string): Promise<void> {
  const item = getItem(id);
  if (!item) return;

  setStatus(id, 'processing');
  try {
    const extracted = await runExtractor({
      user_id: item.user_id,
      url: item.original_url ?? undefined,
      title: item.title ?? undefined,
      text: item.raw_text ?? undefined,
      images: item.images.length > 0 ? item.images : undefined,
    });

    const text = extracted.text.trim();
    if (text.length < 2) {
      setStatus(id, 'needs_review', extracted.note ?? '未能提取到有效内容');
      return;
    }

    const result = await classify(extracted.sourcePlatform, extracted.title, text);

    setResult(id, {
      title: extracted.title,
      extractedText: extracted.text,
      coverUrl: extracted.coverUrl,
      platform: extracted.sourcePlatform,
      category: result.category,
      tags: result.tags,
      summary: result.summary,
      confidence: result.confidence,
      intent: result.intent,
      halfLife: halfLifeForCategory(result.category),
    });

    storeAtoms(id, result.atoms);

    // 相似检测（照镜子）：与用户历史条目比对
    const candidates = listItemsForSimilarity(item.user_id).filter((x) => x.id !== id);
    const similar = findSimilar(
      candidates,
      { title: extracted.title, summary: result.summary, tags: result.tags },
    );
    setSimilarItems(id, similar);

    // 关系引擎（增量）：similar + topic 建边
    relateNewItem(item.user_id, id);

    if (result.confidence < 0.6) {
      setStatus(id, 'needs_review', '分类置信度较低，请确认');
    }
  } catch (e) {
    setStatus(id, 'failed', (e as Error).message);
  }
}
