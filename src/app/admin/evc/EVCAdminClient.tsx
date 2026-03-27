'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Zap, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Connection {
  id: string; merchant_name: string; merchant_phone: string | null
  merchant_number: string | null; is_active: boolean; status: string | null
  current_balance: number | null; last_synced_at: string | null
  created_at: string; business_id: string
  businesses: { name: string; slug: string } | null
}

export function EVCAdminClient({ connections: initial }: { connections: Connection[] }) {
  const supabase = createClient()
  const [connections, setConnections] = useState(initial)

  async function toggleActive(conn: Connection) {
    const newVal = !conn.is_active
    const newStatus = newVal ? 'active' : 'disconnected'
    const { error } = await supabase
      .from('evc_connections')
      .update({ is_active: newVal, status: newStatus })
      .eq('id', conn.id)
    if (error) { toast.error(error.message); return }
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, is_active: newVal, status: newStatus } : c))
    toast.success(newVal ? 'Connection activated' : 'Connection deactivated')
  }

  const totalBalance = connections.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  const activeCount = connections.filter(c => c.is_active).length

  const statusIcon = (c: Connection) => {
    if (c.is_active) return <CheckCircle className="h-4 w-4 text-[#27AE60]" />
    if (c.status === 'error') return <XCircle className="h-4 w-4 text-red-400" />
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-6 w-6 text-[#F5A623]" /> EVC Plus Connections
        </h1>
        <p className="text-gray-500 text-sm mt-1">All Hormud EVC merchant accounts across the platform</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Connections', value: connections.length, color: '#0F4C81' },
          { label: 'Active',            value: activeCount,         color: '#27AE60' },
          { label: 'Total Balance',     value: formatCurrency(totalBalance, 'USD'), color: '#F5A623' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide bg-gray-50">
              <th className="text-left px-5 py-3">Merchant</th>
              <th className="text-left px-5 py-3">Business</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Balance</th>
              <th className="text-left px-5 py-3">Last Sync</th>
              <th className="text-left px-5 py-3">Connected</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {connections.map(conn => (
              <tr key={conn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-[#F5A623] shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{conn.merchant_name}</p>
                      {conn.merchant_phone && <p className="text-xs text-gray-400">{conn.merchant_phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {conn.businesses ? (
                    <Link href={`/admin/businesses/${conn.business_id}`} className="hover:text-[#0F4C81]">
                      <p className="font-medium text-gray-900">{conn.businesses.name}</p>
                      <p className="text-xs text-gray-400">{conn.businesses.slug}</p>
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(conn)}
                    <span className={`text-xs font-medium capitalize ${
                      conn.is_active ? 'text-[#27AE60]' :
                      conn.status === 'error' ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {conn.is_active ? 'Active' : conn.status ?? 'Pending'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {conn.current_balance != null ? formatCurrency(conn.current_balance, 'USD') : '—'}
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {new Date(conn.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggleActive(conn)}
                    className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                      conn.is_active
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {conn.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {connections.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No EVC connections yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
