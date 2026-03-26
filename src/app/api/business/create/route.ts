import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEFAULT_STAGES = [
  { id: 'open', name: 'Open', order: 0, color: '#3B82F6' },
  { id: 'contacted', name: 'Contacted', order: 1, color: '#8B5CF6' },
  { id: 'proposal_sent', name: 'Proposal Sent', order: 2, color: '#F59E0B' },
  { id: 'deal_done', name: 'Deal Done', order: 3, color: '#10B981' },
  { id: 'lost', name: 'Lost', order: 4, color: '#EF4444' },
  { id: 'not_serviceable', name: 'Not Serviceable', order: 5, color: '#6B7280' },
]

const DOCUMENT_TYPES = [
  'invoice', 'quotation', 'proforma_invoice', 'sales_order',
  'delivery_challan', 'credit_note', 'payment_receipt',
  'purchase', 'expense', 'purchase_order', 'payout_receipt', 'debit_note',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { slug, name, logo_url, country, currency, timezone } = body

  // Use admin client to bypass RLS
  const admin = createAdminClient(SUPABASE_URL, SERVICE_KEY)

  // Create business
  const { data: business, error: bizError } = await admin
    .from('businesses')
    .insert({ slug, name, logo_url, country, currency, timezone, owner_id: user.id })
    .select()
    .single()

  if (bizError || !business) {
    return NextResponse.json({ error: bizError?.message ?? 'Failed to create business' }, { status: 400 })
  }

  // Add owner as super_admin (bypasses RLS via service key)
  await admin.from('business_users').insert({
    business_id: business.id,
    user_id: user.id,
    role: 'super_admin',
    accepted_at: new Date().toISOString(),
  })

  // Create default pipeline
  await admin.from('pipelines').insert({
    business_id: business.id,
    name: 'Sales Pipeline',
    stages: DEFAULT_STAGES,
    is_default: true,
  })

  // Create document sequences
  const sequences = DOCUMENT_TYPES.map(type => ({
    business_id: business.id,
    document_type: type,
    prefix: '',
    current_number: 0,
  }))
  await admin.from('document_sequences').insert(sequences)

  return NextResponse.json({ slug: business.slug })
}
