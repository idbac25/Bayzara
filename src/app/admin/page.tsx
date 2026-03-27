import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'
import { Building2, Users, Receipt, TrendingUp, Zap, CreditCard, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [
    { count: bizCount },
    { count: userCount },
    { count: invoiceCount },
    { data: revenueData },
    { data: recentBusinesses },
    { data: recentUsers },
    { count: evcCount },
    { data: planData },
    { data: newThisWeek },
  ] = await Promise.all([
    admin.from('businesses').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('documents').select('*', { count: 'exact', head: true }).eq('type', 'invoice').is('deleted_at', null),
    admin.from('documents').select('total').eq('type', 'invoice').is('deleted_at', null),
    admin.from('businesses').select('id, name, slug, plan, created_at, country, suspended_at').order('created_at', { ascending: false }).limit(6),
    admin.from('profiles').select('id, full_name, email, created_at, is_platform_admin').order('created_at', { ascending: false }).limit(6),
    admin.from('evc_connections').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('businesses').select('plan'),
    admin.from('businesses').select('id').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalVolume = (revenueData ?? []).reduce((s, d) => s + (d.total ?? 0), 0)

  const planCounts: Record<string, number> = {}
  planData?.forEach(b => { planCounts[b.plan ?? 'free'] = (planCounts[b.plan ?? 'free'] ?? 0) + 1 })
  const planOrder = ['free', 'pro', 'enterprise']
  const planColors: Record<string, string> = {
    free: 'bg-gray-200',
    pro: 'bg-[#F5A623]',
    enterprise: 'bg-purple-500',
  }

  const stats = [
    { label: 'Total Businesses',  value: bizCount ?? 0,                         icon: Building2,  color: '#0F4C81', suffix: '' },
    { label: 'Total Users',       value: userCount ?? 0,                         icon: Users,      color: '#27AE60', suffix: '' },
    { label: 'Total Invoices',    value: invoiceCount ?? 0,                      icon: Receipt,    color: '#8B5CF6', suffix: '' },
    { label: 'Platform Volume',   value: formatCurrency(totalVolume, 'USD'),     icon: TrendingUp, color: '#F5A623', suffix: '' },
    { label: 'Active EVC',        value: evcCount ?? 0,                          icon: Zap,        color: '#F5A623', suffix: '' },
    { label: 'New This Week',     value: newThisWeek?.length ?? 0,               icon: ArrowUpRight, color: '#27AE60', suffix: '' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">All businesses and users across Bayzara</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Plan Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Plan Breakdown
        </h2>
        <div className="flex items-end gap-8">
          {planOrder.map(plan => {
            const count = planCounts[plan] ?? 0
            const total = bizCount ?? 1
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={plan} className="flex flex-col items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{count}</span>
                <div className="w-16 rounded-full overflow-hidden bg-gray-100 h-2">
                  <div className={`h-2 rounded-full ${planColors[plan]}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 capitalize">{plan}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#0F4C81]" /> Recent Businesses
            </h2>
            <Link href="/admin/businesses" className="text-xs text-[#0F4C81] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentBusinesses ?? []).length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No businesses yet</p>
            ) : (recentBusinesses ?? []).map(biz => (
              <Link
                key={biz.id}
                href={`/admin/businesses/${biz.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{biz.name}</p>
                  <p className="text-xs text-gray-400">{biz.slug} · {biz.country ?? 'Somalia'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {biz.suspended_at && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Suspended</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    biz.plan === 'pro' ? 'bg-[#F5A623]/15 text-[#e09520]' :
                    biz.plan === 'enterprise' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>{biz.plan ?? 'free'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#27AE60]" /> Recent Users
            </h2>
            <Link href="/admin/users" className="text-xs text-[#0F4C81] hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentUsers ?? []).length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No users yet</p>
            ) : (recentUsers ?? []).map(u => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.full_name ?? 'No name'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.is_platform_admin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#e09520] font-medium">Admin</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
