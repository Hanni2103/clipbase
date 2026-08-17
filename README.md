# Clipbase Server

跨平台内容收藏 + AI 分类知识库 —— 后端服务。用户从任意 App 分享内容 → 后端识别类型 → 提取文本 → AI 分类打标 → 存入个人知识库。

## 技术栈

- Node 24（原生 `node:sqlite`，无需外部数据库）
- TypeScript + tsx（直接运行，无需编译）
- Express + cheerio
- 大模型分类（OpenAI 兼容接口，DeepSeek/通义/豆包/Kimi 均可）；未配 Key 时用内置 mock 分类器

## 快速开始

```bash
cd clipbase
npm install

# 复制环境变量（可选，不配也能跑，用 mock 分类）
cp .env.example .env        # Windows: Copy-Item .env.example .env

npm start
# 或开发热重载：npm run dev
```

启动后访问 `http://localhost:3000/health` 应返回 `{"ok":true,"mock":true}`。

**Web 看板**：浏览器打开 `http://localhost:3000` 即可体验完整流程（收藏 → AI 精炼原子卡片 → 场景 → 照镜子相似提醒 → 搜索）。

运行测试（需先启动服务）：`npm test`

## 配置大模型（可选）

编辑 `.env`，填入任一家 OpenAI 兼容接口的 Key：

```
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-xxxx
LLM_MODEL=deepseek-chat

# 图片 OCR 用的多模态模型（留空则图片分享标记 needs_review）
VISION_MODEL=
```

填入 Key 后重启，`/health` 返回 `mock:false`，分类走真实大模型。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/ingest` | 分享入口：接收 payload，异步分类，返回 item_id + 精确重复 `similar` |
| GET | `/api/items?user_id=xxx` | 列表（支持 `category`/`tag`/`q`/`scene_id` 筛选 + 分页），含原子卡片与相似条目 |
| GET | `/api/items/:id` | 单条详情（含原子卡片 + 相似条目） |
| PATCH | `/api/items/:id` | 用户手动改分类/标签 |
| POST | `/api/items/:id/retry` | 重新入队 |
| POST | `/api/items/:id/scene` | 条目归入/移出场景 |
| GET | `/api/scenes?user_id=xxx` | 场景列表（含条目计数） |
| POST | `/api/scenes` | 建场景 |
| POST | `/api/scenes/:id/archive` | 归档场景 |
| GET | `/api/scenes/suggestions?user_id=xxx` | 场景建议（分类聚合计数） |
| GET | `/api/search?user_id=xxx&q=xxx` | 语义近似搜索（n-gram + 关键词） |

### 示例

```bash
# 分享一个网页
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"user_id":"demo","url":"https://example.com/article","title":"某篇文章"}'

# 分享纯文字（Android 会把标题+链接混在 text 里，后端自动拆）
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"user_id":"demo","text":"空气炸锅做的脆皮五花肉绝了 https://v.douyin.com/xxx/"}'

# 查列表（等 2~3 秒分类完成后）
curl "http://localhost:3000/api/items?user_id=demo"

# 手动改分类
curl -X PATCH http://localhost:3000/api/items/<id> \
  -H "Content-Type: application/json" \
  -d '{"category":"美食","tags":["空气炸锅","五花肉"]}'
```

## 状态机

```
pending → processing → completed
                     → needs_review（文本过短 / 置信度<0.6）
                     → failed（抓取或分类失败）
```

## 目录结构

```
src/
  server.ts           入口
  config.ts           环境变量
  types.ts            类型定义
  db.ts               SQLite 存储 + 状态机
  routes.ts           REST API
  pipeline.ts         异步队列：提取 + 分类
  extractors/
    detect.ts         域名识别平台
    fetch.ts          拉取 HTML（跟随短链跳转）
    meta.ts           meta 字段抽取（抖音/小红书/B站通用）
    web.ts            通用网页提取
    wechat.ts         公众号提取（#js_content）
    douyin.ts         抖音提取器
    xiaohongshu.ts    小红书提取器
    bilibili.ts       B站提取器
    image.ts          图片 OCR（多模态大模型）
    index.ts          路由入口
  classifier/
    prompt.ts         System Prompt + few-shot
    mock.ts           关键词 mock 分类器
    index.ts          LLM 调用 + 结构化解析
scripts/
  smoke-test.ts       自动化测试（单元 + 集成）
client/
  ios/                iOS Share Extension 参考
  android/            Android 分享 Activity 参考
```

## 已实现范围

- ✅ 公众号 / 通用网页 / 纯文字 → 提取 + 分类
- ✅ 小红书 → 短链跳转 + meta 提取 + 分类（真实短链实测通过）
- ✅ 抖音 → 短链识别 + 反爬挑战检测 + 分享文案兜底 + 文案清洗
- ✅ B站 → 短链跳转 + meta 提取
- ✅ 图片 → OCR 管道（配 `VISION_MODEL` 用多模态大模型识别）
- ✅ **AI 精炼 → 原子卡片**（要点/步骤/金句/数据）
- ✅ **场景化组织**（建场景 / 归入 / 归档 / 自动建议）
- ✅ **照镜子相似提醒**（精确/高度/主题相关三级判定）
- ✅ **语义近似搜索**（n-gram + 关键词）
- ✅ 分享文案自动清洗、重试接口、手动改分类、分类筛选
- ✅ **Web 看板**（浏览器直接体验完整流程）
- ⏳ 视频号：暂不支持（浏览器基本打不开）

## 平台实测结果（真实短链验证）

用真实分享短链实测各平台：

| 平台 | 结果 | 说明 |
|---|---|---|
| 小红书 | ✅ 可用 | 短链跳转后是服务端渲染 meta（`og:title`/`og:description`），无需 JS 即可提取标题 + 正文预览 |
| 抖音 | ⚠️ 部分可用 | 跳转后返回**反爬 JS 挑战页**（`_$jsvmprt` 混淆 VM），纯 HTTP 抓不到正文；但**分享文案兜底可用**（分享面板自带文案时分类正常） |
| B站 | 🟡 未实测 | 机制与小红书一致（meta 提取），未用真实短链验证 |
| 公众号 / 网页 | ✅ 可用 | 公开网页直接抓正文 |
| 图片 | ✅ 可用 | OCR（需配多模态模型） |

### 抖音的边界

抖音对非浏览器请求统一返回反爬挑战页，**服务端"安全抓取"正文不可行**（已实测 `iesdouyin.com` 老端点、Referer/UA/参数变体均无效）。可选路径：

- ✅ 安全：分享文案兜底（已内置 + 自动清洗话术）、截图 OCR（用户主动分享截图）
- 🔴 踩线（不建议）：无头浏览器执行 JS、逆向 `X-Bogus`/`a_bogus` 签名、第三方「解析」API —— 维护成本高、法律风险高

## 合规底线（实现已内置）

只存「链接 + 摘要 + 标签」，不存原文/原视频/原图；对锁定平台只取标题/文案/摘要级公开信息，不绕登录、不去水印、不下载视频流。
