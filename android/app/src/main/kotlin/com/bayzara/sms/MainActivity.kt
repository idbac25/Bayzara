package com.bayzara.sms

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.bayzara.sms.data.Prefs
import com.bayzara.sms.ui.BayzaraTheme
import com.bayzara.sms.ui.PairScreen
import com.bayzara.sms.ui.StatusScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = Prefs(applicationContext)

        setContent {
            BayzaraTheme {
                var paired by remember { mutableStateOf(prefs.isPaired) }
                Surface(modifier = Modifier.fillMaxSize()) {
                    if (paired) {
                        StatusScreen(prefs = prefs, onUnpaired = { paired = false })
                    } else {
                        PairScreen(prefs = prefs, onPaired = { paired = true })
                    }
                }
            }
        }
    }
}
