// Verify a staff member's PIN for POS login
// POST /api/staff/verify-pin
// Body: { business_id, staff_id, pin }
// Returns: { valid: true, staff: { id, name, role } } or { valid: false }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

function hashPin(pin: string, staffId: string): string {
  return createHash('sha256').update(`${pin}:${staffId}`).digest('hex')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  // Note: we do NOT require auth here — POS login runs before the cashier is authenticated
  // The business_id acts as the scope guard

  const { business_id, staff_id, pin } = await req.json()
  if (!business_id || !staff_id || !pin) {
    return NextResponse.json({ valid: false, error: 'Missing fields' }, { status: 400 })
  }

  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, name, role, pin_hash, is_active')
    .eq('id', staff_id)
    .eq('business_id', business_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!staff) return NextResponse.json({ valid: false })

  // If no PIN is set, any PIN attempt is rejected
  if (!staff.pin_hash) return NextResponse.json({ valid: false, error: 'No PIN set for this staff member' })

  const inputHash = hashPin(String(pin), staff_id)
  if (inputHash !== staff.pin_hash) return NextResponse.json({ valid: false })

  return NextResponse.json({
    valid: true,
    staff: { id: staff.id, name: staff.name, role: staff.role },
  })
}
