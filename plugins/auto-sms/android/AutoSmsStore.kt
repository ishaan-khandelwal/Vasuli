package com.vasuli.app.autosms

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** App-private persistence (MODE_PRIVATE, excluded from backups) for the plan, send log and daily counters. */
internal object AutoSmsStore {
  private const val PREFS = "vasuli_autosms"
  private const val KEY_PLAN = "plan"
  private const val KEY_NEXT = "next_trigger"
  private const val KEY_LOG = "log"
  private const val KEY_SENT_DAY = "sent_day"
  private const val KEY_SENT_KEYS = "sent_keys"
  private const val MAX_LOG = 100

  val lock = Any()

  private fun prefs(ctx: Context) =
    ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  fun loadPlan(ctx: Context): AutoSmsPlan? =
    AutoSmsPlan.parse(prefs(ctx).getString(KEY_PLAN, null), System.currentTimeMillis())

  fun savePlan(ctx: Context, plan: AutoSmsPlan) {
    prefs(ctx).edit().putString(KEY_PLAN, plan.toJson()).apply()
  }

  fun clearPlan(ctx: Context) {
    prefs(ctx).edit().remove(KEY_PLAN).remove(KEY_NEXT).apply()
  }

  fun nextTrigger(ctx: Context): Long = prefs(ctx).getLong(KEY_NEXT, 0L)

  fun setNextTrigger(ctx: Context, value: Long) {
    prefs(ctx).edit().putLong(KEY_NEXT, value).apply()
  }

  /** Keys already messaged today, so the same debtor is never texted twice in one day. */
  fun sentKeysToday(ctx: Context): MutableSet<String> = synchronized(lock) {
    val p = prefs(ctx)
    if (p.getString(KEY_SENT_DAY, null) != today()) {
      mutableSetOf()
    } else {
      val arr = JSONArray(p.getString(KEY_SENT_KEYS, "[]"))
      (0 until arr.length()).mapTo(mutableSetOf()) { arr.getString(it) }
    }
  }

  fun saveSentKeysToday(ctx: Context, keys: Set<String>) = synchronized(lock) {
    prefs(ctx).edit()
      .putString(KEY_SENT_DAY, today())
      .putString(KEY_SENT_KEYS, JSONArray(keys.toList()).toString())
      .apply()
  }

  fun readLog(ctx: Context): JSONArray = synchronized(lock) {
    try {
      JSONArray(prefs(ctx).getString(KEY_LOG, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }
  }

  fun clearLog(ctx: Context) = synchronized(lock) {
    prefs(ctx).edit().remove(KEY_LOG).apply()
  }

  fun appendLog(ctx: Context, entry: JSONObject) = synchronized(lock) {
    val current = readLog(ctx)
    val next = JSONArray()
    next.put(entry)
    for (i in 0 until minOf(current.length(), MAX_LOG - 1)) next.put(current.get(i))
    prefs(ctx).edit().putString(KEY_LOG, next.toString()).apply()
  }

  /** Applies [change] to the log entry with [id]; does nothing if it has already rotated out. */
  fun updateLog(ctx: Context, id: String, change: (JSONObject) -> Unit) = synchronized(lock) {
    val arr = readLog(ctx)
    for (i in 0 until arr.length()) {
      val obj = arr.optJSONObject(i) ?: continue
      if (obj.optString("id") == id) {
        change(obj)
        prefs(ctx).edit().putString(KEY_LOG, arr.toString()).apply()
        break
      }
    }
  }
}
