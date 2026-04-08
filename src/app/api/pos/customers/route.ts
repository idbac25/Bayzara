// Create or return an existing POS customer.
// Used by the POS cashier to add a walk-in customer inline without leaving the POS.
//
// POST /api/pos/customers
// Body: { business_id, name, primary_phone }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, name, primary_phone } = await req.json()

  if (!business_id || !name?.trim() || !primary_phone?.trim()) {
    return NextResponse.json({ error: 'business_id, name and primary_phone are required' }, { status: 400 })
  }

  // Upsert: if this phone already exists for the business, return the existing record
  const { data, error } = await supabase
    .from('pos_customers')
    .upsert(
      { business_id, name: name.trim(), primary_phone: primary_phone.trim() },
      { onConflict: 'business_id,primary_phone', ignoreDuplicates: false }
    )
    .select('id, name, primary_phone')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
