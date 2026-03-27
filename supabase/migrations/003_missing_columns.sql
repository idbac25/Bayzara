-- Add missing columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'client' CHECK (type IN ('client','prospect')),
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add missing columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS bank_details TEXT,
  ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(15,2) DEFAULT 0;
