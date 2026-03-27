import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { BusinessDetailClient } from './BusinessDetailClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props { params: Promise<{ id: string }> }

export default async function BusinessDetailPage({ params }: Props) {
  const { id } = await params

  const [
    { data: business },
    { data: members },
    { data: plans },
    { data: evcConns },
    { count: clientCount },
    { count: vendorCount },
    { count: invoiceCount },
    { data: volumeData },
  ] = await Promise.all([
    admin.from('businesses').select('*').eq('id', id).single(),
    admin.from('business_users').select('id, role, user_id, created_at, profiles(full_name, email, phone)').eq('business_id', id),
    admin.from('plan_templates').select('*').order('sort_order'),
    admin.from('evc_connections').select('id, merchant_name, merchant_phone, is_active, status, current_balance, last_synced_at').eq('business_id', id),
    admin.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', id).eq('archived', false),
    admin.from('vendors').select('*', { count: 'exact', head: true }).eq('business_id', id).eq('archived', false),
    admin.from('documents').select('*', { count: 'exact', head: true }).eq('business_id', id).eq('type', 'invoice').is('deleted_at', null),
    admin.from('documents').select('total').eq('business_id', id).eq('type', 'invoice').is('deleted_at', null),
  ])

  if (!business) notFound()

  const totalVolume = (volumeData ?? []).reduce((s, d) => s + (d.total ?? 0), 0)

  // Supabase returns joined relations as arrays — normalize to single object
  const normalizedMembers = (members ?? []).map(m => ({
    ...m,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles,
  }))

  return (
    <BusinessDetailClient
      business={business}
      members={normalizedMembers}
      plans={plans ?? []}
      evcConnections={evcConns ?? []}
      stats={{
        clients: clientCount ?? 0,
        vendors: vendorCount ?? 0,
        invoices: invoiceCount ?? 0,
        volume: totalVolume,
      }}
    />
  )
}
