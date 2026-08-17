package com.clipbase

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ItemDetailActivity : AppCompatActivity() {

    private lateinit var itemId: String
    private lateinit var titleText: TextView
    private lateinit var summaryText: TextView
    private lateinit var atomsText: TextView
    private lateinit var similarText: TextView
    private lateinit var categorySpinner: Spinner
    private lateinit var intentSpinner: Spinner
    private lateinit var digestSpinner: Spinner
    private lateinit var sceneSpinner: Spinner
    private lateinit var tagsEdit: EditText
    private lateinit var saveBtn: Button
    private lateinit var openLinkBtn: Button
    private lateinit var retryBtn: Button
    private var originalUrl: String? = null
    private var scenes: List<Scene> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_item_detail)

        itemId = intent.getStringExtra("item_id") ?: run { finish(); return }

        titleText = findViewById(R.id.title)
        summaryText = findViewById(R.id.summary)
        atomsText = findViewById(R.id.atoms)
        similarText = findViewById(R.id.similar)
        categorySpinner = findViewById(R.id.category_spinner)
        intentSpinner = findViewById(R.id.intent_spinner)
        digestSpinner = findViewById(R.id.digest_spinner)
        sceneSpinner = findViewById(R.id.scene_spinner)
        tagsEdit = findViewById(R.id.tags_edit)
        saveBtn = findViewById(R.id.save_btn)
        openLinkBtn = findViewById(R.id.open_link_btn)
        retryBtn = findViewById(R.id.retry_btn)

        categorySpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, CATEGORIES)
        intentSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, INTENT_KEYS.map { INTENT_LABELS[it] })
        digestSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, DIGEST_KEYS.map { DIGEST_LABELS[it] })

        saveBtn.setOnClickListener { save() }
        openLinkBtn.setOnClickListener {
            originalUrl?.let { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) }
        }
        retryBtn.setOnClickListener { retry() }

        load()
    }

    private fun load() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val item = ApiClient.fetchItem(itemId)
                scenes = ApiClient.fetchScenes(this@ItemDetailActivity)
                titleText.text = item.title ?: "(无标题)"
                summaryText.text = item.summary ?: ""
                originalUrl = item.originalUrl
                openLinkBtn.isEnabled = !item.originalUrl.isNullOrEmpty()
                retryBtn.isEnabled = item.status == "needs_review" || item.status == "failed"

                atomsText.visibility = if (item.atoms.isEmpty()) View.GONE else View.VISIBLE
                atomsText.text = item.atoms.joinToString("\n") { a ->
                    "${ATOM_TYPE_LABELS[a.type] ?: a.type}：${a.content}"
                }

                similarText.visibility = if (item.similarItems.isEmpty()) View.GONE else View.VISIBLE
                similarText.text = "📌 你存过 ${item.similarItems.size} 条类似内容：\n" + item.similarItems.joinToString("\n") { s ->
                    "• ${s.title ?: "(无标题)"}（${s.level}）"
                }

                item.category?.let { c -> CATEGORIES.indexOf(c).takeIf { it >= 0 }?.let { categorySpinner.setSelection(it) } }
                item.intent?.let { i -> INTENT_KEYS.indexOf(i).takeIf { it >= 0 }?.let { intentSpinner.setSelection(it) } }
                DIGEST_KEYS.indexOf(item.digestState).takeIf { it >= 0 }?.let { digestSpinner.setSelection(it) }
                tagsEdit.setText(item.tags.joinToString(", "))

                val sceneNames = listOf("未分类") + scenes.map { "${it.emoji ?: ""} ${it.name}" }
                sceneSpinner.adapter = ArrayAdapter(this@ItemDetailActivity, android.R.layout.simple_spinner_dropdown_item, sceneNames)
                val sceneIdx = scenes.indexOfFirst { it.id == item.sceneId } + 1
                sceneSpinner.setSelection(sceneIdx.coerceAtLeast(0))
            } catch (e: Exception) {
                Toast.makeText(this@ItemDetailActivity, "加载失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun save() {
        val category = categorySpinner.selectedItem as String
        val intentKey = INTENT_KEYS[intentSpinner.selectedItemPosition]
        val digestKey = DIGEST_KEYS[digestSpinner.selectedItemPosition]
        val tags = tagsEdit.text.toString().split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val sceneIdx = sceneSpinner.selectedItemPosition
        val sceneId = if (sceneIdx > 0) scenes.getOrNull(sceneIdx - 1)?.id else null

        CoroutineScope(Dispatchers.Main).launch {
            try {
                ApiClient.updateItem(itemId, category, tags, intentKey, digestKey)
                ApiClient.assignItemToScene(itemId, sceneId)
                Toast.makeText(this@ItemDetailActivity, "已保存", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@ItemDetailActivity, "保存失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun retry() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                ApiClient.retry(itemId)
                Toast.makeText(this@ItemDetailActivity, "已重新入队", Toast.LENGTH_SHORT).show()
                load()
            } catch (e: Exception) {
                Toast.makeText(this@ItemDetailActivity, "重试失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
