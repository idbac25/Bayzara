import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreTransactions } from '@/lib/evc-score'

export const runtime = 'nodejs'

// GET /api/evc/recent-transactions
// Query params:
//   business_id      — required
//   expected_amount  — required, the POS sale total
//   initiated_at     — ISO timestamp of when the cashier opened the payment screen
//   window_seconds   — optional, how far back to look (default 300 = 5 minutes)

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const businessId     = searchParams.get('business_id')
  const expectedAmount = parseFloat(searchParams.get('expected_amount') ?? '')
  const initiatedAt    = searchParams.get('initiated_at') ?? new Date().toISOString()
  const windowSeconds  = parseInt(searchParams.get('window_seconds') ?? '300', 10)

  if (!businessId || isNaN(expectedAmount)) {
    return NextResponse.json({ error: 'Missing business_id or expected_amount' }, { status: 400 })
  }

  // Compute the time window: from (initiatedAt - windowSeconds) to now
  const since = new Date(new Date(initiatedAt).getTime() - windowSeconds * 1000).toISOString()

  // Fetch recent unmatched inbound transactions
  const { data: txns, error } = await supabase
    .from('evc_transactions')
    .select('id, tran_id, amount, sender_name, sender_phone, tran_date')
    .eq('business_id', businessId)
    .eq('direction', 'in')
    .eq('is_recorded', false)
    .gte('tran_date', since)
    .order('tran_date', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Look up all known customer phones for this business (primary + alternatives)
  // to give the scorer a bonus when sender is a known customer
  const { data: primaryPhones } = await supabase
    .from('pos_customers')
    .select('primary_phone')
    .eq('business_id', businessId)

  const { data: altPhones } = await supabase
    .from('customer_phones')
    .select('phone')
    .eq('business_id', businessId)

  const knownPhones = [
    ...(primaryPhones ?? []).map(r => r.primary_phone),
    ...(altPhones ?? []).map(r => r.phone),
  ]

  const scored = scoreTransactions(
    txns ?? [],
    expectedAmount,
    new Date(initiatedAt),
    knownPhones,
  )

  return NextResponse.json({ transactions: scored })
}
