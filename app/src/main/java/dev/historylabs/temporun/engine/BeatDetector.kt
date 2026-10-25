package dev.historylabs.temporun.engine

/**
 * On-device tempo (BPM) analysis — the zero-cost moat. No cloud API.
 *
 * Pipeline sketch (P0 spike):
 *   PCM decode (MediaCodec) -> downmix mono, 22.05 kHz
 *   -> onset strength envelope (spectral flux)
 *   -> autocorrelation over 60-200 BPM
 *   -> peak picking + octave disambiguation
 *   -> confidence score (tracks < 0.7 excluded from auto-queue)
 *
 * Candidates to evaluate in P0:
 *   - TarsosDSP (pure Java, easy embed)
 *   - aubio-style onset wrapper via JNI (faster, more work)
 */
class BeatDetector {

    data class Result(val bpm: Int, val confidence: Double)

    fun analyze(pcm: FloatArray, sampleRate: Int): Result {
        // TODO(P0): onset-based autocorrelation; validate against a known-BPM
        // test set across genres (EDM easy, jazz hard)
        TODO("P0 engine spike")
    }
}
