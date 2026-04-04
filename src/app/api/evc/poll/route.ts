// EVC payment poll — called every 2-3 seconds by the POS while waiting for payment.
// Triggers a live sync from Hormud, then checks the DB for a matching transaction.

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const HORMUD_API        = process.env.HORMUD_API_BASE ?? 'https://merchant.hormuud.com/api'

interface HormudTransaction {
  tranID: number
  sender: string
  credit: string
  debit: string
  tranDate: string
  description: string
  currentBalance: string
}

function parseAmount(s: string): number {
  if (!s || s === '-') return 0
  return parseFloat(s) || 0
}

async function pullLatestTransactions(
  sessionId: string,
  sessionCookie: string,
): Promise<HormudTransaction[]> {
  try {
    const res = await fetch(`${HORMUD_API}/account/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json; charset=utf-8',
        ...(sessionCookie ? { Cookie: `_cyc=${sessionCookie}` } : {}),
      },
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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, expected_amount, since } = await req.json()
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  // Load the active EVC connection for this business
  const { data: conn } = await supabase
    .from('evc_connections')
    .select('id, session_token, session_cookie, last_tran_id')
    .eq('business_id', business_id)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  // Live poll: pull transactions directly from Hormud and upsert new ones
  if (conn?.session_token) {
    const txns = await pullLatestTransactions(conn.session_token, conn.session_cookie ?? '')

    const seenIds = new Set<number>()
    const incoming = txns.filter(t => {
      const isCredit = parseAmount(t.credit) > 0
      if (!isCredit || seenIds.has(t.tranID)) return false
      seenIds.add(t.tranID)
      return true
    })

    if (incoming.length > 0) {
      // Insert any new transactions into the DB (duplicates silently ignored by unique constraint)
      await Promise.allSettled(
        incoming.map(async (tx) => {
          let tranDate: string
          try {
            const [datePart, timePart] = tx.tranDate.split(' ')
            const [dd, mm, yy] = datePart.split('/')
            tranDate = new Date(`20${yy}-${mm}-${dd}T${timePart}`).toISOString()
          } catch {
            tranDate = new Date().toISOString()
          }

          await supabase.from('evc_transactions').insert({
            business_id,
            evc_connection_id: conn.id,
            tran_id:           String(tx.tranID),
            amount:            parseAmount(tx.credit),
            direction:         'in',
            sender_phone:      tx.sender ?? '',
            tran_date:         tranDate,
            balance_after:     parseAmount(tx.currentBalance),
            description:       tx.description,
            is_recorded:       false,
            needs_review:      true,
          })
          // Duplicate tran_id is fine — just means we already stored it
        })
      )
    }
  } else {
    // Fallback: trigger the edge function (slower, async)
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      fetch(`${SUPABASE_URL}/functions/v1/evc-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
      }).catch(() => {})
    }
  }

  // Check DB for a matching unrecorded inbound transaction
  const sinceTime = since ?? new Date(Date.now() - 120_000).toISOString()

  let query = supabase
    .from('evc_transactions')
    .select('id, tran_id, amount, sender_phone, sender_name, tran_date, created_at')
    .eq('business_id', business_id)
    .eq('direction', 'in')
    .eq('is_recorded', false)
    .gte('created_at', sinceTime)
    .order('created_at', { ascending: false })
    .limit(10)

  if (expected_amount != null) {
    query = query
      .gte('amount', (expected_amount as number) - 0.5)
      .lte('amount', (expected_amount as number) + 0.5)
  }

  const { data: transactions } = await query
  const match = transactions?.[0] ?? null

  return NextResponse.json({ found: !!match, transaction: match })
}
