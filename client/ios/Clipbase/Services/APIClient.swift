import Foundation

/// 后端 API 客户端
struct APIClient {
    static let shared = APIClient()

    /// 服务器地址：
    /// - 后端跑在同一台 Mac 上：http://127.0.0.1:3000
    /// - 后端跑在别的机器：改成那台机器局域网 IP
    static let baseURL = URL(string: "http://127.0.0.1:3000")!

    static let appGroup = "group.com.clipbase"

    static var userId: String {
        let defaults = UserDefaults(suiteName: appGroup)!
        if let id = defaults.string(forKey: "user_id") { return id }
        let newId = UUID().uuidString
        defaults.set(newId, forKey: "user_id")
        return newId
    }

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> Data {
        var req = URLRequest(url: APIClient.baseURL.appendingPathComponent(path))
        req.httpMethod = method
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }

    // MARK: 条目

    func fetchItems(category: String? = nil, sceneId: String? = nil, q: String? = nil) async throws -> [Item] {
        var comps = URLComponents(url: APIClient.baseURL.appendingPathComponent("api/items"), resolvingAgainstBaseURL: false)!
        var query = [URLQueryItem(name: "user_id", value: APIClient.userId)]
        if let category, !category.isEmpty { query.append(URLQueryItem(name: "category", value: category)) }
        if let sceneId, !sceneId.isEmpty { query.append(URLQueryItem(name: "scene_id", value: sceneId)) }
        if let q, !q.isEmpty { query.append(URLQueryItem(name: "q", value: q)) }
        comps.queryItems = query
        let (data, _) = try await URLSession.shared.data(from: comps.url!)
        return try decoder.decode(ItemListResponse.self, from: data).items
    }

    func fetchItem(id: String) async throws -> Item {
        try decoder.decode(Item.self, from: await request("api/items/\(id)"))
    }

    func ingest(text: String? = nil, url: String? = nil) async throws {
        var body: [String: Any] = ["user_id": APIClient.userId]
        if let text { body["text"] = text }
        if let url { body["url"] = url }
        _ = try await request("api/ingest", method: "POST", body: body)
    }

    func updateItem(id: String, category: String?, tags: [String]?, intent: String? = nil, digestState: String? = nil) async throws -> Item {
        var body: [String: Any] = [:]
        if let category { body["category"] = category }
        if let tags { body["tags"] = tags }
        if let intent { body["intent"] = intent }
        if let digestState { body["digest_state"] = digestState }
        return try decoder.decode(Item.self, from: await request("api/items/\(id)", method: "PATCH", body: body))
    }

    func retry(id: String) async throws {
        _ = try await request("api/items/\(id)/retry", method: "POST")
    }

    func assignItem(id: String, sceneId: String?) async throws -> Item {
        try decoder.decode(Item.self, from: await request("api/items/\(id)/scene", method: "POST", body: ["scene_id": sceneId ?? ""]))
    }

    func similarAction(id: String, action: String) async throws {
        _ = try await request("api/items/\(id)/similar-action", method: "POST", body: ["action": action])
    }

    // MARK: 场景

    func fetchScenes() async throws -> [Scene] {
        let data = try await request("api/scenes?user_id=\(APIClient.userId)")
        struct Resp: Codable { let scenes: [Scene] }
        return try decoder.decode(Resp.self, from: data).scenes
    }

    func createScene(name: String, emoji: String? = nil) async throws {
        var body: [String: Any] = ["user_id": APIClient.userId, "name": name]
        if let emoji { body["emoji"] = emoji }
        _ = try await request("api/scenes", method: "POST", body: body)
    }

    // MARK: 搜索 + 创造

    func search(q: String) async throws -> [Item] {
        struct R: Codable { let results: [Item] }
        let data = try await request("api/search?user_id=\(APIClient.userId)&q=\(q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? q)")
        return try decoder.decode(R.self, from: data).results
    }

    func compose() async throws -> String {
        struct R: Codable { let title: String; let content: String }
        let data = try await request("api/compose", method: "POST", body: ["user_id": APIClient.userId])
        return try decoder.decode(R.self, from: data).content
    }

    func weekly() async throws -> String {
        struct R: Codable { let content: String }
        let data = try await request("api/weekly?user_id=\(APIClient.userId)")
        return try decoder.decode(R.self, from: data).content
    }
}
