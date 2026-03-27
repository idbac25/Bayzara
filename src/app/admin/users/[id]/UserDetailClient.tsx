'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, User, Shield, ShieldOff, Building2, ExternalLink, Trash2, Mail } from 'lucide-react'

interface Profile {
  id: string; full_name: string | null; email: string | null; phone: string | null
  is_platform_admin: boolean | null; created_at: string; updated_at: string
}

interface Membership {
  id: string; role: string; created_at: string
  businesses: { id: string; name: string; slug: string; plan: string | null; country: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Owner', admin: 'Admin', manager: 'Manager',
  accountant: 'Accountant', employee: 'Employee', viewer: 'Viewer',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-[#0F4C81]/10 text-[#0F4C81]',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-purple-100 text-purple-700',
  accountant: 'bg-green-100 text-green-700',
  employee: 'bg-gray-100 text-gray-600',
  viewer: 'bg-gray-100 text-gray-500',
}

export function UserDetailClient({ profile, memberships }: { profile: Profile; memberships: Membership[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(!!profile.is_platform_admin)
  const [togglingAdmin, setTogglingAdmin] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function togglePlatformAdmin() {
    setTogglingAdmin(true)
    const newVal = !isAdmin
    const { error } = await supabase.from('profiles').update({ is_platform_admin: newVal }).eq('id', profile.id)
    if (error) { toast.error(error.message); setTogglingAdmin(false); return }
    setIsAdmin(newVal)
    toast.success(newVal ? 'Platform admin granted' : 'Platform admin revoked')
    setTogglingAdmin(false)
  }

  async function sendPasswordReset() {
    if (!profile.email) { toast.error('No email on file'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Password reset email sent')
  }

  async function deleteUser() {
    if (!confirm(`Permanently delete ${profile.full_name ?? profile.email}? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id }),
    })
    if (!res.ok) { toast.error('Failed to delete user'); setDeleting(false); return }
    toast.success('User deleted')
    router.push('/admin/users')
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-500',
    pro: 'bg-[#F5A623]/15 text-[#e09520]',
    enterprise: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/users" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Users
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#0F4C81]/10 flex items-center justify-center">
              <User className="h-6 w-6 text-[#0F4C81]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name ?? 'No name'}</h1>
              <p className="text-gray-400 text-sm">{profile.email}</p>
            </div>
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5A623]/15 text-[#e09520] font-medium flex items-center gap-1">
                <Shield className="h-3 w-3" /> Platform Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={sendPasswordReset}
              className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <Mail className="h-3.5 w-3.5" /> Reset Password
            </button>
            <button
              onClick={togglePlatformAdmin}
              disabled={togglingAdmin}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                isAdmin
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-[#F5A623]/15 text-[#e09520] hover:bg-[#F5A623]/25'
              }`}
            >
              {isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {isAdmin ? 'Revoke Admin' : 'Grant Admin'}
            </button>
            <button
              onClick={deleteUser}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Profile</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          {[
            { label: 'Full Name', value: profile.full_name },
            { label: 'Email', value: profile.email },
            { label: 'Phone', value: profile.phone },
            { label: 'Joined', value: new Date(profile.created_at).toLocaleDateString() },
            { label: 'Last Updated', value: new Date(profile.updated_at).toLocaleDateString() },
            { label: 'User ID', value: profile.id.slice(0, 8) + '…' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
              <p className="font-medium text-gray-900">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Business Memberships */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[#0F4C81]" />
          <h3 className="font-semibold text-gray-900">Business Memberships ({memberships.length})</h3>
        </div>
        {memberships.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400">Not a member of any business</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {memberships.map(m => {
              const biz = m.businesses
              if (!biz) return null
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{biz.name}</p>
                    <p className="text-xs text-gray-400">{biz.slug} · {biz.country ?? 'Somalia'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planColors[biz.plan ?? 'free'] ?? 'bg-gray-100 text-gray-500'}`}>
                      {biz.plan ?? 'free'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                    <Link
                      href={`/admin/businesses/${biz.id}`}
                      className="text-gray-300 hover:text-[#0F4C81] transition-colors"
                      title="Manage business"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
