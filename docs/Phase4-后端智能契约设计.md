# Clipbase Phase 4 — Backend Intelligence Contract Design

> 本文档定义 AI Memory OS 的**核心智能数据模型与前后端契约**。只做设计，不写实现。
> 红线：**不造假**——每一条关系、洞察、召回都必须携带 `source`（来源算法）与 `evidence`（证据），前端据此渲染「AI 为什么这么说」。

---

## 0. 目标与红线

### 目标
把 Clipbase 从「优秀 AI 知识库」推进到「AI Memory OS」的关键，是让后端拥有**可追溯、可演进、可解释**的智能层。本设计定义五个实体：

| # | 实体 | 职责 | 现状 |
|---|---|---|---|
| 1 | Memory Entity | 一条被 AI 理解并纳入生命周期管理的记忆 | `items` 表已有，缺「强度/复习」字段 |
| 2 | Relation Entity | 记忆之间的**持久化关系**（图谱的边） | `items.similar_items` JSON + 实时算，无独立表 |
| 3 | Insight Entity | AI 发现的**可持久化洞察**（连接/空白/趋势/矛盾） | `/insight` 实时算，无持久化、无反馈 |
| 4 | Recall Event | 一次**召回事件**及其复习反馈 | `/recall` 实时算，只有 `last_recalled_at`，无反馈闭环 |
| 5 | Compose Context | 创作时**显式的上下文**（选哪些记忆、怎么用） | `/compose` 无 `item_ids`，隐式全库 |

### 红线（继承自项目定位）
1. **关系来自真实数据，不伪造 A→B→C**：每一条边标注 `source`（hash/ngram/tag/llm）与 `evidence`。
2. **洞察可解释**：每条洞察带 `related_ids` 与生成依据，前端可跳转验证。
3. **召回可闭环**：每次复习记录 `feedback`，用于调整半衰期，而非永远用固定 `0.5^(days/half_life)`。
4. **创作可溯源**：`/compose` 返回 `used_memory_ids` 与 `cited_atoms`，让用户知道「这内容来自我的哪几条记忆」。
5. **不引入重型依赖**：继续 `node:sqlite`，无 ORM，无 pgvector。

---

## 1. 总览：五个实体如何拼成 Memory OS

```
        Capture ──▶ Memory Entity（理解/提炼/生命周期）
                         │
                         ├──▶ Relation Entity（连接 → 图谱）
                         │         │
                         │         ▼
                         │    Insight Entity（洞察，持久化 + 反馈）
                         │
                         ├──▶ Recall Event（主动唤醒 → 复习反馈 → 调半衰期）
                         │
                         └──▶ Compose Context（选记忆 → 创作 → 溯源）
```

- **Memory** 是根，其余四个都围绕它。
- **Relation / Insight / Recall Event** 都是新表（`CREATE TABLE IF NOT EXISTS`，加性迁移）。
- **Compose Context** 不改表，只改 `/compose` 的请求/响应契约（向后兼容）。

---

## 2. Memory Entity（记忆实体）

### 2.1 现状
`items` 表已相当完整（见 `src/db.ts`）：`category/tags/summary/intent/half_life/digest_state/last_recalled_at/similar_items/...`，原子卡片在 `atoms` 子表。

缺口：**没有「记忆强度」与「复习调度」字段**，导致召回分永远只能按固定公式重算，无法被用户行为修正。

### 2.2 目标数据模型（`items` 表加列，加性）

在 `items` 表上 `ALTER TABLE ADD COLUMN` 以下字段（`digest_state` 复用为「消化轴」）：

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `memory_strength` | REAL | NULL | 当前记忆强度 0–1（初值 = 入藏时的 `recall_score`） |
| `review_count` | INTEGER | 0 | 已复习次数 |
| `next_review_at` | TEXT | NULL | 下次计划复习时间（间隔重复） |
| `last_recalled_at` | TEXT | NULL | 最近一次召回时间（**已存在，无需迁移**，纳入 Memory 正式字段集） |

> 说明：`half_life` 是「内容类别」决定的衰减速度（资讯快/方法慢）；`memory_strength` 是「这条记忆当前还剩多少」，由复习行为动态修正。二者正交。

### 2.3 API Contract

| 方法 | 路径 | 说明 | 变更 |
|---|---|---|---|
| GET | `/api/items` | 记忆列表 | 加 `memory_strength/review_count/next_review_at` |
| GET | `/api/items/:id` | 记忆详情 | 同上 + 已有 `atoms` |
| PATCH | `/api/items/:id` | 编辑分类/标签/意图/消化状态 | 已有，扩展 `digest_state` 状态机校验 |
| POST | `/api/items/:id/review` | 记录一次复习（见 Recall Event） | 新 |

**Memory 形状（JSON，snake_case）**

```jsonc
{
  "id": "uuid",
  "user_id": "u...",
  "title": "…",
  "category": "科技",
  "tags": ["RAG", "LLM"],
  "summary": "…",
  "intent": "material",            // do_it|insight|material|inspiration|fun
  "half_life": 60,                  // 天
  "digest_state": "digested",       // unread|read|digested|internalized
  "memory_strength": 0.82,          // 新增
  "review_count": 3,                // 新增
  "next_review_at": "2026-…",       // 新增
  "last_recalled_at": "2026-…",
  "atoms": [{ "type": "key_point", "content": "…" }],
  "similar_items": [{ "id", "title", "level" }]  // 过渡期保留，最终由 relations 取代
}
```

### 2.4 前端影响
- `types/brain.ts` 的 `Item` 增加 `memoryStrength/reviewCount/nextReviewAt`。
- `api/memory.ts` 的 `mapItem` 增加三个字段映射。
- 记忆卡片的生命周期条从「`half_life − days`」升级为「`memory_strength`」驱动（更真实，随复习回升）。

---

## 3. Relation Entity（关系实体）

### 3.1 现状
- `similar.ts`：`hashContent`（精确）、`charNGrams`（3-gram Jaccard）、`tagOverlap`、`combinedSimilarity = max(textSim, tagOverlap*0.85)`，`classifyLevel`（≥0.9 high，否则 related；exact 来自哈希命中）。
- 结果存进 `items.similar_items`（JSON 文本列），并写入 `dedup_actions`。
- 问题：关系**不持久化、不可查询、不可扩展类型**，也无法支撑图谱。

### 3.2 目标数据模型（新表 `relations`）

```sql
CREATE TABLE IF NOT EXISTS relations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  left_memory_id  TEXT NOT NULL,    -- 规范化：min(id)，无向类型保证方向无关
  right_memory_id TEXT NOT NULL,    -- 规范化：max(id)
  type            TEXT NOT NULL CHECK (type IN ('similar','topic','support','contradict','derived')),
  score           REAL NOT NULL,    -- 0–1（相似度/强度）
  confidence      REAL NOT NULL,    -- 0–1（AI 置信度；确定性来源=score，LLM 来源=模型置信度）
  source          TEXT NOT NULL CHECK (source IN ('embedding','keyword','tag','llm')),
  evidence        TEXT NOT NULL,    -- JSON：如 {"shared_tags":["RAG"],"ngram":0.73}
  status          TEXT NOT NULL DEFAULT 'active',  -- active|dismissed
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_relations_user ON relations(user_id, created_at DESC);
CREATE INDEX idx_relations_left ON relations(left_memory_id);
CREATE INDEX idx_relations_right ON relations(right_memory_id);
-- 无向去重：A↔B 视为同一条（left=min, right=max）
CREATE UNIQUE INDEX uniq_relation_pair ON relations(user_id, left_memory_id, right_memory_id, type);
```

**关系类型（分阶段，见 Migration）**

| type | 语义 | 来源 | 成本 |
|---|---|---|---|
| `similar` | 内容相似（照镜子） | keyword（字符 n-gram）/ tag | 免费、同步 |
| `topic` | 同主题 | tag | 免费、同步 |
| `support` | A 支撑 B（论据/方法） | LLM | 付费、异步 |
| `contradict` | A 与 B 矛盾 | LLM | 付费、异步 |
| `derived` | B 由 A 衍生 | LLM | 付费、异步 |

> **V1 只做 `similar` + `topic`**（来源：`keyword`（字符 n-gram）+ `tag`，**禁止 LLM**，零成本、零造假）。`embedding`（语义向量）留待可用的向量模型接入后启用（此前豆包 embedding 均不可用，已回退本地 n-gram）。`support/contradict/derived` 留作 `POST /relations/derive` 异步增强，且必须携带 LLM 原文证据。
>
> **无向规范化（防重复边）**：`similar`/`topic` 为无向，写入前 `left=min(a,b)`、`right=max(a,b)`，A↔B 只存一条（`UNIQUE(user_id,left,right,type)` 兜底）；方向性类型（4.5 的 `support/contradict/derived`）届时再加方向列。

### 3.3 API Contract

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/relations?memory_id=…&type=…` | 某记忆的所有关系（或全库关系） |
| GET | `/api/graph` | 图谱：`{ nodes:[], edges:[] }`，**只返回 status=active 的真实边** |
| POST | `/api/relations/derive` | 异步 LLM 推导 support/contradict/derived（可空跑） |
| PATCH | `/api/relations/:id` | 用户 dismiss 一条关系（不删，改 status） |

**Relation 形状**

```jsonc
{
  "id": "uuid",
  "source_id": "mem-A",
  "target_id": "mem-B",
  "type": "similar",
  "score": 0.73,
  "confidence": 0.73,
  "source": "ngram",
  "evidence": { "shared_tags": ["RAG"], "ngram": 0.73 }
}
```

**Graph 形状（图谱契约，严格真实边）**

```jsonc
{
  "nodes": [{ "id": "mem-A", "title": "…", "category": "科技", "strength": 0.8 }],
  "edges": [{ "id": "rel-1", "source": "mem-A", "target": "mem-B", "type": "similar", "score": 0.73 }]
}
```

### 3.4 前端影响
- `api/relations.ts` 新增 `fetchRelations/fetchGraph/dismissRelation`。
- 记忆详情「相关知识」改由 `relations` 驱动（替代 `similar_items`），并显示 `type` + `evidence`（如「共享标签 RAG」）。
- 未来 Memory Universe 图谱直接用 `/api/graph`，不自己拼假边。

---

## 4. Insight Entity（洞察实体）

### 4.1 现状
`/insight` 实时 O(n²) 算「最相似的一对」，返回 `item_a/item_b/similarity`，无持久化、无用户反馈、类型单一（只有 connection）。

### 4.2 目标数据模型（新表 `insights`）

```sql
CREATE TABLE IF NOT EXISTS insights (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  type         TEXT NOT NULL,       -- pattern|connection|trend|opportunity
  title        TEXT NOT NULL,       -- 一句话标题
  body         TEXT NOT NULL,       -- 解释文案（含证据）
  related_ids  TEXT NOT NULL,       -- JSON 数组：["mem-A","mem-B",...]
  confidence   REAL NOT NULL,       -- 0–1
  impact_score TEXT NOT NULL DEFAULT 'medium',  -- low|medium|high（对用户的价值等级）
  status       TEXT NOT NULL DEFAULT 'active',  -- active|accepted|dismissed|expired（生命周期）
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_insights_user ON insights(user_id, created_at DESC);
```

**洞察类型**

| type | 语义 | 来源 |
|---|---|---|
| `connection` | 两条记忆有关联（现有 /insight 的升级） | keyword/tag（免费） |
| `pattern` | 你反复收藏某类主题，正在形成关注模式 | 分类/标签聚合（免费） |
| `trend` | 你最近 N 天兴趣正在转向 X | 时间窗口统计（免费） |
| `opportunity` | 这些记忆指向一个可行动的下一步（如「AI Agent 创业」） | 聚合 + LLM（可延后） |

**洞察生命周期（`status`）**：`active`（默认，展示中）→ 用户 `accepted`（认可）或 `dismissed`（忽略）；超过有效期（如 30 天未被认可）自动 `expired`（过期，不再展示）。避免「AI 发现你关注 AI Agent」半年后还挂在首页。

### 4.3 API Contract

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/insights` | 洞察列表（state 过滤） |
| GET | `/api/insights/:id` | 单条详情 |
| PATCH | `/api/insights/:id` | `{ status: accepted|dismissed }` 用户反馈 |
| POST | `/api/insights/generate` | 触发生成（幂等，去重） |

**Insight 形状**

```jsonc
{
  "id": "uuid",
  "type": "connection",
  "title": "RAG 与向量检索的关联",
  "body": "你存的《RAG 入门》与《向量数据库选型》共享标签 RAG，相似度 73%",
  "related_ids": ["mem-A", "mem-B"],
  "confidence": 0.73,
  "impact_score": "high",
  "status": "active"
}
```

### 4.4 前端影响
- `api/dashboard.ts` 的 `mapInsight` 升级为 `fetchInsights`（列表）。
- 首页 `InsightCard` 展示 `title + related_ids` 跳转（已能跳 `aId/bId`，升级为 `related_ids[]`）。
- 用户可「接受/忽略」，洞察从此**可累积、可追溯**，不再每次刷新重算。

---

## 5. Recall Event（召回事件）

### 5.1 现状
- `/recall`：过滤 `completed + (unread|read) + 未静音`，按 `recall_score = 0.5^(days/half_life)` 降序取前 N。
- `/items/:id/recall`：只把 `last_recalled_at` 置为当前时间。
- 缺口：**无复习反馈、无历史、半衰期永不调整**——「看了就忘了」和「看了记住了」在系统里没有区别。

### 5.2 目标数据模型（新表 `recall_events`）

```sql
CREATE TABLE IF NOT EXISTS recall_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  memory_id    TEXT NOT NULL,
  triggered_by TEXT NOT NULL,       -- decay|schedule|manual|similar
  trigger_reason TEXT NOT NULL,     -- 人类可读，如「半衰期 60 天 · 已 12 天未复习」
  recall_score REAL NOT NULL,       -- 召回那一刻的分数（快照）
  feedback     TEXT,                -- again|good|easy（未复习为 NULL）
  created_at   TEXT NOT NULL,
  reviewed_at  TEXT                 -- 用户实际复习的时间
);
CREATE INDEX idx_recall_user ON recall_events(user_id, created_at DESC);
CREATE INDEX idx_recall_memory ON recall_events(memory_id);
```

### 5.3 API Contract

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/recall` | 今日召回队列（行为不变，返回里补 `next_review_at`） |
| POST | `/api/recall/:memoryId/review` | 复习反馈 `{ feedback: again|good|easy }` |
| GET | `/api/recall/events?memory_id=…` | 某记忆的召回历史（可选） |

**review 反馈 → 记忆调整规则（极简版，不照搬 SM-2）**

| difficulty | 语义 | `memory_strength` 变化 |
|---|---|---|
| `again` | 忘了，难 | ×0.6（下限 0.1） |
| `good` | 记住了 | 恢复到 0.9 |
| `easy` | 太简单 | 1.0 |

> 只调 `memory_strength`，**不改 `half_life`**（类别衰减速度保持稳定）。每次 review 同时：`review_count += 1`、写 `last_recalled_at`、按 `difficulty` 更新 `next_review_at`（again=1天后，good=half_life×0.5天后，easy=half_life×1.0天后）、在 `recall_events` 记一条记录。`difficulty` 存为 `recall_events.feedback`。

### 5.4 前端影响
- 回顾页每条记忆加「忘了 / 记住了 / 太简单」三个反馈按钮，点击调 `POST /api/recall/:id/review`。
- 这是「Why Now」从**静态公式**升级为**有反馈的主动唤醒**的关键一步（且完全真实，不编理由）。

---

## 6. Compose Context（创作上下文）

### 6.1 现状
`/compose` 只接受 `{ user_id, type, scene_id?, category?, topic? }`，内部对**全部 completed items** 组装 prompt，**不接受 `item_ids`**。前端 Phase 2.5 已做出「选记忆」UI，但选择目前无效（UI 已诚实标注）。

### 6.2 目标契约（不改表，改请求/响应，向后兼容）

**请求（新增可选字段，旧字段仍可用）**

```jsonc
{
  "user_id": "u...",
  "type": "article",                // 7 种之一
  "memory_ids": ["mem-A","mem-B","mem-C"],  // 新增：显式选择（可空=全库，兼容旧行为）
  "topic": "…",
  "tone": "专业|口语|种草",         // 新增：可选
  "audience": "…",                  // 新增：可选
  "length": "short|medium|long"     // 新增：可选
}
```

**响应（新增溯源字段）**

```jsonc
{
  "title": "…",
  "type": "article",
  "content": "…",
  "used_memory_ids": ["mem-A","mem-B","mem-C"],   // 新增：实际引用了哪些记忆
  "cited_atoms": [                                // 新增：引用的原子（溯源）
    { "memory_id": "mem-A", "atom_type": "key_point", "content": "…" }
  ],
  "token_estimate": 3420                          // 新增：实际消耗的上下文 token
}
```

### 6.3 上下文组装契约（`GET /api/compose/context`）

新增一个「预览」端点，让前端在创作前展示「AI 将引用这些原子」：

```jsonc
// GET /api/compose/context?memory_ids=a,b,c&topic=AI Agent创业
{
  "memory_ids": ["a","b","c"],
  "selected_atoms": [
    {
      "memory_id": "a",
      "title": "…",
      "context_score": 0.71,        // 排序/截断唯一依据（见下公式）
      "atoms": [{"type":"key_point","content":"…"}]
    }
  ],
  "token_estimate": 3420,           // 预估 token（超出则截断提示）
  "truncated": false
}
```

**Context Score（选择与截断的唯一依据，不是 memory_strength）**

```
context_score = 0.4 × relevance + 0.3 × memory_strength + 0.2 × recency + 0.1 × intent_match
```

| 因素 | 权重 | 含义 | 计算来源 |
|---|---|---|---|
| `relevance` | 0.4 | 与当前创作主题的相关度 | keyword/tag 命中（未来 embedding） |
| `memory_strength` | 0.3 | 长期价值 | items.memory_strength |
| `recency` | 0.2 | 近期关注 | 收藏时间归一化（越近越高） |
| `intent_match` | 0.1 | 与用户目的匹配 | 记忆 `intent` 与创作类型/主题的匹配 |

> 反例（为什么不能只看 strength）：用户要写「AI Agent 创业方案」，10 年前收藏的投资文章 strength=0.95，昨天存的 AI Agent 案例 strength=0.65——按 strength 会错选前者；Context Score 因 `relevance` 权重最高，会正确优先后者。

### 6.4 前端影响
- `api/create.ts` 的 `compose()` 增加 `memory_ids/tone/audience/length`。
- `CreateEditor` 把已选记忆真正传给后端（去掉「选择仅记录」的诚实提示，改为真实生效）。
- 创作结果下方显示「引用自 N 条记忆」+ 原子溯源，实现「把你看过的，变成你的」的可信闭环。

---

## 7. 前端-后端接口契约

### 7.1 命名与映射（铁律）

| 层 | 约定 | 示例 |
|---|---|---|
| 后端响应 | snake_case | `memory_strength`, `used_memory_ids` |
| 前端类型 | camelCase | `memoryStrength`, `usedMemoryIds` |
| 转换位置 | 只在前端 `src/api/*` 适配器 | `mapItem/mapInsight/...` |

### 7.2 前端新增类型（`types/brain.ts` 增强）

```ts
// 设计层形状，非实现
interface Item {           // 增强
  // ...现有字段
  memoryStrength: number | null
  reviewCount: number
  nextReviewAt: string | null
}
interface Relation {
  id: string; sourceId: string; targetId: string  // API 层映射；DB 存 left/right（min/max 规范化）
  type: 'similar'|'topic'|'support'|'contradict'|'derived'
  score: number; confidence: number; source: string; evidence: Record<string, unknown>
}
interface GraphNode { id: string; title: string; category: string | null; strength: number }
interface GraphEdge { id: string; source: string; target: string; type: string; score: number; confidence: number }
interface Insight {        // 增强：从单一连接 → 列表
  id: string; type: string; title: string; body: string
  relatedIds: string[]; confidence: number; impactScore: 'low'|'medium'|'high'
  status: 'active'|'accepted'|'dismissed'|'expired'
}
interface RecallEvent {
  id: string; memoryId: string; triggeredBy: string; triggerReason: string
  recallScore: number; feedback: 'again'|'good'|'easy'|null; createdAt: string
}
interface ComposeContext {
  memoryIds: string[]; selectedAtoms: unknown[]; tokenEstimate: number; truncated: boolean
}
```

### 7.3 错误契约（统一）

```jsonc
{ "error": "人类可读的中文错误信息" }
```

- 400：参数缺失/非法（`缺少 user_id`、`action 必须是 …`）
- 404：资源不存在（`未找到`）
- 500：LLM/服务器异常（带 message）
- 前端 `ApiError` 已按 status 分类，继续沿用，不新增错误结构。

---

## 8. Migration Plan（迁移计划）

> 原则：**全部加性迁移，零破坏**。旧表不动、旧端点行为保持，新能力逐步点亮。沿用 `db.ts` 的 `PRAGMA table_info` + `ALTER TABLE` / `CREATE TABLE IF NOT EXISTS` 模式。

### 8.1 阶段划分

| 阶段 | 内容 | 表/字段 | 风险 |
|---|---|---|---|
| **4.0 Schema** | 建 3 张新表 + items 加 3 列 | `relations`、`insights`、`recall_events`；`items.memory_strength/review_count/next_review_at` | 极低（加性） |
| **4.1 Relation** | `similar/topic` 关系生成（来源 `keyword`/`tag`，**禁 LLM**）+ `/api/relations` + `/api/graph`；从 `items.similar_items` 回填 | `relations` | 低（免费算法） |
| **4.2 Insight** | 洞察持久化 + `/api/insights` 列表 + 反馈 | `insights` | 低 |
| **4.3 Recall 闭环** | 复习反馈 + 半衰期调整 + `/recall/events` | `recall_events` + items 字段更新 | 中（改召回逻辑） |
| **4.4 Compose Context** | `/compose` 接 `memory_ids` + 溯源 + `/compose/context` | 无表改动 | 中（prompt 组装/截断） |
| **4.5（可选）** | LLM 推导 `support/contradict/derived` 关系、`opportunity` 洞察；**触发条件 = 用户量达标 或 用户主动点击「深度分析我的知识关系」** | `relations`/`insights` | 高（成本/质量） |

### 8.2 回填策略（Backfill）

1. **relations 回填**：遍历 `items.similar_items`（JSON），把每条相似关系转写为 `relations`（`type='similar'`, `source='ngram'`, `evidence={level, ngram}`），`status='active'`；幂等（按 `(source_id,target_id,type)` 去重）。
2. **insights 回填**：跑一次现有 `/insight` 的 O(n²) 逻辑，把 top-K 连接写入 `insights`（`type='connection'`），初始 `state='pending'`。
3. **memory_strength 回填**：`memory_strength = recall_score(created_at, half_life)`（一次性按当前公式初始化），之后由 review 动态修正。

### 8.3 兼容性

- 旧端点 `/api/insight`（单条）保留，前端逐步切到 `/api/insights`（列表），双轨过渡。
- `items.similar_items` 字段**保留**（不删），`relations` 与它并行一段时间，避免破坏现有详情页。
- `/api/compose` 旧调用（无 `memory_ids`）继续等价于「全库」，向前兼容。

### 8.4 回滚

- 所有迁移可逆（新表 drop 即可，items 新列留空无害）。
- 不写破坏性 `ALTER ... DROP COLUMN`（SQLite 也不支持）。

---

## 9. 证据链原则（不造假，贯彻到底）

每个智能产物都必须回答「AI 为什么这么说」：

| 产物 | 证据字段 | 前端展示 |
|---|---|---|
| Relation | `source` + `evidence` | 「共享标签 RAG · 相似度 73%」 |
| Insight | `related_ids` + `body` | 「关联到《RAG 入门》《向量数据库选型》，点击查看」 |
| Recall | `recall_score` 快照 + `triggered_by` + `trigger_reason` | 「半衰期 60 天 · 已 12 天未复习」 |
| Compose | `used_memory_ids` + `cited_atoms` | 「引用自 3 条记忆」+ 原子溯源 |

> 反向原则：**任何没有 `source`/`evidence` 的关系或洞察，不得渲染为「AI 发现」**。宁可显示「暂无连接」，也不显示假图谱。这正是 Clipbase 与普通收藏夹的分水岭。

---

## 10. 风险与决策点（待确认）

1. **LLM 关系推导的成本与质量**：`support/contradict/derived` 需要逐对调用 LLM（O(n²) 成本）。**决策**：V1 只做免费 `similar/topic`；LLM 推导留到 **Phase 4.5**，触发条件 = **用户量达标 或 用户主动点击「深度分析我的知识关系」**，且限额 + 缓存，不做全库自动。
2. **召回反馈的作用边界**：**只调 `memory_strength`，不改 `half_life`**（不照搬 SM-2 的复杂度）。`recall_score` 保持「衰减快照」用于排序，`memory_strength` 独立承载「被复习修正后的强度」，二者不互相污染。
3. **compose token 窗口**：选了 N 条记忆可能超出模型窗口。**决策**：`/compose/context` 先做 `token_estimate` 与 `truncated` 提示，超限时按 **`context_score` 降序截断**（§6.3 公式）——不是按 `memory_strength`，因为「强度 ≠ 当前任务相关」。
4. **图谱规模**：单用户 MVP 图很小（<1k 节点），前端直接渲染无压力；规模化再谈图数据库/布局算法。

---

## 附：术语表

| 术语 | 含义 |
|---|---|
| Memory | 一条被 AI 理解并纳入生命周期的收藏 |
| digest_state | 消化轴：unread/read/digested/internalized |
| half_life | 内容类别决定的衰减速度（天） |
| memory_strength | 当前记忆强度 0–1，随复习动态修正 |
| relation | 两条记忆间持久化的边 |
| insight | AI 发现的可持久化、可反馈的洞察 |
| recall event | 一次召回 + 复习反馈事件 |
| compose context | 创作时显式选择的记忆与上下文 |
