# UI 开发交接说明（给接手做 UI 的智能体）

> 请先读 `AGENTS.md`（开发规范）和 `docs/产品架构文档-V2.md`（产品架构），再动手。

## 任务

基于 Clipbase 现有后端 + 客户端，进行 **UI 开发**，把界面做到贴近参考图 `docs/ui-reference.png`。

## 项目定位

**AI 知识生命系统（AI Memory OS）**——不是「收藏工具」，是「会学习、会遗忘、会提醒、会成长的 AI 大脑」。

一句话：把你看过的，变成你的。

## 参考图

- `docs/ui-reference.png`：4 屏设计稿（首页 / 知识卡片 / Recall / 创造）
- 首页 V2 详细设计（AI 大脑核心球 / 记忆健康度 / AI 洞察）：见 `docs/产品架构文档-V2.md` §7

## 你要做的 UI（6 个页面）

1. **首页 V2**（AI 大脑）：核心球 + 脑健康度 + 三统计卡 + AI 状态（活跃/即将遗忘/沉睡）+ AI 今日建议 + Brain Activity
2. **知识库**：列表 + 快速收藏 + 搜索 + 分类筛选
3. **检索**：语义搜索
4. **创造**：7 种创作类型（深度文章/文案/小红书/视频脚本/周报/商业分析/思维导图）
5. **我的**：用户 + 统计
6. **知识卡片详情**：AI 摘要 + 原子卡片 + 关联知识（照镜子）+ 动机 + 消化状态 + 场景 + 标签编辑

## 三端现状

| 端 | 文件 | 现状 | 建议 |
|---|---|---|---|
| Web | `public/index.html` | 已实现 V2 首页骨架（AI 核心球/健康度/洞察）| 精修视觉（玻璃拟态/渐变/图标/动效）|
| Android | `client/android/` | 5 Tab 深色（XML）| 视觉还原度高需 **Jetpack Compose 重写** |
| iOS | `client/ios/` | SwiftUI | 需 Mac + Xcode 编译 |

## 后端已就绪（不用改）

所有数据接口已实现，见 `docs/产品架构文档-V2.md` §4（API 全景）。
- 后端：`cd clipbase && npm install && npm start`（跑在 `http://localhost:3000`）
- 首页数据：`/api/dashboard`（含 brain_health）、`/api/insight`（AI 关联洞察）

## 关键约定

- 后端字段是 **snake_case**（`source_platform`/`scene_id`/`digest_state`），两端客户端模型要同步（iOS `Item.swift`、Android `Item.kt`）
- 深色 AI 宇宙配色：背景 `#050816`，紫 `#8B5CF6`，记忆蓝 `#06B6D4`，成长绿 `#10B981`，警告 `#F59E0B`
- 不要引入重型依赖（见 AGENTS.md 红线）
- `.env` / token / `data/` / `build/` 绝不提交

## 验收标准

- 视觉接近参考图（深色 AI 宇宙、玻璃拟态、图标体系、动效：核心球发光/数字滚动/卡片上浮）
- 6 个页面齐全、数据正确
- 首页顶部标语是「你的 AI 大脑正在成长」，不是「知识库」
