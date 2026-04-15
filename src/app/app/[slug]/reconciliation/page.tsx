import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReconciliationClient } from './ReconciliationClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReconciliationPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd   = `${today}T23:59:59.999Z`

  // Today's reconciliation record
  const { data: todayRec } = await supabase
    .from('pos_reconciliations')
    .select('*, opened_by:staff_members!pos_reconciliations_opened_by_fkey(name), closed_by:staff_members!pos_reconciliations_closed_by_fkey(name)')
    .eq('business_id', business.id)
    .eq('date', today)
    .maybeSingle()

  // Live system totals for today
  const [cashRes, evcRes, creditRes, debtPayRes, salesCountRes] = await Promise.all([
    supabase.from('documents').select('total').eq('business_id', business.id).eq('source', 'pos').eq('payment_method', 'cash').gte('created_at', todayStart).lte('created_at', todayEnd),
    supabase.from('evc_transactions').select('amount').eq('business_id', business.id).eq('direction', 'in').gte('tran_date', todayStart).lte('tran_date', todayEnd),
    supabase.from('debt_transactions').select('amount').eq('business_id', business.id).eq('type', 'credit').gte('created_at', todayStart).lte('created_at', todayEnd),
    supabase.from('debt_transactions').select('amount').eq('business_id', business.id).eq('type', 'payment').gte('created_at', todayStart).lte('created_at', todayEnd),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('source', 'pos').gte('created_at', todayStart).lte('created_at', todayEnd),
  ])

  const liveCash    = (cashRes.data    ?? []).reduce((s, r) => s + (r.total  ?? 0), 0)
  const liveEvc     = (evcRes.data     ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
  const liveCredit  = (creditRes.data  ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
  const liveDebtPay = (debtPayRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
  const salesCount  = salesCountRes.count ?? 0

  // Staff list for dropdown
  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('name')

  // Last 14 days of reconciliations
  const { data: history } = await supabase
    .from('pos_reconciliations')
    .select('date, status, system_cash_total, system_evc_total, system_credit_total, cash_variance, closing_cash_counted, opening_cash')
    .eq('business_id', business.id)
    .order('date', { ascending: false })
    .limit(14)

  return (
    <ReconciliationClient
      business={business}
      todayRec={todayRec ?? null}
      liveTotals={{ cash: liveCash, evc: liveEvc, credit: liveCredit, salesCount }}
      staff={staff ?? []}
      history={history ?? []}
      slug={slug}
      today={today}
    />
  )
}
