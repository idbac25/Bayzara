'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Megaphone, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Announcement {
  id: string; message: string; type: string; is_active: boolean; created_at: string
}

const TYPE_OPTIONS = [
  { value: 'info',    label: 'Info',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'success', label: 'Success', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'error',   label: 'Alert',   color: 'bg-red-100 text-red-700 border-red-200' },
]

export function AnnouncementsClient({ announcements: initial }: { announcements: Announcement[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState(initial)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!message.trim()) { toast.error('Message is required'); return }
    setSaving(true)
    const { data, error } = await supabase
      .from('platform_announcements')
      .insert({ message: message.trim(), type, is_active: true })
      .select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setAnnouncements(prev => [data, ...prev])
    setMessage('')
    toast.success('Announcement created and activated')
  }

  async function toggleActive(ann: Announcement) {
    // Deactivate all others if activating one
    if (!ann.is_active) {
      await supabase.from('platform_announcements').update({ is_active: false }).neq('id', ann.id)
    }
    const { error } = await supabase
      .from('platform_announcements')
      .update({ is_active: !ann.is_active })
      .eq('id', ann.id)
    if (error) { toast.error(error.message); return }
    setAnnouncements(prev => prev.map(a => ({
      ...a,
      is_active: a.id === ann.id ? !ann.is_active : ann.is_active ? a.is_active : false,
    })))
    toast.success(ann.is_active ? 'Deactivated' : 'Activated — shown to all users')
    router.refresh()
  }

  async function deleteAnn(id: string) {
    if (!confirm('Delete this announcement?')) return
    const { error } = await supabase.from('platform_announcements').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  const activeAnn = announcements.find(a => a.is_active)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-[#0F4C81]" /> Announcements
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Show a banner to all users on the platform. Only one can be active at a time.
        </p>
      </div>

      {/* Active preview */}
      {activeAnn && (
        <div className={`border rounded-xl px-4 py-3 text-sm font-medium ${
          TYPE_OPTIONS.find(t => t.value === activeAnn.type)?.color ?? 'bg-blue-100 text-blue-700 border-blue-200'
        }`}>
          <span className="font-semibold">Currently showing: </span>{activeAnn.message}
        </div>
      )}

      {/* Create form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#0F4C81]" /> New Announcement
        </h3>
        <div className="space-y-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g. Scheduled maintenance on Saturday at 2am UTC"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] resize-none"
          />
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`text-xs px-3 py-1 rounded-full font-medium border transition-all ${
                    type === t.value ? t.color : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={create}
              disabled={saving}
              className="ml-auto flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0d3f6e] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {saving ? 'Posting...' : 'Post & Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">History</h3>
        {announcements.length === 0 && (
          <p className="text-sm text-gray-400">No announcements yet</p>
        )}
        {announcements.map(ann => (
          <div key={ann.id} className={`bg-white border rounded-xl p-4 shadow-sm flex items-start justify-between gap-3 ${
            ann.is_active ? 'border-[#0F4C81]' : 'border-gray-200'
          }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                  TYPE_OPTIONS.find(t => t.value === ann.type)?.color ?? ''
                }`}>{ann.type}</span>
                {ann.is_active && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] font-semibold uppercase">Live</span>
                )}
                <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-800">{ann.message}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => toggleActive(ann)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                title={ann.is_active ? 'Deactivate' : 'Activate'}
              >
                {ann.is_active
                  ? <ToggleRight className="h-4 w-4 text-[#0F4C81]" />
                  : <ToggleLeft className="h-4 w-4" />}
              </button>
              <button
                onClick={() => deleteAnn(ann.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
