-- ============================================================
-- Migration 010: Debt Book (Daftar)
-- ============================================================

-- One debt account per customer per business
-- current_balance = how much the customer owes (positive = they owe us)
CREATE TABLE IF NOT EXISTS debt_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  credit_limit    NUMERIC(15,2) NOT NULL DEFAULT 0,  -- 0 = no limit enforced
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, customer_id)
);

ALTER TABLE debt_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_accounts_member" ON debt_accounts
  FOR ALL USING (is_business_member(business_id));

-- Each credit sale or payment recorded in the ledger
CREATE TABLE IF NOT EXISTS debt_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  debt_account_id UUID NOT NULL REFERENCES debt_accounts(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES pos_customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('credit', 'payment', 'adjustment')),
  -- credit     = customer took goods on credit  → balance increases
  -- payment    = customer paid                  → balance decreases
  -- adjustment = manual correction
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description     TEXT,
  sale_id         UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debt_transactions_member" ON debt_transactions
  FOR ALL USING (is_business_member(business_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_debt_accounts_business
  ON debt_accounts(business_id);

CREATE INDEX IF NOT EXISTS idx_debt_accounts_customer
  ON debt_accounts(business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_debt_transactions_account
  ON debt_transactions(debt_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_debt_transactions_business
  ON debt_transactions(business_id, created_at DESC);

-- Feature flag
UPDATE plan_templates
  SET features = features || '{"debt_book": false}'::jsonb
  WHERE name = 'free';

UPDATE plan_templates
  SET features = features || '{"debt_book": true}'::jsonb
  WHERE name IN ('pro', 'enterprise');
