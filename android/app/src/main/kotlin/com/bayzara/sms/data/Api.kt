package com.bayzara.sms.data

import android.os.Build
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object Api {
    data class PairResult(
        val deviceToken: String,
        val businessId: String,
        val businessName: String?,
    )

    data class EventResult(
        val eventId: String?,
        val status: String,
    )

    /** Exchanges a 6-digit pairing code for a long-lived device token. */
    fun pair(apiBase: String, pairingCode: String, devicePhone: String?): Result<PairResult> {
        return runCatching {
            val body = JSONObject().apply {
                put("pairing_code", pairingCode)
                if (!devicePhone.isNullOrBlank()) put("device_phone", devicePhone)
                put("app_version", Build.VERSION.RELEASE + " (0.1.0)")
            }
            val (code, text) = httpPost(
                "${apiBase.trimEnd('/')}/api/sms/pair/complete",
                null,
                body.toString(),
            )
            if (code !in 200..299) error(parseError(text) ?: "HTTP $code")
            val json = JSONObject(text)
            PairResult(
                deviceToken = json.getString("device_token"),
                businessId = json.getString("business_id"),
                businessName = json.optString("business_name").takeIf { it.isNotBlank() },
            )
        }
    }

    /** Forwards an SMS body to Bayzara. Authenticated by bearer token. */
    fun postEvent(apiBase: String, token: String, rawSms: String): Result<EventResult> {
        return runCatching {
            val body = JSONObject().apply {
                put("raw_sms", rawSms)
                put("app_version", "0.1.0")
            }
            val (code, text) = httpPost(
                "${apiBase.trimEnd('/')}/api/sms/event",
                token,
                body.toString(),
            )
            if (code !in 200..299) error(parseError(text) ?: "HTTP $code")
            val json = JSONObject(text)
            EventResult(
                eventId = json.optString("event_id").takeIf { it.isNotBlank() },
                status = json.optString("status", "unknown"),
            )
        }
    }

    private fun httpPost(url: String, bearer: String?, json: String): Pair<Int, String> {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json")
            if (bearer != null) setRequestProperty("Authorization", "Bearer $bearer")
        }
        return try {
            conn.outputStream.use { it.write(json.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            code to text
        } finally {
            conn.disconnect()
        }
    }

    private fun parseError(text: String): String? = runCatching {
        JSONObject(text).optString("error").takeIf { it.isNotBlank() }
    }.getOrNull()
}
