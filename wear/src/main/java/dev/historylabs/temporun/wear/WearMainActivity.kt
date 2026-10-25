package dev.historylabs.temporun.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.wear.compose.material.Text

/**
 * Wear OS companion: standalone run tracking + cached tempo-tagged playlist.
 * P2 scope — phone-free runs, on-watch cadence detection, battery budget
 * < 15% for a 90-min run (spec section 9).
 */
class WearMainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { Text("TempoRun — Wear (P2)") }
    }
}
