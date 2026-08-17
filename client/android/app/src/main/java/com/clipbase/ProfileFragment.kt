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

class ProfileFragment : Fragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_profile, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        view.findViewById<TextView>(R.id.user_id).text = "用户 ID：${ApiClient.userId(requireContext())}"
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val d = ApiClient.fetchDashboard(requireContext())
                view.findViewById<TextView>(R.id.stats).text =
                    "沉淀知识 ${d.total}  ·  需复习 ${d.review}  ·  已过期 ${d.expired}"
            } catch (_: Exception) {
            }
        }
    }
}
