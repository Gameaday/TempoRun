package dev.historylabs.temporun.engine

import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.PI
import kotlin.math.sin

class CadenceDetectorTest {

    /** Simulates a runner/walker: gravity (1 g) + sinusoidal step bounce + drift noise. */
    private fun simulate(spm: Int, seconds: Int, detector: CadenceDetector): Int? {
        val hz = 50
        val stepHz = spm / 60.0
        for (i in 0 until seconds * hz) {
            val t = i.toDouble() / hz
            val bounce = 0.35 * sin(2 * PI * stepHz * t)
            val drift = 0.02 * sin(2 * PI * 0.3 * t)
            val x = 0.1 * sin(2 * PI * 0.7 * t)
            val y = 0.1 * sin(2 * PI * 1.1 * t + 1.0)
            val z = 1.0 + bounce + drift
            detector.onSample(
                x.toFloat(), y.toFloat(), z.toFloat(),
                (t * 1000).toLong(),
            )
        }
        return detector.stepsPerMinute
    }

    @Test
    fun detectsRunningCadence() {
        val d = CadenceDetector()
        val spm = simulate(180, 40, d)
        assertTrue("expected a reading, got null", spm != null)
        assertTrue("180 spm in -> " + spm + " out", spm!! in 172..188)
    }

    @Test
    fun detectsSlowRunningCadence() {
        val d = CadenceDetector()
        val spm = simulate(155, 40, d)
        assertTrue("155 spm in -> " + spm + " out", spm != null && spm in 148..162)
    }

    @Test
    fun detectsWalkingCadence() {
        val d = CadenceDetector()
        val spm = simulate(120, 40, d)
        assertTrue("120 spm in -> " + spm + " out", spm != null && spm in 113..127)
    }

    @Test
    fun noReadingBeforeWarmUp() {
        val d = CadenceDetector()
        simulate(180, 1, d) // 1 s: less than a full window + min steps
        assertTrue(d.stepsPerMinute == null)
    }
}
