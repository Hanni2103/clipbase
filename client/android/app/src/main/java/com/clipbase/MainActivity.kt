package com.clipbase

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val nav = findViewById<BottomNavigationView>(R.id.bottom_nav)
        nav.setOnItemSelectedListener { item ->
            val frag: Fragment = when (item.itemId) {
                R.id.nav_home -> HomeFragment()
                R.id.nav_knowledge -> KnowledgeFragment()
                R.id.nav_search -> SearchFragment()
                R.id.nav_create -> CreateFragment()
                R.id.nav_profile -> ProfileFragment()
                else -> HomeFragment()
            }
            supportFragmentManager.beginTransaction().replace(R.id.fragment_container, frag).commit()
            true
        }
        nav.selectedItemId = R.id.nav_home
    }
}
