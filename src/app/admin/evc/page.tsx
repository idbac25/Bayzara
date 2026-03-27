import { createClient as createAdminClient } from '@supabase/supabase-js'
import { EVCAdminClient } from './EVCAdminClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminEVCPage() {
  const { data: connections } = await admin
    .from('evc_connections')
    .select('id, merchant_name, merchant_phone, merchant_number, is_active, status, current_balance, last_synced_at, created_at, business_id, businesses(name, slug)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <EVCAdminClient connections={(connections ?? []) as any} />
}
