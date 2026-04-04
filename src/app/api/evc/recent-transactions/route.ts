import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET /api/evc/recent-transactions
// Returns all unmatched inbound EVC transactions from the last 30 minutes,
// newest first. Amount-match confidence badge is computed here.
//
// Query params:
//   business_id      — required
//   expected_amount  — required, the POS sale total

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const businessId     = searchParams.get('business_id')
  const expectedAmount = parseFloat(searchParams.get('expected_amount') ?? '')

  if (!businessId || isNaN(expectedAmount)) {
    return NextResponse.json({ error: 'Missing business_id or expected_amount' }, { status: 400 })
  }

  // Hard 30-minute window from right now — prevents old unmatched transactions leaking in
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // Fetch unmatched inbound transactions — newest first
  const { data: txns, error } = await supabase
    .from('evc_transactions')
    .select('id, tran_id, amount, sender_name, sender_phone, tran_date')
    .eq('business_id', businessId)
    .eq('direction', 'in')
    .eq('is_recorded', false)
    .gte('tran_date', since)
    .order('tran_date', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach a simple amount-match confidence badge — no time-based resorting,
  // newest-first order is preserved
  const transactions = (txns ?? []).map(tx => {
    const diff = Math.abs(tx.amount - expectedAmount)
    const confidence: 'high' | 'medium' | 'low' =
      diff === 0     ? 'high'   :
      diff <= 0.5    ? 'medium' :
                       'low'

    const secondsAgo = Math.round((Date.now() - new Date(tx.tran_date).getTime()) / 1000)

    return { ...tx, confidence, secondsAgo, score: diff === 0 ? 100 : diff <= 0.5 ? 60 : 20 }
  })

  return NextResponse.json({ transactions })
}
