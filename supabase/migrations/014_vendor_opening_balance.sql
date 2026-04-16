-- ============================================================
-- VENDOR OPENING BALANCE
-- For migrated/imported vendor debts that pre-date the system
-- The vendor's total owed = opening_balance + SUM(unpaid stock_restocks)
-- ============================================================

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_balance_date DATE,
  ADD COLUMN IF NOT EXISTS opening_balance_notes TEXT;
