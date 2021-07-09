package com.example.logintest.adapters

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.TextView
import com.example.logintest.R
import com.example.logintest.RoomResult

class WaitingRoomAdapter(var context: Context, rooms: List<RoomResult>): BaseAdapter() {
    var rooms = rooms
    override fun getCount(): Int {
        return rooms.size
    }

    override fun getItem(position: Int): Any {
        return "TEST STRING"
    }

    override fun getItemId(position: Int): Long {
        return position.toLong()
    }

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val layoutInflater = LayoutInflater.from(context)
        val roomRow = layoutInflater.inflate(R.layout.waiting_room_item, parent, false)
        val roomTitle = roomRow.findViewById<TextView>(R.id.tv_room)
        roomTitle.text = rooms[position].toString()
        return roomRow
    }
}