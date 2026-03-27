'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Settings, Shield, UserPlus, Trash2 } from 'lucide-react'

interface Admin {
  id: string; full_name: string | null; email: string | null; created_at: string
}

export function SettingsClient({ admins: initial }: { admins: Admin[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [admins, setAdmins] = useState(initial)
  const [email, setEmail] = useState('')
  const [promoting, setPromoting] = useState(false)

  async function promoteByEmail() {
    if (!email.trim()) { toast.error('Enter an email'); return }
    setPromoting(true)
    // Look up user by email in profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !profile) {
      toast.error('No user found with that email')
      setPromoting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_platform_admin: true })
      .eq('id', profile.id)

    if (updateError) { toast.error(updateError.message); setPromoting(false); return }
    setAdmins(prev => [...prev, profile])
    setEmail('')
    toast.success(`${profile.full_name ?? profile.email} is now a platform admin`)
    setPromoting(false)
  }

  async function revokeAdmin(adminId: string) {
    if (admins.length <= 1) { toast.error('Cannot remove the last platform admin'); return }
    if (!confirm('Revoke platform admin for this user?')) return
    const { error } = await supabase.from('profiles').update({ is_platform_admin: false }).eq('id', adminId)
    if (error) { toast.error(error.message); return }
    setAdmins(prev => prev.filter(a => a.id !== adminId))
    toast.success('Admin access revoked')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#0F4C81]" /> Platform Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage platform administrators and global settings</p>
      </div>

      {/* Platform Admins */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#0F4C81]" />
          <h3 className="font-semibold text-gray-900">Platform Administrators</h3>
          <span className="ml-auto text-xs text-gray-400">{admins.length} admin{admins.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-gray-50">
          {admins.map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-gray-900 text-sm">{a.full_name ?? '—'}</p>
                <p className="text-xs text-gray-400">{a.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Since {new Date(a.created_at).toLocaleDateString()}</span>
                <button
                  onClick={() => revokeAdmin(a.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  title="Revoke admin"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add admin by email */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Promote user to admin</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && promoteByEmail()}
              placeholder="user@example.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] bg-white"
            />
            <button
              onClick={promoteByEmail}
              disabled={promoting}
              className="flex items-center gap-1.5 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {promoting ? 'Finding...' : 'Promote'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">The user must already have an account on Bayzara</p>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Platform Info</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Platform', value: 'Bayzara' },
            { label: 'Region', value: 'Somalia' },
            { label: 'Currency', value: 'USD (default)' },
            { label: 'Admin URL', value: typeof window !== 'undefined' ? window.location.origin + '/admin' : '/admin' },
          ].map(f => (
            <div key={f.label} className="flex justify-between">
              <span className="text-gray-400">{f.label}</span>
              <span className="font-medium text-gray-900">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
