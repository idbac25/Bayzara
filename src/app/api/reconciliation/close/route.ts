// Close today's reconciliation
// POST /api/reconciliation/close
// Body: { business_id, staff_id, closing_cash_counted, notes }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, staff_id, closing_cash_counted, notes } = await req.json()
  if (!business_id || closing_cash_counted == null) {
    return NextResponse.json({ error: 'business_id and closing_cash_counted required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd   = `${today}T23:59:59.999Z`

  // Compute system totals from the source tables
  const [cashRes, evcRes, creditRes] = await Promise.all([
    // Cash sales today via POS
    supabase
      .from('documents')
      .select('total')
      .eq('business_id', business_id)
      .eq('source', 'pos')
      .eq('payment_method', 'cash')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),

    // EVC inbound payments today
    supabase
      .from('evc_transactions')
      .select('amount')
      .eq('business_id', business_id)
      .eq('direction', 'in')
      .gte('tran_date', todayStart)
      .lte('tran_date', todayEnd),

    // Credit sales today (debt charges)
    supabase
      .from('debt_transactions')
      .select('amount')
      .eq('business_id', business_id)
      .eq('type', 'credit')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),
  ])

  const systemCash   = (cashRes.data   ?? []).reduce((s, r) => s + (r.total  ?? 0), 0)
  const systemEvc    = (evcRes.data    ?? []).reduce((s, r) => s + (r.amount  ?? 0), 0)
  const systemCredit = (creditRes.data ?? []).reduce((s, r) => s + (r.amount  ?? 0), 0)
  const variance     = parseFloat(closing_cash_counted) - systemCash

  const { error } = await supabase
    .from('pos_reconciliations')
    .update({
      closed_by:            staff_id ?? null,
      closing_cash_counted: parseFloat(closing_cash_counted),
      system_cash_total:    systemCash,
      system_evc_total:     systemEvc,
      system_credit_total:  systemCredit,
      cash_variance:        variance,
      notes:                notes ?? null,
      status:               'closed',
      closed_at:            new Date().toISOString(),
    })
    .eq('business_id', business_id)
    .eq('date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('business_audit_log').insert({
    business_id, staff_id: staff_id ?? null, user_id: user.id,
    action: 'shift_close',
    details: { date: today, system_cash: systemCash, system_evc: systemEvc, system_credit: systemCredit, variance, closing_cash_counted },
  })

  return NextResponse.json({ success: true, systemCash, systemEvc, systemCredit, variance })
}
