import Foundation

/// 后端返回的收藏条目（完整字段）
struct Item: Identifiable, Codable {
    let id: String
    let userId: String
    let sourcePlatform: String
    let originalUrl: String?
    let title: String?
    let category: String?
    let tags: [String]
    let summary: String?
    let confidence: Double?
    let sceneId: String?
    let intent: String?
    let halfLife: Int?
    let digestState: String?
    let coverUrl: String?
    let status: String
    let errorMsg: String?
    let atoms: [Atom]?
    let similarItems: [SimilarItem]?
    let createdAt: String
    let updatedAt: String
}

/// 原子卡片（要点/步骤/金句/数据）
struct Atom: Codable, Identifiable {
    let id: String
    let itemId: String
    let type: String
    let content: String
    let sort: Int
}

/// 相似条目（照镜子）
struct SimilarItem: Codable, Identifiable {
    let id: String
    let title: String?
    let category: String?
    let similarity: Double
    let level: String
}

/// 场景
struct Scene: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let emoji: String?
    let status: String
    let autoExpireAt: String?
    let createdAt: String
    let itemCount: Int?
}

struct ItemListResponse: Codable {
    let items: [Item]
    let total: Int
}

/// 固定分类体系（与后端一致）
enum Category {
    static let all = ["美食", "科技", "搞笑娱乐", "学习成长", "职场",
                      "生活方式", "健康", "财经商业", "新闻资讯", "其他"]
}

let IntentLabels = ["do_it": "照着做", "insight": "有道理", "material": "素材", "inspiration": "灵感", "fun": "娱乐"]
let DigestLabels = ["unread": "未看", "read": "已看", "digested": "已消化", "internalized": "已内化"]
let AtomTypeLabels = ["key_point": "要点", "step": "步骤", "quote": "金句", "fact": "数据"]
let PlatformLabels = ["wechat": "公众号", "douyin": "抖音", "xiaohongshu": "小红书", "bilibili": "B站", "image": "图片", "text": "文字", "web": "网页"]
