import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminUsersClient from './AdminUsersClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminUsersPage() {
  const { data: users } = await admin
    .from('profiles')
    .select('id, full_name, email, phone, is_platform_admin, created_at')
    .order('created_at', { ascending: false })

  const { data: bizUsers } = await admin
    .from('business_users')
    .select('user_id, role, businesses(name, slug)')

  const bizByUser: Record<string, Array<{ name: string; slug: string; role: string }>> = {}
  bizUsers?.forEach(bu => {
    const biz = Array.isArray(bu.businesses) ? bu.businesses[0] : bu.businesses
    if (biz && 'name' in biz) {
      if (!bizByUser[bu.user_id]) bizByUser[bu.user_id] = []
      bizByUser[bu.user_id].push({ name: (biz as { name: string; slug: string }).name, slug: (biz as { name: string; slug: string }).slug, role: bu.role })
    }
  })

  return <AdminUsersClient users={users ?? []} bizByUser={bizByUser} />
}
