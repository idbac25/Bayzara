import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(request: NextRequest) {
  const { username, password, business_id } = await request.json()

  if (!username || !password || !business_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Step 1: Login to Hormud with the correct merchant request format
    const loginRes = await fetch(`${HORMUD_API}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        userNature: 'MERCHANT',
        type: 'MERCHANT',
        currency: 840,
      }),
    })

    let loginData: Record<string, unknown> = {}
    let rawText = ''
    try {
      rawText = await loginRes.text()
      loginData = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: `Hormud API (status ${loginRes.status}): ${rawText.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const resultCode = String(loginData.resultCode ?? '')
    if (resultCode !== '2001') {
      const msg =
        (loginData.replyMessage as string) ??
        (loginData.resultDescription as string) ??
        rawText.slice(0, 200)
      return NextResponse.json({ error: msg || 'Login failed' }, { status: 401 })
    }

    const sessionId = String(loginData.sessionId ?? '')
    const token = String(loginData.token ?? '')

    // Extract account info from accountInformation array
    const accountInfo = (loginData.accountInformation as Record<string, unknown>[] | undefined)?.[0] ?? {}
    const merchantName = String(accountInfo.accountTitle ?? loginData.subscriptionId ?? username)
    const accountNumber = String(accountInfo.accountNumber ?? '')
    const accountId = String(accountInfo.accountId ?? '')
    const subscriptionId = String(loginData.subscriptionId ?? username)
    const partnerUid = String(loginData.partnerUID ?? '')

    // Extract session cookie if present
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const cycMatch = setCookie.match(/_cyc=([^;]+)/)
    const sessionCookie = cycMatch?.[1] ?? ''

    // Step 2: Get balance
    let currentBalance = 0
    try {
      const balanceRes = await fetch(`${HORMUD_API}/account/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionCookie ? { Cookie: `_cyc=${sessionCookie}` } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      })
      const balanceData: Record<string, unknown> = await balanceRes.json()
      currentBalance = parseFloat(String(balanceData.currentBalance ?? balanceData.CurrentBalance ?? '0'))
    } catch { /* ignore if balance fails */ }

    // Step 4: Store in Supabase (pending activation)
    const supabase = await createClient()

    const { data: connection, error } = await supabase
      .from('evc_connections')
      .insert({
        business_id,
        merchant_name: merchantName,
        merchant_phone: username,
        merchant_number: accountNumber || subscriptionId,
        session_token: token,
        current_balance: currentBalance,
        is_active: false,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      connection_id: connection.id,
      merchant_name: merchantName,
      merchant_phone: username,
      merchant_number: accountNumber || subscriptionId,
      current_balance: currentBalance,
    })

  } catch (err) {
    console.error('EVC connect error:', err)
    return NextResponse.json(
      { error: 'Failed to connect to Hormud. Try again.' },
      { status: 500 }
    )
  }
}
