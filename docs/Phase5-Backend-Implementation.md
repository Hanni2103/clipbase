# Clipbase Phase 5 — Backend Implementation Plan

> 本文档冻结 Phase 4 的**工程实施方案**。只定方案，不写实现代码（路由/服务函数体不在此处）。
> 依赖：`docs/Phase4-后端智能契约设计.md`（已按批准版更新）。所有字段 snake_case，前端 camelCase 在 `src/api/*` 转换。

---

## 0. 范围与冻结原则

- **范围**：Phase 4.0 Schema + 4.1 Relation + 4.2 Insight + 4.3 Recall 闭环 + 4.4 Compose Context。**4.5 LLM Relation 不在本期**。
- **迁移铁律**：全部加性，`CREATE TABLE IF NOT EXISTS` + `ALTER TABLE`（沿用 `db.ts` 的 `PRAGMA table_info` 模式），零破坏，可回滚。
- **模块边界**（沿用 AGENTS.md）：`db.ts` 是唯一碰 SQL 的地方；`routes.ts` 唯一碰 HTTP；新增 `services/` 承载纯逻辑（无 SQL、无 HTTP）。
- **证据链**：每个关系/洞察携带 `source`+`evidence`，无证据不产出。

---

## 1. 数据库 Migration SQL

> 在 `db.ts` 的 `initDb` 内、现有建表语句之后追加；对旧库用 `PRAGMA table_info` 判定后 `ALTER TABLE`。

```sql
-- ===== Phase 4.0：items 加列（加性） =====
ALTER TABLE items ADD COLUMN memory_strength REAL;               -- 0–1，NULL=未初始化
ALTER TABLE items ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE items ADD COLUMN next_review_at TEXT;                -- ISO 时间
-- 注：last_recalled_at 已存在，无需迁移

-- ===== Phase 4.0：relations =====
CREATE TABLE IF NOT EXISTS relations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  left_memory_id  TEXT NOT NULL,             -- 规范化：min(id)，无向类型方向无关
  right_memory_id TEXT NOT NULL,             -- 规范化：max(id)
  type            TEXT NOT NULL CHECK (type IN ('similar','topic','support','contradict','derived')),
  score           REAL NOT NULL,             -- 0–1 相似度/强度
  confidence      REAL NOT NULL,             -- 0–1 置信度（确定性来源=score）
  source          TEXT NOT NULL CHECK (source IN ('embedding','keyword','tag','llm')),
  evidence        TEXT NOT NULL,             -- JSON 证据
  status          TEXT NOT NULL DEFAULT 'active', -- active|dismissed
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_relations_user ON relations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relations_left ON relations(left_memory_id);
CREATE INDEX IF NOT EXISTS idx_relations_right ON relations(right_memory_id);
-- 无向去重：A↔B 视为同一条（left=min, right=max）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_relation_pair ON relations(user_id, left_memory_id, right_memory_id, type);

-- ===== Phase 4.0：insights =====
CREATE TABLE IF NOT EXISTS insights (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('pattern','connection','trend','opportunity')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  related_ids  TEXT NOT NULL,                -- JSON 数组
  confidence   REAL NOT NULL,
  impact_score TEXT NOT NULL DEFAULT 'medium', -- low|medium|high
  status       TEXT NOT NULL DEFAULT 'active', -- active|accepted|dismissed|expired
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insights_user ON insights(user_id, created_at DESC);

-- ===== Phase 4.0：recall_events =====
CREATE TABLE IF NOT EXISTS recall_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  memory_id    TEXT NOT NULL,
  triggered_by TEXT NOT NULL,                -- decay|schedule|manual|similar
  trigger_reason TEXT NOT NULL,              -- 人类可读，如「半衰期 60 天 · 已 12 天未复习」
  recall_score REAL NOT NULL,                -- 召回时刻快照
  feedback     TEXT,                         -- again|good|easy（未复习为 NULL）
  created_at   TEXT NOT NULL,
  reviewed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_recall_user ON recall_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recall_memory ON recall_events(memory_id);
```

**回填（Backfill，一次性，幂等）**

1. `memory_strength`：`UPDATE items SET memory_strength = recall_score(created_at, half_life)`（对 `half_life` 非空且 `status='completed'`）。
2. `relations`：遍历 `items.similar_items` JSON，转写为 `(left_memory_id=min(id,similar.id), right_memory_id=max(id,similar.id), type='similar', score=similar.similarity, confidence=similar.similarity, source='keyword', evidence={level})`；`uniq_relation_pair` 幂等（A↔B 只留一条）。
3. `insights`：跑一次现有 `/insight` 的 O(n²) 逻辑，把 top-K 连接写入 `insights`（`type='connection'`）。

---

## 2. API Endpoint 变化

### 新增端点

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/relations?user_id=&memory_id=&type=` | 关系列表 |
| GET | `/api/graph?user_id=` | 图谱 `{nodes, edges}`（只 active） |
| PATCH | `/api/relations/:id` | `{ status: dismissed }` |
| GET | `/api/insights?user_id=&status=` | 洞察列表 |
| GET | `/api/insights/:id` | 单条洞察 |
| PATCH | `/api/insights/:id` | `{ status: accepted|dismissed }` |
| POST | `/api/insights/generate` | 幂等触发生成 |
| POST | `/api/recall/:memoryId/review` | `{ feedback: again|good|easy }` |
| GET | `/api/recall/events?user_id=&memory_id=` | 召回历史 |
| GET | `/api/compose/context?user_id=&memory_ids=&topic=` | 上下文预览 |

> `POST /api/relations/derive`（LLM 推导）**本期不实现**，占位返回 501。

### 变更端点

| 端点 | 变更 |
|---|---|
| `GET /api/items` | 响应项增加 `memory_strength/review_count/next_review_at` |
| `GET /api/items/:id` | 同上 |
| `POST /api/compose` | 请求增 `memory_ids/tone/audience/length`；响应增 `used_memory_ids/cited_atoms/token_estimate` |
| `GET /api/insight` | 保留（兼容），内部改为读 `insights` 表；前端逐步切 `/api/insights` |

### 错误契约（沿用）

```jsonc
{ "error": "中文可读信息" }
```

---

## 3. Model Schema（前后端类型）

### 3.1 后端 `src/types.ts` 新增

```ts
// 设计形状，非实现
export interface Relation {
  id: string; user_id: string
  // API 层：DB 存 left/right（min/max 规范化），读取映射回 source_id/target_id
  source_id: string; target_id: string
  type: 'similar' | 'topic'
  score: number; confidence: number
  source: 'embedding' | 'keyword' | 'tag' | 'llm'
  evidence: Record<string, unknown>
  status: 'active' | 'dismissed'
  created_at: string; updated_at: string
}

export interface Insight {
  id: string; user_id: string
  type: 'pattern' | 'connection' | 'trend' | 'opportunity'
  title: string; body: string
  related_ids: string[]
  confidence: number
  impact_score: 'low' | 'medium' | 'high'
  status: 'active' | 'accepted' | 'dismissed' | 'expired'
  created_at: string; updated_at: string
}

export interface RecallEvent {
  id: string; user_id: string; memory_id: string
  triggered_by: 'decay' | 'schedule' | 'manual' | 'similar'
  trigger_reason: string
  recall_score: number
  feedback: 'again' | 'good' | 'easy' | null
  created_at: string; reviewed_at: string | null
}

export interface ComposeContextResult {
  memory_ids: string[]
  selected_atoms: { memory_id: string; title: string; context_score: number; atoms: AtomInput[] }[]
  token_estimate: number
  truncated: boolean
}
```

### 3.2 前端 `src/types/brain.ts` 新增

```ts
// 设计形状，非实现
interface Item { /* ...现有 */ memoryStrength: number | null; reviewCount: number; nextReviewAt: string | null }
interface Relation { id; sourceId; targetId; type; score; confidence; source; evidence }
interface GraphNode { id; title; category; strength }
interface GraphEdge { id; source; target; type; score; confidence }
interface Insight { id; type; title; body; relatedIds; confidence; impactScore; state }
interface RecallEvent { id; memoryId; triggeredBy; recallScore; feedback; createdAt }
interface ComposeContext { memoryIds; selectedAtoms; tokenEstimate; truncated }
```

---

## 4. Service Layer

新增 `src/services/`（纯逻辑，不碰 SQL/HTTP，只调用 `db.ts` 暴露的函数）：

| 文件 | 职责 | 关键函数签名（设计） |
|---|---|---|
| `services/memory.ts` | 强度初始化/更新 | `initStrength(item)`, `applyReview(item, difficulty)` |
| `services/relation.ts` | 关系引擎（见 §5） | `buildRelations(userId)`, `relateNewItem(userId, itemId)`, `toGraph(userId)` |
| `services/insight.ts` | 洞察生成/持久化 | `generateConnections(userId)`, `listInsights(userId, state)` |
| `services/recall.ts` | 召回调度（见 §6） | `buildQueue(userId)`, `review(memoryId, difficulty)` |
| `services/compose-context.ts` | 上下文组装（见 §7） | `buildContext(userId, opts)`, `contextScore(memory, topic)` |

**边界**：`routes.ts` 只做参数解析 + 调 service + 返回 JSON；`services/` 只做逻辑 + 调 `db.ts`。新增字段的读写统一加在 `db.ts`（如 `getRelations/upsertRelation/setMemoryStrength/insertRecallEvent`）。

---

## 5. Relation Engine 设计

### 5.1 数据流

```
ingest 完成（pipeline 结束）
        │
        ▼
relateNewItem(newItem, 现有 completed items)
        │
        ├── exact：content_hash 命中 → 不建边（已在 /ingest 返回）
        ├── similar：char n-gram Jaccard(title+summary) ≥ 阈值 → source='keyword'
        └── topic：tag overlap ≥ 阈值 → source='tag'
        │
        ▼
upsert relations（UNIQUE 幂等）＋ evidence
```

### 5.2 规则

| type | 算法（复用 `similar.ts`） | 阈值 | source | confidence |
|---|---|---|---|---|
| `similar` | `combinedSimilarity` ≥ 0.5 | 0.5 | `keyword` | = score |
| `topic` | `tagOverlap` ≥ 0.5（去重后独立建边） | 0.5 | `tag` | = score |

- **evidence** 示例：`similar → {"ngram":0.73, "overlap_words":[...]}`；`topic → {"shared_tags":["RAG"]}`。
- **无向规范化（防重复边）**：写入前 `left=min(a,b)`、`right=max(a,b)`，A↔B 只存一条；`UNIQUE(user_id,left,right,type)` 兜底。方向性类型（4.5 的 support/contradict/derived）届时再加方向列。
- **增量优先**：入库时只算「新条目 vs 存量」，避免全库 O(n²)。全库重建 `buildRelations` 仅在回填/修复时跑一次。
- **图谱**：`nodes` = completed items 投影（id/title/category/strength=memory_strength）；`edges` = `relations` 中 `status='active'`。**不产出无 source 的边**。

### 5.3 复杂度与护栏

- 单用户 <1k 条目：增量 O(n) 每次 ingest 足够；全库 O(n²) 仅一次性。
- 上限：每条目最多存 top-K（默认 5）条关系，避免边爆炸。

---

## 6. Recall Scheduler 设计

### 6.1 队列生成（懒计算，无 cron）

`GET /api/recall` 逻辑（沿用现有 + 补字段）：

```
completed + (digest_state ∈ unread|read) + 未静音
  → 计算 recall_score = 0.5^(days/half_life)（快照）
  → 若 next_review_at 已到期（≤ now）优先置顶
  → 按 recall_score 降序，取前 N
```

### 6.2 复习闭环 `review(memoryId, difficulty)`

```
difficulty = again | good | easy
  again → memory_strength = max(0.1, s × 0.6); next_review_at = now + 1d
  good  → memory_strength = 0.9;               next_review_at = now + half_life×0.5 d
  easy  → memory_strength = 1.0;               next_review_at = now + half_life×1.0 d
  （half_life 不变）

同时：review_count += 1
      last_recalled_at = now
      recall_events 插入一条（feedback=difficulty, recall_score=当时快照）
```

### 6.3 语义分工（关键）

| 字段 | 语义 | 谁改 |
|---|---|---|
| `recall_score` | 衰减快照（排序用） | 每次实时算，不改表 |
| `memory_strength` | 被复习修正的强度 | review 时改 |
| `half_life` | 类别衰减速度 | 永不改（除非 Phase 4.5） |

---

## 7. Compose Context Builder 设计

### 7.1 流程

```
POST /api/compose { memory_ids?, type, topic?, tone?, audience?, length? }
        │
        ▼
buildContext(userId, opts)
  ├── 选源：memory_ids 非空 → 用它们；否则 → 全库 completed（兼容旧行为）
  ├── 取 atoms（getAtomsForItems）
  ├── 逐条算 context_score（§7.2）
  ├── 按 context_score 降序
  ├── 按 token 预算截断（§7.3）
  ├── 组装 prompt（composer.buildUserPrompt 扩展 tone/audience/length）
  └── 返回 used_memory_ids + cited_atoms（= 实际进入 prompt 的原子）+ token_estimate
```

### 7.2 Context Score

```
context_score = 0.4×relevance + 0.3×memory_strength + 0.2×recency + 0.1×intent_match
```

| 因素 | 计算 |
|---|---|
| relevance | topic/type 关键词 vs 记忆 title/tags/summary 的 n-gram 命中（未来 embedding） |
| memory_strength | 直接读 items.memory_strength（NULL 则用 recall_score 兜底） |
| recency | 1 / (1 + 收藏天数/30) 归一化 |
| intent_match | 记忆 intent 与创作 type 的映射表命中（如 xiaohongshu→material/inspiration 加分） |

### 7.3 Token 预算与截断

- 预算：模型上下文上限 × 0.5（留给 system + 生成空间）。
- 粗估：中文按「字符数 / 1.5 ≈ token」估；逐条累加 `selected_atoms` 直到超预算。
- 超限：停止加入后续记忆，`truncated=true`；`token_estimate` 返回最终实际量。
- `/api/compose/context` 与 `/api/compose` 复用同一 builder，保证预览=实际。

### 7.4 溯源（信任闭环）

`cited_atoms` 只包含**真正进入 prompt** 的原子；`used_memory_ids` 与之对应。前端据此渲染「本文由以下记忆生成 → Memory A/B + 引用 Atom 1/3」。

---

## 8. 前端需要同步修改的位置

| 文件 | 改动 |
|---|---|
| `src/types/brain.ts` | 新增 §3.2 类型；`Item` 加 3 字段 |
| `src/api/memory.ts` | `mapItem` 加 `memoryStrength/reviewCount/nextReviewAt` |
| `src/api/relations.ts` | **新**：`fetchRelations/fetchGraph/dismissRelation` |
| `src/api/dashboard.ts` | `fetchInsight` → `fetchInsights`（列表 + state 过滤 + 反馈） |
| `src/api/recall.ts` | 新增 `reviewMemory(memoryId, feedback)`；`fetchRecallEvents` |
| `src/api/create.ts` | `compose()` 加 `memory_ids/tone/audience/length` + 解析 `used_memory_ids/cited_atoms/token_estimate`；新增 `fetchComposeContext()` |
| `src/components/ItemCard.tsx` | 生命周期条改用 `memoryStrength` 驱动（随复习回升） |
| `src/pages/MemoryDetail.tsx` | 「相关知识」改读 `relations`（显示 type + confidence + evidence） |
| `src/pages/Recall.tsx` | 每条加「忘了/记住了/太简单」→ `reviewMemory` |
| `src/pages/Insight.tsx` | 洞察列表 + impact_score + accept/dismiss |
| `src/pages/Home.tsx` | `InsightCard` 接洞察列表 |
| `src/pages/CreateEditor.tsx` | 真正传 `memory_ids`；展示 `token_estimate`「AI Context: 3420 tokens / 预计生成 2000 字」；结果下方展示 `cited_atoms` 溯源；移除「选择仅记录」提示 |

---

## 9. 测试计划

### 9.1 单元测试（`scripts/` 或独立 test 文件）

| 模块 | 用例 |
|---|---|
| `relation.ts` | similar/topic 阈值判定、evidence 结构、UNIQUE 幂等、confidence=score |
| `recall.ts` | difficulty→strength 三态、next_review_at 三档、half_life 不变 |
| `compose-context.ts` | context_score 四因子、token 预算截断、truncated 标志、cited_atoms=实际入 prompt |
| `halflife.ts` | 现有 recall_score 不回归 |

### 9.2 迁移测试

- 用旧 schema 的 `data/*.db` 起库 → `initDb` 迁移 → 断言：旧数据完整、新列/新表存在、回填正确、二次启动幂等。

### 9.3 集成测试（扩展 `scripts/smoke-test.ts`，现有 24 项 → 新增）

- `/api/relations`、`/api/graph`、`/api/insights` 列表 + 反馈、`/api/recall/:id/review` 后 `memory_strength/review_count/next_review_at` 变化、`/api/compose` 带 `memory_ids` 返回 `used_memory_ids/cited_atoms/token_estimate`、`/api/compose/context` 预览一致。

### 9.4 前端验证

- `npx tsc --noEmit` + `npm run build` 通过。
- 手动：Recall 反馈按钮→strength 变化；Create 页 token 显示；Insight 接受/忽略。

### 9.5 可信度人工检查（护城河）

- 断言：`relations` 无 `source` 的行 = 0；`insights` 无 `related_ids` 的行 = 0；`cited_atoms` 必 ⊆ 用户选中的记忆原子。

---

## 10. AI Trust & Explainability（AI 可信与可解释）

> 这是 Clipbase 与普通收藏夹 / AI 聊天工具的最大差异化。**所有 AI 输出必须可解释**，形成「数据 → 关系 → 洞察 → 生成 → 解释」的完整证据链。

| AI 输出 | 必须有 | 前端展示 |
|---|---|---|
| Insight | `relation source` / `evidence` | 「关联到《A》《B》，共享标签 RAG」 |
| Compose | `cited_atoms` + `used_memory_ids` | 「本次创作依据：Memory 3 条 / Atoms 12 个 / 来源：公众号 2 篇 · 网页 1 篇 / 生成可信度：高」 |
| Recall | `trigger_reason` | 「半衰期 60 天 · 已 12 天未复习 · 建议今天复习」 |
| Relation | `source` + `confidence` + `evidence` | 「相似度 92% · 共享标签 RAG」 |

**强制规则**

1. 无 `source`/`evidence` 的关系 → 不产出、不渲染为「AI 发现」。
2. `/compose/context` 与 `/compose` 复用同一 builder：**预览 = 实际**，杜绝「预览引用 A B C、实际模型重新搜索」。
3. 未来 Compose 结果页展示「本次创作依据」卡片（Memory 数 / Atoms 数 / 来源分布 / 生成可信度），成为高级能力。
4. 测试层硬断言（见 §9.5）：`relations` 无 source 行 = 0、`insights` 无 related_ids 行 = 0、`cited_atoms` ⊆ 选中记忆原子。

## 11. 实施顺序与验收标准

| 步骤 | 交付 | 验收 |
|---|---|---|
| 5.0 Schema + 回填 | 迁移跑通、旧库无损 | 迁移测试过 |
| 5.1 Relation + Graph | `/api/relations` `/api/graph` | 集成测试过；图谱无假边 |
| 5.2 Insight 持久化 | `/api/insights` + 反馈 | 列表/反馈测试过 |
| 5.3 Recall 闭环 | review 端点 + 强度更新 | 复习后 strength 变化正确 |
| 5.4 Compose Context | `memory_ids` + 溯源 + token | 预览=实际；cited 溯源正确 |
| 5.5 前端同步 | 8 处改动 | tsc + build 过 |

> 每步独立可上线，不互相阻塞；全部加性，随时可停。

---

## 附：本期明确不做（冻结）

- ❌ LLM Relation 推导（`support/contradict/derived`）—— Phase 4.5，触发条件已定义。
- ❌ `embedding` 语义向量—— 待可用向量模型（豆包 embedding 此前不可用）。
- ❌ 登录/多端/图谱大图布局/推送 cron—— 均不在本期。
