package com.clipbase

import org.json.JSONObject

data class Item(
    val id: String,
    val sourcePlatform: String,
    val originalUrl: String?,
    val title: String?,
    val category: String?,
    val tags: List<String>,
    val summary: String?,
    val confidence: Double?,
    val sceneId: String?,
    val intent: String?,
    val halfLife: Int?,
    val digestState: String,
    val status: String,
    val errorMsg: String?,
    val atoms: List<Atom>,
    val similarItems: List<SimilarItem>
) {
    companion object {
        fun fromJson(o: JSONObject): Item {
            val tagsArr = o.optJSONArray("tags") ?: org.json.JSONArray()
            val tags = (0 until tagsArr.length()).map { tagsArr.optString(it) }
            val atomsArr = o.optJSONArray("atoms") ?: org.json.JSONArray()
            val atoms = (0 until atomsArr.length()).map { Atom.fromJson(atomsArr.getJSONObject(it)) }
            val simArr = o.optJSONArray("similar_items") ?: org.json.JSONArray()
            val sims = (0 until simArr.length()).map { SimilarItem.fromJson(simArr.getJSONObject(it)) }
            return Item(
                id = o.optString("id"),
                sourcePlatform = o.optString("source_platform"),
                originalUrl = o.optString("original_url").ifBlank { null },
                title = o.optString("title").ifBlank { null },
                category = o.optString("category").ifBlank { null },
                tags = tags,
                summary = o.optString("summary").ifBlank { null },
                confidence = if (o.isNull("confidence")) null else o.optDouble("confidence"),
                sceneId = o.optString("scene_id").ifBlank { null },
                intent = o.optString("intent").ifBlank { null },
                halfLife = if (o.isNull("half_life")) null else o.optInt("half_life"),
                digestState = o.optString("digest_state").ifBlank { "unread" },
                status = o.optString("status"),
                errorMsg = o.optString("error_msg").ifBlank { null },
                atoms = atoms,
                similarItems = sims
            )
        }
    }
}

data class Atom(val id: String, val type: String, val content: String) {
    companion object {
        fun fromJson(o: JSONObject) = Atom(o.optString("id"), o.optString("type"), o.optString("content"))
    }
}

data class SimilarItem(val id: String, val title: String?, val similarity: Double, val level: String) {
    companion object {
        fun fromJson(o: JSONObject) = SimilarItem(
            o.optString("id"),
            o.optString("title").ifBlank { null },
            o.optDouble("similarity"),
            o.optString("level")
        )
    }
}

data class Scene(val id: String, val name: String, val emoji: String?, val itemCount: Int) {
    companion object {
        fun fromJson(o: JSONObject) = Scene(o.optString("id"), o.optString("name"), o.optString("emoji").ifBlank { null }, o.optInt("item_count"))
    }
}

/** 固定分类体系（与后端一致） */
val CATEGORIES = listOf(
    "美食", "科技", "搞笑娱乐", "学习成长", "职场",
    "生活方式", "健康", "财经商业", "新闻资讯", "其他"
)

val INTENT_LABELS = mapOf("do_it" to "照着做", "insight" to "有道理", "material" to "素材", "inspiration" to "灵感", "fun" to "娱乐")
val DIGEST_LABELS = mapOf("unread" to "未看", "read" to "已看", "digested" to "已消化", "internalized" to "已内化")
val INTENT_KEYS = listOf("do_it", "insight", "material", "inspiration", "fun")
val DIGEST_KEYS = listOf("unread", "read", "digested", "internalized")
val ATOM_TYPE_LABELS = mapOf("key_point" to "要点", "step" to "步骤", "quote" to "金句", "fact" to "数据")
val PLATFORM_LABELS = mapOf("wechat" to "公众号", "douyin" to "抖音", "xiaohongshu" to "小红书", "bilibili" to "B站", "image" to "图片", "text" to "文字", "web" to "网页")

data class Dashboard(
    val total: Int,
    val todayReview: Int,
    val todayAwaken: Int,
    val expiringSoon: Int,
    val active: Int,
    val review: Int,
    val expired: Int,
    val awakening: List<JSONObject>,
    val recent: List<JSONObject>
) {
    companion object {
        fun fromJson(o: JSONObject): Dashboard {
            val aw = o.optJSONArray("awakening") ?: org.json.JSONArray()
            val awakening = (0 until aw.length()).map { aw.getJSONObject(it) }
            val rc = o.optJSONArray("recent") ?: org.json.JSONArray()
            val recent = (0 until rc.length()).map { rc.getJSONObject(it) }
            val lc = o.optJSONObject("lifecycle") ?: JSONObject()
            return Dashboard(
                total = o.optInt("total"),
                todayReview = o.optInt("today_review"),
                todayAwaken = o.optInt("today_awaken"),
                expiringSoon = o.optInt("expiring_soon"),
                active = lc.optInt("active"),
                review = lc.optInt("review"),
                expired = lc.optInt("expired"),
                awakening = awakening,
                recent = recent
            )
        }
    }
}
