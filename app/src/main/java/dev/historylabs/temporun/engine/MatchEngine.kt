package dev.historylabs.temporun.engine

import kotlin.math.abs

/**
 * Pure matching engine: cadence -> target BPM -> track selection.
 * Implements spec section 6: lock tolerance, hysteresis, anti-repeat,
 * half-time feel. No Android dependencies — unit-test it hard.
 */
object MatchEngine {
    const val LOCK_TOLERANCE_BPM = 2
    const val RESYNC_THRESHOLD_BPM = 4
    const val RESYNC_SUSTAIN_SECONDS = 15
    const val ANTI_REPEAT_WINDOW = 4
    const val ANTI_REPEAT_PENALTY_BPM = 8

    enum class TimeFeel { FULL, HALF }

    data class Track(
        val id: Long,
        val title: String,
        val artist: String,
        val bpm: Int,
        val genre: String? = null,
        val year: Int? = null,
        val unlockedForFreeRun: Boolean = true,
    )

    data class Match(val track: Track, val deltaBpm: Int)

    fun effectiveBpm(track: Track, feel: TimeFeel): Int =
        if (feel == TimeFeel.HALF) track.bpm * 2 else track.bpm

    fun isLocked(cadenceSpm: Int, track: Track, feel: TimeFeel): Boolean =
        abs(effectiveBpm(track, feel) - cadenceSpm) <= LOCK_TOLERANCE_BPM

    /** Pick the best unlocked track for a target cadence. */
    fun pick(
        targetCadenceSpm: Int,
        pool: List<Track>,
        feel: TimeFeel,
        recentIds: List<Long>,
    ): Match? {
        var best: Track? = null
        var bestScore = Int.MAX_VALUE
        for (t in pool) {
            if (!t.unlockedForFreeRun) continue
            val recent = recentIds.takeLast(ANTI_REPEAT_WINDOW).contains(t.id)
            val score = abs(effectiveBpm(t, feel) - targetCadenceSpm) +
                (if (recent) ANTI_REPEAT_PENALTY_BPM else 0)
            if (score < bestScore) {
                bestScore = score
                best = t
            }
        }
        return best?.let { Match(it, abs(effectiveBpm(it, feel) - targetCadenceSpm)) }
    }

    /** Hysteresis: resync only when drift exceeds threshold AND sustains. */
    fun shouldResync(
        currentTrack: Track,
        cadenceSpm: Int,
        feel: TimeFeel,
        sustainedDriftSeconds: Int,
    ): Boolean =
        abs(effectiveBpm(currentTrack, feel) - cadenceSpm) > RESYNC_THRESHOLD_BPM &&
            sustainedDriftSeconds >= RESYNC_SUSTAIN_SECONDS
}
