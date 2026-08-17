export type Platform =
  | 'wechat'
  | 'web'
  | 'text'
  | 'image'
  | 'douyin'
  | 'xiaohongshu'
  | 'bilibili'
  | 'unknown';

export type ItemStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_review';

/** 分享入口 POST 到 /api/ingest 的请求体 */
export interface IngestInput {
  user_id: string;
  url?: string;
  title?: string;
  text?: string;
  images?: string[];
  platform_hint?: string;
}

/** 提取器产物：把任何输入归一化成「一段文本」 */
export interface ExtractedContent {
  title: string;
  text: string;
  coverUrl?: string;
  sourcePlatform: Platform;
  /** 提取器附加说明（如「未配置 OCR」），用于 needs_review 提示 */
  note?: string;
}

/** AI 分类产物（结构化） */
export interface ClassifyResult {
  category: string;
  tags: string[];
  summary: string;
  confidence: number;
  /** 原子卡片（要点/步骤/金句/数据） */
  atoms: AtomInput[];
  /** 预测的收藏动机 */
  intent: string;
}

/** AI 产出的原子卡片（未入库） */
export interface AtomInput {
  type: string;
  content: string;
}

/** 数据库中的原子卡片 */
export interface Atom {
  id: string;
  item_id: string;
  type: string;
  content: string;
  sort: number;
}

/** 场景（活的、有时间性的文件夹，可自动归档） */
export interface Scene {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  status: string; // active | archived
  auto_expire_at: string | null;
  created_at: string;
}

/** 用户偏好（静音主题 / 提醒频率 / 时区） */
export interface UserPrefs {
  user_id: string;
  muted_topics: string[];
  remind_frequency: string;
  timezone: string;
}

/** 数据库中的收藏条目 */
export interface Item {
  id: string;
  user_id: string;
  source_platform: Platform;
  original_url: string | null;
  title: string | null;
  raw_text: string | null;
  images: string[];
  extracted_text: string | null;
  category: string | null;
  tags: string[];
  summary: string | null;
  confidence: number | null;
  scene_id: string | null;
  cover_url: string | null;
  content_hash: string | null;
  similar_items: SimilarItem[];
  intent: string | null;
  half_life: number | null;
  digest_state: string;
  last_recalled_at: string | null;
  status: ItemStatus;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

/** 相似条目（照镜子） */
export interface SimilarItem {
  id: string;
  title: string | null;
  category: string | null;
  similarity: number;
  level: 'exact' | 'high' | 'related';
}
