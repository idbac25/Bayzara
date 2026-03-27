'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { FEATURE_LABELS, type FeatureKey } from '@/lib/features'
import { toast } from 'sonner'
import {
  Building2, Users, Receipt, TrendingUp, Zap, ExternalLink,
  Ban, CheckCircle, Trash2, ArrowLeft, Save, Shield
} from 'lucide-react'

interface Business {
  id: string; name: string; slug: string; plan: string | null
  plan_expires_at: string | null; email: string | null; phone: string | null
  country: string | null; city: string | null; address_line1: string | null
  currency: string | null; features: Record<string, boolean | number> | null
  suspended_at: string | null; created_at: string
}

interface Member {
  id: string; role: string; user_id: string; created_at: string
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}

interface PlanTemplate {
  id: string; name: string; label: string; price_usd: number
  features: Record<string, boolean | number>
}

interface EVCConnection {
  id: string; merchant_name: string; merchant_phone: string | null
  is_active: boolean; status: string | null; current_balance: number | null
  last_synced_at: string | null
}

interface Stats { clients: number; vendors: number; invoices: number; volume: number }

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Owner' },
  { value: 'admin',       label: 'Admin' },
  { value: 'manager',     label: 'Manager' },
  { value: 'accountant',  label: 'Accountant' },
  { value: 'employee',    label: 'Employee' },
  { value: 'viewer',      label: 'Viewer' },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-[#0F4C81]/10 text-[#0F4C81]',
  admin:       'bg-blue-100 text-blue-700',
  manager:     'bg-purple-100 text-purple-700',
  accountant:  'bg-green-100 text-green-700',
  employee:    'bg-gray-100 text-gray-600',
  viewer:      'bg-gray-100 text-gray-500',
}

export function BusinessDetailClient({ business, members, plans, evcConnections, stats }: {
  business: Business
  members: Member[]
  plans: PlanTemplate[]
  evcConnections: EVCConnection[]
  stats: Stats
}) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'overview' | 'features' | 'team' | 'evc'>('overview')

  // Plan state
  const [plan, setPlan] = useState(business.plan ?? 'free')
  const [planExpiry, setPlanExpiry] = useState(business.plan_expires_at?.split('T')[0] ?? '')
  const [savingPlan, setSavingPlan] = useState(false)

  // Feature state
  const [features, setFeatures] = useState<Record<string, boolean | number>>(business.features ?? {})
  const [savingFeatures, setSavingFeatures] = useState(false)

  // Suspend state
  const [suspended, setSuspended] = useState(!!business.suspended_at)
  const [togglingSupend, setTogglingSupend] = useState(false)

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-500',
    pro: 'bg-[#F5A623]/15 text-[#e09520]',
    enterprise: 'bg-purple-100 text-purple-600',
  }

  async function logAction(action: string, metadata?: Record<string, unknown>) {
    await supabase.from('admin_audit_log').insert({
      action,
      target_type: 'business',
      target_id: business.id,
      target_name: business.name,
      metadata: metadata ?? {},
    })
  }

  async function savePlan() {
    setSavingPlan(true)
    const { error } = await supabase.from('businesses').update({
      plan,
      plan_expires_at: planExpiry || null,
    }).eq('id', business.id)
    if (error) { toast.error(error.message); setSavingPlan(false); return }
    await logAction('plan_changed', { old: business.plan, new: plan })
    toast.success('Plan updated')
    setSavingPlan(false)
    router.refresh()
  }

  function applyPlanPreset(planName: string) {
    const template = plans.find(p => p.name === planName)
    if (template) setFeatures({ ...template.features })
  }

  async function saveFeatures() {
    setSavingFeatures(true)
    const { error } = await supabase.from('businesses').update({ features }).eq('id', business.id)
    if (error) { toast.error(error.message); setSavingFeatures(false); return }
    await logAction('features_changed', { features })
    toast.success('Features saved')
    setSavingFeatures(false)
  }

  async function toggleSuspend() {
    setTogglingSupend(true)
    const newSuspended = !suspended
    const { error } = await supabase.from('businesses').update({
      suspended_at: newSuspended ? new Date().toISOString() : null,
    }).eq('id', business.id)
    if (error) { toast.error(error.message); setTogglingSupend(false); return }
    await logAction(newSuspended ? 'business_suspended' : 'business_unsuspended')
    setSuspended(newSuspended)
    toast.success(newSuspended ? 'Business suspended' : 'Business unsuspended')
    setTogglingSupend(false)
  }

  async function changeRole(memberId: string, newRole: string) {
    const { error } = await supabase.from('business_users').update({ role: newRole }).eq('id', memberId)
    if (error) { toast.error(error.message); return }
    await logAction('role_changed', { member_id: memberId, new_role: newRole })
    toast.success('Role updated')
    router.refresh()
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from this business?`)) return
    const { error } = await supabase.from('business_users').delete().eq('id', memberId)
    if (error) { toast.error(error.message); return }
    await logAction('member_removed', { member_id: memberId, name })
    toast.success('Member removed')
    router.refresh()
  }

  const featureKeys = Object.keys(FEATURE_LABELS) as FeatureKey[]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/businesses" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Businesses
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planColors[plan] ?? planColors.free}`}>
              {plan}
            </span>
            {suspended && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">SUSPENDED</span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">{business.slug} · {business.country ?? 'Somalia'}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/app/${business.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Support View
          </a>
          <button
            onClick={toggleSuspend}
            disabled={togglingSupend}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
              suspended
                ? 'bg-[#27AE60] text-white hover:bg-[#219d55]'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            {suspended ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
            {suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Clients',  value: stats.clients,  icon: Users,    color: '#0F4C81' },
          { label: 'Invoices', value: stats.invoices, icon: Receipt,  color: '#8B5CF6' },
          { label: 'Volume',   value: formatCurrency(stats.volume, business.currency ?? 'USD'), icon: TrendingUp, color: '#27AE60' },
          { label: 'EVC',      value: evcConnections.length, icon: Zap, color: '#F5A623' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${s.color}18` }}>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {(['overview', 'features', 'team', 'evc'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'evc' ? 'EVC Plus' : t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#0F4C81]" /> Business Info
            </h3>
            {[
              { label: 'Email', value: business.email },
              { label: 'Phone', value: business.phone },
              { label: 'Country', value: business.country },
              { label: 'City', value: business.city },
              { label: 'Address', value: business.address_line1 },
              { label: 'Currency', value: business.currency },
              { label: 'Joined', value: new Date(business.created_at).toLocaleDateString() },
            ].map(f => f.value && (
              <div key={f.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{f.label}</span>
                <span className="text-gray-900 font-medium">{f.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#0F4C81]" /> Plan Management
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</label>
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] bg-white"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan Expires</label>
                <input
                  type="date"
                  value={planExpiry}
                  onChange={e => setPlanExpiry(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81]"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry</p>
              </div>
              <button
                onClick={savePlan}
                disabled={savingPlan}
                className="w-full flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {savingPlan ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {tab === 'features' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Feature Flags</h3>
              <p className="text-xs text-gray-400 mt-0.5">Override individual features or apply a plan preset</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={e => applyPlanPreset(e.target.value)}
                defaultValue=""
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] bg-white text-gray-700"
              >
                <option value="" disabled>Apply preset…</option>
                {plans.map(p => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={saveFeatures}
                disabled={savingFeatures}
                className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                {savingFeatures ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {featureKeys.map(key => {
              const meta = FEATURE_LABELS[key]
              const val = features[key]
              return (
                <div key={key} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.description}</p>
                  </div>
                  {meta.type === 'toggle' ? (
                    <button
                      onClick={() => setFeatures(prev => ({ ...prev, [key]: val === false ? true : false }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                        val !== false ? 'bg-[#0F4C81]' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        val !== false ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={typeof val === 'number' ? val : 0}
                      onChange={e => setFeatures(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-[#0F4C81] shrink-0"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0F4C81]" /> Team Members ({members.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide bg-gray-50">
                <th className="text-left px-5 py-3">Member</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(m => {
                const profile = m.profiles
                const name = profile?.full_name ?? profile?.email ?? 'Unknown'
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-xs text-gray-400">{profile?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={m.role}
                        onChange={e => changeRole(m.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-500'}`}
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => removeMember(m.id, name)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Remove from business"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">No team members</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EVC Tab */}
      {tab === 'evc' && (
        <div className="space-y-4">
          {evcConnections.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No EVC connections for this business</p>
            </div>
          ) : evcConnections.map(conn => (
            <div key={conn.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#F5A623]" />
                    <p className="font-semibold text-gray-900">{conn.merchant_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      conn.is_active ? 'bg-green-100 text-green-700' :
                      conn.status === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {conn.is_active ? 'Active' : conn.status ?? 'Pending'}
                    </span>
                  </div>
                  {conn.merchant_phone && <p className="text-sm text-gray-400 mt-1">{conn.merchant_phone}</p>}
                  {conn.last_synced_at && (
                    <p className="text-xs text-gray-400 mt-1">Last sync: {new Date(conn.last_synced_at).toLocaleString()}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className="text-xl font-bold text-[#27AE60]">
                    {conn.current_balance != null ? formatCurrency(conn.current_balance, 'USD') : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
