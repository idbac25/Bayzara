import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SettingsClient } from './SettingsClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminSettingsPage() {
  const { data: admins } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('is_platform_admin', true)
    .order('created_at')

  return <SettingsClient admins={admins ?? []} />
}
