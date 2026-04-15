import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsClient } from './ReportsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReportsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, name, slug')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  // 13 months of data so "last 12 months" and "this year" both work
  const since = new Date()
  since.setMonth(since.getMonth() - 13)
  since.setDate(1)
  const sinceStr = since.toISOString().split('T')[0]

  const [
    { data: invoices },
    { data: expenses },
    { data: evcTxns },
    { data: openInvoices },
    { data: posLineItems },
    { data: vendorRestocks },
  ] = await Promise.all([
    // All invoices (B2B + POS) — include created_at for hour-of-day analysis
    supabase
      .from('documents')
      .select('id, document_number, date, created_at, total, amount_paid, status, source, payment_method, clients(name)')
      .eq('business_id', business.id)
      .eq('type', 'invoice')
      .gte('date', sinceStr)
      .is('deleted_at', null)
      .order('date', { ascending: false }),

    // Expenses / purchases / bills
    supabase
      .from('documents')
      .select('id, document_number, date, total, type')
      .eq('business_id', business.id)
      .in('type', ['purchase', 'expense'])
      .gte('date', sinceStr)
      .is('deleted_at', null)
      .order('date', { ascending: false }),

    // EVC transactions
    supabase
      .from('evc_transactions')
      .select('id, tran_id, amount, direction, sender_name, sender_phone, tran_date, is_recorded, matched_sale_id')
      .eq('business_id', business.id)
      .gte('tran_date', since.toISOString())
      .order('tran_date', { ascending: false }),

    // Open invoices for AR (no date filter)
    supabase
      .from('documents')
      .select('id, document_number, date, due_date, total, amount_due, status, clients(name)')
      .eq('business_id', business.id)
      .eq('type', 'invoice')
      .in('status', ['sent', 'overdue', 'partially_paid'])
      .is('deleted_at', null)
      .order('due_date', { ascending: true }),

    // POS line items for top products + COGS
    supabase
      .from('line_items')
      .select(`
        inventory_item_id, name, quantity, amount,
        inventory_items ( name, purchase_price ),
        documents!inner ( created_at, date, source, business_id )
      `)
      .eq('documents.business_id', business.id)
      .eq('documents.source', 'pos')
      .gte('documents.date', sinceStr),

    // Stock restocks for vendor payables tab
    supabase
      .from('stock_restocks')
      .select(`
        id, date, due_date, total_cost, status, payment_method,
        vendors ( name ),
        inventory_items ( name )
      `)
      .eq('business_id', business.id)
      .order('due_date', { ascending: true }),
  ])

  return (
    <ReportsClient
      slug={slug}
      currency={business.currency}
      businessName={business.name}
      invoices={invoices ?? []}
      expenses={expenses ?? []}
      evcTxns={evcTxns ?? []}
      openInvoices={openInvoices ?? []}
      posLineItems={(posLineItems ?? []).map(li => ({
        inventory_item_id: li.inventory_item_id,
        name: li.name,
        quantity: li.quantity,
        amount: li.amount,
        product_name: Array.isArray(li.inventory_items) ? (li.inventory_items[0]?.name ?? null) : (li.inventory_items as { name: string } | null)?.name ?? null,
        purchase_price: Array.isArray(li.inventory_items) ? (li.inventory_items[0]?.purchase_price ?? 0) : (li.inventory_items as { purchase_price: number } | null)?.purchase_price ?? 0,
        created_at: Array.isArray(li.documents) ? (li.documents[0]?.created_at ?? '') : '',
        date: Array.isArray(li.documents) ? (li.documents[0]?.date ?? '') : '',
      }))}
      vendorRestocks={(vendorRestocks ?? []).map(r => ({
        id: r.id,
        date: r.date,
        due_date: r.due_date,
        total_cost: r.total_cost,
        status: r.status,
        payment_method: r.payment_method,
        vendor_name: Array.isArray(r.vendors) ? (r.vendors[0]?.name ?? null) : (r.vendors as { name: string } | null)?.name ?? null,
        product_name: Array.isArray(r.inventory_items) ? (r.inventory_items[0]?.name ?? null) : (r.inventory_items as { name: string } | null)?.name ?? null,
      }))}
    />
  )
}
