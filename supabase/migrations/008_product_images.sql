-- ============================================================
-- Migration 008: Product images + categories for POS
-- ============================================================

-- Add visual product fields to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for fast category lookups in POS
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(business_id, category);
