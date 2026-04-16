-- ============================================================
-- SMS LISTENER (Android APK companion)
-- Pairs a phone with Bayzara to forward EVC payment SMS notifications.
-- The APK uses Android NotificationListenerService and posts events
-- to /api/sms/event with a per-device bearer token.
-- ============================================================

-- ─── Devices ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_listener_devices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                     TEXT,                       -- e.g. "Shop main phone"
  device_token             TEXT NOT NULL UNIQUE,       -- bearer token used by APK
  device_phone             TEXT,                       -- the SIM number receiving EVC SMS
  pairing_code             TEXT,                       -- 6-digit code, valid 10 min
  pairing_code_expires_at  TIMESTAMPTZ,
  paired_at                TIMESTAMPTZ,
  revoked_at               TIMESTAMPTZ,
  last_seen_at             TIMESTAMPTZ,
  app_version              TEXT,
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sms_listener_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_dev_member" ON sms_listener_devices
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_sms_dev_business ON sms_listener_devices(business_id);
CREATE UNIQUE INDEX idx_sms_dev_pair_code
  ON sms_listener_devices(pairing_code)
  WHERE pairing_code IS NOT NULL AND paired_at IS NULL;

-- ─── Events (each forwarded SMS) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  device_id            UUID REFERENCES sms_listener_devices(id) ON DELETE SET NULL,
  raw_sms              TEXT NOT NULL,
  parsed               JSONB,                          -- full parser output
  direction            TEXT CHECK (direction IN ('in','out','unknown')),
  amount               NUMERIC(15,2),
  currency             TEXT,
  counterparty_phone   TEXT,
  balance_after        NUMERIC(15,2),
  matched_customer_id  UUID REFERENCES pos_customers(id) ON DELETE SET NULL,
  matched_vendor_id    UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','recorded','ignored','error')),
  recorded_payment_id  UUID,                           -- generic ref to debt tx / sale / etc.
  error                TEXT,
  occurred_at          TIMESTAMPTZ,                    -- when the SMS was sent (parsed from body)
  received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- when APK forwarded it
  UNIQUE (business_id, raw_sms, occurred_at)
);

ALTER TABLE sms_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_evt_member" ON sms_events
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_sms_evt_business        ON sms_events(business_id, received_at DESC);
CREATE INDEX idx_sms_evt_status          ON sms_events(business_id, status);
CREATE INDEX idx_sms_evt_counterparty    ON sms_events(business_id, counterparty_phone);
