package com.vasuli.app.autosms

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AutoSmsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "VasuliAutoSms"

  /** Stores the plan (validated again natively) and aligns the alarm with it. */
  @ReactMethod
  fun syncPlan(json: String, promise: Promise) {
    try {
      val plan = AutoSmsPlan.parse(json, System.currentTimeMillis())
      if (plan == null) {
        promise.reject("E_INVALID_PLAN", "Invalid reminder plan.")
        return
      }
      val previous = AutoSmsStore.loadPlan(reactContext)
      AutoSmsStore.savePlan(reactContext, plan)
      AutoSmsScheduler.reconcile(reactContext, forceFresh = !plan.sameSchedule(previous))
      promise.resolve(AutoSmsStore.nextTrigger(reactContext).toDouble())
    } catch (e: Exception) {
      promise.reject("E_SYNC_FAILED", "Could not schedule reminders.")
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    AutoSmsStore.clearPlan(reactContext)
    AutoSmsScheduler.cancel(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun getLog(promise: Promise) {
    promise.resolve(AutoSmsStore.readLog(reactContext).toString())
  }

  @ReactMethod
  fun clearLog(promise: Promise) {
    AutoSmsStore.clearLog(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    val pm = reactContext.getSystemService(PowerManager::class.java)
    val map = Arguments.createMap()
    map.putBoolean("exactAlarmAllowed", AutoSmsScheduler.canScheduleExact(reactContext))
    map.putBoolean("batteryUnrestricted", pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false)
    map.putDouble("nextTriggerAt", AutoSmsStore.nextTrigger(reactContext).toDouble())
    promise.resolve(map)
  }

  @ReactMethod
  fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      launch(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${reactContext.packageName}")))
    }
  }

  @ReactMethod
  fun openBatterySettings() {
    launch(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
  }

  private fun launch(intent: Intent) {
    try {
      reactContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
      // Settings screen unavailable on this device.
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}
}
