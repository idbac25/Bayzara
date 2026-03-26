import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './ReportsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReportsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, name')
    .eq('slug', slug)
    .single()

  // Accounts Receivable: open invoices
  const { data: openInvoices } = await supabase
    .from('documents')
    .select('id, document_number, date, due_date, total, amount_due, status, clients(name)')
    .eq('business_id', business?.id)
    .eq('type', 'invoice')
    .in('status', ['sent', 'overdue', 'partially_paid'])
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  // Income vs Expenses last 12 months
  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)
  since.setDate(1)

  const { data: invoices } = await supabase
    .from('documents')
    .select('date, total, amount_paid, type')
    .eq('business_id', business?.id)
    .in('type', ['invoice'])
    .gte('date', since.toISOString().split('T')[0])
    .is('deleted_at', null)

  const { data: purchases } = await supabase
    .from('documents')
    .select('date, total, type')
    .eq('business_id', business?.id)
    .in('type', ['purchase', 'expense'])
    .gte('date', since.toISOString().split('T')[0])
    .is('deleted_at', null)

  // EVC summary
  const { data: evcTotals } = await supabase
    .from('evc_transactions')
    .select('amount, direction, tran_date')
    .eq('business_id', business?.id)
    .gte('tran_date', since.toISOString())

  return (
    <ReportsClient
      slug={slug}
      currency={business?.currency ?? 'USD'}
      businessName={business?.name ?? ''}
      openInvoices={openInvoices ?? []}
      invoices={invoices ?? []}
      purchases={purchases ?? []}
      evcTransactions={evcTotals ?? []}
    />
  )
}
