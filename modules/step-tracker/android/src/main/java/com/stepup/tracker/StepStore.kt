package com.stepup.tracker
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.content.ContentValues
import android.provider.Settings
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class StepStore(private val context: Context) : SQLiteOpenHelper(context, "steps.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), counter INTEGER, boot INTEGER)")
    db.execSQL("CREATE TABLE days (date TEXT PRIMARY KEY, steps INTEGER NOT NULL, km REAL NOT NULL, kcal REAL NOT NULL)")
  }
  override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) {}
  fun resetBaseline() { writableDatabase.delete("state", null, null) }
  fun clear() { writableDatabase.delete("days", null, null); resetBaseline() }
  fun record(counter: Long, timestamp: Long) {
    val db = writableDatabase
    val boot = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    val prefs = context.getSharedPreferences("profile", Context.MODE_PRIVATE)
    db.beginTransaction()
    try {
      var previous: Long? = null
      var previousBoot = -2
      db.rawQuery("SELECT counter, boot FROM state WHERE id=1", null).use { c ->
        if(c.moveToFirst()) { previous = c.getLong(0); previousBoot = c.getInt(1) }
      }
      val delta = CounterMath.delta(previous, counter, previousBoot == boot)
      val values = ContentValues().apply { put("id", 1); put("counter", counter); put("boot", boot) }
      db.insertWithOnConflict("state", null, values, SQLiteDatabase.CONFLICT_REPLACE)
      if(delta > 0) {
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(timestamp))
        val length = prefs.getFloat("stepLength", 0.72f).toDouble()
        val weight = prefs.getFloat("weight", 70f).toDouble()
        val km = CounterMath.km(delta, length)
        val kcal = CounterMath.kcal(km, weight)
        db.execSQL("INSERT OR IGNORE INTO days(date,steps,km,kcal) VALUES(?,0,0,0)", arrayOf(date))
        db.execSQL("UPDATE days SET steps=steps+?, km=km+?, kcal=kcal+? WHERE date=?", arrayOf(delta,km,kcal,date))
      }
      db.setTransactionSuccessful()
    } finally { db.endTransaction() }
  }
  fun days(): List<Map<String, Any>> {
    val rows = mutableListOf<Map<String, Any>>()
    readableDatabase.rawQuery("SELECT date,steps,km,kcal FROM days ORDER BY date DESC", null).use { c ->
      while(c.moveToNext()) rows.add(mapOf("date" to c.getString(0),"steps" to c.getLong(1),"km" to c.getDouble(2),"kcal" to c.getDouble(3)))
    }
    return rows
  }
}
