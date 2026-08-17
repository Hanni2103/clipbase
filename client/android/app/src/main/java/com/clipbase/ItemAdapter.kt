package com.clipbase

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class ItemAdapter(
    private var items: List<Item>,
    private val onClick: (Item) -> Unit
) : RecyclerView.Adapter<ItemAdapter.VH>() {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val title: TextView = view.findViewById(R.id.title)
        val category: TextView = view.findViewById(R.id.category)
        val platform: TextView = view.findViewById(R.id.platform)
        val summary: TextView = view.findViewById(R.id.summary)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_card, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        holder.title.text = item.title ?: "(无标题)"
        holder.category.text = item.category ?: ""
        holder.category.visibility = if (item.category.isNullOrEmpty()) View.GONE else View.VISIBLE

        val meta = mutableListOf<String>()
        meta.add(PLATFORM_LABELS[item.sourcePlatform] ?: item.sourcePlatform)
        if (item.atoms.isNotEmpty()) meta.add("${item.atoms.size}原子")
        if (item.similarItems.isNotEmpty()) meta.add("📌存过${item.similarItems.size}条")
        item.intent?.let { meta.add(INTENT_LABELS[it] ?: it) }
        holder.platform.text = meta.joinToString(" · ")

        holder.summary.text = item.summary ?: ""
        holder.summary.visibility = if (item.summary.isNullOrEmpty()) View.GONE else View.VISIBLE
        holder.itemView.setOnClickListener { onClick(item) }
    }

    override fun getItemCount() = items.size

    fun update(newItems: List<Item>) {
        items = newItems
        notifyDataSetChanged()
    }
}
