// Record a payment against a customer's debt balance.
//
// POST /api/debt/pay
// Body: { business_id, customer_id, amount, description }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, customer_id, amount, description } = await req.json()

  if (!business_id || !customer_id || !amount) {
    return NextResponse.json({ error: 'business_id, customer_id and amount are required' }, { status: 400 })
  }

  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }

  const { data: account, error: accountError } = await supabase
    .from('debt_accounts')
    .select('id, current_balance')
    .eq('business_id', business_id)
    .eq('customer_id', customer_id)
    .maybeSingle()

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 })
  if (!account) return NextResponse.json({ error: 'No debt account found for this customer' }, { status: 404 })

  const newBalance = Math.max(0, account.current_balance - amt)

  // Record the payment transaction
  const { error: txError } = await supabase
    .from('debt_transactions')
    .insert({
      business_id,
      debt_account_id: account.id,
      customer_id,
      type: 'payment',
      amount: amt,
      description: description ?? 'Payment received',
      created_by: user.id,
    })

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // Update balance
  const { error: balanceError } = await supabase
    .from('debt_accounts')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', account.id)

  if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 })

  return NextResponse.json({ success: true, new_balance: newBalance })
}
