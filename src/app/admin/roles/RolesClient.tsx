'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Shield, Search, Trash2 } from 'lucide-react'

interface Membership {
  id: string; role: string; user_id: string; business_id: string; created_at: string
  profiles: { full_name: string | null; email: string | null } | null
  businesses: { id: string; name: string; slug: string } | null
}

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

export function RolesClient({ memberships: initial }: { memberships: Membership[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [memberships, setMemberships] = useState(initial)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = memberships.filter(m => {
    const name = m.profiles?.full_name ?? m.profiles?.email ?? ''
    const biz = m.businesses?.name ?? ''
    const matchSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      biz.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || m.role === roleFilter
    return matchSearch && matchRole
  })

  async function changeRole(id: string, newRole: string) {
    const { error } = await supabase.from('business_users').update({ role: newRole }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setMemberships(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m))
    toast.success('Role updated')
  }

  async function removeMember(m: Membership) {
    const name = m.profiles?.full_name ?? m.profiles?.email ?? 'this user'
    if (!confirm(`Remove ${name} from ${m.businesses?.name}?`)) return
    const { error } = await supabase.from('business_users').delete().eq('id', m.id)
    if (error) { toast.error(error.message); return }
    setMemberships(prev => prev.filter(x => x.id !== m.id))
    toast.success('Membership removed')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#0F4C81]" /> Role Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage every user's role across all businesses on the platform.
        </p>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map(r => (
          <span key={r.value} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[r.value]}`}>
            {r.label}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user or business..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0F4C81]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] bg-white text-gray-700"
        >
          <option value="all">All roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} memberships</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide bg-gray-50">
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Business</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Since</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/users/${m.user_id}`} className="hover:text-[#0F4C81]">
                    <p className="font-medium text-gray-900">{m.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{m.profiles?.email}</p>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  {m.businesses ? (
                    <Link href={`/admin/businesses/${m.businesses.id}`} className="hover:text-[#0F4C81]">
                      <p className="font-medium text-gray-900">{m.businesses.name}</p>
                      <p className="text-xs text-gray-400">{m.businesses.slug}</p>
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-500'}`}
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
                    onClick={() => removeMember(m)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No memberships found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
