package com.stepup.tracker
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.content.ContentValues
import android.provider.Settings
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class StepStore(private val context: Context) : SQLiteOpenHelper(context, "steps.db", null, 2) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), counter INTEGER, boot INTEGER)")
    db.execSQL("CREATE TABLE days (date TEXT PRIMARY KEY, steps INTEGER NOT NULL, km REAL NOT NULL, kcal REAL NOT NULL)")
    createSessions(db)
  }
  private fun createSessions(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, started INTEGER NOT NULL, status TEXT NOT NULL, elapsed INTEGER NOT NULL DEFAULT 0, segment INTEGER NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0, km REAL NOT NULL DEFAULT 0, kcal REAL NOT NULL DEFAULT 0, counter INTEGER)")
  }
  override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) { if(old < 2) createSessions(db) }
  fun checkpoint() {
    val now = android.os.SystemClock.elapsedRealtime()
    writableDatabase.execSQL("UPDATE sessions SET elapsed=elapsed+MAX(0,?-segment), segment=? WHERE status='recording'", arrayOf(now,now))
  }
  fun interrupt() {
    // On process recreation, only persisted checkpoint duration is trusted.
    writableDatabase.execSQL("UPDATE sessions SET status='interrupted', segment=0, counter=NULL WHERE status='recording'")
  }
  fun sessionAction(action: String) {
    val db = writableDatabase
    db.beginTransaction()
    try {
      if(action == "begin") {
        db.rawQuery("SELECT id FROM sessions WHERE status != 'saved'",null).use { check(!it.moveToFirst()) { "Finish the current walk first" } }
        db.execSQL("INSERT INTO sessions(id,started,status,segment) VALUES(?,?,'recording',?)", arrayOf(java.util.UUID.randomUUID().toString(),System.currentTimeMillis(),android.os.SystemClock.elapsedRealtime()))
      } else {
        if(action != "resume") checkpoint()
        when(action) {
          "pause" -> db.execSQL("UPDATE sessions SET status='paused',segment=0,counter=NULL WHERE status='recording'")
          "resume" -> db.execSQL("UPDATE sessions SET status='recording',segment=?,counter=NULL WHERE status IN ('paused','interrupted')", arrayOf(android.os.SystemClock.elapsedRealtime()))
          "finish" -> db.execSQL("UPDATE sessions SET status='review',segment=0,counter=NULL WHERE status IN ('recording','paused','interrupted')")
          "save" -> db.execSQL("UPDATE sessions SET status='saved' WHERE status='review'")
          "discard" -> db.execSQL("DELETE FROM sessions WHERE status='review'")
          else -> error("Unknown walk action")
        }
      }
      db.setTransactionSuccessful()
    } finally { db.endTransaction() }
  }
  fun sessions(): List<Map<String, Any>> {
    val rows = mutableListOf<Map<String, Any>>()
    readableDatabase.rawQuery("SELECT id,started,status,elapsed,segment,steps,km,kcal FROM sessions ORDER BY started DESC",null).use { c ->
      while(c.moveToNext()) {
        val duration = c.getLong(3) + if(c.getString(2)=="recording") maxOf(0L,android.os.SystemClock.elapsedRealtime()-c.getLong(4)) else 0L
        rows.add(mapOf("id" to c.getString(0),"started" to c.getLong(1),"status" to c.getString(2),"elapsedMs" to duration,"steps" to c.getLong(5),"km" to c.getDouble(6),"kcal" to c.getDouble(7)))
      }
    }
    return rows
  }
  fun resetBaseline() { writableDatabase.delete("state", null, null) }
  fun clear() { writableDatabase.delete("days", null, null); writableDatabase.delete("sessions",null,null); resetBaseline() }
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
      db.rawQuery("SELECT id,counter FROM sessions WHERE status='recording'",null).use { c ->
        if(c.moveToFirst()) {
          val previousSession = if(c.isNull(1)) null else c.getLong(1)
          val count = CounterMath.delta(previousSession,counter,previousBoot == boot)
          val km = CounterMath.km(count,prefs.getFloat("stepLength",0.72f).toDouble())
          val kcal = CounterMath.kcal(km,prefs.getFloat("weight",70f).toDouble())
          db.execSQL("UPDATE sessions SET steps=steps+?,km=km+?,kcal=kcal+?,counter=? WHERE id=?",arrayOf(count,km,kcal,counter,c.getString(0)))
        }
      }
      checkpoint()
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
