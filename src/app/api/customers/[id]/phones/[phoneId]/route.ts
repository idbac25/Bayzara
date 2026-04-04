import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/customers/[id]/phones/[phoneId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phoneId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: customerId, phoneId } = await params

  const { error } = await supabase
    .from('customer_phones')
    .delete()
    .eq('id', phoneId)
    .eq('customer_id', customerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
