-- ============================================================
-- Migration 009: POS customer registry + EVC payment matching
-- ============================================================

-- retail walk-in customer profiles, built automatically from EVC payments
CREATE TABLE IF NOT EXISTS pos_customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  primary_phone   TEXT NOT NULL,
  notes           TEXT,
  total_spent     NUMERIC(15,2) NOT NULL DEFAULT 0,
  visit_count     INTEGER NOT NULL DEFAULT 0,
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, primary_phone)
);

ALTER TABLE pos_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_customers_member" ON pos_customers
  FOR ALL USING (is_business_member(business_id));

-- alternative phone numbers linked to a pos_customer
-- (e.g. wife, son, work phone — rare but supported)
CREATE TABLE IF NOT EXISTS customer_phones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  label       TEXT,  -- e.g. "Wife", "Son", "Work"
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, phone)
);

ALTER TABLE customer_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_phones_member" ON customer_phones
  FOR ALL USING (is_business_member(business_id));

-- link EVC transactions to the POS sale they were matched to
ALTER TABLE evc_transactions
  ADD COLUMN IF NOT EXISTS matched_sale_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_at      TIMESTAMPTZ;

-- link POS sale documents to retail customers + carry payment metadata
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS pos_customer_id  UUID REFERENCES pos_customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method   TEXT,
  ADD COLUMN IF NOT EXISTS evc_sender_phone TEXT,
  ADD COLUMN IF NOT EXISTS evc_sender_name  TEXT;

-- indexes
CREATE INDEX IF NOT EXISTS idx_pos_customers_business
  ON pos_customers(business_id);

CREATE INDEX IF NOT EXISTS idx_pos_customers_phone
  ON pos_customers(business_id, primary_phone);

CREATE INDEX IF NOT EXISTS idx_customer_phones_lookup
  ON customer_phones(business_id, phone);

CREATE INDEX IF NOT EXISTS idx_evc_tx_unmatched
  ON evc_transactions(business_id, is_recorded, tran_date DESC)
  WHERE is_recorded = false;

CREATE INDEX IF NOT EXISTS idx_documents_pos_customer
  ON documents(pos_customer_id)
  WHERE pos_customer_id IS NOT NULL;

-- Atomic upsert for pos_customer on each EVC sale.
-- Creates the customer if new (by phone), or increments stats if existing.
-- Returns the customer id in both cases.
CREATE OR REPLACE FUNCTION upsert_pos_customer_sale(
  p_business_id   UUID,
  p_phone         TEXT,
  p_name          TEXT,
  p_amount        NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO pos_customers (business_id, name, primary_phone, total_spent, visit_count, first_seen_at, last_seen_at)
  VALUES (p_business_id, p_name, p_phone, p_amount, 1, NOW(), NOW())
  ON CONFLICT (business_id, primary_phone) DO UPDATE
    SET name         = COALESCE(NULLIF(p_name, ''), pos_customers.name),
        total_spent  = pos_customers.total_spent + p_amount,
        visit_count  = pos_customers.visit_count + 1,
        last_seen_at = NOW(),
        updated_at   = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update plan templates to include the customers feature
UPDATE plan_templates
SET features = features || '{"pos_customers": false}'::jsonb
WHERE name = 'free';

UPDATE plan_templates
SET features = features || '{"pos_customers": true}'::jsonb
WHERE name IN ('pro', 'enterprise');
