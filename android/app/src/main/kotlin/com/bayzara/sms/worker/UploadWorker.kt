package com.bayzara.sms.worker

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.bayzara.sms.data.Api
import com.bayzara.sms.data.Prefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

/**
 * WorkManager worker that forwards a single SMS event to Bayzara.
 * Persisted across app restarts and retries with exponential backoff.
 */
class UploadWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val raw = inputData.getString(KEY_RAW) ?: return@withContext Result.failure()
        val prefs = Prefs(applicationContext)
        val token = prefs.deviceToken ?: return@withContext Result.failure()
        val base = prefs.apiBase ?: return@withContext Result.failure()

        val result = Api.postEvent(base, token, raw)
        if (result.isSuccess) {
            val r = result.getOrNull()
            prefs.lastEventAt = System.currentTimeMillis()
            prefs.lastEventSummary = "Sent · ${r?.status ?: "ok"}"
            Result.success()
        } else {
            val msg = result.exceptionOrNull()?.message ?: "upload failed"
            // 401/403 = token revoked → don't retry forever
            if (msg.contains("401") || msg.contains("403") || msg.contains("Invalid device token")) {
                prefs.lastEventSummary = "Rejected: $msg"
                Result.failure()
            } else if (runAttemptCount >= 20) {
                prefs.lastEventSummary = "Gave up after $runAttemptCount retries"
                Result.failure()
            } else {
                Result.retry()
            }
        }
    }

    companion object {
        const val KEY_RAW = "raw_sms"

        fun enqueue(ctx: Context, rawSms: String) {
            val data: Data = workDataOf(KEY_RAW to rawSms)
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val work = OneTimeWorkRequestBuilder<UploadWorker>()
                .setInputData(data)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(ctx).enqueue(work)
        }
    }
}
