import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Load business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  // Load recent invoices
  const { data: recentInvoices } = await supabase
    .from('documents')
    .select('id, document_number, date, total, amount_due, status, clients(name)')
    .eq('business_id', business?.id)
    .eq('type', 'invoice')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // Load invoice stats for this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const { data: monthStats } = await supabase
    .from('documents')
    .select('total, amount_paid, amount_due, status')
    .eq('business_id', business?.id)
    .eq('type', 'invoice')
    .is('deleted_at', null)
    .gte('date', monthStart)

  // Load EVC connections
  const { data: evcConnections } = await supabase
    .from('evc_connections')
    .select('id, merchant_name, current_balance, last_synced_at, is_active')
    .eq('business_id', business?.id)
    .eq('is_active', true)

  // Load recent EVC transactions
  const { data: recentEvc } = await supabase
    .from('evc_transactions')
    .select('id, amount, direction, sender_name, sender_phone, tran_date, is_recorded, needs_review')
    .eq('business_id', business?.id)
    .order('tran_date', { ascending: false })
    .limit(5)

  const stats = {
    totalInvoiced: monthStats?.reduce((s, d) => s + d.total, 0) ?? 0,
    totalPaid: monthStats?.reduce((s, d) => s + d.amount_paid, 0) ?? 0,
    totalOutstanding: monthStats?.reduce((s, d) => s + d.amount_due, 0) ?? 0,
    totalOverdue: monthStats?.filter(d => d.status === 'overdue').reduce((s, d) => s + d.amount_due, 0) ?? 0,
    invoiceCount: monthStats?.length ?? 0,
  }

  return (
    <DashboardClient
      user={user}
      business={business}
      stats={stats}
      recentInvoices={recentInvoices ?? []}
      evcConnections={evcConnections ?? []}
      recentEvc={recentEvc ?? []}
      slug={slug}
    />
  )
}
