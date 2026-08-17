package com.clipbase

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Android 分享接收 Activity。
 * EXTRA_TEXT 通常是「标题/文案 + 链接」混在一起，后端会自动拆出链接，无需客户端处理。
 * 图片分享（image 通配）走 EXTRA_STREAM URI，本版后端 OCR 接收 data URI，本地图片上传留待后续。
 */
class ShareActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (intent.action != Intent.ACTION_SEND) {
            finish()
            return
        }

        val text = intent.getStringExtra(Intent.EXTRA_TEXT)

        CoroutineScope(Dispatchers.Main).launch {
            try {
                ApiClient.ingest(this@ShareActivity, text, null)
                Toast.makeText(this@ShareActivity, "已收藏，正在分类…", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@ShareActivity, "收藏失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
            finish()
        }
    }
}
