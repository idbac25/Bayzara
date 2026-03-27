-- ============================================================
-- Migration 004: Admin features, plan system, feature flags
-- All additive — nothing dropped or renamed
-- ============================================================

-- 1. Add suspended_at to businesses (null = active, timestamp = suspended)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add feature flags JSONB to businesses
--    Empty object = no restrictions (all features available)
--    Explicit false = feature disabled for this business
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}';

-- 3. Expand business_users role values to include manager and employee
--    Drop old CHECK, add new one with expanded values
ALTER TABLE business_users
  DROP CONSTRAINT IF EXISTS business_users_role_check;

ALTER TABLE business_users
  ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'accountant', 'employee', 'viewer'));

-- 4. Plan templates table — defines what each plan includes
CREATE TABLE IF NOT EXISTS plan_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,   -- 'free', 'pro', 'enterprise', etc.
  label        TEXT NOT NULL,          -- 'Free', 'Pro', 'Enterprise'
  price_usd    NUMERIC(10,2) DEFAULT 0,
  features     JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Admin audit log — track every admin action
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,          -- 'plan_changed', 'business_suspended', etc.
  target_type  TEXT NOT NULL,          -- 'business', 'user', 'evc_connection'
  target_id    UUID,
  target_name  TEXT,                   -- human readable name for display
  metadata     JSONB DEFAULT '{}',     -- extra context (old value, new value)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Platform announcements — banner shown to all users in the app
CREATE TABLE IF NOT EXISTS platform_announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message      TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Seed default plan templates
INSERT INTO plan_templates (name, label, price_usd, sort_order, features) VALUES
(
  'free', 'Free', 0, 1,
  '{
    "invoices": true,
    "invoices_limit": 10,
    "quotations": false,
    "expenses": false,
    "evc_plus": false,
    "evc_auto_record": false,
    "clients_limit": 25,
    "team_members": false,
    "team_limit": 1,
    "vendors": false,
    "inventory": false,
    "leads_crm": false,
    "reports": false,
    "pdf_export": true,
    "public_links": true,
    "multi_currency": false,
    "api_access": false,
    "custom_branding": false,
    "recurring_invoices": false,
    "bulk_operations": false
  }'
),
(
  'pro', 'Pro', 29, 2,
  '{
    "invoices": true,
    "invoices_limit": 100,
    "quotations": true,
    "expenses": true,
    "evc_plus": true,
    "evc_auto_record": true,
    "clients_limit": 500,
    "team_members": true,
    "team_limit": 5,
    "vendors": true,
    "inventory": false,
    "leads_crm": true,
    "reports": true,
    "pdf_export": true,
    "public_links": true,
    "multi_currency": true,
    "api_access": false,
    "custom_branding": true,
    "recurring_invoices": true,
    "bulk_operations": true
  }'
),
(
  'enterprise', 'Enterprise', 99, 3,
  '{
    "invoices": true,
    "invoices_limit": 0,
    "quotations": true,
    "expenses": true,
    "evc_plus": true,
    "evc_auto_record": true,
    "clients_limit": 0,
    "team_members": true,
    "team_limit": 0,
    "vendors": true,
    "inventory": true,
    "leads_crm": true,
    "reports": true,
    "pdf_export": true,
    "public_links": true,
    "multi_currency": true,
    "api_access": true,
    "custom_branding": true,
    "recurring_invoices": true,
    "bulk_operations": true
  }'
)
ON CONFLICT (name) DO NOTHING;

-- 8. RLS: audit log and announcements only accessible by platform admins
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Platform admins can do everything on audit log
CREATE POLICY "Platform admins manage audit log"
  ON admin_audit_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );

-- Plan templates: admins can manage, everyone can read (needed for plan display)
CREATE POLICY "Anyone can read plan templates"
  ON plan_templates FOR SELECT USING (TRUE);

CREATE POLICY "Platform admins manage plan templates"
  ON plan_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );

-- Announcements: admins manage, everyone can read active ones
CREATE POLICY "Anyone can read active announcements"
  ON platform_announcements FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Platform admins manage announcements"
  ON platform_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = TRUE
    )
  );
