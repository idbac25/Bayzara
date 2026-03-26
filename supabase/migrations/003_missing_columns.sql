-- Add missing columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'client' CHECK (type IN ('client','prospect')),
  ADD COLUMN IF NOT EXISTS industry TEXT;
