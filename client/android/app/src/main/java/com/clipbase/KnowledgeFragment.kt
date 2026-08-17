package com.clipbase

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.SearchView
import android.widget.Spinner
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class KnowledgeFragment : Fragment() {

    private lateinit var recycler: RecyclerView
    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var searchView: SearchView
    private lateinit var spinner: Spinner
    private lateinit var ingestInput: EditText
    private lateinit var adapter: ItemAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_knowledge, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        recycler = view.findViewById(R.id.recycler)
        swipe = view.findViewById(R.id.swipe)
        searchView = view.findViewById(R.id.search)
        spinner = view.findViewById(R.id.spinner)
        ingestInput = view.findViewById(R.id.ingest_input)

        adapter = ItemAdapter(emptyList()) { item -> openDetail(item) }
        recycler.layoutManager = LinearLayoutManager(requireContext())
        recycler.adapter = adapter

        spinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, listOf("全部分类") + CATEGORIES)

        swipe.setOnRefreshListener { load() }
        searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(q: String?): Boolean { load(); return true }
            override fun onQueryTextChange(q: String?): Boolean = false
        })
        view.findViewById<Button>(R.id.ingest_btn).setOnClickListener { ingest() }

        load()
    }

    private fun openDetail(item: Item) {
        startActivity(Intent(requireContext(), ItemDetailActivity::class.java).putExtra("item_id", item.id))
    }

    private fun ingest() {
        val text = ingestInput.text.toString().trim()
        if (text.isEmpty()) return
        ingestInput.text.clear()
        CoroutineScope(Dispatchers.Main).launch {
            try {
                ApiClient.ingest(requireContext(), text, null)
                Toast.makeText(requireContext(), "已收藏，正在分类…", Toast.LENGTH_SHORT).show()
                delay(5000)
                load()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "收藏失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun load() {
        val category = spinner.selectedItem as String
        val q = searchView.query?.toString()
        CoroutineScope(Dispatchers.Main).launch {
            swipe.isRefreshing = true
            try {
                val items = ApiClient.fetchItems(requireContext(), if (category == "全部分类") null else category, null, q)
                adapter.update(items)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "加载失败：${e.message}", Toast.LENGTH_SHORT).show()
            }
            swipe.isRefreshing = false
        }
    }
}
