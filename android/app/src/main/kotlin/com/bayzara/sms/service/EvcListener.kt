package com.bayzara.sms.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.bayzara.sms.data.EvcFilter
import com.bayzara.sms.data.Prefs
import com.bayzara.sms.worker.UploadWorker

/**
 * Listens to every notification on the device. When one looks like an EVC Plus SMS,
 * enqueues an UploadWorker to forward it to Bayzara.
 *
 * No SMS permissions required — the user just grants "Notification access" in Settings.
 */
class EvcListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val sbnRef = sbn ?: return
        try {
            val prefs = Prefs(applicationContext)
            if (!prefs.isPaired) return

            val text = extractText(sbnRef.notification) ?: return
            if (!EvcFilter.isEvcSms(text)) return

            UploadWorker.enqueue(applicationContext, text)
            Log.i(TAG, "Forwarding EVC SMS (${text.length} chars)")
        } catch (t: Throwable) {
            Log.e(TAG, "onNotificationPosted failed", t)
        }
    }

    private fun extractText(n: Notification): String? {
        val extras = n.extras ?: return null
        val candidates = listOfNotNull(
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
            extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.joinToString("\n") { it.toString() },
        )
        // Return the longest (most complete) copy
        return candidates.maxByOrNull { it.length }?.takeIf { it.isNotBlank() }
    }

    companion object {
        private const val TAG = "EvcListener"
    }
}
