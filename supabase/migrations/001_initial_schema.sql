-- ============================================================
-- Bayzara — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Somalia',
  postal_code TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'Africa/Mogadishu',
  fiscal_year_start INT DEFAULT 1,
  tax_type TEXT DEFAULT 'none',
  default_tax_rate NUMERIC(5,2) DEFAULT 0,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  default_terms TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BUSINESS USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin','admin','accountant','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- Helper function for RLS
CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_users
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies
CREATE POLICY "biz_member_read" ON businesses FOR SELECT
  USING (is_business_member(id) OR owner_id = auth.uid());

CREATE POLICY "biz_owner_all" ON businesses FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "bizuser_read" ON business_users FOR SELECT
  USING (user_id = auth.uid() OR is_business_member(business_id));

CREATE POLICY "bizuser_super_admin" ON business_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM business_users bu
      WHERE bu.business_id = business_users.business_id
      AND bu.user_id = auth.uid()
      AND bu.role = 'super_admin'
    )
  );

-- ============================================================
-- PIPELINES
-- ============================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Sales Pipeline',
  stages TEXT[] NOT NULL DEFAULT ARRAY['new','contacted','qualified','proposal','won','lost'],
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_member" ON pipelines FOR ALL USING (is_business_member(business_id));

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  evc_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  tax_number TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_member" ON clients FOR ALL USING (is_business_member(business_id));

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  city TEXT,
  country TEXT,
  tax_number TEXT,
  notes TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_member" ON vendors FOR ALL USING (is_business_member(business_id));

-- ============================================================
-- DOCUMENT SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT '',
  next_number INT NOT NULL DEFAULT 1,
  padding INT NOT NULL DEFAULT 4,
  UNIQUE(business_id, type)
);

ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seq_member" ON document_sequences FOR ALL USING (is_business_member(business_id));

-- Function to get next document number
CREATE OR REPLACE FUNCTION get_next_document_number(
  p_business_id UUID,
  p_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next INT;
  v_padding INT;
  v_result TEXT;
BEGIN
  -- Lock the row to prevent concurrent issues
  SELECT prefix, next_number, padding
  INTO v_prefix, v_next, v_padding
  FROM document_sequences
  WHERE business_id = p_business_id AND type = p_type
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create default sequence
    INSERT INTO document_sequences (business_id, type, prefix, next_number, padding)
    VALUES (
      p_business_id,
      p_type,
      CASE p_type
        WHEN 'invoice' THEN 'INV-'
        WHEN 'quotation' THEN 'QUO-'
        WHEN 'purchase' THEN 'BILL-'
        WHEN 'purchase_order' THEN 'PO-'
        WHEN 'expense' THEN 'EXP-'
        ELSE UPPER(SUBSTR(p_type, 1, 3)) || '-'
      END,
      1, 4
    )
    ON CONFLICT (business_id, type) DO NOTHING
    RETURNING prefix, next_number, padding
    INTO v_prefix, v_next, v_padding;

    IF NOT FOUND THEN
      SELECT prefix, next_number, padding INTO v_prefix, v_next, v_padding
      FROM document_sequences
      WHERE business_id = p_business_id AND type = p_type
      FOR UPDATE;
    END IF;
  END IF;

  v_result := v_prefix || LPAD(v_next::TEXT, v_padding, '0');

  UPDATE document_sequences
  SET next_number = next_number + 1
  WHERE business_id = p_business_id AND type = p_type;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DOCUMENTS (invoices, quotations, purchases, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'invoice','quotation','proforma_invoice','sales_order','delivery_challan',
    'credit_note','payment_receipt','purchase','expense','purchase_order',
    'payout_receipt','debit_note'
  )),
  document_number TEXT NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  client_id UUID REFERENCES clients(id),
  vendor_id UUID REFERENCES vendors(id),
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  additional_charges NUMERIC(15,2) DEFAULT 0,
  additional_charges_label TEXT DEFAULT 'Additional Charges',
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  pdf_url TEXT,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_member" ON documents FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_documents_business_type ON documents(business_id, type);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_documents_public_token ON documents(public_token);

-- ============================================================
-- LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  rate NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  group_name TEXT,
  sort_order INT DEFAULT 0
);

ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineitem_doc" ON line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = line_items.document_id
      AND is_business_member(d.business_id)
    )
  );

CREATE INDEX idx_line_items_document ON line_items(document_id);

-- ============================================================
-- PAYMENT ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('bank','cash','evc','card','mobile_money')),
  account_number TEXT,
  bank_name TEXT,
  current_balance NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  evc_connection_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payacct_member" ON payment_accounts FOR ALL USING (is_business_member(business_id));

-- ============================================================
-- PAYMENT RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  payment_account_id UUID REFERENCES payment_accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL,
  method TEXT DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  evc_tran_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_member" ON payment_records FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_payment_records_document ON payment_records(document_id);

-- Auto-update document amount_paid and amount_due after payment insert
CREATE OR REPLACE FUNCTION update_document_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_doc_total NUMERIC;
  v_new_status TEXT;
BEGIN
  SELECT SUM(amount) INTO v_total_paid
  FROM payment_records
  WHERE document_id = COALESCE(NEW.document_id, OLD.document_id);

  SELECT total INTO v_doc_total
  FROM documents
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);

  v_total_paid := COALESCE(v_total_paid, 0);

  IF v_total_paid >= v_doc_total THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'sent';
  END IF;

  UPDATE documents
  SET
    amount_paid = v_total_paid,
    amount_due = GREATEST(v_doc_total - v_total_paid, 0),
    status = CASE WHEN status IN ('draft','cancelled') THEN status ELSE v_new_status END,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_doc_payments
AFTER INSERT OR UPDATE OR DELETE ON payment_records
FOR EACH ROW EXECUTE FUNCTION update_document_payment_totals();

-- ============================================================
-- EVC CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS evc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  merchant_name TEXT,
  merchant_phone TEXT NOT NULL,
  merchant_number TEXT,
  session_token TEXT,
  current_balance NUMERIC(15,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_tran_id TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','error','disconnected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evc_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evc_conn_member" ON evc_connections FOR ALL USING (is_business_member(business_id));

-- ============================================================
-- EVC TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS evc_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  evc_connection_id UUID NOT NULL REFERENCES evc_connections(id) ON DELETE CASCADE,
  tran_id TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  sender_phone TEXT,
  sender_name TEXT,
  receiver_phone TEXT,
  description TEXT,
  tran_date TIMESTAMPTZ NOT NULL,
  balance_after NUMERIC(15,2),
  is_recorded BOOLEAN DEFAULT FALSE,
  needs_review BOOLEAN DEFAULT FALSE,
  client_id UUID REFERENCES clients(id),
  document_id UUID REFERENCES documents(id),
  payment_record_id UUID REFERENCES payment_records(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(evc_connection_id, tran_id)
);

ALTER TABLE evc_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evc_tx_member" ON evc_transactions FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_evc_tx_business ON evc_transactions(business_id);
CREATE INDEX idx_evc_tx_date ON evc_transactions(tran_date);
CREATE INDEX idx_evc_tx_phone ON evc_transactions(sender_phone);

-- ============================================================
-- INVENTORY ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  type TEXT NOT NULL DEFAULT 'product' CHECK (type IN ('product','service')),
  sale_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  stock_quantity INT,
  reorder_level INT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_member" ON inventory_items FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_inventory_business ON inventory_items(business_id);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  value NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','won','lost')),
  stage TEXT,
  pipeline_id UUID REFERENCES pipelines(id),
  source TEXT,
  notes TEXT,
  converted_to_client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_member" ON leads FOR ALL USING (is_business_member(business_id));

CREATE INDEX idx_leads_business ON leads(business_id);
CREATE INDEX idx_leads_status ON leads(status);

-- ============================================================
-- AUTO-UPDATE updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','businesses','clients','vendors','documents','inventory_items','leads','evc_connections','payment_accounts']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- AUTO-SET OVERDUE STATUS
-- ============================================================
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
  UPDATE documents
  SET status = 'overdue', updated_at = NOW()
  WHERE type = 'invoice'
  AND status = 'sent'
  AND due_date < CURRENT_DATE
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
