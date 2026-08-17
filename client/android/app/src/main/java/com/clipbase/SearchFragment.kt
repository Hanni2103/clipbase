package com.clipbase

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SearchView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SearchFragment : Fragment() {

    private lateinit var recycler: RecyclerView
    private lateinit var searchView: SearchView
    private lateinit var adapter: ItemAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_search, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        recycler = view.findViewById(R.id.recycler)
        searchView = view.findViewById(R.id.search)

        adapter = ItemAdapter(emptyList()) { item ->
            startActivity(Intent(requireContext(), ItemDetailActivity::class.java).putExtra("item_id", item.id))
        }
        recycler.layoutManager = LinearLayoutManager(requireContext())
        recycler.adapter = adapter

        searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(q: String?): Boolean { if (!q.isNullOrBlank()) search(q); return true }
            override fun onQueryTextChange(q: String?): Boolean = false
        })
    }

    private fun search(q: String) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val items = ApiClient.fetchItems(requireContext(), null, null, q)
                adapter.update(items)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "搜索失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
