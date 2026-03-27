'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Building2, Search, Download } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  plan: string | null
  currency: string | null
  country: string | null
  created_at: string
  email: string | null
  suspended_at: string | null
  member_count: number
  invoice_count: number
  volume: number
}

export function AdminBusinessesClient({ businesses }: { businesses: Business[] }) {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')

  const filtered = businesses.filter(b => {
    const matchSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()) ||
      b.email?.toLowerCase().includes(search.toLowerCase())
    const matchPlan = planFilter === 'all' || b.plan === planFilter
    return matchSearch && matchPlan
  })

  function exportCSV() {
    const rows = [
      ['Name', 'Slug', 'Plan', 'Country', 'Email', 'Members', 'Invoices', 'Volume', 'Joined', 'Suspended'],
      ...filtered.map(b => [
        b.name, b.slug, b.plan ?? 'free', b.country ?? '', b.email ?? '',
        b.member_count, b.invoice_count, b.volume.toFixed(2),
        new Date(b.created_at).toLocaleDateString(),
        b.suspended_at ? 'Yes' : 'No',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'businesses.csv'; a.click()
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-500',
    pro: 'bg-[#F5A623]/15 text-[#e09520]',
    enterprise: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#0F4C81]" /> Businesses
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} of {businesses.length} businesses</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, slug or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0F4C81] focus:ring-1 focus:ring-[#0F4C81]/20"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F4C81] bg-white text-gray-700"
        >
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide bg-gray-50">
              <th className="text-left px-5 py-3">Business</th>
              <th className="text-left px-5 py-3">Plan</th>
              <th className="text-left px-5 py-3">Country</th>
              <th className="text-right px-5 py-3">Members</th>
              <th className="text-right px-5 py-3">Invoices</th>
              <th className="text-right px-5 py-3">Volume</th>
              <th className="text-left px-5 py-3">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(biz => (
              <tr key={biz.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/businesses/${biz.id}`} className="hover:text-[#0F4C81]">
                    <p className="font-medium text-gray-900">{biz.name}</p>
                    <p className="text-gray-400 text-xs">{biz.slug}</p>
                  </Link>
                  {biz.suspended_at && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">SUSPENDED</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${planColors[biz.plan ?? 'free'] ?? planColors.free}`}>
                    {biz.plan ?? 'free'}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{biz.country ?? '—'}</td>
                <td className="px-5 py-3 text-right text-gray-600">{biz.member_count}</td>
                <td className="px-5 py-3 text-right text-gray-600">{biz.invoice_count}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  {biz.volume > 0 ? formatCurrency(biz.volume, biz.currency ?? 'USD') : '—'}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(biz.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/businesses/${biz.id}`}
                      className="text-xs text-[#0F4C81] hover:underline font-medium"
                    >
                      Manage
                    </Link>
                    <a
                      href={`/app/${biz.slug}`}
                      target="_blank"
                      className="text-gray-300 hover:text-gray-500"
                      title="Open in app"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">No businesses found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
