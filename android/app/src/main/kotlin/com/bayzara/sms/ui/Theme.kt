package com.bayzara.sms.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Navy = Color(0xFF1A2744)
private val Blue = Color(0xFF0F4C81)
private val Amber = Color(0xFFF5A623)

private val Light = lightColorScheme(
    primary = Blue,
    onPrimary = Color.White,
    secondary = Navy,
    tertiary = Amber,
)

private val Dark = darkColorScheme(
    primary = Blue,
    onPrimary = Color.White,
    secondary = Navy,
    tertiary = Amber,
)

@Composable
fun BayzaraTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) Dark else Light
    MaterialTheme(colorScheme = colors, content = content)
}
