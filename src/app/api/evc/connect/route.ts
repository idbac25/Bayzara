import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptCredential } from '@/lib/evc-crypto'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

export async function POST(request: NextRequest) {
  const { username, password, business_id } = await request.json()

  if (!username || !password || !business_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Step 1: Login to Hormud merchant portal
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

    // Extract the sessionId — this is the auth credential for all subsequent API calls.
    // Format: "WEB;{subscriptionId};{shortToken}"
    // NOTE: NOT the JWT `token` field — the Hormud API uses sessionId in request bodies.
    const sessionId = String(loginData.sessionId ?? '')
    if (!sessionId) {
      return NextResponse.json({ error: 'No sessionId returned from Hormud' }, { status: 400 })
    }

    // Extract the _cyc session cookie — required for server-side API calls
    const setCookieHeader = loginRes.headers.get('set-cookie') ?? ''
    const cycMatch = setCookieHeader.match(/_cyc=([^;]+)/)
    const sessionCookie = cycMatch?.[1] ?? ''

    // Extract account info
    const accountInfo = (loginData.accountInformation as Record<string, unknown>[] | undefined)?.[0] ?? {}
    const merchantName  = String(accountInfo.accountTitle ?? loginData.subscriptionId ?? username)
    const accountNumber = String(accountInfo.accountNumber ?? '')
    const accountId     = String(accountInfo.accountId ?? '')
    const subscriptionId = String(loginData.subscriptionId ?? username)

    // Step 2: Get balance
    let currentBalance = 0
    try {
      const balanceRes = await fetch(`${HORMUD_API}/account/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionCookie ? { Cookie: `_cyc=${sessionCookie}` } : {}),
        },
        body: JSON.stringify({ userNature: 'MERCHANT', sessionId }),
      })
      if (balanceRes.ok) {
        const balanceData: Record<string, unknown> = await balanceRes.json()
        currentBalance = parseFloat(String(balanceData.currentBalance ?? '0'))
      }
    } catch { /* ignore if balance fails */ }

    // Step 3: Encrypt credentials for auto-reconnect
    let credentialsEncrypted: string | null = null
    const credSecret = process.env.EVC_CREDENTIALS_SECRET
    if (credSecret) {
      try {
        credentialsEncrypted = await encryptCredential(
          JSON.stringify({ username, password }),
          credSecret,
          business_id,
        )
      } catch (e) {
        console.error('Failed to encrypt EVC credentials:', e)
      }
    }

    // Step 4: Store in Supabase (pending activation)
    const supabase = await createClient()

    // Upsert so reconnecting the same merchant updates credentials rather than erroring
    const { data: connection, error } = await supabase
      .from('evc_connections')
      .upsert({
        business_id,
        merchant_name:          merchantName,
        merchant_phone:         username,
        merchant_number:        accountNumber || subscriptionId,
        account_id:             accountId,
        // session_token stores the sessionId string ("WEB;...;...") — NOT the JWT token
        session_token:          sessionId,
        session_cookie:         sessionCookie,
        credentials_encrypted:  credentialsEncrypted,
        current_balance:        currentBalance,
        is_active:              false,
        status:                 'pending',
      }, { onConflict: 'business_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      connection_id:   connection.id,
      merchant_name:   merchantName,
      merchant_phone:  username,
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
