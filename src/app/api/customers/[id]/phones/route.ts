import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/customers/[id]/phones
// Body: { business_id, phone, label? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: customerId } = await params
  const { business_id, phone, label } = await req.json()

  if (!business_id || !phone) {
    return NextResponse.json({ error: 'Missing business_id or phone' }, { status: 400 })
  }

  // Verify customer belongs to this business
  const { data: customer } = await supabase
    .from('pos_customers')
    .select('id')
    .eq('id', customerId)
    .eq('business_id', business_id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Check for conflict — does this phone already belong to another customer?
  const { data: conflict } = await supabase
    .from('pos_customers')
    .select('id, name')
    .eq('business_id', business_id)
    .eq('primary_phone', phone)
    .maybeSingle()

  const { data: altConflict } = await supabase
    .from('customer_phones')
    .select('id, customer_id, pos_customers(name)')
    .eq('business_id', business_id)
    .eq('phone', phone)
    .maybeSingle()

  if (conflict && conflict.id !== customerId) {
    return NextResponse.json(
      { error: `This number is already the primary phone for ${conflict.name}`, conflict: true },
      { status: 409 }
    )
  }
  if (altConflict && altConflict.customer_id !== customerId) {
    return NextResponse.json(
      { error: `This number is already linked to another customer`, conflict: true },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('customer_phones')
    .insert({ customer_id: customerId, business_id, phone, label: label ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This number is already linked to a customer', conflict: true }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ phone: data })
}
