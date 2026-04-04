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

  // Fetch 13 months of data so "last 12 months" and "this year" both work
  const since = new Date()
  since.setMonth(since.getMonth() - 13)
  since.setDate(1)
  const sinceStr = since.toISOString().split('T')[0]

  // All invoices (B2B + POS)
  const { data: invoices } = await supabase
    .from('documents')
    .select('id, document_number, date, total, amount_paid, status, source, payment_method, clients(name)')
    .eq('business_id', business.id)
    .eq('type', 'invoice')
    .gte('date', sinceStr)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  // All expenses / purchases / bills
  const { data: expenses } = await supabase
    .from('documents')
    .select('id, document_number, date, total, type')
    .eq('business_id', business.id)
    .in('type', ['purchase', 'expense'])
    .gte('date', sinceStr)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  // EVC transactions
  const { data: evcTxns } = await supabase
    .from('evc_transactions')
    .select('id, tran_id, amount, direction, sender_name, sender_phone, tran_date, is_recorded, matched_sale_id')
    .eq('business_id', business.id)
    .gte('tran_date', since.toISOString())
    .order('tran_date', { ascending: false })

  // Open invoices for AR (no date filter — always show current state)
  const { data: openInvoices } = await supabase
    .from('documents')
    .select('id, document_number, date, due_date, total, amount_due, status, clients(name)')
    .eq('business_id', business.id)
    .eq('type', 'invoice')
    .in('status', ['sent', 'overdue', 'partially_paid'])
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  return (
    <ReportsClient
      slug={slug}
      currency={business.currency}
      businessName={business.name}
      invoices={invoices ?? []}
      expenses={expenses ?? []}
      evcTxns={evcTxns ?? []}
      openInvoices={openInvoices ?? []}
    />
  )
}
