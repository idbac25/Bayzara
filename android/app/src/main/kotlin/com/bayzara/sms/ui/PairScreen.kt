package com.bayzara.sms.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bayzara.sms.BuildConfig
import com.bayzara.sms.data.Api
import com.bayzara.sms.data.Prefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairScreen(prefs: Prefs, onPaired: () -> Unit) {
    val scope = rememberCoroutineScope()
    var apiBase by remember { mutableStateOf(prefs.apiBase ?: BuildConfig.DEFAULT_API_BASE) }
    var pairingCode by remember { mutableStateOf("") }
    var devicePhone by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "Bayzara SMS",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.secondary,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Pair this phone with your shop to auto-record EVC payments",
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = apiBase,
            onValueChange = { apiBase = it.trim() },
            label = { Text("Bayzara URL") },
            placeholder = { Text("https://bayzara.app") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = pairingCode,
            onValueChange = {
                // Digits only, max 6
                pairingCode = it.filter(Char::isDigit).take(6)
            },
            label = { Text("6-digit pairing code") },
            placeholder = { Text("123456") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = devicePhone,
            onValueChange = { devicePhone = it.trim() },
            label = { Text("This phone's EVC number (optional)") },
            placeholder = { Text("0613229925") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        )

        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                error!!,
                color = MaterialTheme.colorScheme.error,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.height(24.dp))

        Button(
            onClick = {
                if (pairingCode.length != 6) {
                    error = "Enter the 6-digit code from Bayzara"
                    return@Button
                }
                scope.launch {
                    busy = true
                    error = null
                    val result = withContext(Dispatchers.IO) {
                        Api.pair(apiBase, pairingCode, devicePhone.ifBlank { null })
                    }
                    busy = false
                    result.onSuccess { r ->
                        prefs.apiBase = apiBase
                        prefs.deviceToken = r.deviceToken
                        prefs.businessId = r.businessId
                        prefs.businessName = r.businessName
                        onPaired()
                    }.onFailure { e ->
                        error = e.message ?: "Pairing failed"
                    }
                }
            },
            enabled = !busy && pairingCode.length == 6 && apiBase.isNotBlank(),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            if (busy) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Pair", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(Modifier.height(24.dp))

        Text(
            "In Bayzara: Operations → SMS Recorder → Pair phone",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
