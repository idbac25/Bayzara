// Open today's reconciliation / shift
// POST /api/reconciliation/open
// Body: { business_id, staff_id, opening_cash }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, staff_id, opening_cash } = await req.json()
  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('pos_reconciliations')
    .upsert(
      { business_id, date: today, opened_by: staff_id ?? null, opening_cash: opening_cash ?? 0, status: 'open' },
      { onConflict: 'business_id,date', ignoreDuplicates: true }
    )
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await supabase.from('business_audit_log').insert({
    business_id, staff_id: staff_id ?? null, user_id: user.id,
    action: 'shift_open', details: { opening_cash, date: today },
  })

  return NextResponse.json({ success: true, id: data?.id })
}
