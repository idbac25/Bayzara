// Cancel / refund an inbound EVC transaction.
// Calls Hormud /api/money/cancel to reverse a payment back to the sender.
//
// POST /api/evc/cancel
// Body: { business_id, transaction_id, amount, description, pin }
// Returns: { success, message }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, transaction_id, amount, description, pin } = await req.json()

  if (!business_id || !transaction_id || !amount || !pin) {
    return NextResponse.json(
      { error: 'business_id, transaction_id, amount and pin are required' },
      { status: 400 }
    )
  }

  const { data: conn } = await supabase
    .from('evc_connections')
    .select('id, session_token, session_cookie, account_id')
    .eq('business_id', business_id)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!conn?.session_token) {
    return NextResponse.json({ error: 'No active EVC connection' }, { status: 400 })
  }

  try {
    const res = await fetch(`${HORMUD_API}/money/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json; charset=utf-8',
        ...(conn.session_cookie ? { Cookie: `_cyc=${conn.session_cookie}` } : {}),
      },
      body: JSON.stringify({
        userNature:      'MERCHANT',
        sessionId:       conn.session_token,
        accountId:       conn.account_id,
        adminPIN:        String(pin),
        transactionId:   String(transaction_id),
        tranDescription: description ?? 'refund',
        amount:          String(amount),
        currency:        'USD',
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Hormud API error' }, { status: 502 })
    const data = await res.json()

    if (data.resultCode !== '2001') {
      return NextResponse.json(
        { error: data.replyMessage || 'Refund failed' },
        { status: 400 }
      )
    }

    // Mark the original transaction as refunded in our DB
    await supabase
      .from('evc_transactions')
      .update({ description: `[REFUNDED] ${description ?? 'refund'}`, needs_review: false })
      .eq('tran_id', String(transaction_id))
      .eq('business_id', business_id)

    return NextResponse.json({ success: true, message: data.replyMessage })
  } catch (err) {
    console.error('EVC cancel error:', err)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
