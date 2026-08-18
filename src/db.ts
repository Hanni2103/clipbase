import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { recallScore } from './halflife.js';
import type { Atom, Insight, Item, ItemStatus, Platform, RecallEvent, Relation, Scene, SimilarItem, UserPrefs } from './types.js';

let db: DatabaseSync;

export function initDb(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_platform TEXT NOT NULL,
      original_url TEXT,
      title TEXT,
      raw_text TEXT,
      images TEXT NOT NULL DEFAULT '[]',
      extracted_text TEXT,
      category TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      summary TEXT,
      confidence REAL,
      scene_id TEXT,
      content_hash TEXT,
      similar_items TEXT NOT NULL DEFAULT '[]',
      intent TEXT,
      half_life INTEGER,
      digest_state TEXT NOT NULL DEFAULT 'unread',
      last_recalled_at TEXT,
      cover_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_msg TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(user_id, category);

    CREATE TABLE IF NOT EXISTS atoms (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_atoms_item ON atoms(item_id, sort);

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      emoji TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      auto_expire_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scenes_user ON scenes(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS user_prefs (
      user_id TEXT PRIMARY KEY,
      muted_topics TEXT NOT NULL DEFAULT '[]',
      remind_frequency TEXT NOT NULL DEFAULT 'low',
      timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai'
    );

    CREATE TABLE IF NOT EXISTS dedup_actions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      similar_item_id TEXT,
      similarity REAL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dedup_user ON dedup_actions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      left_memory_id TEXT NOT NULL,
      right_memory_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('similar','topic','support','contradict','derived')),
      score REAL NOT NULL,
      confidence REAL NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('embedding','keyword','tag','llm')),
      evidence TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_relations_user ON relations(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_relations_left ON relations(left_memory_id);
    CREATE INDEX IF NOT EXISTS idx_relations_right ON relations(right_memory_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_relation_pair ON relations(user_id, left_memory_id, right_memory_id, type);

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('pattern','connection','trend','opportunity')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      related_ids TEXT NOT NULL,
      confidence REAL NOT NULL,
      impact_score TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS recall_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      trigger_reason TEXT NOT NULL,
      recall_score REAL NOT NULL,
      feedback TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_recall_user ON recall_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recall_memory ON recall_events(memory_id);
  `);

  // 简单迁移：为旧库补列
  const itemCols = db.prepare('PRAGMA table_info(items)').all() as { name: string }[];
  if (!itemCols.some((c) => c.name === 'scene_id')) {
    db.exec('ALTER TABLE items ADD COLUMN scene_id TEXT');
  }
  if (!itemCols.some((c) => c.name === 'content_hash')) {
    db.exec('ALTER TABLE items ADD COLUMN content_hash TEXT');
  }
  if (!itemCols.some((c) => c.name === 'similar_items')) {
    db.exec("ALTER TABLE items ADD COLUMN similar_items TEXT NOT NULL DEFAULT '[]'");
  }
  if (!itemCols.some((c) => c.name === 'intent')) {
    db.exec('ALTER TABLE items ADD COLUMN intent TEXT');
  }
  if (!itemCols.some((c) => c.name === 'half_life')) {
    db.exec('ALTER TABLE items ADD COLUMN half_life INTEGER');
  }
  if (!itemCols.some((c) => c.name === 'digest_state')) {
    db.exec("ALTER TABLE items ADD COLUMN digest_state TEXT NOT NULL DEFAULT 'unread'");
  }
  if (!itemCols.some((c) => c.name === 'last_recalled_at')) {
    db.exec('ALTER TABLE items ADD COLUMN last_recalled_at TEXT');
  }
  if (!itemCols.some((c) => c.name === 'memory_strength')) {
    db.exec('ALTER TABLE items ADD COLUMN memory_strength REAL');
  }
  if (!itemCols.some((c) => c.name === 'review_count')) {
    db.exec('ALTER TABLE items ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0');
  }
  if (!itemCols.some((c) => c.name === 'next_review_at')) {
    db.exec('ALTER TABLE items ADD COLUMN next_review_at TEXT');
  }

  // ===== Phase 6.0 回填（幂等）=====
  const backfillNow = new Date().toISOString();

  // memory_strength：未初始化的条目用当前 recall_score 初始化
  const strengthRows = db
    .prepare('SELECT id, created_at, half_life FROM items WHERE memory_strength IS NULL AND half_life IS NOT NULL')
    .all() as { id: string; created_at: string; half_life: number }[];
  const updStrength = db.prepare('UPDATE items SET memory_strength = ? WHERE id = ?');
  for (const r of strengthRows) {
    updStrength.run(recallScore(r.created_at, r.half_life), r.id);
  }

  // relations：把 items.similar_items JSON 转成无向 relations（left/right 规范化，INSERT OR IGNORE 幂等）
  const relRows = db
    .prepare("SELECT id, user_id, similar_items FROM items WHERE similar_items != '[]'")
    .all() as { id: string; user_id: string; similar_items: string }[];
  const insRel = db.prepare(`
    INSERT OR IGNORE INTO relations
      (id, user_id, left_memory_id, right_memory_id, type, score, confidence, source, evidence, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'similar', ?, ?, 'keyword', ?, 'active', ?, ?)
  `);
  for (const r of relRows) {
    let sims: SimilarItem[] = [];
    try {
      sims = JSON.parse(r.similar_items);
    } catch {
      continue;
    }
    for (const s of sims) {
      if (!s.id || s.id === r.id) continue;
      const left = r.id < s.id ? r.id : s.id;
      const right = r.id < s.id ? s.id : r.id;
      insRel.run(
        randomUUID(),
        r.user_id,
        left,
        right,
        s.similarity,
        s.similarity,
        JSON.stringify({ level: s.level }),
        backfillNow,
        backfillNow,
      );
    }
  }

  return db;
}

interface Row {
  id: string;
  user_id: string;
  source_platform: string;
  original_url: string | null;
  title: string | null;
  raw_text: string | null;
  images: string;
  extracted_text: string | null;
  category: string | null;
  tags: string;
  summary: string | null;
  confidence: number | null;
  scene_id: string | null;
  content_hash: string | null;
  similar_items: string;
  intent: string | null;
  half_life: number | null;
  digest_state: string;
  last_recalled_at: string | null;
  memory_strength: number | null;
  review_count: number;
  next_review_at: string | null;
  cover_url: string | null;
  status: string;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

function toItem(r: Row): Item {
  let tags: unknown = [];
  try {
    tags = JSON.parse(r.tags);
  } catch {
    tags = [];
  }
  let images: unknown = [];
  try {
    images = JSON.parse(r.images);
  } catch {
    images = [];
  }
  let similarItems: unknown = [];
  try {
    similarItems = JSON.parse(r.similar_items);
  } catch {
    similarItems = [];
  }
  return {
    id: r.id,
    user_id: r.user_id,
    source_platform: r.source_platform as Platform,
    original_url: r.original_url,
    title: r.title,
    raw_text: r.raw_text,
    images: Array.isArray(images) ? images.map(String) : [],
    extracted_text: r.extracted_text,
    category: r.category,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    summary: r.summary,
    confidence: r.confidence,
    scene_id: r.scene_id,
    content_hash: r.content_hash,
    similar_items: Array.isArray(similarItems) ? (similarItems as SimilarItem[]) : [],
    intent: r.intent,
    half_life: r.half_life,
    digest_state: r.digest_state ?? 'unread',
    last_recalled_at: r.last_recalled_at,
    memory_strength: r.memory_strength,
    review_count: r.review_count,
    next_review_at: r.next_review_at,
    cover_url: r.cover_url,
    status: r.status as ItemStatus,
    error_msg: r.error_msg,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function createItem(input: {
  userId: string;
  url?: string;
  title?: string;
  text?: string;
  images?: string[];
  contentHash?: string;
  platform: Platform;
}): Item {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO items (id, user_id, source_platform, original_url, title, raw_text, images, content_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.userId,
    input.platform,
    input.url ?? null,
    input.title ?? null,
    input.text ?? null,
    JSON.stringify(input.images ?? []),
    input.contentHash ?? null,
    now,
    now,
  );
  return getItem(id)!;
}

export function getItem(id: string): Item | undefined {
  const r = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Row | undefined;
  return r ? toItem(r) : undefined;
}

export function listItems(
  userId: string,
  opts: { category?: string; tag?: string; q?: string; sceneId?: string; page?: number; size?: number },
): { items: Item[]; total: number } {
  const where: string[] = ['user_id = ?'];
  const params: any[] = [userId];
  if (opts.category) {
    where.push('category = ?');
    params.push(opts.category);
  }
  if (opts.sceneId) {
    where.push('scene_id = ?');
    params.push(opts.sceneId);
  }
  if (opts.tag) {
    where.push('tags LIKE ?');
    params.push(`%"${opts.tag}"%`);
  }
  if (opts.q) {
    where.push('(title LIKE ? OR summary LIKE ? OR tags LIKE ?)');
    params.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`);
  }
  const whereSql = where.join(' AND ');

  const totalRow = db.prepare(`SELECT COUNT(*) AS c FROM items WHERE ${whereSql}`).get(...params) as { c: number };
  const page = opts.page ?? 1;
  const size = opts.size ?? 20;
  const rows = db
    .prepare(`SELECT * FROM items WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, size, (page - 1) * size) as unknown as Row[];

  return { items: rows.map(toItem), total: Number(totalRow.c) };
}

export function setStatus(id: string, status: ItemStatus, errorMsg?: string): void {
  db.prepare('UPDATE items SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?')
    .run(status, errorMsg ?? null, new Date().toISOString(), id);
}

export function setResult(
  id: string,
  result: {
    title: string;
    extractedText: string;
    coverUrl?: string;
    platform: Platform;
    category: string;
    tags: string[];
    summary: string;
    confidence: number;
    intent: string;
    halfLife: number;
  },
): void {
  db.prepare(`
    UPDATE items SET
      title = ?, extracted_text = ?, cover_url = ?, source_platform = ?,
      category = ?, tags = ?, summary = ?, confidence = ?,
      intent = ?, half_life = ?,
      status = 'completed', error_msg = NULL, updated_at = ?
    WHERE id = ?
  `).run(
    result.title,
    result.extractedText,
    result.coverUrl ?? null,
    result.platform,
    result.category,
    JSON.stringify(result.tags),
    result.summary,
    result.confidence,
    result.intent,
    result.halfLife,
    new Date().toISOString(),
    id,
  );
}

export function updateManual(id: string, patch: { category?: string; tags?: string[] }): Item | undefined {
  if (patch.category !== undefined) {
    db.prepare('UPDATE items SET category = ?, updated_at = ? WHERE id = ?')
      .run(patch.category, new Date().toISOString(), id);
  }
  if (patch.tags !== undefined) {
    db.prepare('UPDATE items SET tags = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(patch.tags), new Date().toISOString(), id);
  }
  return getItem(id);
}

// ===== 原子卡片 =====

interface AtomRow {
  id: string;
  item_id: string;
  type: string;
  content: string;
  sort: number;
}

function toAtom(r: AtomRow): Atom {
  return { id: r.id, item_id: r.item_id, type: r.type, content: r.content, sort: r.sort };
}

export function storeAtoms(itemId: string, atoms: { type: string; content: string }[]): void {
  db.prepare('DELETE FROM atoms WHERE item_id = ?').run(itemId);
  if (atoms.length === 0) return;
  const ins = db.prepare('INSERT INTO atoms (id, item_id, type, content, sort) VALUES (?, ?, ?, ?, ?)');
  atoms.forEach((a, i) => ins.run(randomUUID(), itemId, a.type, a.content, i));
}

export function getAtoms(itemId: string): Atom[] {
  const rows = db.prepare('SELECT * FROM atoms WHERE item_id = ? ORDER BY sort').all(itemId) as unknown as AtomRow[];
  return rows.map(toAtom);
}

export function getAtomsForItems(itemIds: string[]): Record<string, Atom[]> {
  const result: Record<string, Atom[]> = {};
  if (itemIds.length === 0) return result;
  const placeholders = itemIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT * FROM atoms WHERE item_id IN (${placeholders}) ORDER BY item_id, sort`)
    .all(...itemIds) as unknown as AtomRow[];
  for (const r of rows) {
    (result[r.item_id] ??= []).push(toAtom(r));
  }
  return result;
}

// ===== 场景 =====

interface SceneRow {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  status: string;
  auto_expire_at: string | null;
  created_at: string;
}

function toScene(r: SceneRow): Scene {
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    emoji: r.emoji,
    status: r.status,
    auto_expire_at: r.auto_expire_at,
    created_at: r.created_at,
  };
}

export function createScene(userId: string, name: string, emoji?: string, autoExpireAt?: string): Scene {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO scenes (id, user_id, name, emoji, status, auto_expire_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, name, emoji ?? null, 'active', autoExpireAt ?? null, now);
  return getScene(id)!;
}

export function getScene(id: string): Scene | undefined {
  const r = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as SceneRow | undefined;
  return r ? toScene(r) : undefined;
}

export function listScenes(userId: string): (Scene & { item_count: number })[] {
  const rows = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM items i WHERE i.scene_id = s.id) AS item_count
    FROM scenes s WHERE s.user_id = ? AND s.status = 'active'
    ORDER BY s.created_at DESC
  `).all(userId) as unknown as (SceneRow & { item_count: number })[];
  return rows.map((r) => ({ ...toScene(r), item_count: Number(r.item_count) }));
}

export function archiveScene(id: string): Scene | undefined {
  db.prepare("UPDATE scenes SET status = 'archived' WHERE id = ?").run(id);
  // 归档场景时，把其中条目 scene_id 置空（回到未分类）
  db.prepare('UPDATE items SET scene_id = NULL, updated_at = ? WHERE scene_id = ?')
    .run(new Date().toISOString(), id);
  return getScene(id);
}

export function assignItemToScene(itemId: string, sceneId: string | null): Item | undefined {
  db.prepare('UPDATE items SET scene_id = ?, updated_at = ? WHERE id = ?')
    .run(sceneId, new Date().toISOString(), itemId);
  return getItem(itemId);
}

export function categoryCounts(userId: string): { category: string; count: number }[] {
  const rows = db.prepare(`
    SELECT category, COUNT(*) AS count FROM items
    WHERE user_id = ? AND category IS NOT NULL AND category != '其他'
    GROUP BY category ORDER BY count DESC
  `).all(userId) as unknown as { category: string; count: number }[];
  return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
}

// ===== 相似（照镜子） =====

export function findByHash(userId: string, contentHash: string): Item[] {
  const rows = db.prepare('SELECT * FROM items WHERE user_id = ? AND content_hash = ?')
    .all(userId, contentHash) as unknown as Row[];
  return rows.map(toItem);
}

export function setSimilarItems(itemId: string, similar: SimilarItem[]): void {
  db.prepare('UPDATE items SET similar_items = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(similar), new Date().toISOString(), itemId);
}

export function updateIntent(id: string, intent: string): Item | undefined {
  db.prepare('UPDATE items SET intent = ?, updated_at = ? WHERE id = ?')
    .run(intent, new Date().toISOString(), id);
  return getItem(id);
}

export function updateDigestState(id: string, digestState: string): Item | undefined {
  db.prepare('UPDATE items SET digest_state = ?, updated_at = ? WHERE id = ?')
    .run(digestState, new Date().toISOString(), id);
  return getItem(id);
}

export function markRecalled(id: string): void {
  db.prepare('UPDATE items SET last_recalled_at = ?, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), new Date().toISOString(), id);
}

export function listItemsForSimilarity(userId: string): Item[] {
  const rows = db.prepare('SELECT * FROM items WHERE user_id = ?').all(userId) as unknown as Row[];
  return rows.map(toItem);
}

// ===== 用户偏好 + 照镜子动作 =====

interface PrefsRow {
  user_id: string;
  muted_topics: string;
  remind_frequency: string;
  timezone: string;
}

export function getPrefs(userId: string): UserPrefs {
  const r = db.prepare('SELECT * FROM user_prefs WHERE user_id = ?').get(userId) as PrefsRow | undefined;
  if (r) {
    let muted: unknown = [];
    try { muted = JSON.parse(r.muted_topics); } catch { muted = []; }
    return {
      user_id: r.user_id,
      muted_topics: Array.isArray(muted) ? muted.map(String) : [],
      remind_frequency: r.remind_frequency,
      timezone: r.timezone,
    };
  }
  const defaults: UserPrefs = { user_id: userId, muted_topics: [], remind_frequency: 'low', timezone: 'Asia/Shanghai' };
  db.prepare('INSERT INTO user_prefs (user_id, muted_topics, remind_frequency, timezone) VALUES (?, ?, ?, ?)')
    .run(userId, '[]', 'low', 'Asia/Shanghai');
  return defaults;
}

export function updatePrefs(userId: string, patch: { muted_topics?: string[]; remind_frequency?: string; timezone?: string }): UserPrefs {
  const cur = getPrefs(userId);
  const muted = patch.muted_topics ?? cur.muted_topics;
  const freq = patch.remind_frequency ?? cur.remind_frequency;
  const tz = patch.timezone ?? cur.timezone;
  db.prepare('UPDATE user_prefs SET muted_topics = ?, remind_frequency = ?, timezone = ? WHERE user_id = ?')
    .run(JSON.stringify(muted), freq, tz, userId);
  return { user_id: userId, muted_topics: muted, remind_frequency: freq, timezone: tz };
}

export function recordDedupAction(userId: string, itemId: string, action: string, similarItemId?: string, similarity?: number): void {
  const id = randomUUID();
  db.prepare('INSERT INTO dedup_actions (id, user_id, item_id, similar_item_id, similarity, action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, itemId, similarItemId ?? null, similarity ?? null, action, new Date().toISOString());
}

export function autoArchiveExpiredScenes(): number {
  const now = new Date().toISOString();
  const rows = db.prepare("SELECT id FROM scenes WHERE status = 'active' AND auto_expire_at IS NOT NULL AND auto_expire_at <= ?")
    .all(now) as unknown as { id: string }[];
  for (const r of rows) {
    db.prepare("UPDATE scenes SET status = 'archived' WHERE id = ?").run(r.id);
    db.prepare('UPDATE items SET scene_id = NULL, updated_at = ? WHERE scene_id = ?').run(now, r.id);
  }
  return rows.length;
}

// ===== Phase 4 智能层：relations =====

interface RelationRow {
  id: string;
  user_id: string;
  left_memory_id: string;
  right_memory_id: string;
  type: string;
  score: number;
  confidence: number;
  source: string;
  evidence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toRelation(r: RelationRow): Relation {
  let evidence: unknown = {};
  try {
    evidence = JSON.parse(r.evidence);
  } catch {
    evidence = {};
  }
  return {
    id: r.id,
    user_id: r.user_id,
    source_id: r.left_memory_id,
    target_id: r.right_memory_id,
    type: r.type as Relation['type'],
    score: r.score,
    confidence: r.confidence,
    source: r.source as Relation['source'],
    evidence: evidence && typeof evidence === 'object' ? (evidence as Record<string, unknown>) : {},
    status: r.status as Relation['status'],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function listRelations(
  userId: string,
  opts: { memoryId?: string; type?: string; status?: string } = {},
): Relation[] {
  const where: string[] = ['user_id = ?'];
  const params: any[] = [userId];
  if (opts.memoryId) {
    where.push('(left_memory_id = ? OR right_memory_id = ?)');
    params.push(opts.memoryId, opts.memoryId);
  }
  if (opts.type) {
    where.push('type = ?');
    params.push(opts.type);
  }
  if (opts.status) {
    where.push('status = ?');
    params.push(opts.status);
  }
  const rows = db
    .prepare(`SELECT * FROM relations WHERE ${where.join(' AND ')} ORDER BY created_at DESC`)
    .all(...params) as unknown as RelationRow[];
  return rows.map(toRelation);
}

/** 写入无向关系：left/right 自动 min/max 规范化，UNIQUE 幂等去重 */
export function insertRelation(input: {
  userId: string;
  leftId: string;
  rightId: string;
  type: Relation['type'];
  score: number;
  confidence: number;
  source: Relation['source'];
  evidence: Record<string, unknown>;
}): void {
  const now = new Date().toISOString();
  const left = input.leftId < input.rightId ? input.leftId : input.rightId;
  const right = input.leftId < input.rightId ? input.rightId : input.leftId;
  db.prepare(`
    INSERT OR IGNORE INTO relations
      (id, user_id, left_memory_id, right_memory_id, type, score, confidence, source, evidence, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    randomUUID(),
    input.userId,
    left,
    right,
    input.type,
    input.score,
    input.confidence,
    input.source,
    JSON.stringify(input.evidence),
    now,
    now,
  );
}

export function dismissRelation(id: string): void {
  db.prepare("UPDATE relations SET status = 'dismissed', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

// ===== Phase 4 智能层：insights =====

interface InsightRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_ids: string;
  confidence: number;
  impact_score: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toInsight(r: InsightRow): Insight {
  let related: unknown = [];
  try {
    related = JSON.parse(r.related_ids);
  } catch {
    related = [];
  }
  return {
    id: r.id,
    user_id: r.user_id,
    type: r.type as Insight['type'],
    title: r.title,
    body: r.body,
    related_ids: Array.isArray(related) ? related.map(String) : [],
    confidence: r.confidence,
    impact_score: r.impact_score as Insight['impact_score'],
    status: r.status as Insight['status'],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function listInsights(userId: string, status?: string): Insight[] {
  const params: any[] = [userId];
  let sql = 'SELECT * FROM insights WHERE user_id = ?';
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params) as unknown as InsightRow[];
  return rows.map(toInsight);
}

export function insertInsight(input: {
  userId: string;
  type: Insight['type'];
  title: string;
  body: string;
  relatedIds: string[];
  confidence: number;
  impactScore?: Insight['impact_score'];
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO insights (id, user_id, type, title, body, related_ids, confidence, impact_score, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    randomUUID(),
    input.userId,
    input.type,
    input.title,
    input.body,
    JSON.stringify(input.relatedIds),
    input.confidence,
    input.impactScore ?? 'medium',
    now,
    now,
  );
}

export function updateInsightStatus(id: string, status: Insight['status']): void {
  db.prepare('UPDATE insights SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
}

// ===== Phase 4 智能层：recall_events =====

interface RecallEventRow {
  id: string;
  user_id: string;
  memory_id: string;
  triggered_by: string;
  trigger_reason: string;
  recall_score: number;
  feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
}

function toRecallEvent(r: RecallEventRow): RecallEvent {
  return {
    id: r.id,
    user_id: r.user_id,
    memory_id: r.memory_id,
    triggered_by: r.triggered_by as RecallEvent['triggered_by'],
    trigger_reason: r.trigger_reason,
    recall_score: r.recall_score,
    feedback: r.feedback as RecallEvent['feedback'] | null,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
  };
}

export function listRecallEvents(userId: string, memoryId?: string): RecallEvent[] {
  const params: any[] = [userId];
  let sql = 'SELECT * FROM recall_events WHERE user_id = ?';
  if (memoryId) {
    sql += ' AND memory_id = ?';
    params.push(memoryId);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params) as unknown as RecallEventRow[];
  return rows.map(toRecallEvent);
}

export function insertRecallEvent(input: {
  userId: string;
  memoryId: string;
  triggeredBy: RecallEvent['triggered_by'];
  triggerReason: string;
  recallScore: number;
  feedback?: RecallEvent['feedback'];
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO recall_events (id, user_id, memory_id, triggered_by, trigger_reason, recall_score, feedback, created_at, reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    input.userId,
    input.memoryId,
    input.triggeredBy,
    input.triggerReason,
    input.recallScore,
    input.feedback ?? null,
    now,
    input.feedback ? now : null,
  );
}

// ===== Phase 4 智能层：memory 字段 =====

export function setMemoryStrength(id: string, strength: number): void {
  db.prepare('UPDATE items SET memory_strength = ?, updated_at = ? WHERE id = ?')
    .run(strength, new Date().toISOString(), id);
}

/** 记录一次复习：更新强度、复习次数、最近召回时间、下次复习时间 */
export function applyReview(id: string, strength: number, nextReviewAt: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE items SET memory_strength = ?, review_count = review_count + 1, last_recalled_at = ?, next_review_at = ?, updated_at = ? WHERE id = ?
  `).run(strength, now, nextReviewAt, now, id);
}
