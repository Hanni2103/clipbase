import SwiftUI

struct ItemDetailView: View {
    let itemId: String
    @State private var item: Item?
    @State private var scenes: [Scene] = []
    @State private var selectedCategory = "其他"
    @State private var selectedIntent = "insight"
    @State private var selectedDigest = "unread"
    @State private var selectedScene: String? = nil
    @State private var tagsText = ""
    @State private var saving = false
    @State private var saveMessage: String?

    var body: some View {
        Group {
            if let item {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        // 标题 + 元信息
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.title ?? "(无标题)").font(.title3).fontWeight(.semibold)
                            HStack(spacing: 6) {
                                badge(PlatformLabels[item.sourcePlatform] ?? item.sourcePlatform)
                                if let category = item.category { badge(category, color: .blue) }
                                if let intent = item.intent { badge("动机:\(IntentLabels[intent] ?? intent)") }
                                badge(DigestLabels[item.digestState ?? "unread"] ?? "未看")
                            }
                        }

                        // 原链接
                        if let url = item.originalUrl, !url.isEmpty {
                            Link(destination: URL(string: url)!) {
                                Label("打开原链接", systemImage: "safari").font(.subheadline)
                            }
                        }

                        // 摘要
                        if let summary = item.summary, !summary.isEmpty {
                            Text(summary).font(.subheadline).foregroundColor(.secondary)
                        }

                        // 原子卡片
                        if let atoms = item.atoms, !atoms.isEmpty {
                            sectionHeader("原子卡片")
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(atoms) { atom in
                                    HStack(alignment: .top, spacing: 8) {
                                        Text(AtomTypeLabels[atom.type] ?? atom.type)
                                            .font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.1)).foregroundColor(.blue).clipShape(RoundedRectangle(cornerRadius: 4))
                                        Text(atom.content).font(.subheadline)
                                    }
                                }
                            }
                            .padding(12)
                            .background(Color(.systemGray6)).cornerRadius(8)
                        }

                        // 照镜子
                        if let similar = item.similarItems, !similar.isEmpty {
                            sectionHeader("📌 你存过 \(similar.count) 条类似内容")
                            VStack(alignment: .leading, spacing: 6) {
                                ForEach(similar) { s in
                                    HStack {
                                        Text(s.title ?? "(无标题)").font(.subheadline).lineLimit(1)
                                        Spacer()
                                        Text(levelLabel(s.level)).font(.caption2).foregroundColor(.orange)
                                    }
                                }
                            }
                            .padding(12).background(Color.orange.opacity(0.08)).cornerRadius(8)
                        }

                        // 编辑区
                        sectionHeader("分类与标签")
                        Picker("分类", selection: $selectedCategory) {
                            ForEach(Category.all, id: \.self) { Text($0) }
                        }
                        Picker("动机", selection: $selectedIntent) {
                            ForEach(IntentLabels.keys.sorted(), id: \.self) { Text(IntentLabels[$0] ?? $0) }
                        }
                        Picker("消化状态", selection: $selectedDigest) {
                            ForEach(DigestLabels.keys.sorted(), id: \.self) { Text(DigestLabels[$0] ?? $0) }
                        }
                        TextField("标签（逗号分隔）", text: $tagsText)
                            .textFieldStyle(.roundedBorder)

                        // 场景
                        if !scenes.isEmpty {
                            Picker("场景", selection: $selectedScene) {
                                Text("未分类").tag(String?.none)
                                ForEach(scenes) { s in
                                    Text("\(s.emoji ?? "") \(s.name)").tag(String?.some(s.id))
                                }
                            }
                        }

                        Button(saving ? "保存中…" : "保存") { Task { await save() } }
                            .buttonStyle(.borderedProminent)
                            .disabled(saving)
                        if let saveMessage {
                            Text(saveMessage).font(.caption).foregroundColor(.secondary)
                        }

                        if item.status == "needs_review" || item.status == "failed" {
                            Button("重新处理") { Task { await retry() } }
                        }
                    }
                    .padding()
                }
                .navigationTitle(item.title ?? "详情")
            } else {
                ProgressView()
            }
        }
        .task { await load() }
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text).font(.headline)
    }

    private func badge(_ text: String, color: Color = .gray) -> some View {
        Text(text).font(.caption2).padding(.horizontal, 8).padding(.vertical, 3)
            .background(color.opacity(0.12)).foregroundColor(color).clipShape(Capsule())
    }

    private func levelLabel(_ level: String) -> String {
        switch level {
        case "exact": return "完全重复"
        case "high": return "高度相似"
        case "related": return "主题相关"
        default: return level
        }
    }

    private func load() async {
        do {
            item = try await APIClient.shared.fetchItem(id: itemId)
            scenes = (try? await APIClient.shared.fetchScenes()) ?? []
            if let item {
                selectedCategory = item.category ?? "其他"
                selectedIntent = item.intent ?? "insight"
                selectedDigest = item.digestState ?? "unread"
                selectedScene = item.sceneId
                tagsText = item.tags.joined(separator: ", ")
            }
        } catch {}
    }

    private func save() async {
        saving = true
        let tags = tagsText.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        do {
            item = try await APIClient.shared.updateItem(id: itemId, category: selectedCategory, tags: tags, intent: selectedIntent, digestState: selectedDigest)
            _ = try? await APIClient.shared.assignItem(id: itemId, sceneId: selectedScene)
            saveMessage = "已保存"
        } catch {
            saveMessage = "保存失败：\(error.localizedDescription)"
        }
        saving = false
    }

    private func retry() async {
        try? await APIClient.shared.retry(id: itemId)
        await load()
    }
}
