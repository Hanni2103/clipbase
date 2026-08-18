# AGENTS.md — Clipbase 开发规范（给 AI 编码代理 / 协作者）

> 任何 AI 编码代理（Codex / Claude Code / DSH harness / 其他）在修改本仓库前，**必须先读本文件**。
> 产品定位与技术细节见 `docs/产品架构文档-V2.md`。

---

## 1. 项目是什么

Clipbase = **AI 知识生命系统（AI Memory OS）**。用户从任意平台分享内容进来，AI 读懂、分类、提炼原子卡片、建立关联、按半衰期管理记忆、主动唤醒复习、一键成文。

一句话：**把你看过的，变成你的。**

核心概念（贯穿所有代码）：
- **原子卡片（atom）**：收藏的基本单位是「要点/步骤/金句/数据」，不是整篇文章。
- **半衰期（half_life）**：内容会遗忘，按分类预设衰减（资讯 3 天 / 方法 60 天）。
- **召回（recall）**：主动唤醒用户复习，不是被动存储。
- **照镜子（similar）**：发现相似内容，提醒「你存过类似的」。

---

## 2. 技术栈（勿随意更换）

| 层 | 技术 | 版本/要求 |
|---|---|---|
| 后端 | Node + TypeScript + tsx + Express | Node **22+**（依赖 `node:sqlite`）|
| 存储 | SQLite（`node:sqlite`，原生）| 单用户 MVP；规模化再迁 pgvector |
| AI | OpenAI 兼容接口（DeepSeek/豆包/Kimi/通义）| 用 `fetch` 直接调，不引入 SDK |
| 网页提取 | cheerio | |
| Web | React 18 + Vite + Tailwind + Framer Motion + Lucide | 源码在 `client/web/`，dev 跑 Vite(5173) 代理 /api 到后端(3000) |
| Android | Kotlin + XML + Material + OkHttp | 编译：Gradle 8.10.2 + AGP 8.5 + JDK 17 |
| iOS | SwiftUI + URLSession | iOS 16+ |

**红线**：**后端**不要引入新的重型依赖（如 Prisma、Next.js、ORM），除非产品文档明确要求。**前端（Web）例外**：React + Vite + Tailwind + Framer Motion 是既定的 Web 技术栈，用于实现 AI 大脑的高质量动效。

---

## 3. 目录结构与模块边界

```
src/
  server.ts       入口（Express + 静态托管 public/ + 监听 0.0.0.0）
  config.ts       环境变量（唯一读 .env 的地方）
  types.ts        所有类型定义（新增字段先改这里）
  db.ts           SQLite 存储 + 自动迁移（唯一碰 SQL 的地方）
  routes.ts       REST 路由（唯一碰 HTTP 的地方）
  pipeline.ts     异步处理流水线（提取→分类→相似→存储）
  extractors/     提取器（每个平台一个文件，可插拔）
  classifier/     分类+精炼+动机（prompt.ts 是提示词，mock.ts 是兜底，index.ts 是调用）
  similar.ts      相似度引擎（哈希 + n-gram + 标签重合）
  halflife.ts     半衰期 + 召回分
  composer.ts     一键成文（7 种创作类型）
client/web/       Web 前端（React + Vite + Tailwind，AI Brain 首页）
client/ios/       iOS（SwiftUI + Share Extension）
client/android/   Android（5 Tab 深色 + 分享接收）
docs/             文档
scripts/smoke-test.ts  测试
```

**模块边界原则**：
- 加一个「数据字段」→ 改 `types.ts` + `db.ts`（表结构/迁移）+ `routes.ts`（若需暴露）。
- 加一个「平台」→ 在 `extractors/` 加一个文件 + 在 `extractors/index.ts` 注册 + `detect.ts` 加域名。
- 加一个「AI 能力」→ 改 `classifier/prompt.ts`（提示词）+ `classifier/index.ts`（解析）。

---

## 4. 关键约定

### 4.1 数据结构
- **一次 LLM 调用**并行产出「分类 + 原子卡片 + 动机」，不要为每个拆单独调用。
- 分类体系固定 10 类（`classifier/prompt.ts` 的 `VALID_CATEGORIES`），**禁止 AI 自造分类**。
- 原子类型固定 4 类（key_point/step/quote/fact）。
- 动机固定 5 类（do_it/insight/material/inspiration/fun）。

### 4.2 数据库迁移
- 现有库升级用**自动迁移**（`db.ts` 的 `initDb` 里 `PRAGMA table_info` 检查 + `ALTER TABLE`），**不要删库重建**。
- 新表用 `CREATE TABLE IF NOT EXISTS`。

### 4.3 相似度
- 三级判定：`content_hash`（精确）→ 文本 n-gram（近一样）→ 标签重合（同主题）。
- 公式在 `similar.ts`：`max(文本 n-gram, 标签重合 × 0.85)`。

### 4.4 半衰期
- 按分类预设，在 `halflife.ts`。召回分 `0.5^(天数/半衰期)`。

### 4.5 客户端与后端一致性
- 后端返回的字段是 **snake_case**（`source_platform`、`scene_id`、`digest_state`）。
- iOS 用 `.convertFromSnakeCase` 自动转；Android 用 `optString("xxx")` 手动映射。
- 后端加字段后，**两端客户端模型也要同步加**（iOS `Item.swift`、Android `Item.kt`）。

---

## 5. 运行 / 测试 / 构建

```bash
# 后端
cd clipbase
npm install
npm start              # 启动（读 .env，未配 Key 走 mock）
npm run dev            # 热重载
npm test               # 跑 smoke test（需先 start）
npm run typecheck      # tsc --noEmit

# Android 编译（需 JDK 17 + Android SDK + Gradle 8.10.2）
cd client/android
gradle assembleDebug   # 或完整路径 C:\Gradle\gradle-8.10.2\bin\gradle.bat

# Web 前端（React + Vite，源码在 client/web）
cd client/web
npm install
npm run dev            # dev 服务器 5173，/api 代理到后端 3000
npm run build          # 构建到 dist/
```

---

## 6. 敏感信息（最高优先级，违反即事故）

- **`.env`（含 API Key）绝不能提交**。已 gitignore。只提交 `.env.example`（空模板）。
- **任何 GitHub token / API Key / 密码**，绝不出现在代码、注释、日志、commit message 里。
- 修改后提交前，**必须**跑 `git status` 确认没有 `.env`、`data/`、`local.properties`、`build/` 被加入。

---

## 7. 本仓库的已知坑（务必避开）

1. **PowerShell 传中文会乱码**（变 `?`）：测试中文内容用 UTF-8 文件 + `curl --data-binary @file`，或用 `Invoke-RestMethod` + hashtable（纯 ASCII 时）。不要把中文直接写进 `pwsh -Command`。
2. **curl.exe 内联 JSON 会被 PowerShell 弄坏引号**：用 `--data-binary @file` 或 `Invoke-RestMethod`，别用 `-d '{"..."}'` 内联。
3. **Kotlin 支持嵌套块注释**：注释里不要写 `/*`（如 `image/*`），否则外层注释永远不闭合。
4. **Android 用系统占位图标**（`@android:drawable/...`），正式图标后续替换。
5. **Android 真机连后端**：APK 的 `ApiClient.BASE_URL` 指向局域网 IP（当前 `192.168.3.36:3000`），后端监听 `0.0.0.0`，需放行防火墙 3000 端口。
6. **iOS 需 Mac + Xcode 才能编译**；源码在 `client/ios/`，无法在 Windows 验证。

---

## 8. 新增功能的检查清单

- [ ] 改了 `types.ts` / `db.ts` / `routes.ts` 三处吗（字段贯穿）？
- [ ] `npm run typecheck` 通过？
- [ ] `npm test` 通过（24 项）？
- [ ] 客户端模型（iOS/Android）同步了吗？
- [ ] README / 架构文档需要更新吗？
- [ ] 没有敏感信息泄漏？

---

## 9. 北极星

产品定位、六层飞轮、数据模型、API 全景、V2 首页设计，全部见 `docs/产品架构文档-V2.md`。**任何新功能先对照它确认所处层级和优先级，避免功能堆砌。**
