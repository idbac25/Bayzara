# Bayzara SMS — Android Companion APK

Listens to incoming SMS notifications on the shop's phone, filters for Hormuud
EVC Plus payment messages, and forwards them to Bayzara so payments are recorded
automatically. No `READ_SMS` / `RECEIVE_SMS` permissions are used — the app
relies on Android's `NotificationListenerService`.

## How a shopkeeper uses it

1. **In Bayzara dashboard:** Operations → SMS Recorder → Pair phone → copy the
   6-digit code.
2. **Install the APK** on the phone that holds the EVC SIM (sideload — see
   download section below).
3. **Open Bayzara SMS** on that phone, enter the dashboard URL and the 6-digit
   code, tap Pair.
4. **Grant notification access** when prompted (Settings → Apps → Special
   access → Notification access → toggle on Bayzara SMS).
5. Done. Every Hormuud SMS that matches the EVC payment format is forwarded to
   the dashboard, where it appears in the SMS Recorder inbox for review.

## Architecture

| Piece | Responsibility |
|---|---|
| `EvcListener` (NotificationListenerService) | Filters incoming notifications for EVC payment text |
| `EvcFilter` | Lightweight regex — does this text look like an EVC SMS? |
| `UploadWorker` (WorkManager) | Forwards each matched SMS to `/api/sms/event` with bearer auth, exponential backoff, persists across reboots |
| `Prefs` (EncryptedSharedPreferences) | Stores `device_token`, business id, API base URL |
| `PairScreen` / `StatusScreen` (Compose) | UI |

The app does NOT use `READ_SMS` or `RECEIVE_SMS` permissions. Google Play would
restrict those without a special-use justification. NotificationListenerService
is much less restricted and only needs a single user toggle.

## Building the APK

### Option A — GitHub Actions (recommended, no local setup)

Every push to `main` that touches `android/**` triggers a build. To grab the
APK:

1. Go to the repository's **Actions** tab.
2. Open the most recent successful "Build Android APK" run.
3. Scroll to the **Artifacts** section and download `bayzara-sms-apk`.
4. Unzip and you have `app-release-unsigned.apk` (debug-signed for now).

You can also trigger a build manually: Actions → Build Android APK →
"Run workflow" → Run.

### Option B — Local build with Android Studio

1. Open `android/` in Android Studio (Hedgehog or newer).
2. Let Gradle sync.
3. Build → Build Bundle(s) / APK(s) → Build APK.
4. APK lands in `android/app/build/outputs/apk/release/`.

### Option C — Local build with command line

Requires JDK 17 and Gradle 8.9+ on PATH.

```bash
cd android
gradle wrapper
./gradlew assembleRelease
```

APK at `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

## Sideloading on the shop phone

1. Transfer the APK to the phone (USB, WhatsApp to self, Google Drive — whatever).
2. Open the file. Android will warn about installing from an unknown source —
   accept the prompt (one-time per source app).
3. Install. Open Bayzara SMS to begin pairing.

## Configuration knobs

- **Default API base** — `BuildConfig.DEFAULT_API_BASE` in `app/build.gradle.kts`.
  Change it to your deployed Bayzara URL so users don't have to type it.
- **Min SDK** — currently `26` (Android 8.0). Covers ~98% of devices in the
  field and gives us full NotificationListenerService.
- **Signing** — release builds are signed with the debug key for now. Add a
  proper `signingConfig` in `app/build.gradle.kts` before publishing.

## Troubleshooting

**"Notification access needed" stays on after I toggled it on.**
Some OEMs (Xiaomi MIUI, Huawei) revoke notification access aggressively. You
may need to whitelist the app under battery optimization too.

**SMS arrives but nothing shows up in Bayzara.**
- Check the test button on the Status screen — does it forward?
- Check the listener is running: pull down notification shade after a fresh
  EVC SMS, then check Bayzara dashboard Operations → SMS Recorder.
- Confirm the SMS sender/format. EVC Hormuud format starts with
  `[-EVCPLUS-]` and uses Somali phrasing (`waxaad ... ka heshay`).

**Phone reboots — does the listener auto-resume?**
Yes. NotificationListenerService is rebound by the system after boot. The
`RECEIVE_BOOT_COMPLETED` permission is declared as a hint to Android.
