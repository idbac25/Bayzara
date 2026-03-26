import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/app')

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      <nav className="border-b border-white/10 px-6 py-3 flex items-center justify-between bg-[#0F0F1A]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5A623, #e09520)' }}>
            <span className="text-black font-bold text-sm">B</span>
          </div>
          <span className="font-bold text-sm">Bayzara Admin</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5A623]/20 text-[#F5A623] font-semibold">PLATFORM</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/60">
          <a href="/admin" className="hover:text-white">Dashboard</a>
          <a href="/admin/businesses" className="hover:text-white">Businesses</a>
          <a href="/admin/users" className="hover:text-white">Users</a>
          <a href="/app" className="hover:text-white text-xs border border-white/20 rounded px-2 py-1">← Back to App</a>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
