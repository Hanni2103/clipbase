import SwiftUI

struct ItemListView: View {
    @State private var items: [Item] = []
    @State private var scenes: [Scene] = []
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil
    @State private var selectedScene: String? = nil
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var reportTitle = ""
    @State private var reportContent = ""
    @State private var showingReport = false

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Clipbase 知识库")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("全部分类") { selectedCategory = nil; Task { await load() } }
                            ForEach(Category.all, id: \.self) { cat in
                                Button(cat) { selectedCategory = cat; Task { await load() } }
                            }
                        } label: {
                            Label(selectedCategory ?? "分类", systemImage: "line.3.horizontal.decrease.circle")
                        }
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button("全部场景") { selectedScene = nil; Task { await load() } }
                            ForEach(scenes) { s in
                                Button("\(s.emoji ?? "") \(s.name)") { selectedScene = s.id; Task { await load() } }
                            }
                        } label: {
                            Label(selectedSceneName, systemImage: "folder")
                        }
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        Menu {
                            Button("✍️ 一键成文") { Task { await makeReport(mode: .article) } }
                            Button("📊 周报") { Task { await makeReport(mode: .weekly) } }
                        } label: {
                            Label("创造", systemImage: "wand.and.stars")
                        }
                    }
                }
                .searchable(text: searchText, prompt: "搜索（语义近似）")
                .onSubmit(of: .search) { Task { await load() } }
                .refreshable { await load() }
                .task { await load() }
                .navigationDestination(for: String.self) { id in ItemDetailView(itemId: id) }
                .sheet(isPresented: $showingReport) {
                    NavigationStack {
                        ScrollView {
                            Text(reportContent)
                                .font(.body)
                                .lineSpacing(6)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding()
                        }
                        .navigationTitle(reportTitle)
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) { Button("关闭") { showingReport = false } }
                        }
                    }
                }
        }
    }

    private var selectedSceneName: String {
        scenes.first(where: { $0.id == selectedScene })?.name ?? "场景"
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && items.isEmpty {
            ProgressView("加载中…")
        } else if let errorMessage, items.isEmpty {
            VStack(spacing: 12) {
                Text("加载失败").font(.headline)
                Text(errorMessage).font(.caption).foregroundColor(.secondary)
                Button("重试") { Task { await load() } }
            }
        } else if items.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "square.and.arrow.down").font(.largeTitle).foregroundColor(.secondary)
                Text("还没有收藏内容\n去任意 App 点「分享」→ 选 Clipbase")
                    .multilineTextAlignment(.center).foregroundColor(.secondary)
            }
        } else {
            List(items) { item in
                NavigationLink(value: item.id) { ItemRow(item: item) }
            }
            .listStyle(.plain)
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        do {
            async let itemsReq = APIClient.shared.fetchItems(category: selectedCategory, sceneId: selectedScene, q: searchText.isEmpty ? nil : searchText)
            async let scenesReq = APIClient.shared.fetchScenes()
            (items, scenes) = try await (itemsReq, scenesReq)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func makeReport(mode: ReportMode) async {
        do {
            if mode == .article {
                reportTitle = "我的知识整理"
                reportContent = try await APIClient.shared.compose()
            } else {
                reportTitle = "我这一周学到的"
                reportContent = try await APIClient.shared.weekly()
            }
            showingReport = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    enum ReportMode { case article, weekly }
}

struct ItemRow: View {
    let item: Item

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(item.title ?? "(无标题)").font(.body).fontWeight(.medium).lineLimit(2)
            HStack(spacing: 6) {
                if let category = item.category {
                    Text(category).font(.caption2).padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.blue.opacity(0.12)).foregroundColor(.blue).clipShape(Capsule())
                }
                Text(PlatformLabels[item.sourcePlatform] ?? item.sourcePlatform).font(.caption2).foregroundColor(.secondary)
                if let atoms = item.atoms, !atoms.isEmpty {
                    Text("\(atoms.count) 原子").font(.caption2).foregroundColor(.secondary)
                }
                if let similar = item.similarItems, !similar.isEmpty {
                    Text("📌 存过 \(similar.count) 条类似").font(.caption2).foregroundColor(.orange)
                }
            }
            if let summary = item.summary, !summary.isEmpty {
                Text(summary).font(.caption).foregroundColor(.secondary).lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }
}
