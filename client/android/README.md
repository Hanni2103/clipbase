# Android 客户端构建说明

Clipbase Android 客户端：Kotlin + RecyclerView（列表/搜索/分类筛选）+ 详情编辑 + 分享接收 Activity。

## 目录结构

```
app/src/main/
  AndroidManifest.xml         清单（含分享接收 intent-filter、http 明文允许）
  java/com/clipbase/
    Item.kt                   数据模型 + 固定分类
    ApiClient.kt              OkHttp API 客户端 + user_id + 服务器地址
    MainActivity.kt           知识库列表（搜索/分类/下拉刷新）
    ItemDetailActivity.kt     详情 + 改分类/标签 + 打开链接 + 重试
    ShareActivity.kt          分享接收（EXTRA_TEXT → POST /api/ingest）
    ItemAdapter.kt            RecyclerView 适配器
  res/layout/                 三个布局
  res/values/                 字符串 + 主题
```

## 构建步骤

1. **导入工程**：Android Studio → Open → 选择 `client/android` 目录（含 `settings.gradle.kts`）。
2. 等待 Gradle 同步完成（会自动下载 AGP 8.5、Kotlin、OkHttp 等依赖）。
3. **改服务器地址**（`ApiClient.kt` 里的 `BASE_URL`）：
   - 模拟器：`http://10.0.2.2:3000`（默认，`10.0.2.2` 指向宿主机）
   - 真机：`http://<电脑局域网IP>:3000`（同一 WiFi）
4. 运行到模拟器或真机。

## 运行

1. 先启动后端：`cd clipbase && npm start`。
2. 运行 App → 主界面是空的知识库列表。
3. 打开任意 App（浏览器/抖音/小红书等）→ 分享 → 选 **Clipbase** → 自动收藏。
4. 回 App 下拉刷新，看到 AI 分类结果；点条目进详情可改分类/标签、打开原链接。

## 关键配置说明

- `usesCleartextTraffic="true"`：允许 http 明文（本地/局域网调试用；上生产建议换 https 并去掉）。
- 分享接收：`ShareActivity` 声明了 `text/plain` 和 `image/*` 两个 intent-filter；`EXTRA_TEXT` 里「标题 + 链接」混在一起，后端会自动拆出链接。
- user_id：存 `SharedPreferences("clipbase")`，首次生成，各 Activity 共用。

## 注意

- 首次分享后，主 App 需下拉刷新才能看到新条目。
- 图片分享（`image/*`）目前只接收 `EXTRA_STREAM` 的 URI，后端 OCR 需要 data URI，本地图片转 data URI 留待后续版本。
