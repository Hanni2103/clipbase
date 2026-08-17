# M1 开发文档：接口设计 + AI 分类 Prompt 模板

> 承接《MVP开发文档-跨平台收藏AI分类.md》。本文档是 M1 里程碑的落地设计：
> 「分享入口 → 后端接收 → 网页/公众号提取 → AI 分类 → 存库展示」完整链路。
> 目标：先跑通网页类内容，为 M2（抖音/小红书）铺好可插拔的提取器框架。

---

## 1. M1 范围（只做这些）

| 项 | 内容 |
|---|---|
| 分享入口 | iOS Share Extension + Android ACTION_SEND，收到 payload 传给后端 |
| 内容识别 | 域名路由：公众号 / 通用网页 / 纯文字 / 图片（OCR 后置到 M3） |
| 提取器 | 通用网页 + 公众号（readability 抽正文） |
| AI 分类 | 结构化输出：category / tags / summary / confidence |
| 存储 | PostgreSQL，item 单表 + 状态机 |
| 客户端展示 | 列表 + 按分类筛选 + 搜索 + 点链接回原平台 |

---

## 2. 数据流时序

```
用户点「分享」→ 选本 App
   │
   ▼
[Share Extension / Intent]  收集 payload（url + title + text + images）
   │  POST /api/ingest
   ▼
[后端]  识别类型 → 写入 item（status=pending）→ 投递任务队列
   │  立即返回 item_id（202）
   ▼
[Worker]  取任务 → 提取器 extract() → 得到 title+text
   │
   ▼
[AI 分类]  调大模型 → 返回 JSON → 校验
   │
   ▼
[DB]  更新 item（status=completed，写入 category/tags/summary）
   │
   ▼
[客户端]  轮询 GET /api/items/{id} 拿到结果，展示
```

---

## 3. API 接口设计

### 3.1 POST /api/ingest —— 分享入口调用（核心）

请求（客户端从分享面板拼装）：
```json
{
  "user_id": "uuid",
  "url": "https://mp.weixin.qq.com/s/xxxx",
  "title": "React 19 新特性全解析",
  "text": "分享面板自带的简介文字（可为空）",
  "images": ["https://.../cover.jpg"]
}
```
- `url` 是主信号；`title` / `text` 是分享面板附带的，作为提取器的补充；`images` 可选（封面或截图）。
- 客户端**根据域名预判平台**，放在 URL 参数或 header 里更省一步：`platform_hint=douyin|xiaohongshu|wechat|web`。

响应（立即返回，异步处理）：
```json
{
  "item_id": "9f3c...",
  "status": "pending",
  "message": "已收到，正在分类"
}
```

### 3.2 GET /api/items —— 知识库列表

```
GET /api/items?user_id=xxx&category=科技&tag=AI&q=前端&page=1&size=20
```
响应：
```json
{
  "items": [
    {
      "id": "9f3c...",
      "source_platform": "wechat",
      "title": "React 19 新特性全解析",
      "category": "科技",
      "tags": ["React", "前端", "编程"],
      "summary": "介绍 React 19 的新特性及用法",
      "confidence": 0.95,
      "cover_url": "https://.../cover.jpg",
      "status": "completed",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### 3.3 GET /api/items/{id} —— 单条详情（客户端轮询用）

```json
{
  "id": "9f3c...",
  "status": "completed",
  "category": "科技",
  "tags": ["React"],
  "summary": "...",
  "original_url": "https://mp.weixin.qq.com/s/xxxx",
  "title": "..."
}
```
客户端逻辑：`status=pending/processing` 时轮询，`completed` 时展示，`failed` 时提示重试，`needs_review` 时提示"待确认"。

### 3.4 PATCH /api/items/{id} —— 用户手动改分类/标签（攒反馈）

```json
{ "category": "学习成长", "tags": ["React", "教程"] }
```
> 这一步既是纠错入口，也是**反馈数据源**（见 §6.4），M4 用它回灌 few-shot。

---

## 4. 数据模型（PostgreSQL DDL）

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  source_platform TEXT NOT NULL,      -- wechat | web | text | image | douyin | xiaohongshu
  original_url  TEXT,
  title         TEXT,
  extracted_text TEXT,                 -- 提取原文，仅用于分类，不对外展示
  category      TEXT,
  tags          JSONB NOT NULL DEFAULT '[]',
  summary       TEXT,
  confidence    REAL,
  cover_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
               -- pending | processing | completed | failed | needs_review
  error_msg     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_user ON items(user_id, created_at DESC);
CREATE INDEX idx_items_category ON items(user_id, category);
CREATE INDEX idx_items_tags ON items USING GIN(tags);       -- 标签筛选
-- 搜索用 pg_trgm 或后续 pgvector（M3）
```

状态机：
```
pending ──worker取任务──▶ processing ──成功──▶ completed
   │                          │
   │                          └─失败──▶ failed（可重试回 pending）
   └──文本太短/置信度低──▶ needs_review
```

---

## 5. 提取器框架（可插拔，为 M2 铺路）

```ts
// 统一接口：任何内容源都归一化成「一段文本」
interface IngestInput {
  url?: string;
  title?: string;
  text?: string;
  images?: string[];
}

interface ExtractedContent {
  title: string;
  text: string;          // AI 要吃的文本原料
  coverUrl?: string;
  sourcePlatform: string;
}

interface Extractor {
  platform: string;
  canHandle(input: IngestInput): boolean;
  extract(input: IngestInput): Promise<ExtractedContent>;
}
```

**域名路由表（M1 先实现前两个，其余注册为占位）**：
```ts
const routers = [
  { pattern: /mp\.weixin\.qq\.com/, extractor: new WechatExtractor() },
  { pattern: /./,                 extractor: new GenericWebExtractor() }, // 兜底
  // M2: v.douyin.com / xhslink.com / b23.tv ...
];
```

**GenericWebExtractor / WechatExtractor 实现要点**：
1. 服务端 HTTP GET 拉取网页（带 UA，模拟浏览器）；
2. 用 readability 类库抽取正文，去广告、去导航；
3. 优先用「分享面板带来的 title」，缺了才用网页 `<title>`；
4. 文本过长时截断到 2000 字左右（AI 分类够用，省 token）；
5. 失败时**降级**：用分享面板自带的 `title + text` 直接分类，标记 `needs_review`。

---

## 6. AI 分类服务（本份重点）

### 6.1 调用方式

用 OpenAI 兼容接口（DeepSeek / 豆包 / Kimi / 通义都支持）：
```ts
const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${LLM_API_KEY}` },
  body: JSON.stringify({
    model: "deepseek-chat",            // 换成实际模型名
    messages: [system, user],
    response_format: { type: "json_object" },  // 强制 JSON 输出
    temperature: 0.1                     // 低温度，稳定
  })
});
```

### 6.2 System Prompt（固定，写死在配置里）

```
你是一个个人知识库的内容分类助手。用户从不同平台（抖音、小红书、公众号、网页）收藏内容，你需要根据给定文本，判断它属于哪个分类，提取标签，并写一句话摘要。

【分类体系】只能在以下分类中选择，禁止自创分类：
美食、科技、搞笑娱乐、学习成长、职场、生活方式、健康、财经商业、新闻资讯、其他

【判断规则】
1. 标题和文案是主要判断依据，正文是补充。
2. 只选一个最贴切的分类，不要多选。
3. 标签 3~8 个，是能帮助以后搜索的关键词。
4. 摘要一句话，客观概括，不评价、不延伸。
5. confidence 是 0~1 的分类把握，低于 0.6 就选「其他」。
6. 只输出一个 JSON 对象，不要输出任何解释、前后缀或 markdown 代码块。

【输出格式】（严格 JSON）
{"category":"分类名","tags":["标签1","标签2"],"summary":"一句话摘要","confidence":0.0}
```

### 6.3 Few-shot 示例（放在 System Prompt 之后，对齐分类习惯）

```
【示例】
输入：平台=公众号，标题=《React 19 新特性全解析》，文本=本文详细介绍 React 19 的 Actions、useOptimistic、useFormStatus 等新特性及其使用场景。
输出：{"category":"科技","tags":["React","前端","编程"],"summary":"介绍 React 19 的新特性及用法","confidence":0.95}

输入：平台=抖音，标题=空气炸锅做的脆皮五花肉绝了，文本=五花肉焯水后腌料，空气炸锅 200 度 30 分钟，出锅外酥里嫩。
输出：{"category":"美食","tags":["空气炸锅","五花肉","家常菜"],"summary":"空气炸锅制作脆皮五花肉的教程","confidence":0.93}

输入：平台=小红书，标题=打工人的通勤穿搭，文本=一周不重样的通勤穿搭分享，都是基础款，很百搭。
输出：{"category":"生活方式","tags":["穿搭","通勤","职场穿搭"],"summary":"分享一周通勤穿搭灵感","confidence":0.90}

输入：平台=网页，标题=2025 年央行降准，文本=央行宣布下调存款准备金率 0.5 个百分点，释放长期资金。
输出：{"category":"财经商业","tags":["央行","降准","宏观经济"],"summary":"央行降准释放流动性","confidence":0.94}

输入：平台=文字，标题=，文本=哈哈哈哈这个评论笑死我了，当代打工人精神状态。
输出：{"category":"搞笑娱乐","tags":["段子","打工人","搞笑"],"summary":"一条关于打工人状态的搞笑评论","confidence":0.88}
```

### 6.4 User Prompt（每次请求拼装）

```
平台：{source_platform}
标题：{title}
文本：{extracted_text}
```

### 6.5 输出解析与降级（保证「准」和「稳」）

```ts
function parseResult(raw: string) {
  const obj = JSON.parse(raw);                 // json_object 模式直接可解析
  const VALID = ["美食","科技","搞笑娱乐","学习成长","职场",
                 "生活方式","健康","财经商业","新闻资讯","其他"];
  return {
    category: VALID.includes(obj.category) ? obj.category : "其他",
    tags: Array.isArray(obj.tags) ? obj.tags.slice(0, 8) : [],
    summary: obj.summary ?? "",
    confidence: clamp(Number(obj.confidence) || 0, 0, 1)
  };
}
```

**降级规则**：
1. `confidence < 0.6` → 归「其他」，`status=needs_review`；
2. 提取文本为空或 < 20 字 → 不调 AI，`status=needs_review`（等 M3 的 OCR 兜底）；
3. LLM 返回非 JSON / 超时 → 重试 1 次，仍失败 → `status=failed`；
4. 用户手动改分类 → 写入 `user_feedback` 表（M4 回灌 few-shot）。

---

## 7. 队列与任务

- 用 Redis 队列（BullMQ / Celery），`ingest` 只做「识别 + 入库 + 投递」，立即返回；
- Worker 并发处理提取 + 分类（分类调 LLM 有延迟，异步是必须的）；
- 每任务设超时（如 30s）与重试上限（2 次）。

---

## 8. 客户端分享入口要点

**iOS（Share Extension）**：
- 新建 Share Extension target，激活类型勾选 URL / Text / Image；
- 从 `NSExtensionItem.attachments` 读 `URL` 和 `String`；
- 拿 `NSItemProvider` 的 `loadItem`，拼成 §3.1 的 JSON 调 `POST /api/ingest`；
- 处理完调 `extensionContext.completeRequest` 关闭。

**Android（ACTION_SEND）**：
- `AndroidManifest` 声明 intent-filter：`ACTION_SEND` + `text/plain`、`image/*`；
- 从 `intent.getStringExtra(Intent.EXTRA_TEXT)` 拿链接/文字，`EXTRA_STREAM` 拿图片；
- 调后端后直接 finish，不阻塞用户。

---

## 9. 环境变量 / 配置

```
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxxx
LLM_MODEL=deepseek-chat
DATABASE_URL=postgres://...
REDIS_URL=redis://...
```

---

## 10. M1 验收清单

- [ ] 抖音/公众号/浏览器分享面板里能看到本 App
- [ ] 分享公众号文章 → 5 秒内列表出现，分类/标签/摘要正确
- [ ] 分享普通网页 → 同上
- [ ] 分享纯文字/评论 → 能分类（搞笑/学习等）
- [ ] 点列表项能跳回原链接
- [ ] 按分类、标签、关键词能筛选/搜索
- [ ] 手动改分类 → 保存生效
- [ ] 抓取失败的链接 → 显示"待确认"而非崩溃
- [ ] 无标题、无正文的分享 → 不硬分类，标记待确认

---

## 11. 下一步（M2 预告）

在 M1 的 `Extractor` 框架上新增两个提取器：`DouyinExtractor`、`XiaohongshuExtractor`（解析短链跳转，读网页 title + 文案），其余链路完全复用。
