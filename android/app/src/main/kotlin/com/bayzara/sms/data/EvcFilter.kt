package com.bayzara.sms.data

/**
 * Lightweight filter: does this notification text look like an EVC Plus SMS?
 * The server does the authoritative parsing — this just decides whether to forward.
 */
object EvcFilter {
    private val REGEX = Regex(
        "EVCPLUS|waxaad\\s+.+(ka\\s+heshay|u\\s+dirtay|ka\\s+qaadatay|ka\\s+bixiyey)",
        RegexOption.IGNORE_CASE,
    )

    fun isEvcSms(text: String?): Boolean {
        if (text.isNullOrBlank()) return false
        return REGEX.containsMatchIn(text)
    }
}
