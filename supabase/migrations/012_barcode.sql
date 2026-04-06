-- Add a dedicated barcode column to inventory_items.
-- Previously the `sku` field doubled as barcode; now both coexist.
-- Barcode lookup in POS checks `barcode` first, then falls back to `sku`.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(business_id, barcode)
  WHERE barcode IS NOT NULL;

-- Backfill: if SKU looks like a numeric barcode (8-13 digits), copy it to barcode
UPDATE inventory_items
SET barcode = sku
WHERE barcode IS NULL
  AND sku ~ '^\d{8,13}$';
