import { createClient as createAdminClient } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Building2, ExternalLink } from 'lucide-react'
import { AdminBusinessesClient } from './AdminBusinessesClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminBusinessesPage() {
  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name, slug, plan, currency, country, created_at, email, suspended_at, mode')
    .order('created_at', { ascending: false })

  const { data: memberCounts } = await admin
    .from('business_users')
    .select('business_id')

  const { data: docCounts } = await admin
    .from('documents')
    .select('business_id, total, type')
    .eq('type', 'invoice')
    .is('deleted_at', null)

  const members: Record<string, number> = {}
  memberCounts?.forEach(m => { members[m.business_id] = (members[m.business_id] ?? 0) + 1 })

  const invoices: Record<string, number> = {}
  const volume: Record<string, number> = {}
  docCounts?.forEach(d => {
    invoices[d.business_id] = (invoices[d.business_id] ?? 0) + 1
    volume[d.business_id] = (volume[d.business_id] ?? 0) + (d.total ?? 0)
  })

  const rows = (businesses ?? []).map(b => ({
    ...b,
    member_count: members[b.id] ?? 0,
    invoice_count: invoices[b.id] ?? 0,
    volume: volume[b.id] ?? 0,
  }))

  return <AdminBusinessesClient businesses={rows} />
}
