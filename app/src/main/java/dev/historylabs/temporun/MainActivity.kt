package dev.historylabs.temporun

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp

/**
 * Phone app entry point.
 * P0: engine validation (see engine/). P1: run tracking UI + synced playback.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { TempoRunApp() }
    }
}

@Composable
fun TempoRunApp() {
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Text(
                text = "TempoRun — P0 engine spike\nSee engine/ and docs/PRODUCT_SPEC.md",
                fontSize = 18.sp,
            )
        }
    }
}
