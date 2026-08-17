import UIKit
import UniformTypeIdentifiers

/// iOS Share Extension 主控制器
///
/// 在 Xcode 里新建 Share Extension target 后，用本文件替换自动生成的 ShareViewController.swift。
/// 关键配置（见同目录 Info.plist 参考）：
/// - NSExtensionActivationSupportsWebURLWithMaxCount = 1
/// - NSExtensionActivationSupportsText = true
/// - App Group：group.com.clipbase（与主 App 共享 user_id）
/// - ATS 允许 http（本地/局域网调试）
final class ShareViewController: UIViewController {

    private let apiBase = "http://127.0.0.1:3000"   // TODO: 真机改成电脑局域网 IP
    private let appGroup = "group.com.clipbase"

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            done(); return
        }

        var url: String?
        var text: String?
        let group = DispatchGroup()

        for item in items {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { value, _ in
                        if let u = value as? URL { url = u.absoluteString }
                        else if let s = value as? String, s.hasPrefix("http") { url = s }
                        group.leave()
                    }
                }
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { value, _ in
                        if let s = value as? String, !s.isEmpty { text = s }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.submit(url: url, text: text)
        }
    }

    private func submit(url: String?, text: String?) {
        let userId = userId()
        var body: [String: Any] = ["user_id": userId]
        if let url { body["url"] = url }
        if let text { body["text"] = text }

        guard let data = try? JSONSerialization.data(withJSONObject: body),
              let reqUrl = URL(string: "\(apiBase)/api/ingest") else {
            done(); return
        }

        var req = URLRequest(url: reqUrl)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        req.timeoutInterval = 10

        URLSession.shared.dataTask(with: req) { _, _, _ in
            DispatchQueue.main.async { self.done() }
        }.resume()
    }

    private func userId() -> String {
        let defaults = UserDefaults(suiteName: appGroup)!
        if let id = defaults.string(forKey: "user_id") { return id }
        let newId = UUID().uuidString
        defaults.set(newId, forKey: "user_id")
        return newId
    }

    private func done() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
