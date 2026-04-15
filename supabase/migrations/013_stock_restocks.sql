-- ============================================================
-- STOCK RESTOCKS
-- Simple supplier restocking for B2C shops
-- Separate from the B2B documents/purchases system
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_restocks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  vendor_id         UUID REFERENCES vendors(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity          NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  cost_per_unit     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method    TEXT NOT NULL DEFAULT 'credit' CHECK (payment_method IN ('cash', 'credit')),
  status            TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  due_date          DATE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_restocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restock_member" ON stock_restocks
  FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_stock_restocks_business ON stock_restocks(business_id);
CREATE INDEX idx_stock_restocks_vendor   ON stock_restocks(vendor_id);
CREATE INDEX idx_stock_restocks_item     ON stock_restocks(inventory_item_id);
CREATE INDEX idx_stock_restocks_status   ON stock_restocks(business_id, status);

-- Add evc_phone to vendors if missing (useful for paying vendors via EVC)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS evc_phone TEXT;
