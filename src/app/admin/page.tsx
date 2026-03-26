import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Building2, Users, Receipt, TrendingUp, Zap, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: bizCount },
    { count: userCount },
    { count: invoiceCount },
    { data: revenueData },
    { data: recentBusinesses },
    { data: recentUsers },
    { count: evcConnections },
  ] = await Promise.all([
    supabase.from('businesses').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('type', 'invoice'),
    supabase.from('documents').select('total').eq('type', 'invoice').is('deleted_at', null),
    supabase.from('businesses').select('id, name, slug, plan, created_at, country').order('created_at', { ascending: false }).limit(8),
    supabase.from('profiles').select('id, full_name, email, created_at, is_platform_admin').order('created_at', { ascending: false }).limit(8),
    supabase.from('evc_connections').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const totalInvoiced = (revenueData ?? []).reduce((s, d) => s + (d.total ?? 0), 0)

  const planCounts: Record<string, number> = {}
  const { data: planData } = await supabase.from('businesses').select('plan')
  planData?.forEach(b => { planCounts[b.plan] = (planCounts[b.plan] ?? 0) + 1 })

  const stats = [
    { label: 'Total Businesses', value: bizCount ?? 0, icon: Building2, color: '#0F4C81' },
    { label: 'Total Users', value: userCount ?? 0, icon: Users, color: '#27AE60' },
    { label: 'Total Invoices', value: invoiceCount ?? 0, icon: Receipt, color: '#8B5CF6' },
    { label: 'Platform Volume', value: formatCurrency(totalInvoiced, 'USD'), icon: TrendingUp, color: '#F5A623', isAmount: true },
    { label: 'EVC Connections', value: evcConnections ?? 0, icon: Zap, color: '#F5A623' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-white/50 text-sm mt-1">All businesses and users across Bayzara</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}25` }}>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Plans
        </h2>
        <div className="flex items-center gap-6">
          {Object.entries(planCounts).map(([plan, count]) => (
            <div key={plan}>
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs text-white/40 capitalize">{plan}</p>
            </div>
          ))}
          {Object.keys(planCounts).length === 0 && (
            <p className="text-sm text-white/30">No businesses yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#0F4C81]" /> Recent Businesses
            </h2>
            <Link href="/admin/businesses" className="text-xs text-white/40 hover:text-white">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {(recentBusinesses ?? []).length === 0 ? (
              <p className="p-5 text-sm text-white/30">No businesses yet</p>
            ) : (recentBusinesses ?? []).map(biz => (
              <div key={biz.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{biz.name}</p>
                  <p className="text-xs text-white/40">{biz.slug} · {biz.country ?? 'Somalia'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    biz.plan === 'pro' ? 'bg-[#F5A623]/20 text-[#F5A623]' :
                    biz.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-white/10 text-white/50'
                  }`}>{biz.plan}</span>
                  <span className="text-xs text-white/30">
                    {new Date(biz.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-[#27AE60]" /> Recent Users
            </h2>
            <Link href="/admin/users" className="text-xs text-white/40 hover:text-white">View all →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {(recentUsers ?? []).length === 0 ? (
              <p className="p-5 text-sm text-white/30">No users yet</p>
            ) : (recentUsers ?? []).map(u => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{u.full_name ?? 'No name'}</p>
                  <p className="text-xs text-white/40">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.is_platform_admin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5A623]/20 text-[#F5A623] font-medium">Admin</span>
                  )}
                  <span className="text-xs text-white/30">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
