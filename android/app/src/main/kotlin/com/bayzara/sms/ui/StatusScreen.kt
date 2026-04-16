package com.bayzara.sms.ui

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bayzara.sms.data.Prefs
import com.bayzara.sms.service.EvcListener
import com.bayzara.sms.worker.UploadWorker
import kotlinx.coroutines.delay

@Composable
fun StatusScreen(prefs: Prefs, onUnpaired: () -> Unit) {
    val ctx = LocalContext.current
    var hasNotifAccess by remember { mutableStateOf(isNotificationListenerEnabled(ctx)) }
    var lastEventAt by remember { mutableStateOf(prefs.lastEventAt) }
    var lastEventSummary by remember { mutableStateOf(prefs.lastEventSummary) }

    // Poll state once a second so the UI reflects listener toggle changes and worker updates.
    LaunchedEffect(Unit) {
        while (true) {
            hasNotifAccess = isNotificationListenerEnabled(ctx)
            lastEventAt = prefs.lastEventAt
            lastEventSummary = prefs.lastEventSummary
            delay(1_000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            "Bayzara SMS",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.secondary,
        )

        // Paired status card
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (hasNotifAccess) Color(0xFFE6F4EA) else Color(0xFFFFF3E0)
            ),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    if (hasNotifAccess) "✓ Listening for EVC SMS"
                    else "⚠ Notification access needed",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Paired with ${prefs.businessName ?: "Bayzara"}",
                    fontSize = 13.sp,
                )
                if (!hasNotifAccess) {
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { openNotificationAccessSettings(ctx) }) {
                        Text("Grant notification access")
                    }
                }
            }
        }

        // Last event card
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Last SMS forwarded", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(6.dp))
                if (lastEventAt == 0L) {
                    Text("No SMS sent yet.", fontSize = 14.sp)
                    Text(
                        "Once your phone receives an EVC payment SMS, it will be forwarded automatically.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Text(relativeTime(lastEventAt), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    lastEventSummary?.let {
                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Test button
        OutlinedButton(
            onClick = {
                val test = "[-EVCPLUS-] waxaad \$1 ka heshay 0610000000, Tar: 15/04/26 10:00:00 haraagagu waa \$0.00 (BAYZARA TEST)"
                UploadWorker.enqueue(ctx, test)
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Send test SMS")
        }

        // Unpair
        TextButton(
            onClick = {
                prefs.clear()
                onUnpaired()
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Unpair this phone", color = MaterialTheme.colorScheme.error)
        }
    }
}

private fun isNotificationListenerEnabled(ctx: Context): Boolean {
    val flat = Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners") ?: return false
    val want = ComponentName(ctx, EvcListener::class.java).flattenToString()
    return flat.split(":").any { it == want || it == ComponentName(ctx, EvcListener::class.java).flattenToShortString() }
        || TextUtils.split(flat, ":").any { it.contains(ctx.packageName) }
}

private fun openNotificationAccessSettings(ctx: Context) {
    ctx.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    )
}

private fun relativeTime(ts: Long): String {
    val diff = System.currentTimeMillis() - ts
    val min = diff / 60_000
    if (min < 1) return "just now"
    if (min < 60) return "${min}m ago"
    val hr = min / 60
    if (hr < 24) return "${hr}h ago"
    return "${hr / 24}d ago"
}
