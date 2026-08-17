package com.clipbase

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CreateFragment : Fragment() {

    private val types = listOf(
        "article" to "📄 深度文章",
        "copywriting" to "✍️ 文案写作",
        "xiaohongshu" to "📕 小红书笔记",
        "video_script" to "🎬 视频脚本",
        "weekly" to "📊 周报总结",
        "business" to "📈 商业分析",
        "mindmap" to "🧠 思维导图"
    )

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_create, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val container = view.findViewById<LinearLayout>(R.id.type_container)
        val resultText = view.findViewById<TextView>(R.id.result)

        for ((key, label) in types) {
            val btn = Button(requireContext())
            btn.text = label
            btn.setBackgroundColor(0xFF1C2540.toInt())
            btn.setTextColor(Color.WHITE)
            btn.isAllCaps = false
            val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            lp.setMargins(0, 0, 0, 12)
            btn.layoutParams = lp
            btn.setOnClickListener { compose(key, resultText) }
            container.addView(btn)
        }
    }

    private fun compose(type: String, resultText: TextView) {
        resultText.text = "⏳ 正在创作，请稍候…"
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val content = ApiClient.compose(requireContext(), type)
                resultText.text = content
            } catch (e: Exception) {
                resultText.text = "创作失败：${e.message}"
                Toast.makeText(requireContext(), "创作失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
