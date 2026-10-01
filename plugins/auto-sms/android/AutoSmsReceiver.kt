package com.vasuli.app.autosms

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.util.UUID

/** Fires at the reminder time and sends the stored reminders as SMS through the device SIM. */
class AutoSmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != AutoSmsScheduler.ACTION_RUN) return
    val ctx = context.applicationContext
    val plan = AutoSmsStore.loadPlan(ctx)
    if (plan == null || !plan.enabled) return

    try {
      sendDueMessages(ctx, plan)
    } finally {
      // Always arm the next run, even if this one failed part-way.
      AutoSmsScheduler.scheduleNext(ctx, plan)
    }
  }

  private fun sendDueMessages(ctx: Context, plan: AutoSmsPlan) {
    val now = System.currentTimeMillis()

    if (now - plan.syncedAt > MAX_PLAN_AGE_MS) {
      logEvent(ctx, "skipped", "Reminder list is out of date. Open Vasuli to refresh it.")
      return
    }

    if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
      logEvent(ctx, "failed", "SMS permission is not granted.")
      notify(ctx, "Reminders not sent", "Allow SMS permission in Vasuli to send automatic reminders.")
      return
    }

    val sentKeys = AutoSmsStore.sentKeysToday(ctx)
    var budget = minOf(RUN_CAP, DAILY_CAP - sentKeys.size)
    var queued = 0

    for (item in plan.items) {
      if (budget <= 0) break
      if (item.key in sentKeys) continue
      if (queue(ctx, item)) {
        sentKeys.add(item.key)
        budget--
        queued++
      }
    }

    AutoSmsStore.saveSentKeysToday(ctx, sentKeys)
    if (queued > 0) {
      notify(ctx, "Reminders sent", "Vasuli sent $queued payment reminder SMS.")
    }
  }

  private fun smsManager(ctx: Context): SmsManager =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      ctx.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      SmsManager.getDefault()
    }

  /** Hands one message to the system and records it; the final result arrives in [AutoSmsSentReceiver]. */
  private fun queue(ctx: Context, item: AutoSmsItem): Boolean {
    val id = UUID.randomUUID().toString()
    return try {
      val sms = smsManager(ctx)
      val parts = sms.divideMessage(item.message)
      val sentIntents = ArrayList<PendingIntent>()
      for (i in parts.indices) {
        val sent = Intent(ctx, AutoSmsSentReceiver::class.java)
          .setAction(AutoSmsSentReceiver.ACTION_SENT)
          .putExtra(AutoSmsSentReceiver.EXTRA_ID, id)
        sentIntents.add(
          PendingIntent.getBroadcast(
            ctx,
            id.hashCode() + i,
            sent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          ),
        )
      }

      AutoSmsStore.appendLog(
        ctx,
        JSONObject()
          .put("id", id)
          .put("ts", System.currentTimeMillis())
          .put("label", item.label)
          .put("phone", mask(item.phone))
          .put("status", "queued")
          .put("partsTotal", parts.size)
          .put("partsOk", 0),
      )

      sms.sendMultipartTextMessage(item.phone, null, parts, sentIntents, null)
      true
    } catch (e: Exception) {
      AutoSmsStore.appendLog(
        ctx,
        JSONObject()
          .put("id", id)
          .put("ts", System.currentTimeMillis())
          .put("label", item.label)
          .put("phone", mask(item.phone))
          .put("status", "failed")
          .put("detail", e.javaClass.simpleName),
      )
      false
    }
  }

  private fun logEvent(ctx: Context, status: String, detail: String) {
    AutoSmsStore.appendLog(
      ctx,
      JSONObject()
        .put("id", UUID.randomUUID().toString())
        .put("ts", System.currentTimeMillis())
        .put("label", "Auto reminders")
        .put("phone", "")
        .put("status", status)
        .put("detail", detail),
    )
  }

  private fun notify(ctx: Context, title: String, text: String) {
    try {
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        nm.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Automatic SMS reminders", NotificationManager.IMPORTANCE_DEFAULT),
        )
      }
      val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
      val tap = launch?.let { PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE) }
      nm.notify(
        NOTIFICATION_ID,
        NotificationCompat.Builder(ctx, CHANNEL_ID)
          .setSmallIcon(android.R.drawable.stat_notify_chat)
          .setContentTitle(title)
          .setContentText(text)
          .setContentIntent(tap)
          .setAutoCancel(true)
          .build(),
      )
    } catch (e: SecurityException) {
      // Notification permission not granted: the SMS log still records everything.
    }
  }

  private fun mask(phone: String): String =
    if (phone.length <= 4) phone else "•••••" + phone.takeLast(4)

  companion object {
    private const val CHANNEL_ID = "vasuli-auto-sms"
    private const val NOTIFICATION_ID = 7302
    private const val RUN_CAP = 25
    private const val DAILY_CAP = 60
    private const val MAX_PLAN_AGE_MS = 35L * 24 * 60 * 60 * 1000
  }
}

/** Receives the per-part send result from the telephony stack and updates the log entry. */
class AutoSmsSentReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != ACTION_SENT) return
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val ok = resultCode == Activity.RESULT_OK
    val code = resultCode
    AutoSmsStore.updateLog(context.applicationContext, id) { entry ->
      if (!ok) {
        entry.put("status", "failed").put("detail", "Carrier error $code")
      } else if (entry.optString("status") != "failed") {
        val done = entry.optInt("partsOk", 0) + 1
        entry.put("partsOk", done)
        if (done >= entry.optInt("partsTotal", 1)) entry.put("status", "sent")
      }
    }
  }

  companion object {
    const val ACTION_SENT = "com.vasuli.app.autosms.SENT"
    const val EXTRA_ID = "id"
  }
}

/** Re-arms the alarm after reboot, app update, or a clock/time-zone change. */
class AutoSmsBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    when (action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED ->
        AutoSmsScheduler.reconcile(
          context.applicationContext,
          forceFresh = action == Intent.ACTION_TIME_CHANGED || action == Intent.ACTION_TIMEZONE_CHANGED,
        )
    }
  }
}
