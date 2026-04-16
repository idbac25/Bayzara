# Keep WorkManager workers
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }

# Keep notification listener
-keep class com.bayzara.sms.service.** { *; }
