'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Phone, TrendingUp, Clock } from 'lucide-react'

interface Customer {
  id: string
  name: string
  primary_phone: string
  total_spent: number
  visit_count: number
  last_seen_at: string
  first_seen_at: string
}

interface Business {
  id: string
  slug: string
  name: string
  currency: string
}

interface Props {
  business: Business
  customers: Customer[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function CustomersClient({ business, customers }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.primary_phone.includes(q)
    )
  }, [customers, search])

  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0)
  const avgSpend = customers.length
    ? customers.reduce((s, c) => s + (c.total_spent / Math.max(c.visit_count, 1)), 0) / customers.length
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Retail customer profiles built automatically from EVC payments
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Total Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-[#0F4C81]">
            {formatCurrency(totalRevenue, business.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Avg per Visit</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(avgSpend, business.currency)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customer list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border py-16 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">
            {customers.length === 0
              ? 'Customers will appear here automatically after the first EVC payment is matched'
              : 'No customers match your search'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Visits</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Spent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg/Visit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/${business.slug}/customers/${customer.id}`}
                      className="font-medium text-gray-900 hover:text-[#0F4C81] hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.primary_phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="outline" className="font-semibold">
                      {customer.visit_count}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0F4C81]">
                    {formatCurrency(customer.total_spent, business.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatCurrency(
                      customer.total_spent / Math.max(customer.visit_count, 1),
                      business.currency
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {timeAgo(customer.last_seen_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
