package com.stepup.tracker
internal object CounterMath {
  fun delta(previous: Long?, current: Long, sameBoot: Boolean): Long =
    if (previous == null || !sameBoot || current < previous) 0 else current - previous
  fun km(steps: Long, stepLength: Double): Double = steps * stepLength / 1000.0
  fun kcal(km: Double, weight: Double): Double = 0.5 * weight * km
}
