// Supabase Edge Function: evc-sync
// Runs every 60 seconds via cron to pull new EVC Plus transactions.
//
// Hormud Merchant API — confirmed endpoints (reverse-engineered from merchant.hormuud.com):
//   POST /api/account/transactions  → recent transactions (no date range needed)
//   POST /api/account/balance       → current balance
//   POST /api/account/login         → re-authenticate with stored credentials
//
// Auth: sessionId in request body ("WEB;{subscriptionId};{token}") + _cyc cookie header
// Auto-reconnect: if session expired, decrypt stored credentials and re-login silently

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const HORMUD_API                = Deno.env.get('HORMUD_API_BASE') ?? 'https://merchant.hormuud.com/api'
const CRED_SECRET               = Deno.env.get('EVC_CREDENTIALS_SECRET') ?? ''

// ── Crypto helpers (AES-GCM, Web Crypto API) ──────────────────────────────────
// Key: 64-char hex secret imported directly as AES-256 key (no HKDF — avoids cross-runtime drift).
// Per-tenant binding: businessId passed as AES-GCM Additional Authenticated Data (AAD).

async function importKey(secret: string): Promise<CryptoKey> {
  const raw = new Uint8Array(secret.match(/.{2}/g)!.map(h => parseInt(h, 16)))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt'])
}

async function decryptCredential(base64: string, secret: string, businessId: string): Promise<{ username: string; password: string }> {
  const key      = await importKey(secret)
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const iv       = combined.slice(0, 12)
  const data     = combined.slice(12)
  const enc      = new TextEncoder()
  const plain    = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(businessId) }, key, data)
  return JSON.parse(new TextDecoder().decode(plain))
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface HormudTransaction {
  tranID:         number
  sender:         string        // full E.164 phone, e.g. "252771677183"
  receiver:       string | null
  tranDate:       string        // "02/04/26 15:12:07"
  description:    string
  credit:         string        // "0.01" for incoming payments, "-" otherwise
  debit:          string        // "0.01" for outgoing, "-" otherwise
  balance:        string
  currentBalance: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build request headers including the _cyc session cookie */
function hormudHeaders(sessionCookie?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json; charset=utf-8',
    ...(sessionCookie ? { Cookie: `_cyc=${sessionCookie}` } : {}),
  }
}

/** Parse Hormud amount string: "0.01" → 0.01, "-" → 0 */
function parseAmount(s: string): number {
  if (!s || s === '-') return 0
  return parseFloat(s) || 0
}

/** Pull latest transactions from the dashboard endpoint — no date range needed */
async function fetchLatestTransactions(
  sessionId: string,
  sessionCookie: string,
): Promise<HormudTransaction[]> {
  try {
    const res = await fetch(`${HORMUD_API}/account/transactions`, {
      method: 'POST',
      headers: hormudHeaders(sessionCookie),
      body: JSON.stringify({ userNature: 'MERCHANT', sessionId }),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (data.resultCode !== '2001') return []
    return Array.isArray(data.transactionInfo) ? data.transactionInfo : []
  } catch {
    return []
  }
}

/** Look up a subscriber's display name by phone number */
async function lookupName(
  phone: string,
  sessionId: string,
  sessionCookie: string,
): Promise<string | null> {
  try {
    const local = phone.replace(/^(252|\+252)/, '')
    const res = await fetch(`${HORMUD_API}/account/find`, {
      method: 'POST',
      headers: hormudHeaders(sessionCookie),
      body: JSON.stringify({ userNature: 'MERCHANT', sessionId, type: 'internetwork', mobileNo: local }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.resultCode !== '2001' || !data.ReceiverInfo) return null
    return String(data.ReceiverInfo.NAME ?? '') || null
  } catch {
    return null
  }
}

/** Fetch current balance */
async function fetchBalance(
  sessionId: string,
  sessionCookie: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${HORMUD_API}/account/balance`, {
      method: 'POST',
      headers: hormudHeaders(sessionCookie),
      body: JSON.stringify({ userNature: 'MERCHANT', sessionId }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.resultCode !== '2001') return null
    return parseFloat(String(data.currentBalance ?? '0')) || null
  } catch {
    return null
  }
}

/** Re-authenticate using stored encrypted credentials. Returns new { sessionId, sessionCookie } or null on failure. */
async function reAuthenticate(
  credentialsEncrypted: string,
  businessId: string,
): Promise<{ sessionId: string; sessionCookie: string } | null> {
  if (!CRED_SECRET || !credentialsEncrypted) return null

  let creds: { username: string; password: string }
  try {
    creds = await decryptCredential(credentialsEncrypted, CRED_SECRET, businessId)
  } catch (err) {
    console.error('Failed to decrypt EVC credentials. secret_len:', CRED_SECRET.length, 'business_id:', businessId, 'err:', String(err))
    return null
  }

  try {
    const res = await fetch(`${HORMUD_API}/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username:    creds.username,
        password:    creds.password,
        userNature:  'MERCHANT',
        type:        'MERCHANT',
        currency:    840,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    if (String(data.resultCode) !== '2001') return null

    const sessionId = String(data.sessionId ?? '')
    if (!sessionId) return null

    const setCookie    = res.headers.get('set-cookie') ?? ''
    const cycMatch     = setCookie.match(/_cyc=([^;]+)/)
    const sessionCookie = cycMatch?.[1] ?? ''

    return { sessionId, sessionCookie }
  } catch {
    return null
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Load all active EVC connections
  const { data: connections, error: connErr } = await supabase
    .from('evc_connections')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'active')

  if (connErr) {
    return new Response(JSON.stringify({ error: connErr.message }), { status: 500 })
  }

  const results: Record<string, unknown>[] = []

  for (const conn of connections ?? []) {
    try {
      let sessionId     = conn.session_token   // "WEB;...;..." sessionId string
      let sessionCookie = conn.session_cookie  // _cyc cookie value

      if (!sessionId) {
        // No session at all — try auto-reconnect if we have encrypted credentials
        if (conn.credentials_encrypted) {
          const newSession = await reAuthenticate(conn.credentials_encrypted, conn.business_id)
          if (newSession) {
            sessionId     = newSession.sessionId
            sessionCookie = newSession.sessionCookie
            await supabase.from('evc_connections').update({
              session_token:  sessionId,
              session_cookie: sessionCookie,
              status:         'active',
            }).eq('id', conn.id)
          } else {
            await supabase.from('evc_connections').update({ status: 'error' }).eq('id', conn.id)
            results.push({ id: conn.id, status: 'reconnect_failed' })
            continue
          }
        } else {
          results.push({ id: conn.id, status: 'no_session — reconnect required' })
          continue
        }
      }

      // Pull latest transactions — if session expired the API returns resultCode !== '2001'
      let allTxns = await fetchLatestTransactions(sessionId, sessionCookie)

      // Session may have expired: retry once with fresh credentials
      if (allTxns.length === 0 && conn.credentials_encrypted) {
        // Probe the balance endpoint — a quick way to check if session is alive
        const probe = await fetchBalance(sessionId, sessionCookie)
        if (probe === null) {
          const newSession = await reAuthenticate(conn.credentials_encrypted, conn.business_id)
          if (newSession) {
            sessionId     = newSession.sessionId
            sessionCookie = newSession.sessionCookie
            await supabase.from('evc_connections').update({
              session_token:  sessionId,
              session_cookie: sessionCookie,
              status:         'active',
            }).eq('id', conn.id)
            allTxns = await fetchLatestTransactions(sessionId, sessionCookie)
          }
        }
      }

      if (allTxns.length === 0) {
        // Update balance and timestamp even when no new transactions
        const balance = await fetchBalance(sessionId, sessionCookie)
        if (balance !== null) {
          await supabase.from('evc_connections').update({
            current_balance: balance,
            last_synced_at: new Date().toISOString(),
          }).eq('id', conn.id)
        }
        results.push({ id: conn.id, status: 'no_transactions' })
        continue
      }

      // Filter to incoming payments only (credit !== "-") and deduplicate by tranID.
      // Each payment creates two rows in the API response (one credit, one fee debit).
      const seenIds = new Set<number>()
      const incomingTxns = allTxns.filter(t => {
        const isCredit = parseAmount(t.credit) > 0
        if (!isCredit) return false
        if (seenIds.has(t.tranID)) return false
        seenIds.add(t.tranID)
        return true
      })

      // Stop at the last tran_id we already processed
      const lastTranId = conn.last_tran_id ? Number(conn.last_tran_id) : null
      const newTxns = lastTranId
        ? incomingTxns.filter(t => t.tranID > lastTranId)
        : incomingTxns

      if (newTxns.length === 0) {
        const balance = await fetchBalance(sessionId, sessionCookie)
        if (balance !== null) {
          await supabase.from('evc_connections').update({
            current_balance: balance,
            last_synced_at: new Date().toISOString(),
          }).eq('id', conn.id)
        }
        results.push({ id: conn.id, status: 'no_new_txns' })
        continue
      }

      let inserted = 0

      for (const tx of newTxns) {
        const amount      = parseAmount(tx.credit)
        const senderPhone = tx.sender ?? ''

        // Try to match a client by EVC phone number
        const { data: clientMatch } = await supabase
          .from('clients')
          .select('id')
          .eq('business_id', conn.business_id)
          .eq('evc_phone', senderPhone)
          .maybeSingle()

        // Try to match an open invoice for this client
        let matchedDocumentId: string | null = null
        let needsReview = true

        if (clientMatch?.id) {
          const { data: openInvoice } = await supabase
            .from('documents')
            .select('id, amount_due')
            .eq('business_id', conn.business_id)
            .eq('client_id', clientMatch.id)
            .eq('type', 'invoice')
            .in('status', ['sent', 'partially_paid', 'overdue'])
            .is('deleted_at', null)
            .order('due_date', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (openInvoice) {
            matchedDocumentId = openInvoice.id
            needsReview = Math.abs((openInvoice.amount_due as number) - amount) > 0.01
          }
        }

        // Parse Hormud date "02/04/26 15:12:07" → ISO string
        let tranDate: string
        try {
          const [datePart, timePart] = tx.tranDate.split(' ')
          const [dd, mm, yy] = datePart.split('/')
          tranDate = new Date(`20${yy}-${mm}-${dd}T${timePart}`).toISOString()
        } catch {
          tranDate = new Date().toISOString()
        }

        // Insert — unique constraint on (evc_connection_id, tran_id) prevents duplicates
        const { data: newTxRecord, error: txErr } = await supabase
          .from('evc_transactions')
          .insert({
            business_id:        conn.business_id,
            evc_connection_id:  conn.id,
            tran_id:            String(tx.tranID),
            amount,
            direction:          'in',
            sender_phone:       senderPhone,
            sender_name:        null,   // looked up below after insert
            tran_date:          tranDate,
            balance_after:      parseAmount(tx.currentBalance),
            description:        tx.description,
            is_recorded:        false,
            needs_review:       needsReview,
            client_id:          clientMatch?.id ?? null,
            document_id:        matchedDocumentId,
          })
          .select()
          .single()

        // Look up sender name from EVC — best-effort, non-blocking
        if (newTxRecord && senderPhone) {
          lookupName(senderPhone, sessionId, sessionCookie).then(name => {
            if (name) {
              supabase.from('evc_transactions')
                .update({ sender_name: name })
                .eq('id', newTxRecord.id)
                .then(() => {})
            }
          })
        }

        if (txErr) {
          // Unique constraint violation = already recorded — not an error
          if (!txErr.message.includes('duplicate') && !txErr.message.includes('unique')) {
            console.error('Insert tx error:', txErr.message)
          }
          continue
        }

        inserted++

        // Auto-record payment if client + invoice match exactly
        if (!needsReview && matchedDocumentId && clientMatch?.id && newTxRecord) {
          const { data: payAcct } = await supabase
            .from('payment_accounts')
            .select('id')
            .eq('business_id', conn.business_id)
            .eq('evc_connection_id', conn.id)
            .eq('is_active', true)
            .maybeSingle()

          if (payAcct) {
            const { data: payRecord } = await supabase
              .from('payment_records')
              .insert({
                business_id:        conn.business_id,
                document_id:        matchedDocumentId,
                payment_account_id: payAcct.id,
                amount,
                date:               tranDate.split('T')[0],
                method:             'evc',
                reference:          String(tx.tranID),
                notes:              `Auto-recorded from EVC. Sender: ${senderPhone}`,
                evc_tran_id:        String(tx.tranID),
              })
              .select()
              .single()

            if (payRecord) {
              await supabase.from('evc_transactions').update({
                is_recorded:       true,
                needs_review:      false,
                payment_record_id: payRecord.id,
              }).eq('id', newTxRecord.id)
            }
          }
        }
      }

      // Update connection: latest tranID + fresh balance
      const latestTranId = newTxns[0]?.tranID
      const balance = await fetchBalance(sessionId, sessionCookie)

      await supabase.from('evc_connections').update({
        last_tran_id:    latestTranId ? String(latestTranId) : conn.last_tran_id,
        current_balance: balance ?? conn.current_balance,
        last_synced_at:  new Date().toISOString(),
        status:          'active',
      }).eq('id', conn.id)

      results.push({ id: conn.id, status: 'synced', newTxns: inserted })

    } catch (err) {
      console.error(`Error syncing connection ${conn.id}:`, err)

      await supabase.from('evc_connections').update({
        status:     'error',
        updated_at: new Date().toISOString(),
      }).eq('id', conn.id)

      results.push({ id: conn.id, status: 'error', error: String(err) })
    }
  }

  return new Response(
    JSON.stringify({ synced: results.length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
