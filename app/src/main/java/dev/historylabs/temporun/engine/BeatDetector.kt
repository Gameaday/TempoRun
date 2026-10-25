package dev.historylabs.temporun.engine

import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * On-device tempo (BPM) analysis — the zero-cost moat. No cloud API.
 *
 * Pipeline (P0 implementation, energy-based onset autocorrelation):
 *   1. frame the mono PCM signal (512 samples, hop 256) and measure RMS energy
 *   2. onset strength envelope = positive frame-to-frame energy flux, normalized
 *   3. autocorrelate the envelope over lags matching 60-200 BPM
 *   4. mild tempo prior around 135 BPM helps octave disambiguation
 *      (a 85 BPM track reads as 170 at half lag and vice versa)
 *   5. confidence = peak prominence over the mean autocorrelation response,
 *      clamped to [0, 1]; tracks below CONFIDENCE_THRESHOLD are excluded
 *      from auto-queue and only usable manually
 *
 * P0 validation TODOs:
 *   - spectral flux instead of energy flux for finer onsets (TarsosDSP or JNI aubio)
 *   - full octave check: compare best lag against lag/2 and lag*2 candidates
 *   - known-BPM test set across genres (EDM easy, jazz hard)
 *
 * Caller contract: mono PCM float [-1, 1], any sample rate >= 8 kHz, >= 3 s.
 */
class BeatDetector(
    private val minBpm: Int = 60,
    private val maxBpm: Int = 200,
) {
    data class Result(val bpm: Int, val confidence: Double)

    fun analyze(pcm: FloatArray, sampleRate: Int): Result {
        require(pcm.size > sampleRate * 3) { "need at least 3 seconds of audio" }

        val frame = 512
        val hop = 256
        val frames = (pcm.size - frame) / hop + 1
        require(frames > 64) { "clip too short for tempo analysis" }

        // 1. frame RMS energies
        val energies = FloatArray(frames)
        for (i in 0 until frames) {
            var e = 0.0
            for (j in 0 until frame) {
                val s = pcm[i * hop + j].toDouble()
                e += s * s
            }
            energies[i] = sqrt(e / frame).toFloat()
        }

        // 2. positive energy flux, normalized to [0, 1]
        val flux = FloatArray(frames) { i ->
            if (i == 0) 0f else max(0f, energies[i] - energies[i - 1])
        }
        val maxFlux = flux.maxOrNull() ?: 0f
        if (maxFlux <= 0f) return Result(0, 0.0)
        for (i in flux.indices) flux[i] = flux[i] / maxFlux

        // 3. autocorrelation over the BPM range, with a mild 135 BPM prior
        val frameRate = sampleRate / hop.toDouble()
        val minLag = max(1, (frameRate * 60.0 / maxBpm).toInt())
        val maxLag = min(frames / 2, (frameRate * 60.0 / minBpm).toInt())
        if (maxLag <= minLag) return Result(0, 0.0)

        var bestLag = -1
        var bestVal = 0.0
        var sum = 0.0
        var count = 0
        for (lag in minLag..maxLag) {
            var ac = 0.0
            for (i in lag until frames) {
                ac += flux[i].toDouble() * flux[i - lag].toDouble()
            }
            val bpm = 60.0 * frameRate / lag
            val prior = 1.0 / (1.0 + 0.0008 * (bpm - 135) * (bpm - 135))
            val v = ac * prior
            sum += v
            count++
            if (v > bestVal) {
                bestVal = v
                bestLag = lag
            }
        }
        if (bestLag <= 0) return Result(0, 0.0)

        // 4. confidence = peak prominence over the mean response
        val mean = sum / count
        val prominence = bestVal / (mean + 1e-9)
        val confidence = min(1.0, max(0.0, (prominence - 1.0) / 4.0))

        val bpm = Math.round(60.0 * frameRate / bestLag).toInt()
        return Result(bpm, confidence)
    }

    companion object {
        const val CONFIDENCE_THRESHOLD = 0.5
    }
}
