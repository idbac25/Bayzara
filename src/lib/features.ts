/**
 * Feature flag helpers.
 *
 * IMPORTANT: If a business has no features set (empty object or missing key),
 * we treat the feature as ENABLED. This ensures all existing businesses
 * continue working normally — only explicit `false` values restrict access.
 */

export type FeatureKey =
  | 'invoices'
  | 'invoices_limit'
  | 'quotations'
  | 'expenses'
  | 'evc_plus'
  | 'evc_auto_record'
  | 'clients_limit'
  | 'team_members'
  | 'team_limit'
  | 'vendors'
  | 'inventory'
  | 'leads_crm'
  | 'reports'
  | 'pdf_export'
  | 'public_links'
  | 'multi_currency'
  | 'api_access'
  | 'custom_branding'
  | 'recurring_invoices'
  | 'bulk_operations'

type Features = Record<string, boolean | number | null>

/**
 * Check if a boolean feature is enabled for a business.
 * Returns true if the feature key is missing (backward-compatible default).
 */
export function hasFeature(features: Features | null | undefined, key: FeatureKey): boolean {
  if (!features) return true
  const val = features[key]
  if (val === undefined || val === null) return true  // not set = allowed
  return val !== false
}

/**
 * Get a numeric limit for a feature (e.g. invoices_limit, team_limit).
 * Returns 0 (unlimited) if the key is missing.
 */
export function getLimit(features: Features | null | undefined, key: FeatureKey): number {
  if (!features) return 0
  const val = features[key]
  if (val === undefined || val === null) return 0
  return typeof val === 'number' ? val : 0
}

/**
 * Check if a business has hit a numeric limit.
 * Returns false (not limited) if the limit is 0 or missing.
 */
export function isAtLimit(features: Features | null | undefined, key: FeatureKey, current: number): boolean {
  const limit = getLimit(features, key)
  if (limit === 0) return false  // 0 = unlimited
  return current >= limit
}

export const FEATURE_LABELS: Record<FeatureKey, { label: string; type: 'toggle' | 'number'; description: string }> = {
  invoices:           { label: 'Invoices',              type: 'toggle', description: 'Create and send invoices' },
  invoices_limit:     { label: 'Invoice Limit/month',   type: 'number', description: 'Max invoices per month (0 = unlimited)' },
  quotations:         { label: 'Quotations',            type: 'toggle', description: 'Create quotations and proforma invoices' },
  expenses:           { label: 'Expenses',              type: 'toggle', description: 'Record expenses and purchases' },
  evc_plus:           { label: 'EVC Plus',              type: 'toggle', description: 'Connect Hormud EVC merchant account' },
  evc_auto_record:    { label: 'EVC Auto-record',       type: 'toggle', description: 'Auto-match EVC payments to invoices' },
  clients_limit:      { label: 'Client Limit',          type: 'number', description: 'Max clients (0 = unlimited)' },
  team_members:       { label: 'Team Members',          type: 'toggle', description: 'Add staff to the business' },
  team_limit:         { label: 'Team Member Limit',     type: 'number', description: 'Max team size (0 = unlimited)' },
  vendors:            { label: 'Vendors',               type: 'toggle', description: 'Manage suppliers and vendors' },
  inventory:          { label: 'Inventory',             type: 'toggle', description: 'Product and stock management' },
  leads_crm:          { label: 'Leads & CRM',           type: 'toggle', description: 'Sales pipeline and lead tracking' },
  reports:            { label: 'Reports',               type: 'toggle', description: 'Financial reports and analytics' },
  pdf_export:         { label: 'PDF Export',            type: 'toggle', description: 'Download invoices as PDF' },
  public_links:       { label: 'Public Invoice Links',  type: 'toggle', description: 'Share invoices via public URL' },
  multi_currency:     { label: 'Multi-currency',        type: 'toggle', description: 'Issue documents in multiple currencies' },
  api_access:         { label: 'API Access',            type: 'toggle', description: 'Access via REST API' },
  custom_branding:    { label: 'Custom Branding',       type: 'toggle', description: 'Logo and branding on PDFs' },
  recurring_invoices: { label: 'Recurring Invoices',    type: 'toggle', description: 'Auto-generate repeat invoices' },
  bulk_operations:    { label: 'Bulk Operations',       type: 'toggle', description: 'Bulk status changes and exports' },
}
