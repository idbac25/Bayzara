import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AnnouncementsClient } from './AnnouncementsClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AnnouncementsPage() {
  const { data: announcements } = await admin
    .from('platform_announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return <AnnouncementsClient announcements={announcements ?? []} />
}
