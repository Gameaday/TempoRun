package dev.historylabs.temporun.engine

import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random
import kotlin.math.min

class BeatDetectorTest {

    /** Synthetic click track: decaying 10 ms bursts at a fixed tempo. */
    private fun clickTrack(bpm: Double, seconds: Int, sampleRate: Int): FloatArray {
        val n = seconds * sampleRate
        val out = FloatArray(n)
        val interval = (60.0 / bpm * sampleRate).toInt()
        var i = 0
        while (i < n) {
            val burst = min(220, n - i)
            for (j in 0 until burst) {
                out[i + j] = (1.0 - j.toDouble() / 220.0).toFloat()
            }
            i += interval
        }
        return out
    }

    @Test
    fun detectsHouseTempo() {
        val r = BeatDetector().analyze(clickTrack(124.0, 30, 22050), 22050)
        assertTrue("bpm=" + r.bpm + " conf=" + r.confidence, r.bpm in 120..128)
        assertTrue("confidence=" + r.confidence, r.confidence > 0.5)
    }

    @Test
    fun detectsFastPopTempo() {
        val r = BeatDetector().analyze(clickTrack(171.0, 30, 22050), 22050)
        assertTrue("bpm=" + r.bpm + " conf=" + r.confidence, r.bpm in 166..176)
        assertTrue("confidence=" + r.confidence, r.confidence > 0.5)
    }

    @Test
    fun detectsSlow halftimeTempo() {
        val r = BeatDetector().analyze(clickTrack(85.0, 30, 22050), 22050)
        assertTrue("bpm=" + r.bpm + " conf=" + r.confidence, r.bpm in 82..88)
    }

    @Test
    fun lowConfidenceOnNoise() {
        val rnd = Random(42)
        val noise = FloatArray(30 * 22050) { rnd.nextFloat() * 2 - 1 }
        val r = BeatDetector().analyze(noise, 22050)
        assertTrue("confidence=" + r.confidence, r.confidence < 0.5)
    }
}
