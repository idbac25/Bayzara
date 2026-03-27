/**
 * Bayzara API client
 * Calls the separate Hono.js backend deployed on Cloudflare Workers.
 * All requests are authenticated with the current Supabase session JWT.
 */

import { createClient } from '@/lib/supabase/client'
import type { Client, Vendor, Document, LineItem, PaymentRecord, EvcConnection, EvcTransaction } from '@/types/database'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bayzara-api.idbacfiidal.workers.dev'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const data = await res.json() as Record<string, unknown>

  if (!res.ok) {
    throw new Error((data.error as string) ?? `API error ${res.status}`)
  }

  return data as T
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const clients = {
  list: (slug: string, archived = false) =>
    apiFetch<{ clients: Client[] }>(`/v1/clients?business=${slug}&archived=${archived}`)
      .then(r => r.clients),

  get: (id: string) =>
    apiFetch<{ client: Client; documents: Document[] }>(`/v1/clients/${id}`)
      .then(r => r),

  create: (slug: string, data: Partial<Client>) =>
    apiFetch<{ client: Client }>(`/v1/clients?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.client),

  update: (id: string, data: Partial<Client>) =>
    apiFetch<{ client: Client }>(`/v1/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.client),

  archive: (id: string) =>
    apiFetch<{ client: Client }>(`/v1/clients/${id}/archive`, { method: 'PATCH' })
      .then(r => r.client),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/v1/clients/${id}`, { method: 'DELETE' }),
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export const vendors = {
  list: (slug: string, archived = false) =>
    apiFetch<{ vendors: Vendor[] }>(`/v1/vendors?business=${slug}&archived=${archived}`)
      .then(r => r.vendors),

  get: (id: string) =>
    apiFetch<{ vendor: Vendor }>(`/v1/vendors/${id}`)
      .then(r => r.vendor),

  create: (slug: string, data: Partial<Vendor>) =>
    apiFetch<{ vendor: Vendor }>(`/v1/vendors?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.vendor),

  update: (id: string, data: Partial<Vendor>) =>
    apiFetch<{ vendor: Vendor }>(`/v1/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.vendor),

  archive: (id: string) =>
    apiFetch<{ vendor: Vendor }>(`/v1/vendors/${id}/archive`, { method: 'PATCH' })
      .then(r => r.vendor),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/v1/vendors/${id}`, { method: 'DELETE' }),
}

// ── Invoices ──────────────────────────────────────────────────────────────────

type InvoiceCreatePayload = {
  client_id?: string | null
  title?: string | null
  date: string
  due_date?: string | null
  currency?: string
  notes?: string | null
  terms?: string | null
  bank_details?: Record<string, unknown> | null
  discount_type?: string
  discount_value?: number
  additional_charges?: number
  additional_charges_label?: string | null
  line_items: Array<{
    name: string
    description?: string | null
    sku?: string | null
    quantity: number
    rate: number
    unit?: string
    tax_rate?: number
    discount_percentage?: number
    sort_order?: number
  }>
}

type InvoiceWithDetails = Document & {
  clients: Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'address_line1' | 'city' | 'country'> | null
  line_items: LineItem[]
}

export const invoices = {
  list: (slug: string, deleted = false) =>
    apiFetch<{ invoices: (Document & { clients: { id: string; name: string } | null })[] }>(
      `/v1/invoices?business=${slug}${deleted ? '&deleted=true' : ''}`
    ).then(r => r.invoices),

  get: (id: string) =>
    apiFetch<{ invoice: InvoiceWithDetails; payments: PaymentRecord[] }>(`/v1/invoices/${id}`)
      .then(r => r),

  create: (slug: string, data: InvoiceCreatePayload) =>
    apiFetch<{ invoice: Document }>(`/v1/invoices?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.invoice),

  updateStatus: (id: string, status: Document['status']) =>
    apiFetch<{ invoice: Document }>(`/v1/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(r => r.invoice),

  recordPayment: (id: string, data: {
    amount: number
    date: string
    payment_method: string
    payment_account_id?: string | null
    reference_number?: string | null
    notes?: string | null
  }) =>
    apiFetch<{ payment: PaymentRecord }>(`/v1/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.payment),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/v1/invoices/${id}`, { method: 'DELETE' }),
}

// ── Quotations ────────────────────────────────────────────────────────────────

export const quotations = {
  list: (slug: string) =>
    apiFetch<{ quotations: Document[] }>(`/v1/quotations?business=${slug}`)
      .then(r => r.quotations),

  get: (id: string) =>
    apiFetch<{ quotation: InvoiceWithDetails }>(`/v1/quotations/${id}`)
      .then(r => r.quotation),

  create: (slug: string, data: InvoiceCreatePayload & { valid_until?: string | null }) =>
    apiFetch<{ quotation: Document }>(`/v1/quotations?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r.quotation),

  convertToInvoice: (id: string) =>
    apiFetch<{ invoice: Document }>(`/v1/quotations/${id}/convert`, { method: 'PATCH' })
      .then(r => r.invoice),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

type DashboardData = {
  clients_count: number
  total_revenue: number
  outstanding_amount: number
  payments_this_month: number
  invoices_by_status: Record<string, number>
  overdue_invoices: Array<Document & { clients: { name: string } | null }>
  evc: EvcConnection | null
}

export const dashboard = {
  get: (slug: string) =>
    apiFetch<DashboardData>(`/v1/dashboard?business=${slug}`),
}

// ── EVC ───────────────────────────────────────────────────────────────────────

export const evc = {
  status: (slug: string) =>
    apiFetch<{ connection: EvcConnection | null }>(`/v1/evc/status?business=${slug}`)
      .then(r => r.connection),

  connect: (slug: string, merchant_phone: string, password: string) =>
    apiFetch<{ preview: Partial<EvcConnection> & { session_token: string } }>(`/v1/evc/connect?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify({ merchant_phone, password }),
    }).then(r => r.preview),

  activate: (slug: string, preview: Partial<EvcConnection> & { session_token: string }) =>
    apiFetch<{ success: boolean }>(`/v1/evc/activate?business=${slug}`, {
      method: 'POST',
      body: JSON.stringify(preview),
    }),

  disconnect: (slug: string) =>
    apiFetch<{ success: boolean }>(`/v1/evc/disconnect?business=${slug}`, { method: 'POST' }),

  transactions: (slug: string, status?: string) =>
    apiFetch<{ transactions: EvcTransaction[] }>(
      `/v1/evc/transactions?business=${slug}${status ? `&status=${status}` : ''}`
    ).then(r => r.transactions),

  assignTransaction: (id: string, data: { client_id?: string | null; document_id?: string | null }) =>
    apiFetch<{ transaction: EvcTransaction }>(`/v1/evc/transactions/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.transaction),

  sync: (slug: string) =>
    apiFetch<{ message: string }>(`/v1/evc/sync?business=${slug}`, { method: 'POST' }),
}

// ── Businesses ────────────────────────────────────────────────────────────────

export const businesses = {
  list: () =>
    apiFetch<{ businesses: Array<{ id: string; slug: string; name: string; logo_url: string | null; role: string }> }>('/v1/businesses')
      .then(r => r.businesses),

  update: (slug: string, data: Record<string, unknown>) =>
    apiFetch<{ business: Record<string, unknown> }>(`/v1/businesses/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r.business),
}
