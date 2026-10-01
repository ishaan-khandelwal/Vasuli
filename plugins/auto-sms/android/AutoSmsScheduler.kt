package com.vasuli.app.autosms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

internal object AutoSmsScheduler {
  const val ACTION_RUN = "com.vasuli.app.autosms.RUN"
  private const val REQUEST_CODE = 7301
  private const val CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000L

  private fun alarmManager(ctx: Context) = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun pendingIntent(ctx: Context): PendingIntent =
    PendingIntent.getBroadcast(
      ctx,
      REQUEST_CODE,
      Intent(ctx, AutoSmsReceiver::class.java).setAction(ACTION_RUN),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  fun canScheduleExact(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(ctx).canScheduleExactAlarms()

  private fun setAlarm(ctx: Context, triggerAt: Long) {
    val am = alarmManager(ctx)
    val pi = pendingIntent(ctx)
    try {
      if (canScheduleExact(ctx)) {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
      } else {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
      }
    } catch (e: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
    }
  }

  fun cancel(ctx: Context) {
    alarmManager(ctx).cancel(pendingIntent(ctx))
    AutoSmsStore.setNextTrigger(ctx, 0L)
  }

  /**
   * Brings the alarm in line with the stored plan. [forceFresh] recomputes the next time (used when
   * the user changed the schedule); otherwise an existing future trigger is kept so frequent data
   * syncs never push the reminder back.
   */
  fun reconcile(ctx: Context, forceFresh: Boolean = false) {
    val plan = AutoSmsStore.loadPlan(ctx)
    if (plan == null || !plan.enabled) {
      cancel(ctx)
      return
    }

    val now = System.currentTimeMillis()
    val stored = AutoSmsStore.nextTrigger(ctx)
    val triggerAt = when {
      forceFresh || stored == 0L -> plan.firstTriggerAfter(now)
      stored > now -> stored
      now - stored < CATCH_UP_WINDOW_MS -> now + 30_000L // phone was off briefly: catch up shortly
      else -> plan.firstTriggerAfter(now)
    }

    AutoSmsStore.setNextTrigger(ctx, triggerAt)
    setAlarm(ctx, triggerAt)
  }

  fun scheduleNext(ctx: Context, plan: AutoSmsPlan) {
    val triggerAt = plan.nextTriggerAfterRun(System.currentTimeMillis())
    AutoSmsStore.setNextTrigger(ctx, triggerAt)
    setAlarm(ctx, triggerAt)
  }
}
