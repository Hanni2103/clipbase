import { Router } from 'express';
import { archiveScene, assignItemToScene, autoArchiveExpiredScenes, categoryCounts, createItem, createScene, findByHash, getAtoms, getAtomsForItems, getItem, getPrefs, listItems, listItemsForSimilarity, listScenes, markRecalled, recordDedupAction, updateDigestState, updateIntent, updateManual, updatePrefs } from './db.js';
import { enqueue } from './pipeline.js';
import { detectPlatform } from './extractors/detect.js';
import { combinedSimilarity, hashContent, ngramSimilarity } from './similar.js';
import { recallScore } from './halflife.js';
import { composeDocument, COMPOSE_TYPES, type ComposeType } from './composer.js';
import type { Platform } from './types.js';

export const router = Router();

/** 从文本里提取 URL（Android 分享时 EXTRA_TEXT 通常是「标题 + 链接」混在一起） */
function extractUrlFromText(text: string): { url?: string; rest: string } {
  const m = text.match(/https?:\/\/[^\s]+/);
  if (!m) return { rest: text };
  const raw = m[0].replace(/[)\]}>，。,；;]+$/, '');
  return { url: raw, rest: text.replace(m[0], '').trim() };
}

/** 清理抖音/快手分享文案里的推广话术，保留真实文案（幂等，无话术则原样返回） */
function cleanShareText(text: string): string {
  return text
    .replace(/^[\d.]+\s*(?=复制打开)/, '')
    .replace(/复制打开抖音[，,]?看看?/g, '')
    .replace(/复制打开抖音/g, '')
    .replace(/【[^】]*】的作品/g, '')
    .replace(/复制此链接[^！!]*[！!]/g, '')
    .replace(/打开Dou音搜索[，,]?直接观看视频[！!]/g, '')
    .replace(/^[，,。\s]+/, '')
    .replace(/[，,。\s]+$/, '')
    .trim();
}

/** 条目是否命中静音主题（分类或任一标签被静音） */
function isMuted(item: { category: string | null; tags: string[] }, mutedTopics: string[]): boolean {
  if (mutedTopics.length === 0) return false;
  if (item.category && mutedTopics.includes(item.category)) return true;
  return item.tags.some((t) => mutedTopics.includes(t));
}

router.post('/ingest', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = String(body.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });

  let url = body.url ? String(body.url) : undefined;
  let title = body.title ? String(body.title) : undefined;
  const text = body.text ? cleanShareText(String(body.text)) : undefined;
  const images = Array.isArray(body.images) ? body.images.map(String) : undefined;

  // Android 场景：链接混在 text 里，自动拆出 url 和标题
  if (!url && text) {
    const parsed = extractUrlFromText(text);
    if (parsed.url) {
      url = parsed.url;
      if (!title && parsed.rest) title = parsed.rest;
    }
  }

  const platformHint = body.platform_hint ? String(body.platform_hint) : undefined;
  const platform: Platform = platformHint
    ? (platformHint as Platform)
    : url
      ? detectPlatform(url)
      : text
        ? 'text'
        : images && images.length > 0
          ? 'image'
          : 'unknown';

  if (platform === 'unknown') {
    return res.status(400).json({ error: '无法识别分享内容（需 url / text / images 之一）' });
  }

  // 内容哈希（精确去重）+ 同步查重
  const contentHash = hashContent(url, text);
  const exactMatches = findByHash(userId, contentHash).map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    similarity: 1,
    level: 'exact' as const,
  }));

  const item = createItem({ userId, url, title, text, images, contentHash, platform });
  enqueue(item.id);
  return res.status(202).json({
    item_id: item.id,
    status: 'pending',
    message: '已收到，正在分类',
    similar: exactMatches,
  });
});

router.get('/items', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const { items, total } = listItems(userId, {
    category: req.query.category ? String(req.query.category) : undefined,
    sceneId: req.query.scene_id ? String(req.query.scene_id) : undefined,
    tag: req.query.tag ? String(req.query.tag) : undefined,
    q: req.query.q ? String(req.query.q) : undefined,
    page: Number(req.query.page ?? 1),
    size: Number(req.query.size ?? 20),
  });
  const atomMap = getAtomsForItems(items.map((i) => i.id));
  return res.json({ items: items.map((i) => ({ ...i, atoms: atomMap[i.id] ?? [] })), total });
});

router.get('/items/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到' });
  return res.json({ ...item, atoms: getAtoms(item.id) });
});

router.patch('/items/:id', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  let item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到' });

  if (body.category !== undefined || body.tags !== undefined) {
    const patch: { category?: string; tags?: string[] } = {};
    if (body.category !== undefined) patch.category = String(body.category);
    if (Array.isArray(body.tags)) patch.tags = body.tags.map(String);
    item = updateManual(req.params.id, patch) ?? item;
  }
  if (body.intent !== undefined) {
    item = updateIntent(req.params.id, String(body.intent)) ?? item;
  }
  if (body.digest_state !== undefined) {
    item = updateDigestState(req.params.id, String(body.digest_state)) ?? item;
  }
  return res.json(item);
});

router.post('/items/:id/retry', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到' });
  enqueue(item.id);
  return res.json({ item_id: item.id, status: 'pending', message: '已重新入队' });
});

// ===== 场景 =====

router.get('/scenes/suggestions', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const threshold = Number(req.query.threshold ?? 5);
  const suggestions = categoryCounts(userId).filter((c) => c.count >= threshold);
  return res.json({ suggestions });
});

router.post('/scenes', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = String(body.user_id ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!userId || !name) return res.status(400).json({ error: '缺少 user_id 或 name' });
  const scene = createScene(
    userId,
    name,
    body.emoji ? String(body.emoji) : undefined,
    body.auto_expire_at ? String(body.auto_expire_at) : undefined,
  );
  return res.status(201).json(scene);
});

router.get('/scenes', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  autoArchiveExpiredScenes();
  return res.json({ scenes: listScenes(userId) });
});

router.post('/scenes/:id/archive', (req, res) => {
  const scene = archiveScene(req.params.id);
  if (!scene) return res.status(404).json({ error: '未找到' });
  return res.json(scene);
});

router.post('/items/:id/scene', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const sceneId = body.scene_id ? String(body.scene_id) : null;
  const item = assignItemToScene(req.params.id, sceneId);
  if (!item) return res.status(404).json({ error: '未找到' });
  return res.json(item);
});

// ===== 搜索（语义近似：n-gram 相似 + 关键词命中） =====
router.get('/search', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  const q = String(req.query.q ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  if (!q) return res.json({ results: [] });

  const items = listItemsForSimilarity(userId);
  const results = items
    .map((it) => {
      const titleSim = ngramSimilarity(q, it.title ?? '');
      const summarySim = ngramSimilarity(q, it.summary ?? '');
      const tagSim = ngramSimilarity(q, it.tags.join(' '));
      const keywordHit =
        (it.title ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (it.summary ?? '').toLowerCase().includes(q.toLowerCase()) ||
        it.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()));
      const score = Math.max(titleSim, summarySim, tagSim) + (keywordHit ? 0.3 : 0);
      return {
        id: it.id,
        title: it.title,
        category: it.category,
        summary: it.summary,
        score: Number(Math.min(1, score).toFixed(2)),
      };
    })
    .filter((r) => r.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return res.json({ results });
});

// ===== 主动唤醒（待回顾） =====
router.get('/recall', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const limit = Number(req.query.limit ?? 10);
  const muted = getPrefs(userId).muted_topics;
  const items = listItemsForSimilarity(userId)
    .filter((it) => it.status === 'completed' && (it.digest_state === 'unread' || it.digest_state === 'read') && !isMuted(it, muted))
    .map((it) => ({
      id: it.id,
      title: it.title,
      category: it.category,
      intent: it.intent,
      digest_state: it.digest_state,
      half_life: it.half_life,
      recall_score: Number(recallScore(it.created_at, it.half_life ?? 30).toFixed(3)),
      created_at: it.created_at,
    }))
    .sort((a, b) => b.recall_score - a.recall_score)
    .slice(0, limit);
  return res.json({ items });
});

// ===== 做减法（过期建议归档） =====
router.get('/expired', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const muted = getPrefs(userId).muted_topics;
  const items = listItemsForSimilarity(userId)
    .filter((it) => it.status === 'completed' && (it.digest_state === 'unread' || it.digest_state === 'read') && !isMuted(it, muted))
    .map((it) => ({ ...it, _recall: recallScore(it.created_at, it.half_life ?? 30) }))
    .filter((it) => it._recall < 0.25)
    .sort((a, b) => a._recall - b._recall)
    .map(({ _recall, ...rest }) => ({ ...rest, recall_score: Number(_recall.toFixed(3)) }));
  return res.json({ items });
});

// ===== 用户偏好 =====
router.get('/prefs', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  return res.json(getPrefs(userId));
});

router.patch('/prefs', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = String(body.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const patch: { muted_topics?: string[]; remind_frequency?: string; timezone?: string } = {};
  if (Array.isArray(body.muted_topics)) patch.muted_topics = body.muted_topics.map(String);
  if (body.remind_frequency !== undefined) patch.remind_frequency = String(body.remind_frequency);
  if (body.timezone !== undefined) patch.timezone = String(body.timezone);
  return res.json(updatePrefs(userId, patch));
});

// ===== 照镜子动作（review / create_scene / keep / mute）=====
router.post('/items/:id/similar-action', (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到' });
  const action = String(body.action ?? '');
  if (!['review', 'create_scene', 'keep', 'mute'].includes(action)) {
    return res.status(400).json({ error: 'action 必须是 review/create_scene/keep/mute' });
  }
  const similarItemId = body.similar_item_id ? String(body.similar_item_id) : undefined;
  const similarity = body.similarity !== undefined ? Number(body.similarity) : undefined;
  recordDedupAction(item.user_id, item.id, action, similarItemId, similarity);

  // mute：把该条目的分类加入静音主题
  if (action === 'mute' && item.category) {
    const prefs = getPrefs(item.user_id);
    if (!prefs.muted_topics.includes(item.category)) {
      updatePrefs(item.user_id, { muted_topics: [...prefs.muted_topics, item.category] });
    }
  }
  return res.json({ ok: true, action });
});

// ===== 记录召回时间 =====
router.post('/items/:id/recall', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到' });
  markRecalled(item.id);
  return res.json({ ok: true });
});

// ===== 一键成文 + 周报（创造层） =====
router.post('/compose', async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = String(body.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const sceneId = body.scene_id ? String(body.scene_id) : undefined;
  const category = body.category ? String(body.category) : undefined;
  const topic = body.topic ? String(body.topic) : undefined;
  const typeRaw = body.type ? String(body.type) : 'article';
  const validTypes: ComposeType[] = ['article', 'copywriting', 'xiaohongshu', 'video_script', 'weekly', 'business', 'mindmap'];
  const type: ComposeType = validTypes.includes(typeRaw as ComposeType) ? (typeRaw as ComposeType) : 'article';

  let items = listItemsForSimilarity(userId).filter((it) => it.status === 'completed');
  if (sceneId) items = items.filter((it) => it.scene_id === sceneId);
  if (category) items = items.filter((it) => it.category === category);
  if (items.length === 0) return res.status(400).json({ error: '没有可整理的内容' });

  const atomsMap = getAtomsForItems(items.map((i) => i.id));
  const composeItems = items.map((it) => ({
    title: it.title,
    category: it.category,
    summary: it.summary,
    tags: it.tags,
    atoms: atomsMap[it.id] ?? [],
  }));

  try {
    const content = await composeDocument(composeItems, type, topic);
    return res.json({ title: topic || '我的知识整理', type, content });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ===== 创作类型列表 =====
router.get('/compose-types', (_req, res) => {
  return res.json({ types: COMPOSE_TYPES });
});

router.get('/weekly', async (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const since = Date.now() - 7 * 86400000;
  const items = listItemsForSimilarity(userId).filter(
    (it) => it.status === 'completed' && new Date(it.created_at).getTime() >= since,
  );
  if (items.length === 0) return res.json({ content: '这一周还没有收藏内容' });

  const atomsMap = getAtomsForItems(items.map((i) => i.id));
  const composeItems = items.map((it) => ({
    title: it.title,
    category: it.category,
    summary: it.summary,
    tags: it.tags,
    atoms: atomsMap[it.id] ?? [],
  }));

  try {
    const content = await composeDocument(composeItems, 'weekly');
    return res.json({ content });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ===== 首页仪表盘 =====
router.get('/dashboard', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const muted = getPrefs(userId).muted_topics;
  const items = listItemsForSimilarity(userId).filter((it) => it.status === 'completed' && !isMuted(it, muted));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const withRecall = items.map((it) => ({ ...it, _recall: recallScore(it.created_at, it.half_life ?? 30) }));

  const review = withRecall.filter((it) => (it.digest_state === 'unread' || it.digest_state === 'read') && it._recall >= 0.25);
  const expired = withRecall.filter((it) => it._recall < 0.25);
  const active = withRecall.filter((it) => it.digest_state === 'digested' || it.digest_state === 'internalized');
  const expiringSoon = withRecall.filter((it) => it._recall >= 0.25 && it._recall < 0.5).length;
  const todayReview = items.filter((it) => it.last_recalled_at && new Date(it.last_recalled_at).getTime() >= todayStart.getTime()).length;
  const todayIngested = items.filter((it) => new Date(it.created_at).getTime() >= todayStart.getTime()).length;
  const brainHealth = items.length > 0 ? Math.min(100, Math.round((100 * (active.length + review.length)) / items.length)) : 0;

  const awakening = review
    .sort((a, b) => b._recall - a._recall)
    .slice(0, 7)
    .map((it) => ({
      id: it.id,
      title: it.title,
      category: it.category,
      summary: it.summary,
      source_platform: it.source_platform,
      intent: it.intent,
      recall_score: Number(it._recall.toFixed(3)),
    }));

  const recent = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((it) => ({
      id: it.id,
      title: it.title,
      category: it.category,
      source_platform: it.source_platform,
      summary: it.summary,
    }));

  return res.json({
    total: items.length,
    today_review: todayReview,
    today_ingested: todayIngested,
    today_awaken: awakening.length,
    expiring_soon: expiringSoon,
    brain_health: brainHealth,
    lifecycle: { active: active.length, review: review.length, expired: expired.length },
    awakening,
    recent,
  });
});

// ===== AI 洞察（知识连接建议） =====
router.get('/insight', (req, res) => {
  const userId = String(req.query.user_id ?? '').trim();
  if (!userId) return res.status(400).json({ error: '缺少 user_id' });
  const items = listItemsForSimilarity(userId).filter((it) => it.status === 'completed');
  if (items.length < 2) return res.json({ found: false });

  let best: { a: (typeof items)[number]; b: (typeof items)[number]; similarity: number } | null = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = combinedSimilarity(
        { title: items[i].title ?? '', summary: items[i].summary ?? '', tags: items[i].tags },
        { title: items[j].title ?? '', summary: items[j].summary ?? '', tags: items[j].tags },
      );
      if (!best || sim > best.similarity) best = { a: items[i], b: items[j], similarity: sim };
    }
  }
  if (!best || best.similarity < 0.5) return res.json({ found: false });

  return res.json({
    found: true,
    item_a: { id: best.a.id, title: best.a.title, category: best.a.category },
    item_b: { id: best.b.id, title: best.b.title, category: best.b.category },
    similarity: Math.round(best.similarity * 100),
  });
});
