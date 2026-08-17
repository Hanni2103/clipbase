package com.clipbase

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.util.UUID

object ApiClient {
    /// 服务器地址：改成 Windows 电脑的局域网 IP（真机 + 电脑同一 WiFi）
    private const val BASE_URL = "http://192.168.3.36:3000"

    private val client = OkHttpClient()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    fun userId(context: Context): String {
        val prefs = context.getSharedPreferences("clipbase", Context.MODE_PRIVATE)
        var id = prefs.getString("user_id", null)
        if (id == null) {
            id = UUID.randomUUID().toString()
            prefs.edit().putString("user_id", id).apply()
        }
        return id
    }

    private suspend fun call(method: String, path: String, body: JSONObject? = null): JSONObject =
        withContext(Dispatchers.IO) {
            val rb = body?.toString()?.toRequestBody(jsonType)
            val builder = Request.Builder().url("$BASE_URL$path")
            when (method) {
                "POST" -> builder.post(rb ?: "{}".toRequestBody(jsonType))
                "PATCH" -> builder.patch(rb ?: "{}".toRequestBody(jsonType))
            }
            client.newCall(builder.build()).execute().use { resp ->
                if (!resp.isSuccessful) throw IOException("HTTP ${resp.code}")
                val text = resp.body?.string() ?: "{}"
                if (text.isBlank()) JSONObject() else JSONObject(text)
            }
        }

    // 条目

    suspend fun fetchItems(context: Context, category: String? = null, sceneId: String? = null, q: String? = null): List<Item> {
        val params = mutableListOf("user_id=${userId(context)}")
        if (!category.isNullOrEmpty()) params.add("category=${URLEncoder.encode(category, "UTF-8")}")
        if (!sceneId.isNullOrEmpty()) params.add("scene_id=${URLEncoder.encode(sceneId, "UTF-8")}")
        if (!q.isNullOrEmpty()) params.add("q=${URLEncoder.encode(q, "UTF-8")}")
        val json = call("GET", "/api/items?${params.joinToString("&")}")
        val arr = json.getJSONArray("items")
        return (0 until arr.length()).map { Item.fromJson(arr.getJSONObject(it)) }
    }

    suspend fun fetchItem(id: String): Item = Item.fromJson(call("GET", "/api/items/$id"))

    suspend fun ingest(context: Context, text: String?, url: String?) {
        val body = JSONObject().apply {
            put("user_id", userId(context))
            if (!text.isNullOrEmpty()) put("text", text)
            if (!url.isNullOrEmpty()) put("url", url)
        }
        call("POST", "/api/ingest", body)
    }

    suspend fun updateItem(id: String, category: String, tags: List<String>, intent: String, digest: String) {
        val body = JSONObject().apply {
            put("category", category)
            put("tags", JSONArray(tags))
            put("intent", intent)
            put("digest_state", digest)
        }
        call("PATCH", "/api/items/$id", body)
    }

    suspend fun retry(id: String) = call("POST", "/api/items/$id/retry")

    suspend fun assignItemToScene(id: String, sceneId: String?) {
        call("POST", "/api/items/$id/scene", JSONObject().put("scene_id", sceneId ?: ""))
    }

    suspend fun similarAction(id: String, action: String) {
        call("POST", "/api/items/$id/similar-action", JSONObject().put("action", action))
    }

    // 场景

    suspend fun fetchScenes(context: Context): List<Scene> {
        val json = call("GET", "/api/scenes?user_id=${userId(context)}")
        val arr = json.getJSONArray("scenes")
        return (0 until arr.length()).map { Scene.fromJson(arr.getJSONObject(it)) }
    }

    suspend fun createScene(context: Context, name: String) {
        call("POST", "/api/scenes", JSONObject().put("user_id", userId(context)).put("name", name))
    }

    // 创造

    suspend fun compose(context: Context, type: String): String {
        val json = call("POST", "/api/compose", JSONObject().put("user_id", userId(context)).put("type", type))
        return json.optString("content")
    }

    suspend fun weekly(context: Context): String {
        val json = call("GET", "/api/weekly?user_id=${userId(context)}")
        return json.optString("content")
    }

    suspend fun fetchDashboard(context: Context): Dashboard {
        val json = call("GET", "/api/dashboard?user_id=${userId(context)}")
        return Dashboard.fromJson(json)
    }
}
