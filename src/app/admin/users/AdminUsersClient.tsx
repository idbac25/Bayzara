'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Shield, ShieldOff } from 'lucide-react'

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

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm outline-none focus:border-white/40"
      />

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Businesses</th>
              <th className="text-left px-5 py-3">Phone</th>
              <th className="text-left px-5 py-3">Joined</th>
              <th className="text-center px-5 py-3">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium">{user.full_name ?? '—'}</p>
                  <p className="text-white/40 text-xs">{user.email}</p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(bizByUser[user.id] ?? []).map(b => (
                      <a
                        key={b.slug}
                        href={`/app/${b.slug}`}
                        target="_blank"
                        className="text-xs px-2 py-0.5 rounded-full bg-[#0F4C81]/30 text-blue-300 hover:bg-[#0F4C81]/50"
                      >
                        {b.name}
                      </a>
                    ))}
                    {(bizByUser[user.id] ?? []).length === 0 && (
                      <span className="text-xs text-white/30">No business</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-white/60 text-xs">{user.phone ?? '—'}</td>
                <td className="px-5 py-3 text-white/40 text-xs">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => toggleAdmin(user)}
                    title={user.is_platform_admin ? 'Revoke admin' : 'Grant admin'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.is_platform_admin
                        ? 'bg-[#F5A623]/20 text-[#F5A623] hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-white/10 text-white/30 hover:bg-[#F5A623]/20 hover:text-[#F5A623]'
                    }`}
                  >
                    {user.is_platform_admin ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-white/30">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
