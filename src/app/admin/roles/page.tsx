import { createClient as createAdminClient } from '@supabase/supabase-js'
import { RolesClient } from './RolesClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RolesPage() {
  const { data: memberships } = await admin
    .from('business_users')
    .select('id, role, user_id, business_id, created_at, profiles(full_name, email), businesses(id, name, slug)')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <RolesClient memberships={(memberships ?? []) as any} />
}
