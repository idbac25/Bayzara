export type UserRole = 'super_admin' | 'admin' | 'manager' | 'accountant' | 'sales' | 'viewer'
export type DocumentType =
  | 'invoice'
  | 'quotation'
  | 'proforma_invoice'
  | 'sales_order'
  | 'delivery_challan'
  | 'credit_note'
  | 'payment_receipt'
  | 'purchase'
  | 'expense'
  | 'purchase_order'
  | 'payout_receipt'
  | 'debit_note'

export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'overdue'
  | 'paid'
  | 'partially_paid'
  | 'cancelled'
  | 'accepted'
  | 'rejected'
  | 'acknowledged'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  preferred_language: string
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  slug: string
  name: string
  logo_url: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  country: string
  postal_code: string | null
  currency: string
  timezone: string
  fiscal_year_start: string | null
  tax_type: string
  default_tax_rate: number
  bank_account_name: string | null
  bank_account_number: string | null
  bank_name: string | null
  default_terms: string | null
  plan: string
  plan_expires_at: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface BusinessUser {
  id: string
  business_id: string
  user_id: string
  role: UserRole
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

export interface EvcConnection {
  id: string
  business_id: string
  merchant_name: string
  subscription_id: string
  partner_uid: string
  account_id: string
  account_number: string
  currency: string
  session_id: string | null
  session_cookie: string | null
  session_token: string | null
  session_expires_at: string | null
  encrypted_username: string | null
  encrypted_password: string | null
  last_synced_at: string | null
  last_transaction_id: number | null
  is_active: boolean
  sync_enabled: boolean
  current_balance: number
  balance_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface EvcTransaction {
  id: string
  evc_connection_id: string
  business_id: string
  tran_id: number
  sender: string | null
  receiver: string | null
  tran_date: string
  description: string | null
  credit: number | null
  debit: number | null
  balance: number | null
  direction: 'inbound' | 'outbound'
  sender_phone: string | null
  sender_name: string | null
  amount: number
  is_recorded: boolean
  payment_record_id: string | null
  document_id: string | null
  needs_review: boolean
  reviewed_at: string | null
  reviewed_by: string | null
  notes: string | null
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  name: string
  type: string
  industry: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  country: string | null
  logo_url: string | null
  notes: string | null
  tags: string[] | null
  evc_phone: string | null
  portal_access: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  business_id: string
  name: string
  type: string
  industry: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  country: string | null
  logo_url: string | null
  notes: string | null
  tags: string[] | null
  evc_phone: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  business_id: string
  type: DocumentType
  document_number: string
  title: string | null
  date: string
  due_date: string | null
  client_id: string | null
  vendor_id: string | null
  status: DocumentStatus
  currency: string
  subtotal: number
  discount_type: string
  discount_value: number
  discount_amount: number
  tax_amount: number
  additional_charges: number
  additional_charges_label: string | null
  total: number
  amount_paid: number
  amount_due: number
  notes: string | null
  terms: string | null
  bank_details: Record<string, unknown> | null
  custom_fields: Record<string, unknown>
  pdf_url: string | null
  public_token: string
  is_recurring: boolean
  recurrence_config: Record<string, unknown> | null
  next_recurrence_date: string | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  document_id: string
  sort_order: number
  group_name: string | null
  name: string
  sku: string | null
  description: string | null
  quantity: number
  rate: number
  unit: string
  tax_rate: number
  tax_amount: number
  discount_percentage: number
  amount: number
  image_url: string | null
  inventory_item_id: string | null
  created_at: string
}

export interface PaymentRecord {
  id: string
  document_id: string
  business_id: string
  amount: number
  date: string
  payment_method: string
  payment_account_id: string | null
  reference_number: string | null
  notes: string | null
  evc_transaction_id: string | null
  evc_tran_id: number | null
  auto_recorded: boolean
  created_at: string
}

export interface PaymentAccount {
  id: string
  business_id: string
  name: string
  type: string
  bank_name: string | null
  account_number: string | null
  evc_connection_id: string | null
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  business_id: string
  name: string
  sku: string | null
  description: string | null
  unit: string
  sale_price: number
  purchase_price: number
  tax_rate: number
  category: string | null
  image_url: string | null
  track_inventory: boolean
  current_stock: number
  low_stock_threshold: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Pipeline {
  id: string
  business_id: string
  name: string
  description: string | null
  stages: PipelineStage[]
  is_default: boolean
  created_at: string
}

export interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
}

export interface Lead {
  id: string
  business_id: string
  pipeline_id: string | null
  stage_id: string
  organization_name: string | null
  contact_name: string
  email: string | null
  phone: string | null
  source: string | null
  notes: string | null
  next_activity_date: string | null
  next_activity_type: string | null
  assigned_to: string | null
  converted_to_client_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  business_id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}
