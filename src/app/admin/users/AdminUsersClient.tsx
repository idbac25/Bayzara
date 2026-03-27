'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Shield, ShieldOff, Search, Download, Users } from 'lucide-react'

interface User {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  is_platform_admin: boolean | null
  created_at: string
}

interface Props {
  users: User[]
  bizByUser: Record<string, Array<{ name: string; slug: string; role: string }>>
}

export default function AdminUsersClient({ users: initial, bizByUser }: Props) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAdmin = async (user: User) => {
    const supabase = createClient()
    const newVal = !user.is_platform_admin
    const { error } = await supabase
      .from('profiles')
      .update({ is_platform_admin: newVal })
      .eq('id', user.id)
    if (error) { toast.error(error.message); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_platform_admin: newVal } : u))
    toast.success(newVal ? 'Platform admin granted' : 'Platform admin revoked')
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Phone', 'Businesses', 'Platform Admin', 'Joined'],
      ...filtered.map(u => [
        u.full_name ?? '', u.email ?? '', u.phone ?? '',
        (bizByUser[u.id] ?? []).map(b => b.name).join('; '),
        u.is_platform_admin ? 'Yes' : 'No',
        new Date(u.created_at).toLocaleDateString(),
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[#27AE60]" /> Users
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} of {users.length} users</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81]/20"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide bg-gray-50">
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Businesses</th>
              <th className="text-left px-5 py-3">Phone</th>
              <th className="text-left px-5 py-3">Joined</th>
              <th className="text-center px-5 py-3">Platform Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/users/${user.id}`} className="hover:text-[#0F4C81]">
                    <p className="font-medium text-gray-900">{user.full_name ?? '—'}</p>
                    <p className="text-gray-400 text-xs">{user.email}</p>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(bizByUser[user.id] ?? []).map(b => (
                      <a
                        key={b.slug}
                        href={`/app/${b.slug}`}
                        target="_blank"
                        className="text-xs px-2 py-0.5 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] hover:bg-[#0F4C81]/20"
                      >
                        {b.name}
                      </a>
                    ))}
                    {(bizByUser[user.id] ?? []).length === 0 && (
                      <span className="text-xs text-gray-300">No business</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{user.phone ?? '—'}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => toggleAdmin(user)}
                    title={user.is_platform_admin ? 'Revoke admin' : 'Grant admin'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.is_platform_admin
                        ? 'bg-[#F5A623]/15 text-[#e09520] hover:bg-red-100 hover:text-red-500'
                        : 'bg-gray-100 text-gray-400 hover:bg-[#F5A623]/15 hover:text-[#e09520]'
                    }`}
                  >
                    {user.is_platform_admin ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
