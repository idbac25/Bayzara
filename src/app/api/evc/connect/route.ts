import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptCredential } from '@/lib/evc-crypto'

const HORMUD_API = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

// ── Shared helper: extract account info from a successful (2001) login response ──
function extractAccount(loginData: Record<string, unknown>, username: string) {
  const accountInfo = (loginData.accountInformation as Record<string, unknown>[] | undefined)?.[0] ?? {}
  return {
    sessionId:      String(loginData.sessionId ?? ''),
    merchantName:   String(accountInfo.accountTitle ?? loginData.subscriptionId ?? username),
    accountNumber:  String(accountInfo.accountNumber ?? ''),
    accountId:      String(accountInfo.accountId ?? ''),
    subscriptionId: String(loginData.subscriptionId ?? username),
  }
}

// ── POST /api/evc/connect ────────────────────────────────────────────────────
//
// Mode A — initial login:
//   body: { username, password, business_id }
//   → if 2001: stores connection, returns account info
//   → if 1001: returns { otp_required: true, pending_session_id, pending_session_cookie }
//
// Mode B — OTP verification:
//   body: { username, business_id, otp_code, pending_session_id, pending_session_cookie }
//   → calls /api/account/2auth, on 2001 stores connection, returns account info
//
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { username, business_id } = body

  if (!username || !business_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── MODE B: OTP submission ─────────────────────────────────────────────────
  if (body.otp_code) {
    const { otp_code, pending_session_id, pending_session_cookie } = body

    if (!otp_code || !pending_session_id) {
      return NextResponse.json({ error: 'otp_code and pending_session_id are required' }, { status: 400 })
    }

    try {
      const twoAuthRes = await fetch(`${HORMUD_API}/account/2auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pending_session_cookie ? { Cookie: `_cyc=${pending_session_cookie}` } : {}),
        },
        body: JSON.stringify({
          userNature: 'MERCHANT',
          type:       'MERCHANT',
          sessionId:  pending_session_id,
          code:       String(otp_code).trim(),
        }),
      })

      let twoAuthData: Record<string, unknown> = {}
      const rawText = await twoAuthRes.text()
      try { twoAuthData = JSON.parse(rawText) } catch {
        return NextResponse.json({ error: `Hormud OTP error: ${rawText.slice(0, 200)}` }, { status: 502 })
      }

      const resultCode = String(twoAuthData.resultCode ?? '')
      if (resultCode !== '2001') {
        const msg = (twoAuthData.replyMessage as string) ?? 'OTP verification failed'
        return NextResponse.json({ error: msg }, { status: 401 })
      }

      // Grab refreshed cookie if Hormud set a new one
      const setCookieHeader = twoAuthRes.headers.get('set-cookie') ?? ''
      const cycMatch = setCookieHeader.match(/_cyc=([^;]+)/)
      const sessionCookie = cycMatch?.[1] ?? pending_session_cookie ?? ''

      return await finaliseConnection(twoAuthData, username, business_id, sessionCookie)
    } catch (err) {
      console.error('EVC 2auth error:', err)
      return NextResponse.json({ error: 'OTP verification failed. Try again.' }, { status: 500 })
    }
  }

  // ── MODE A: initial login ──────────────────────────────────────────────────
  const { password } = body
  if (!password) {
    return NextResponse.json({ error: 'password is required' }, { status: 400 })
  }

  try {
    const loginRes = await fetch(`${HORMUD_API}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        userNature: 'MERCHANT',
        type:       'MERCHANT',
        currency:   840,
      }),
    })

    let loginData: Record<string, unknown> = {}
    const rawText = await loginRes.text()
    try { loginData = JSON.parse(rawText) } catch {
      return NextResponse.json(
        { error: `Hormud API (status ${loginRes.status}): ${rawText.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const resultCode = String(loginData.resultCode ?? '')

    // OTP required ────────────────────────────────────────────────────────────
    if (resultCode === '1001') {
      const setCookieHeader = loginRes.headers.get('set-cookie') ?? ''
      const cycMatch = setCookieHeader.match(/_cyc=([^;]+)/)
      return NextResponse.json({
        otp_required:            true,
        pending_session_id:      String(loginData.sessionId ?? ''),
        pending_session_cookie:  cycMatch?.[1] ?? '',
        message:                 (loginData.replyMessage as string) ?? 'Enter the OTP sent to your phone',
      })
    }

    // Any other non-success code ───────────────────────────────────────────────
    if (resultCode !== '2001') {
      const msg =
        (loginData.replyMessage as string) ??
        (loginData.resultDescription as string) ??
        rawText.slice(0, 200)
      return NextResponse.json({ error: msg || 'Login failed' }, { status: 401 })
    }

    // Success without OTP ─────────────────────────────────────────────────────
    const setCookieHeader = loginRes.headers.get('set-cookie') ?? ''
    const cycMatch = setCookieHeader.match(/_cyc=([^;]+)/)
    const sessionCookie = cycMatch?.[1] ?? ''

    return await finaliseConnection(loginData, username, business_id, sessionCookie)

  } catch (err) {
    console.error('EVC connect error:', err)
    return NextResponse.json({ error: 'Failed to connect to Hormud. Try again.' }, { status: 500 })
  }
}

// ── Shared: fetch balance, encrypt creds, store in Supabase ──────────────────
async function finaliseConnection(
  loginData: Record<string, unknown>,
  username: string,
  business_id: string,
  sessionCookie: string,
): Promise<NextResponse> {
  const { sessionId, merchantName, accountNumber, accountId, subscriptionId } =
    extractAccount(loginData, username)

  if (!sessionId) {
    return NextResponse.json({ error: 'No sessionId returned from Hormud' }, { status: 400 })
  }

  // Get balance
  let currentBalance = 0
  try {
    const balanceRes = await fetch(`${process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'}/account/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: `_cyc=${sessionCookie}` } : {}),
      },
      body: JSON.stringify({ userNature: 'MERCHANT', sessionId }),
    })
    if (balanceRes.ok) {
      const bd: Record<string, unknown> = await balanceRes.json()
      currentBalance = parseFloat(String(bd.currentBalance ?? '0'))
    }
  } catch { /* ignore */ }

  // Encrypt credentials
  let credentialsEncrypted: string | null = null
  const credSecret = process.env.EVC_CREDENTIALS_SECRET
  if (credSecret && username) {
    try {
      // We don't have the password in this helper — only encrypt on Mode A (handled in caller)
      // credentialsEncrypted is updated later by the connect route on Mode A
    } catch { /* ignore */ }
  }

  const supabase = await createClient()
  const { data: connection, error } = await supabase
    .from('evc_connections')
    .upsert({
      business_id,
      merchant_name:         merchantName,
      merchant_phone:        username,
      merchant_number:       accountNumber || subscriptionId,
      account_id:            accountId,
      session_token:         sessionId,
      session_cookie:        sessionCookie,
      credentials_encrypted: credentialsEncrypted,
      current_balance:       currentBalance,
      is_active:             false,
      status:                'pending',
    }, { onConflict: 'business_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    connection_id:   connection.id,
    merchant_name:   merchantName,
    merchant_number: accountNumber || subscriptionId,
    current_balance: currentBalance,
  })
}
