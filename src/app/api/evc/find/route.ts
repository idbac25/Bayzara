// Lookup a customer's name by EVC phone number.
// Used by the POS and invoice screens to verify a recipient before sending.
//
// POST /api/evc/find
// Body: { business_id, phone }
// Returns: { name, accountId, status }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, phone } = await req.json()
  if (!business_id || !phone) {
    return NextResponse.json({ error: 'business_id and phone required' }, { status: 400 })
  }

  const { data: conn } = await supabase
    .from('evc_connections')
    .select('session_token, session_cookie')
    .eq('business_id', business_id)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!conn?.session_token) {
    return NextResponse.json({ error: 'No active EVC connection' }, { status: 400 })
  }

  // Strip country prefix for Hormud API — it expects local format (e.g. "619921163")
  const localPhone = phone.replace(/^(252|\+252)/, '')

  try {
    const res = await fetch(`${HORMUD_API}/account/find`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json; charset=utf-8',
        ...(conn.session_cookie ? { Cookie: `_cyc=${conn.session_cookie}` } : {}),
      },
      body: JSON.stringify({
        userNature: 'MERCHANT',
        sessionId:  conn.session_token,
        type:       'internetwork',
        mobileNo:   localPhone,
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'Hormud API error' }, { status: 502 })
    const data = await res.json()

    if (data.resultCode !== '2001' || !data.ReceiverInfo) {
      return NextResponse.json({ error: data.replyMessage || 'Account not found' }, { status: 404 })
    }

    const info = data.ReceiverInfo
    return NextResponse.json({
      name:      info.NAME,
      accountId: info.ACCOUNTID,
      status:    info.STATUS,   // "ACTIVE" | "INACTIVE" | etc.
    })
  } catch (err) {
    console.error('EVC find error:', err)
    return NextResponse.json({ error: 'Failed to look up account' }, { status: 500 })
  }
}
