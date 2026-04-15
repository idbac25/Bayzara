// Close today's reconciliation
// POST /api/reconciliation/close
// Body: { business_id, staff_id, evc_received, other_payments, notes }
// other_payments: Array<{ provider: string; amount: number }>

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, staff_id, evc_received, other_payments, notes } = await req.json()

  if (!business_id) {
    return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00.000Z`
  const todayEnd   = `${today}T23:59:59.999Z`

  // Compute system totals from source tables
  const [cashRes, evcRes, creditRes] = await Promise.all([
    supabase
      .from('documents')
      .select('total')
      .eq('business_id', business_id)
      .eq('source', 'pos')
      .eq('payment_method', 'cash')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),

    supabase
      .from('evc_transactions')
      .select('amount')
      .eq('business_id', business_id)
      .eq('direction', 'in')
      .gte('tran_date', todayStart)
      .lte('tran_date', todayEnd),

    supabase
      .from('debt_transactions')
      .select('amount')
      .eq('business_id', business_id)
      .eq('type', 'credit')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd),
  ])

  const systemMobileMoney = (cashRes.data   ?? []).reduce((s, r) => s + (r.total  ?? 0), 0)
  const systemEvc         = (evcRes.data    ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)
  const systemCredit      = (creditRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0)

  const enteredEvc            = parseFloat(evc_received ?? 0)
  const otherPaymentsBreakdown = other_payments ?? []
  const enteredOther           = otherPaymentsBreakdown.reduce((s: number, p: { amount: number }) => s + (p.amount ?? 0), 0)

  const evcVariance   = enteredEvc - systemEvc
  const otherVariance = enteredOther - systemMobileMoney
  const totalVariance = evcVariance + otherVariance

  const { error } = await supabase
    .from('pos_reconciliations')
    .update({
      closed_by:              staff_id ?? null,
      system_cash_total:      systemMobileMoney,
      system_evc_total:       systemEvc,
      system_credit_total:    systemCredit,
      closing_cash_counted:   enteredEvc + enteredOther,
      cash_variance:          totalVariance,
      notes:                  notes ?? null,
      status:                 'pending_approval',
      closed_at:              new Date().toISOString(),
      // Store the detailed breakdown in the notes field as JSON supplement
      // (other_payments_breakdown stored in closing_cash_counted for now)
    })
    .eq('business_id', business_id)
    .eq('date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('business_audit_log').insert({
    business_id, staff_id: staff_id ?? null, user_id: user.id,
    action: 'shift_close',
    details: {
      date: today,
      system_evc: systemEvc, system_mobile_money: systemMobileMoney, system_credit: systemCredit,
      entered_evc: enteredEvc, entered_other: enteredOther,
      evc_variance: evcVariance, other_variance: otherVariance,
      other_payments_breakdown: otherPaymentsBreakdown,
    },
  })

  return NextResponse.json({
    success: true,
    systemEvc, systemMobileMoney, systemCredit,
    enteredEvc, enteredOther,
    evcVariance, otherVariance, totalVariance,
  })
}
