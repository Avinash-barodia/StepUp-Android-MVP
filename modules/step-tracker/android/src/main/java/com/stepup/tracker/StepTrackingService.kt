package com.stepup.tracker
import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.*
import android.os.*

class StepTrackingService : Service(), SensorEventListener {
  companion object { @Volatile var running = false; @Volatile var status = "Paused"; @Volatile var lastUpdate = 0L }
  private lateinit var sensors: SensorManager
  private lateinit var store: StepStore
  override fun onCreate() { super.onCreate(); sensors = getSystemService(SENSOR_SERVICE) as SensorManager; store = StepStore(this) }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    manager.createNotificationChannel(NotificationChannel("tracking", "Walking tracker", NotificationManager.IMPORTANCE_LOW))
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val notification = Notification.Builder(this,"tracking").setContentTitle("StepUp is counting steps")
      .setContentText("Tap to view your progress or pause tracking.")
      .setSmallIcon(android.R.drawable.ic_menu_directions).setOngoing(true)
    if(launch != null) notification.setContentIntent(PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    try {
      if(Build.VERSION.SDK_INT >= 34) startForeground(10, notification.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
      else startForeground(10, notification.build())
      if(running) return START_NOT_STICKY
      val sensor = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if(sensor == null) { status = "Step sensor unavailable"; stopSelf(); return START_NOT_STICKY }
      // New sessions deliberately establish a fresh baseline: never count paused gaps.
      store.resetBaseline()
      running = sensors.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
      status = if(running) "Waiting for first sensor reading" else "Could not start sensor"
      if(!running) stopSelf()
    } catch(e: Exception) { running = false; status = "Tracking stopped: check activity permission"; stopSelf() }
    return START_NOT_STICKY
  }
  override fun onSensorChanged(event: SensorEvent) {
    try {
      // Use sensor event time so normal delivery delays do not move steps to the wrong day.
      val time = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1000000
      store.record(event.values[0].toLong(), time)
      lastUpdate = System.currentTimeMillis(); status = "Tracking"
    } catch(e: Exception) { status = "Storage error: tracking stopped"; stopSelf() }
  }
  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
  override fun onDestroy() { sensors.unregisterListener(this); running = false; store.close(); super.onDestroy() }
  override fun onBind(intent: Intent?): IBinder? = null
}
