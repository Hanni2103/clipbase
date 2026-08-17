# iOS 客户端构建说明

Clipbase iOS 客户端：SwiftUI 主 App（列表/详情/编辑）+ Share Extension（接收分享）。

## 目录结构

```
Clipbase/                     主 App 源码（拖进 Xcode 项目）
  ClipbaseApp.swift          入口
  Models/Item.swift          数据模型 + 固定分类
  Services/APIClient.swift   API 客户端 + 服务器地址 + user_id
  Views/ItemListView.swift    知识库列表（搜索/分类筛选/下拉刷新）
  Views/ItemDetailView.swift  详情 + 改分类/标签 + 打开原链接 + 重试
ShareExtension/
  ShareViewController.swift   分享扩展（接收 URL/文字 → POST /api/ingest）
  Info.plist                  分享扩展参考配置
```

## 构建步骤

1. **新建项目**：Xcode → File > New > Project → iOS App，命名 `Clipbase`，Interface 选 **SwiftUI**，Language 选 **Swift**。
2. **拖入源码**：把 `Clipbase/` 目录下的 5 个 `.swift` 文件拖进项目（勾选 target `Clipbase`）。
3. **新建 Share Extension**：File > New > Target → **Share Extension**，命名 `ShareExtension`；用 `ShareExtension/ShareViewController.swift` 替换自动生成的文件。
4. **配置 App Group**（两个 target 都要）：
   - 选中 target → Signing & Capabilities → `+ Capability` → **App Groups** → 添加 `group.com.clipbase`。
5. **配置分享扩展激活类型**：ShareExtension target 的 `Info.plist` 里 `NSExtension > NSExtensionAttributes` 添加：
   - `NSExtensionActivationSupportsWebURLWithMaxCount` = `1`
   - `NSExtensionActivationSupportsText` = `true`
   （见 `ShareExtension/Info.plist` 参考）
6. **允许 http（本地/局域网调试）**：主 App 的 `Info.plist` 添加 ATS 例外（见下方）。
7. **服务器地址**（`APIClient.swift` 和 `ShareViewController.swift` 里的 `baseURL`）：
   - **推荐：把后端也跑在这台 Mac 上**（`cd clipbase && npm start`），模拟器直接用 `http://127.0.0.1:3000`，无需改代码。
   - 后端在别的机器：改成那台机器局域网 IP（同一 WiFi）。

## ATS 例外（主 App 的 Info.plist）

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## 最低系统版本

iOS 16.0+（用到了 `LabeledContent` / `navigationDestination` / `searchable`）。

## 运行

1. 先启动后端：`cd clipbase && npm start`。
2. Xcode 里选模拟器运行主 App。
3. 打开 Safari/其他 App → 分享 → 选 **Clipbase**（分享扩展）→ 内容进入知识库。
4. 回主 App 下拉刷新，看到自动分类的结果。

## 注意

- 分享扩展是**独立进程**，user_id 通过 App Group 与主 App 共享，保证两边是同一个用户。
- 首次分享后，主 App 需下拉刷新（或重启）才能看到新条目。
