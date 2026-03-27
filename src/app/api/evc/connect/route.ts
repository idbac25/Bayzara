import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(request: NextRequest) {
  const { username, password, business_id } = await request.json()

  if (!username || !password || !business_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Step 1: Login to Hormud — try form-encoded with userName/password
    const formBody = new URLSearchParams({ userName: username, password })
    const loginRes = await fetch(`${HORMUD_API}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
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

    const resultCode = String(
      loginData.resultCode ?? loginData.ResultCode ?? loginData.result_code ?? loginData.code ?? loginData.Code ?? ''
    )
    const isSuccess =
      resultCode === '2001' ||
      !!loginData.token || !!loginData.Token ||
      !!loginData.sessionId || !!loginData.SessionId

    if (!isSuccess) {
      const msg =
        (loginData.replyMessage as string) ??
        (loginData.resultDescription as string) ??
        (loginData.message as string) ??
        rawText.slice(0, 200)
      return NextResponse.json({ error: msg || 'Login failed' }, { status: 401 })
    }

    const sessionId = loginData.sessionId ?? loginData.SessionId
    const token = loginData.token ?? loginData.Token

    // Extract cookie from response
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const cycMatch = setCookie.match(/_cyc=([^;]+)/)
    const sessionCookie = cycMatch?.[1] ?? ''

    // Step 2: Get balance and account info
    const balanceRes = await fetch(`${HORMUD_API}/account/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `_cyc=${sessionCookie}`,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    })

    let balanceData: Record<string, unknown> = {}
    try { balanceData = await balanceRes.json() } catch { /* ignore */ }

    const currentBalance = parseFloat(
      String(balanceData.currentBalance ?? balanceData.CurrentBalance ?? '0')
    )
    const merchantName =
      (balanceData.accountTitle as string) ??
      (balanceData.AccountTitle as string) ??
      username
    const accountId =
      String(balanceData.accountId ?? balanceData.AccountId ?? '')

    // Step 3: Get transactions to extract account details
    let firstTx: Record<string, unknown> = {}
    try {
      const txRes = await fetch(`${HORMUD_API}/account/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `_cyc=${sessionCookie}`,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      })
      const txData: Record<string, unknown> = await txRes.json()
      const txList = (txData.transactionInfo ?? txData.TransactionInfo) as unknown[]
      firstTx = (txList?.[0] as Record<string, unknown>) ?? {}
    } catch { /* ignore if transactions fail */ }

    const subscriptionId = String(firstTx.sender ?? loginData.accountNumber ?? loginData.AccountNumber ?? username)
    const partnerUid = String(firstTx.receiver ?? '')
    const accountNumber = String(loginData.accountNumber ?? loginData.AccountNumber ?? subscriptionId)

    // Step 4: Store in Supabase (pending activation)
    const supabase = await createClient()

    const { data: connection, error } = await supabase
      .from('evc_connections')
      .insert({
        business_id,
        merchant_name: merchantName,
        subscription_id: subscriptionId,
        partner_uid: partnerUid,
        account_id: accountId,
        account_number: accountNumber,
        session_id: sessionId,
        session_token: token,
        session_cookie: sessionCookie,
        session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        encrypted_username: username,
        encrypted_password: password,
        current_balance: currentBalance,
        balance_updated_at: new Date().toISOString(),
        is_active: false,
        sync_enabled: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      connection_id: connection.id,
      merchant_name: merchantName,
      subscription_id: subscriptionId,
      partner_uid: partnerUid,
      account_id: accountId,
      account_number: accountNumber,
      current_balance: currentBalance,
      session_id: sessionId,
      session_token: token,
      session_cookie: sessionCookie,
    })

  } catch (err) {
    console.error('EVC connect error:', err)
    return NextResponse.json(
      { error: 'Failed to connect to Hormud. Try again.' },
      { status: 500 }
    )
  }
}
