// Send money to a customer via EVC Plus (B2P transfer).
// Used for refunds and manual payouts.
//
// POST /api/evc/send
// Body: { business_id, receiver_phone, receiver_name, amount, description, pin }
// Returns: { transfer_id, transfer_code, amount, charges, balance_after, date }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'



const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, receiver_phone, receiver_name, amount, description, pin } = await req.json()

  if (!business_id || !receiver_phone || !amount || !pin) {
    return NextResponse.json(
      { error: 'business_id, receiver_phone, amount and pin are required' },
      { status: 400 }
    )
  }

  const { data: conn } = await supabase
    .from('evc_connections')
    .select('id, session_token, session_cookie')
    .eq('business_id', business_id)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!conn?.session_token) {
    return NextResponse.json({ error: 'No active EVC connection' }, { status: 400 })
  }

  // Strip country prefix — Hormud API expects local format
  const localPhone = String(receiver_phone).replace(/^(252|\+252)/, '')

  try {
    const res = await fetch(`${HORMUD_API}/money/b2p`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json; charset=utf-8',
        ...(conn.session_cookie ? { Cookie: `_cyc=${conn.session_cookie}` } : {}),
      },
      body: JSON.stringify({
        userNature:     'MERCHANT',
        sessionId:      conn.session_token,
        receiverMobile: localPhone,
        receiverName:   receiver_name ?? '',
        amount:         String(amount),
        description:    description ?? 'refund',
        isInterNetwork: '0',
        pin:            String(pin),
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Hormud API error' }, { status: 502 })
    const data = await res.json()

    if (data.resultCode !== '2001') {
      return NextResponse.json(
        { error: data.replyMessage || 'Transfer failed' },
        { status: 400 }
      )
    }

    const info = data.transferInfo ?? {}
    const sentAmount = parseFloat(String(info.TxAmount ?? amount))

    const newBalance = parseFloat(info.currentBalance ?? '0')

    // Record outbound transaction and update balance — must await before returning
    // (Vercel kills the function once the response is sent)
    await Promise.all([
      supabase.from('evc_transactions').insert({
        business_id,
        evc_connection_id: conn.id,
        tran_id:           String(info['Transfer-Id'] ?? `out-${Date.now()}`),
        amount:            sentAmount,
        direction:         'out',
        sender_phone:      null,
        sender_name:       null,
        receiver_phone:    String(localPhone),
        receiver_name:     receiver_name ?? null,
        tran_date:         new Date().toISOString(),
        balance_after:     newBalance,
        description:       description ?? 'refund',
        is_recorded:       false,
        needs_review:      false,
      }),
      supabase.from('evc_connections')
        .update({ current_balance: newBalance, last_synced_at: new Date().toISOString() })
        .eq('id', conn.id),
    ])

    return NextResponse.json({
      transfer_id:   info['Transfer-Id'],
      transfer_code: info['Transfer-Code'],
      amount:        info.TxAmount,
      charges:       info.Charges,
      balance_after: newBalance,
      date:          info['Transaction-Date'],
      message:       data.replyMessage,
    })
  } catch (err) {
    console.error('EVC send error:', err)
    return NextResponse.json({ error: 'Failed to process transfer' }, { status: 500 })
  }
}
