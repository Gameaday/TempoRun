package dev.historylabs.temporun.engine

/**
 * Cadence (steps/min) from accelerometer magnitude peaks.
 *
 * P0 spike TODOs:
 *  - validate peak detector vs. ground truth (treadmill + manual count)
 *  - calibrate wrist vs. pocket placement; handle watch arm-swing harmonic
 *  - smoothing: 5 s rolling median; reject < 120 and > 200 spm
 *  - settle target: stable cadence within ~10 s of run start
 */
class CadenceDetector(
    private val sampleRateHz: Int = 50,
    private val smoothingWindowSec: Int = 5,
) {
    private val magnitude = ArrayDeque<Float>()
    private val stepIntervalsMs = ArrayDeque<Long>()
    private var lastPeakMs = 0L

    fun onSample(x: Float, y: Float, z: Float, timestampMs: Long) {
        val mag = kotlin.math.sqrt(x * x + y * y + z * z)
        magnitude.addLast(mag)
        // TODO(P0): band-pass filter + adaptive-threshold peak detection here,
        // recording inter-step intervals into stepIntervalsMs
    }

    /** Smoothed steps per minute, or null until enough steps have arrived. */
    val stepsPerMinute: Int?
        get() {
            if (stepIntervalsMs.size < MIN_STEPS) return null
            // TODO(P0): median of recent inter-step intervals, scaled to spm
            return null
        }

    companion object {
        const val MIN_STEPS = 6
        const val MIN_SPM = 120
        const val MAX_SPM = 200
    }
}
