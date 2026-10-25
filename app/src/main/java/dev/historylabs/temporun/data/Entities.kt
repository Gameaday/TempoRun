package dev.historylabs.temporun.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

// Local-first: Room DBs on phone + watch, no cloud. (Spec section 7)

@Entity(tableName = "runs")
data class RunEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTimeEpoch: Long,
    val durationSeconds: Long,
    val distanceMeters: Double,
    val avgPaceSecPerKm: Int,
    val avgCadenceSpm: Int,
    val syncScorePercent: Int,
    val runScore: Long,
)

@Entity(tableName = "tracks")
data class TrackEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val artist: String,
    val bpm: Int,
    val bpmConfidence: Double,
    val genre: String? = null,
    val year: Int? = null,
    val unlockedForFreeRun: Boolean = false,
    val pbLockSeconds: Int = 0,
)

@Entity(tableName = "passport_progress")
data class PassportProgressEntity(
    @PrimaryKey val passportId: String,
    val kmCompleted: Double,
    val completedSlotsCsv: String,
)

@Dao
interface RunDao {
    @Insert suspend fun insert(run: RunEntity): Long
    @Query("SELECT * FROM runs ORDER BY startTimeEpoch DESC LIMIT 50")
    fun recent(): Flow<List<RunEntity>>
}

@Dao
interface TrackDao {
    @Query("SELECT * FROM tracks WHERE unlockedForFreeRun = 1")
    fun freeRunLibrary(): Flow<List<TrackEntity>>
}

@Dao
interface PassportDao {
    @Query("SELECT * FROM passport_progress WHERE passportId = :id")
    suspend fun progress(id: String): PassportProgressEntity?
    @Insert suspend fun upsert(progress: PassportProgressEntity)
}

@Database(
    entities = [RunEntity::class, TrackEntity::class, PassportProgressEntity::class],
    version = 1,
)
abstract class TempoRunDatabase : RoomDatabase() {
    abstract fun runDao(): RunDao
    abstract fun trackDao(): TrackDao
    abstract fun passportDao(): PassportDao
}
