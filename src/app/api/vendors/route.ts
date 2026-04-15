// POST /api/vendors — quick-create a vendor (used by the restock form inline)
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, name, phone } = await req.json()
  if (!business_id || !name?.trim()) {
    return NextResponse.json({ error: 'business_id and name required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('vendors')
    .insert({ business_id, name: name.trim(), phone: phone ?? null })
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
