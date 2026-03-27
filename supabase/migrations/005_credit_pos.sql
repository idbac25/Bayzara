-- ============================================================
-- Migration 005: Credit fields for clients + POS support
-- ============================================================

-- Add credit/payment terms fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'cash';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(15,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_terms_days INTEGER DEFAULT 30;

-- Add POS source tag to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add inventory_item_id to line_items if not present (links POS sales back to inventory)
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;

-- Stock decrement function for POS sales
CREATE OR REPLACE FUNCTION decrement_stock(p_item_id UUID, p_qty NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE inventory_items
  SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - p_qty::INT, 0),
      updated_at = NOW()
  WHERE id = p_item_id AND stock_quantity IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update plan templates to include pos and credit_customers features
UPDATE plan_templates
SET features = features || '{"pos": false, "credit_customers": false}'::jsonb
WHERE name = 'free';

UPDATE plan_templates
SET features = features || '{"pos": true, "credit_customers": false}'::jsonb
WHERE name = 'pro';

UPDATE plan_templates
SET features = features || '{"pos": true, "credit_customers": true}'::jsonb
WHERE name = 'enterprise';

-- Index for fast POS lookups on evc_transactions
CREATE INDEX IF NOT EXISTS idx_evc_transactions_business_created
  ON evc_transactions(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evc_transactions_amount
  ON evc_transactions(business_id, amount, is_recorded);
