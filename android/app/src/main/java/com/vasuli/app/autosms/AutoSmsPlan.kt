package com.vasuli.app.autosms

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * A validated reminder plan pushed from JS. Everything coming from JS is treated as untrusted:
 * phone numbers and message sizes are validated again here, right before sending.
 */
internal data class AutoSmsItem(val key: String, val label: String, val phone: String, val message: String)

internal data class AutoSmsPlan(
  val enabled: Boolean,
  val hour: Int,
  val minute: Int,
  val intervalDays: Int,
  val syncedAt: Long,
  val items: List<AutoSmsItem>,
) {
  fun sameSchedule(other: AutoSmsPlan?): Boolean =
    other != null && other.enabled == enabled && other.hour == hour &&
      other.minute == minute && other.intervalDays == intervalDays

  private fun atReminderTime(now: Long): Calendar =
    Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }

  /** Today at the reminder time if still ahead, otherwise [intervalDays] days from today. */
  fun firstTriggerAfter(now: Long): Long {
    val cal = atReminderTime(now)
    if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, intervalDays)
    return cal.timeInMillis
  }

  /** The reminder time [intervalDays] days after today, used once a run has finished. */
  fun nextTriggerAfterRun(now: Long): Long {
    val cal = atReminderTime(now)
    cal.add(Calendar.DAY_OF_YEAR, intervalDays)
    return cal.timeInMillis
  }

  fun toJson(): String {
    val arr = JSONArray()
    items.forEach {
      arr.put(
        JSONObject()
          .put("key", it.key)
          .put("label", it.label)
          .put("phone", it.phone)
          .put("message", it.message),
      )
    }
    return JSONObject()
      .put("enabled", enabled)
      .put("hour", hour)
      .put("minute", minute)
      .put("intervalDays", intervalDays)
      .put("syncedAt", syncedAt)
      .put("items", arr)
      .toString()
  }

  companion object {
    const val MAX_ITEMS = 50
    const val MAX_MESSAGE_LENGTH = 480
    private val PHONE = Regex("^\\+?[0-9]{10,15}$")
    private val TIME = Regex("^([01][0-9]|2[0-3]):([0-5][0-9])$")

    /** Returns null when the payload is malformed. Invalid individual items are dropped. */
    fun parse(json: String?, now: Long): AutoSmsPlan? {
      if (json.isNullOrBlank() || json.length > 200_000) return null
      return try {
        val obj = JSONObject(json)
        val time = TIME.matchEntire(obj.optString("time", ""))
        val hour = if (time != null) time.groupValues[1].toInt() else obj.getInt("hour")
        val minute = if (time != null) time.groupValues[2].toInt() else obj.getInt("minute")
        if (hour !in 0..23 || minute !in 0..59) return null
        val interval = obj.optInt("intervalDays", 1).coerceIn(1, 30)

        val items = ArrayList<AutoSmsItem>()
        val seen = HashSet<String>()
        val arr = obj.optJSONArray("items") ?: JSONArray()
        for (i in 0 until minOf(arr.length(), MAX_ITEMS)) {
          val entry = arr.optJSONObject(i) ?: continue
          val key = entry.optString("key").take(120)
          val rawPhone = entry.optString("phone").replace(Regex("[\\s-]"), "")
          val message = entry.optString("message").trim()
          if (key.isEmpty() || !seen.add(key)) continue
          if (!PHONE.matches(rawPhone)) continue
          if (message.isEmpty() || message.length > MAX_MESSAGE_LENGTH) continue
          val phone = if (rawPhone.startsWith("+")) rawPhone else "+$rawPhone"
          items.add(AutoSmsItem(key, entry.optString("label").take(40), phone, message))
        }

        val syncedAt = obj.optLong("syncedAt", now)
        AutoSmsPlan(
          enabled = obj.optBoolean("enabled", false),
          hour = hour,
          minute = minute,
          intervalDays = interval,
          syncedAt = if (syncedAt > 0) syncedAt else now,
          items = items,
        )
      } catch (e: Exception) {
        null
      }
    }
  }
}
