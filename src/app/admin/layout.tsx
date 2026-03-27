import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/app')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar adminName={profile.full_name ?? profile.email ?? 'Admin'} />
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
