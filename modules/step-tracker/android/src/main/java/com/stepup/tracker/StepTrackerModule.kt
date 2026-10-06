package com.stepup.tracker
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StepTrackerModule : Module() {
  private fun context(): Context = appContext.reactContext ?: error("Android context unavailable")
  override fun definition() = ModuleDefinition {
    Name("StepTracker")
    Function("snapshot") {
      val c = context(); val p = c.getSharedPreferences("profile", Context.MODE_PRIVATE)
      val store = StepStore(c)
      val rows = try { store.days() } finally { store.close() }
      mapOf("available" to ((c.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null),
        "running" to StepTrackingService.running, "status" to StepTrackingService.status,
        "lastUpdate" to StepTrackingService.lastUpdate, "configured" to p.getBoolean("configured",false),
        "profile" to mapOf("weight" to p.getFloat("weight",70f), "height" to p.getFloat("height",170f),"goal" to p.getInt("goal",8000),"stepLength" to p.getFloat("stepLength",0.72f)), "days" to rows)
    }
    Function("configure") { weight: Double, height: Double, goal: Int, stepLength: Double ->
      require(weight.isFinite() && weight in 20.0..350.0 && height.isFinite() && height in 100.0..250.0 && goal in 100..100000 && stepLength.isFinite() && stepLength in 0.2..1.5) { "Invalid profile values" }
      context().getSharedPreferences("profile",Context.MODE_PRIVATE).edit().putFloat("weight",weight.toFloat()).putFloat("height",height.toFloat()).putInt("goal",goal).putFloat("stepLength",stepLength.toFloat()).putBoolean("configured",true).commit()
      Unit
    }
    Function("start") {
      val c = context()
      check(c.getSharedPreferences("profile",Context.MODE_PRIVATE).getBoolean("configured",false)) { "Save your profile first" }
      check((c.getSystemService(Context.SENSOR_SERVICE) as SensorManager).getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null) { "Step sensor unavailable" }
      c.startForegroundService(Intent(c,StepTrackingService::class.java)); Unit
    }
    Function("stop") { context().stopService(Intent(context(),StepTrackingService::class.java)); StepTrackingService.status = "Paused"; Unit }
    Function("clear") {
      check(!StepTrackingService.running) { "Pause tracking before deleting history" }
      val store = StepStore(context()); try { store.clear() } finally { store.close() }; Unit
    }
  }
}
