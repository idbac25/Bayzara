-- ============================================================
-- IMPORT HISTORY
-- Tracks every CSV / OCR migration import for audit and review
-- ============================================================

CREATE TABLE IF NOT EXISTS import_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  import_type   TEXT NOT NULL CHECK (import_type IN ('customers','products','suppliers','debt','vendor-debts')),
  source        TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('csv','ocr','manual')),
  imported      INTEGER NOT NULL DEFAULT 0,
  skipped       INTEGER NOT NULL DEFAULT 0,
  errors_count  INTEGER NOT NULL DEFAULT 0,
  errors        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_history_member" ON import_history
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_import_history_business ON import_history(business_id, created_at DESC);
