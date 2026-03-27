import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkbocpwzoqvqzthocgia.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, expected_amount, since } = await req.json()

  // Trigger immediate EVC sync via Supabase Edge Function
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/evc-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    // Non-fatal: sync might fail, we still check existing transactions
  }

  // Check for a matching unrecorded inbound transaction since the sale started
  const sinceTime = since ?? new Date(Date.now() - 60000).toISOString()

  const { data: transactions } = await supabase
    .from('evc_transactions')
    .select('id, tran_id, amount, sender_phone, sender_name, tran_date, created_at')
    .eq('business_id', business_id)
    .eq('direction', 'in')
    .eq('is_recorded', false)
    .gte('amount', (expected_amount ?? 0) - 0.5)
    .lte('amount', (expected_amount ?? 999999) + 0.5)
    .gte('created_at', sinceTime)
    .order('created_at', { ascending: false })
    .limit(5)

  const match = transactions?.[0] ?? null

  return NextResponse.json({ found: !!match, transaction: match })
}
