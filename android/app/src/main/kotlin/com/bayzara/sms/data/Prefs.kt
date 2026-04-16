package com.bayzara.sms.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Encrypted persistent store for the device token and paired business.
 * Uses EncryptedSharedPreferences so the token isn't readable from a rooted backup.
 */
class Prefs(ctx: Context) {
    private val masterKey = MasterKey.Builder(ctx)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sp = EncryptedSharedPreferences.create(
        ctx,
        "bayzara_secure",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var apiBase: String?
        get() = sp.getString(K_API_BASE, null)
        set(v) = sp.edit().putString(K_API_BASE, v).apply()

    var deviceToken: String?
        get() = sp.getString(K_TOKEN, null)
        set(v) = sp.edit().putString(K_TOKEN, v).apply()

    var businessId: String?
        get() = sp.getString(K_BIZ_ID, null)
        set(v) = sp.edit().putString(K_BIZ_ID, v).apply()

    var businessName: String?
        get() = sp.getString(K_BIZ_NAME, null)
        set(v) = sp.edit().putString(K_BIZ_NAME, v).apply()

    var lastEventAt: Long
        get() = sp.getLong(K_LAST_EVT, 0L)
        set(v) = sp.edit().putLong(K_LAST_EVT, v).apply()

    var lastEventSummary: String?
        get() = sp.getString(K_LAST_SUMMARY, null)
        set(v) = sp.edit().putString(K_LAST_SUMMARY, v).apply()

    val isPaired: Boolean get() = !deviceToken.isNullOrEmpty() && !apiBase.isNullOrEmpty()

    fun clear() {
        sp.edit().clear().apply()
    }

    companion object {
        private const val K_API_BASE = "api_base"
        private const val K_TOKEN = "device_token"
        private const val K_BIZ_ID = "business_id"
        private const val K_BIZ_NAME = "business_name"
        private const val K_LAST_EVT = "last_evt_at"
        private const val K_LAST_SUMMARY = "last_evt_summary"
    }
}
