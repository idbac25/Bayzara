// Staff member CRUD
// GET  /api/staff?business_id=  — list all staff
// POST /api/staff               — create staff member
// PATCH /api/staff              — update staff member (name, role, pin, is_active)

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPin(pin: string, staffId: string): string {
  return createHash('sha256').update(`${pin}:${staffId}`).digest('hex')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = req.nextUrl.searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, phone, role, is_active, pin_hash, created_at')
    .eq('business_id', businessId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Don't send the actual hash to the client — just whether PIN is set
  const staff = (data ?? []).map(s => ({ ...s, has_pin: !!s.pin_hash, pin_hash: undefined }))
  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, name, phone, role, pin } = await req.json()
  if (!business_id || !name) return NextResponse.json({ error: 'business_id and name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('staff_members')
    .insert({ business_id, name, phone: phone || null, role: role || 'cashier' })
    .select('id')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Failed to create' }, { status: 500 })

  // Set PIN if provided
  if (pin && pin.length === 4) {
    await supabase
      .from('staff_members')
      .update({ pin_hash: hashPin(String(pin), data.id) })
      .eq('id', data.id)
  }

  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, business_id, name, phone, role, pin, is_active } = await req.json()
  if (!id || !business_id) return NextResponse.json({ error: 'id and business_id required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (phone !== undefined) updates.phone = phone || null
  if (role !== undefined) updates.role = role
  if (is_active !== undefined) updates.is_active = is_active
  if (pin !== undefined) {
    updates.pin_hash = pin && String(pin).length === 4 ? hashPin(String(pin), id) : null
  }

  const { error } = await supabase
    .from('staff_members')
    .update(updates)
    .eq('id', id)
    .eq('business_id', business_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
