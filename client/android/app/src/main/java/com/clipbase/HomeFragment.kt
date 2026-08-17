package com.clipbase

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        load(view)
    }

    private fun load(view: View) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val d = ApiClient.fetchDashboard(requireContext())
                view.findViewById<TextView>(R.id.stat_total).text = "${d.total}\n沉淀知识"
                view.findViewById<TextView>(R.id.stat_review).text = "${d.todayReview}\n今日回顾"
                view.findViewById<TextView>(R.id.stat_awaken).text = "${d.todayAwaken}\n今日唤醒"
                view.findViewById<TextView>(R.id.stat_expire).text = "${d.expiringSoon}\n即将过期"
                view.findViewById<TextView>(R.id.lifecycle).text = "✅ 发挥价值 ${d.active}  ·  🔄 需复习 ${d.review}  ·  ⏰ 已过期 ${d.expired}"
                view.findViewById<TextView>(R.id.awakening).text = if (d.awakening.isEmpty()) "暂无待唤醒内容"
                else d.awakening.joinToString("\n") { it -> "• ${it.optString("title").ifBlank { "(无标题)" }}" }
                view.findViewById<TextView>(R.id.recent).text = if (d.recent.isEmpty()) "还没有沉淀内容"
                else d.recent.joinToString("\n") { it -> "• ${it.optString("title").ifBlank { "(无标题)" }}" }
            } catch (_: Exception) {
            }
        }
    }
}
