package dev.historylabs.temporun.engine

/**
 * Playlist Passport progression — the Finch-style content loop.
 *
 * A passport is a bundled, curated playlist journey. Running with a passport
 * active advances its km gates; crossing a gate unlocks that track for Free
 * Run playlists permanently. Passports ship as JSON assets (see
 * app/src/main/assets/passports/) — zero server.
 *
 * Note: passports reference *selection slots* (tempo range + genre), not
 * global track ids — every user's library is different, so each slot is
 * resolved against the user's own analyzed library at load time.
 */
data class Passport(
    val id: String,
    val title: String,
    val subtitle: String,
    val milestones: List<Milestone>,
) {
    data class Milestone(val slotKey: String, val kmGate: Double)

    val totalKm: Double get() = milestones.maxOf { it.kmGate }
}

data class PassportProgress(
    val passportId: String,
    val kmCompleted: Double,
    val unlockedTrackIds: Set<Long>,
)

object PassportEngine {

    /**
     * Advance a passport after a run. Returns the newly unlocked track ids
     * (empty when this run crossed no gates) — the caller persists the
     * updated progress and flips the tracks' unlockedForFreeRun flag.
     */
    fun advance(passport: Passport, progress: PassportProgress, runKm: Double): Set<Long> {
        val newKm = progress.kmCompleted + runKm
        val crossed = passport.milestones.filter {
            it.kmGate > progress.kmCompleted && it.kmGate <= newKm
        }
        // TODO(P1): map each crossed slot to its resolved track id
        return crossed.map { it.slotKey.hashCode().toLong() }.toSet()
    }

    fun isCompleted(passport: Passport, progress: PassportProgress): Boolean =
        progress.kmCompleted >= passport.totalKm
}
