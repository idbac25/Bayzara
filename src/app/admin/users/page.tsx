import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, is_platform_admin, created_at')
    .order('created_at', { ascending: false })

  // Get business membership per user
  const { data: bizUsers } = await supabase
    .from('business_users')
    .select('user_id, role, businesses(name, slug)')

  const bizByUser: Record<string, Array<{ name: string; slug: string; role: string }>> = {}
  bizUsers?.forEach(bu => {
    const biz = Array.isArray(bu.businesses) ? bu.businesses[0] : bu.businesses
    if (biz && 'name' in biz) {
      if (!bizByUser[bu.user_id]) bizByUser[bu.user_id] = []
      bizByUser[bu.user_id].push({ name: biz.name, slug: biz.slug, role: bu.role })
    }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-[#27AE60]" /> All Users
        </h1>
        <p className="text-white/50 text-sm mt-1">{users?.length ?? 0} registered users</p>
      </div>

      <AdminUsersClient users={users ?? []} bizByUser={bizByUser} />
    </div>
  )
}
