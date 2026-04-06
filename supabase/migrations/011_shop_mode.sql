-- ============================================================
-- Migration 011: Shop Mode — Staff, Reconciliation, Audit Log
-- ============================================================

-- 1. Business mode: 'shop' (default) | 'b2b' | 'all'
--    'shop'  = retail/supermarket UI only
--    'b2b'   = invoicing/CRM only
--    'all'   = everything visible
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'shop'
  CHECK (mode IN ('shop', 'b2b', 'all'));

-- 2. Staff members — separate from auth accounts, used for POS cashier login
CREATE TABLE IF NOT EXISTS staff_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'manager', 'cashier')),
  pin_hash    TEXT,        -- SHA-256(pin + ':' + id), null = no PIN set
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_member" ON staff_members
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX IF NOT EXISTS idx_staff_members_business
  ON staff_members(business_id) WHERE is_active = TRUE;

-- 3. Track which cashier (staff member) made each POS sale
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

-- 4. Business-level audit log — who did what inside a business
CREATE TABLE IF NOT EXISTS business_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  -- e.g. 'pos_sale', 'debt_charge', 'debt_payment', 'stock_adjust',
  --      'shift_open', 'shift_close', 'staff_created'
  entity_type TEXT,   -- 'document', 'debt_transaction', 'inventory_item', etc.
  entity_id   UUID,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE business_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_member" ON business_audit_log
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX IF NOT EXISTS idx_audit_log_business
  ON business_audit_log(business_id, created_at DESC);

-- 5. Daily POS reconciliation — one record per business per day
CREATE TABLE IF NOT EXISTS pos_reconciliations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  opened_by            UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  closed_by            UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  opening_cash         NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_cash_counted NUMERIC(15,2),          -- what cashier physically counted
  system_cash_total    NUMERIC(15,2),          -- computed from POS sales
  system_evc_total     NUMERIC(15,2),          -- computed from EVC transactions
  system_credit_total  NUMERIC(15,2),          -- computed from debt charges
  cash_variance        NUMERIC(15,2),          -- counted - system
  notes                TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at            TIMESTAMPTZ,
  UNIQUE(business_id, date)
);

ALTER TABLE pos_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reconciliation_member" ON pos_reconciliations
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX IF NOT EXISTS idx_reconciliations_business
  ON pos_reconciliations(business_id, date DESC);
