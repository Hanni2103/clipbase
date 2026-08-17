# Clipbase · AI 知识生命系统

> 把你看过的，变成你的。

Clipbase 是一个 **AI 知识生命系统（AI Memory OS）**：用户从任意平台（抖音/小红书/公众号/网页/图片）一键分享内容进来，AI 会**读懂、分类、提炼成原子卡片、建立关联、按半衰期管理记忆、主动唤醒复习、一键成文**——让收藏不再堆积，而是持续产生价值。

**不是「一个收藏资料的地方」，而是「一个会学习、会遗忘、会提醒、会成长的 AI 大脑」。**

---

## 六层飞轮

```
收集 → 精炼 → 组织 → 消化 → 创造 → 沉淀
 一键    原子化   场景+   做减法+   成文+   护城河
 分享    卡片    搜索    唤醒      分享
```

---

## 快速开始

```bash
cd clipbase
npm install

# 复制环境变量（可选，不配也能跑，用 mock 分类）
cp .env.example .env        # Windows: Copy-Item .env.example .env

npm start
```

- 后端：`http://localhost:3000`
- **Web 看板（AI Brain V2 首页）**：浏览器打开 `http://localhost:3000`
- 健康检查：`/health`（未配 Key 时返回 `mock:true`）
- 测试：`npm test`（需先启动服务）

## 配置大模型（可选）

编辑 `.env`，填任一家 OpenAI 兼容接口的 Key（DeepSeek/通义/豆包/Kimi 均可）：

```
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxxx
LLM_MODEL=deepseek-chat
VISION_MODEL=          # 图片 OCR 用的多模态模型（留空则图片分享标记待确认）
```

---

## API

### 收集
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/ingest` | 分享入口，返回 item_id + 精确重复 similar |

### 条目
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/items?user_id=xxx` | 列表（category/tag/q/scene_id 筛选）含原子卡片+相似条目 |
| GET | `/api/items/:id` | 详情含原子卡片+相似条目 |
| PATCH | `/api/items/:id` | 改分类/标签/动机/消化状态 |
| POST | `/api/items/:id/retry` | 重新入队 |
| POST | `/api/items/:id/scene` | 归入/移出场景 |
| POST | `/api/items/:id/similar-action` | 照镜子动作（review/create_scene/keep/mute）|
| POST | `/api/items/:id/recall` | 记录召回时间 |

### 场景 / 消化 / 洞察
| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | `/api/scenes` | 场景列表（含计数）/ 建场景 |
| POST | `/api/scenes/:id/archive` | 归档场景 |
| GET | `/api/scenes/suggestions` | 场景建议 |
| GET | `/api/recall` | 主动唤醒（待回顾）|
| GET | `/api/expired` | 做减法（过期建议归档）|
| GET | `/api/dashboard` | 首页聚合统计（含脑健康度）|
| GET | `/api/insight` | AI 洞察（知识关联）|

### 创造 / 搜索 / 偏好
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/compose` | 一键成文（type 参数，7 种类型）|
| GET | `/api/compose-types` | 创作类型列表 |
| GET | `/api/weekly` | 周报 |
| GET | `/api/search?q=xxx` | 语义近似搜索 |
| GET/PATCH | `/api/prefs` | 用户偏好（静音主题/提醒频率/时区）|

---

## 已实现范围

- ✅ 公众号/网页/纯文字 → 提取 + 分类
- ✅ 小红书 → 短链跳转 + meta 提取 + 分类（真实短链实测通过）
- ✅ 抖音 → 短链识别 + 反爬检测 + 分享文案兜底 + 文案清洗
- ✅ B站 → 短链跳转 + meta 提取
- ✅ 图片 → OCR 管道（配 VISION_MODEL）
- ✅ AI 精炼 → 原子卡片（要点/步骤/金句/数据）
- ✅ 场景化组织（建/归入/归档/自动建议）
- ✅ 照镜子相似提醒（精确/高度/主题相关三级）
- ✅ 语义近似搜索、收藏动机、半衰期、生命周期、主动唤醒、做减法
- ✅ 一键成文（7 种类型）+ 周报
- ✅ Web 看板（AI Brain V2 首页）+ Android（5 Tab 深色）+ iOS 源码
- ⏳ 视频号：暂不支持（浏览器基本打不开）

## 平台实测结果（真实短链）

| 平台 | 结果 | 说明 |
|---|---|---|
| 小红书 | ✅ | 短链跳转后服务端渲染 meta，无需 JS 即可提取 |
| 抖音 | ⚠️ | 反爬 JS 挑战页，纯 HTTP 抓不到正文；分享文案兜底可用 |
| B站 | 🟡 | 机制与小红书一致，未实测 |
| 公众号/网页 | ✅ | 公开网页直接抓正文 |
| 图片 | ✅ | OCR（需配多模态模型）|

## 目录结构

```
src/            后端（server/routes/pipeline/db + extractors/classifier/similar/halflife/composer）
public/         Web 看板（AI Brain V2 首页）
client/ios/     iOS 客户端（SwiftUI + Share Extension）
client/android/ Android 客户端（5 Tab 深色 + 分享接收）
docs/           产品架构文档 + 开发规范 + 早期设计文档
scripts/        自动化测试
```

## 合规底线（实现已内置）

只存「链接 + 摘要 + 标签 + 原子卡片」，不存原文/原视频/原图；对锁定平台只取标题/文案/摘要级公开信息，不绕登录、不去水印、不下载视频流。
