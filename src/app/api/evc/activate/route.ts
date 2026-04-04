import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { connection_id, business_id } = await request.json()
  const supabase = await createClient()

  // Activate the connection — must set status:'active' or the edge function
  // query (.eq('status','active')) will never match this connection.
  const { error: activateError } = await supabase
    .from('evc_connections')
    .update({ is_active: true, status: 'active' })
    .eq('id', connection_id)
    .eq('business_id', business_id)

  if (activateError) {
    return NextResponse.json({ error: activateError.message }, { status: 500 })
  }

  // Create linked payment account
  const { data: conn } = await supabase
    .from('evc_connections')
    .select('*')
    .eq('id', connection_id)
    .single()

  if (conn) {
    await supabase.from('payment_accounts').insert({
      business_id,
      name: `EVC Plus – ${conn.merchant_name}`,
      type: 'evc_plus',
      account_number: conn.account_number,
      evc_connection_id: connection_id,
      balance: conn.current_balance,
      currency: conn.currency ?? 'USD',
      is_active: true,
    })
  }

  return NextResponse.json({ success: true })
}
