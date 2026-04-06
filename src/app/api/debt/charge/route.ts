// Record a credit sale — customer takes goods now, pays later.
// Creates the debt_account if it doesn't exist yet.
//
// POST /api/debt/charge
// Body: { business_id, customer_id, amount, description, credit_limit? }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, customer_id, amount, description, credit_limit } = await req.json()

  if (!business_id || !customer_id || !amount) {
    return NextResponse.json({ error: 'business_id, customer_id and amount are required' }, { status: 400 })
  }

  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }

  // Upsert the debt account — create if first time, otherwise just use existing
  const { data: account, error: accountError } = await supabase
    .from('debt_accounts')
    .upsert(
      { business_id, customer_id, credit_limit: credit_limit ?? 0 },
      { onConflict: 'business_id,customer_id', ignoreDuplicates: false }
    )
    .select('id, current_balance, credit_limit')
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: accountError?.message ?? 'Failed to get debt account' }, { status: 500 })
  }

  // Check credit limit (0 = no limit)
  if (account.credit_limit > 0 && (account.current_balance + amt) > account.credit_limit) {
    return NextResponse.json({
      error: `Credit limit of $${account.credit_limit} would be exceeded. Current balance: $${account.current_balance}`
    }, { status: 400 })
  }

  // Record the transaction
  const { error: txError } = await supabase
    .from('debt_transactions')
    .insert({
      business_id,
      debt_account_id: account.id,
      customer_id,
      type: 'credit',
      amount: amt,
      description: description ?? null,
      created_by: user.id,
    })

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  // Update running balance
  const { error: balanceError } = await supabase
    .from('debt_accounts')
    .update({
      current_balance: account.current_balance + amt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)

  if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 })

  // Audit log
  supabase.from('business_audit_log').insert({
    business_id, user_id: user.id,
    action: 'debt_charge', entity_type: 'debt_transaction',
    details: { amount: amt, description, customer_id },
  }).then(() => {})

  return NextResponse.json({ success: true, new_balance: account.current_balance + amt })
}
