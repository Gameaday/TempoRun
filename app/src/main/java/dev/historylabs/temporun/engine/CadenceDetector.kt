package dev.historylabs.temporun.engine

import kotlin.math.sqrt

/**
 * Cadence (steps/min) from accelerometer magnitude peaks.
 *
 * Approach (P0 implementation):
 *  - |a| magnitude removes gravity orientation dependence (1 g baseline remains)
 *  - rolling 2 s window -> adaptive threshold = mean + 0.6 * stddev
 *  - hysteresis: must fall below threshold - 0.2*std before the next peak counts
 *  - refractory interval (300 ms) caps max detection at 200 spm
 *  - spm = median of recent inter-step intervals, clamped to [110, 200]
 *    (110 floor supports walkers — spec section 3, F11)
 *
 * P0 validation TODOs:
 *  - treadmill ground truth + manual count
 *  - wrist (watch) arm-swing harmonic: watch for 2x cadence detection
 *  - pocket vs. armband vs. wrist placement calibration
 */
class CadenceDetector(
    private val sampleRateHz: Int = 50,
    private val refractoryMs: Long = 300L,
    private val minSteps: Int = 6,
) {
    private val window = ArrayDeque<Float>()
    private val windowCapacity = sampleRateHz * 2
    private val intervalsMs = ArrayDeque<Long>()
    private var lastStepMs = -1L
    private var belowThreshold = true

    fun onSample(x: Float, y: Float, z: Float, timestampMs: Long) {
        val mag = sqrt(x * x + y * y + z * z)
        window.addLast(mag)
        if (window.size > windowCapacity) window.removeFirst()
        if (window.size < windowCapacity) return // warm-up: need a full window for stats

        val mean = window.sum() / window.size
        var variance = 0f
        for (v in window) {
            val d = v - mean
            variance += d * d
        }
        val std = sqrt(variance / window.size)
        val threshold = mean + 0.6f * std

        if (belowThreshold && mag > threshold) {
            belowThreshold = false
            onStep(timestampMs)
        } else if (!belowThreshold && mag < threshold - 0.2f * std) {
            belowThreshold = true
        }
    }

    private fun onStep(timestampMs: Long) {
        when {
            lastStepMs < 0 -> lastStepMs = timestampMs
            timestampMs - lastStepMs >= refractoryMs -> {
                intervalsMs.addLast(timestampMs - lastStepMs)
                if (intervalsMs.size > 12) intervalsMs.removeFirst()
                lastStepMs = timestampMs
            }
            // else: refractory violation — noise burst, ignored
        }
    }

    /** Smoothed steps per minute, or null until enough steps have arrived (~10 s of running). */
    val stepsPerMinute: Int?
        get() {
            if (intervalsMs.size < minSteps) return null
            val sorted = intervalsMs.sorted()
            val medianMs = sorted[sorted.size / 2].toFloat()
            if (medianMs <= 0f) return null
            return (60_000f / medianMs).toInt().coerceIn(MIN_SPM, MAX_SPM)
        }

    fun reset() {
        window.clear()
        intervalsMs.clear()
        lastStepMs = -1L
        belowThreshold = true
    }

    companion object {
        const val MIN_SPM = 110 // walkers included (F11)
        const val MAX_SPM = 200
    }
}
