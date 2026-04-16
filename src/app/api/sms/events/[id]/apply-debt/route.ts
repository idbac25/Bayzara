// Owner-authenticated. Applies an SMS event as a payment against a customer's debt.
// Optionally overrides the auto-matched customer_id (if it was wrong or missing).

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customer_id: overrideCustomerId } = await req.json()

  // Load event
  const { data: event } = await supabase
    .from('sms_events')
    .select('id, business_id, amount, direction, counterparty_phone, matched_customer_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status === 'recorded') {
    return NextResponse.json({ error: 'Already recorded' }, { status: 409 })
  }
  if (event.direction !== 'in') {
    return NextResponse.json({ error: 'Only incoming payments can be applied to debt' }, { status: 400 })
  }
  if (!event.amount || event.amount <= 0) {
    return NextResponse.json({ error: 'Event has no valid amount' }, { status: 400 })
  }

  const customerId = overrideCustomerId ?? event.matched_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'No customer specified' }, { status: 400 })
  }

  // Find or create debt account
  const { data: account } = await supabase
    .from('debt_accounts')
    .select('id, current_balance')
    .eq('business_id', event.business_id)
    .eq('customer_id', customerId)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ error: 'Customer has no open debt account' }, { status: 404 })
  }

  const newBalance = Math.max(0, Number(account.current_balance) - Number(event.amount))

  // Record payment
  const { data: tx, error: txError } = await supabase
    .from('debt_transactions')
    .insert({
      business_id: event.business_id,
      debt_account_id: account.id,
      customer_id: customerId,
      type: 'payment',
      amount: event.amount,
      description: `Payment via EVC SMS (${event.counterparty_phone ?? 'unknown phone'})`,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  await supabase
    .from('debt_accounts')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', account.id)

  // Mark event recorded
  await supabase
    .from('sms_events')
    .update({
      status: 'recorded',
      recorded_payment_id: tx?.id ?? null,
      matched_customer_id: customerId,
    })
    .eq('id', id)

  return NextResponse.json({
    ok: true,
    new_balance: newBalance,
    debt_transaction_id: tx?.id,
  })
}
