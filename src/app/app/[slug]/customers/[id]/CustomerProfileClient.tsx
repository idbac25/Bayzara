'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, Phone, Plus, Trash2, ShoppingBag,
  TrendingUp, Calendar, Clock, User, AlertCircle,
} from 'lucide-react'

interface AltPhone {
  id: string
  phone: string
  label: string | null
  added_at: string
}

interface Purchase {
  id: string
  document_number: string
  date: string
  total: number
  payment_method: string | null
  evc_sender_phone: string | null
  status: string
}

interface Customer {
  id: string
  name: string
  primary_phone: string
  notes: string | null
  total_spent: number
  visit_count: number
  first_seen_at: string
  last_seen_at: string
}

interface Business {
  id: string
  slug: string
  currency: string
}

interface Props {
  business: Business
  customer: Customer
  altPhones: AltPhone[]
  purchases: Purchase[]
}

function daysBetween(a: string, b: string) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function CustomerProfileClient({ business, customer, altPhones: initialPhones, purchases }: Props) {
  const [phones, setPhones]           = useState<AltPhone[]>(initialPhones)
  const [addingPhone, setAddingPhone] = useState(false)
  const [newPhone, setNewPhone]       = useState('')
  const [newLabel, setNewLabel]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [conflictMsg, setConflictMsg] = useState<string | null>(null)

  const avgSpend = customer.visit_count > 0
    ? customer.total_spent / customer.visit_count
    : 0

  const daysSinceLast = customer.last_seen_at
    ? daysBetween(customer.last_seen_at, new Date().toISOString())
    : null

  const avgDaysBetweenVisits = customer.visit_count > 1
    ? daysBetween(customer.first_seen_at, customer.last_seen_at) / (customer.visit_count - 1)
    : null

  const isLikelyChurned = daysSinceLast !== null && avgDaysBetweenVisits !== null
    && daysSinceLast > avgDaysBetweenVisits * 2.5

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return
    setSaving(true)
    setConflictMsg(null)
    try {
      const res = await fetch(`/api/customers/${customer.id}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          phone: newPhone.trim(),
          label: newLabel.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.conflict) {
          setConflictMsg(data.error)
        } else {
          toast.error(data.error ?? 'Failed to add phone')
        }
        return
      }

      setPhones(prev => [...prev, data.phone])
      setNewPhone('')
      setNewLabel('')
      setAddingPhone(false)
      toast.success('Phone number added')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhone = async (phoneId: string) => {
    const res = await fetch(`/api/customers/${customer.id}/phones/${phoneId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      toast.error('Failed to remove phone')
      return
    }
    setPhones(prev => prev.filter(p => p.id !== phoneId))
    toast.success('Phone removed')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href={`/app/${business.slug}/customers`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-[#0F4C81]/10 flex items-center justify-center flex-shrink-0">
            <User className="h-7 w-7 text-[#0F4C81]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{customer.primary_phone}</span>
              <Badge variant="outline" className="text-[10px] ml-1">Primary</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Customer since {formatDate(customer.first_seen_at)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-6 pt-5 border-t">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Spent</p>
            <p className="text-lg font-bold text-[#0F4C81] mt-0.5">
              {formatCurrency(customer.total_spent, business.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Visits</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{customer.visit_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Avg / Visit</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {formatCurrency(avgSpend, business.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Last Seen</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {daysSinceLast === 0 ? 'Today' : daysSinceLast === 1 ? 'Yesterday' : `${daysSinceLast}d ago`}
            </p>
          </div>
        </div>

        {/* Churn warning */}
        {isLikelyChurned && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>
              Hasn't visited in {daysSinceLast} days — usually returns every{' '}
              {Math.round(avgDaysBetweenVisits!)} days. May be worth a follow-up.
            </span>
          </div>
        )}

        {/* Visit frequency insight */}
        {avgDaysBetweenVisits !== null && !isLikelyChurned && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Visits roughly every <strong>{Math.round(avgDaysBetweenVisits)} days</strong></span>
            <Clock className="h-3.5 w-3.5 ml-2" />
            <span>Last visit {daysSinceLast === 0 ? 'today' : `${daysSinceLast}d ago`}</span>
          </div>
        )}
      </div>

      {/* Phone numbers */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Phone Numbers</h2>
          {!addingPhone && (
            <Button size="sm" variant="outline" onClick={() => setAddingPhone(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add alternative
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {/* Primary */}
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 font-medium text-sm">{customer.primary_phone}</span>
            <Badge className="text-[10px] bg-[#0F4C81] text-white">Primary</Badge>
          </div>

          {/* Alternatives */}
          {phones.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm">{p.phone}</span>
              {p.label && (
                <Badge variant="outline" className="text-[10px]">{p.label}</Badge>
              )}
              <button
                onClick={() => handleDeletePhone(p.id)}
                className="text-muted-foreground hover:text-destructive p-1 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add form */}
          {addingPhone && (
            <div className="border rounded-lg p-3 space-y-2 bg-blue-50/30">
              {conflictMsg && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {conflictMsg}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Phone number"
                  value={newPhone}
                  onChange={e => { setNewPhone(e.target.value); setConflictMsg(null) }}
                  className="flex-1 h-8 text-sm"
                />
                <Input
                  placeholder="Label (e.g. Wife)"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => { setAddingPhone(false); setConflictMsg(null) }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddPhone} disabled={saving || !newPhone.trim()}>
                  {saving ? 'Saving...' : 'Add'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase history */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-gray-900">Purchase History</h2>
            <Badge variant="outline" className="text-xs ml-1">{purchases.length}</Badge>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No purchases recorded yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-medium text-[#0F4C81]">
                    {p.document_number}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date)}</td>
                  <td className="px-4 py-2.5">
                    {p.payment_method === 'evc' ? (
                      <Badge className="text-[10px] bg-[#F5A623] text-black">EVC Plus</Badge>
                    ) : p.payment_method === 'cash' ? (
                      <Badge variant="outline" className="text-[10px]">Cash</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{p.payment_method ?? '—'}</Badge>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold">
                    <div className="flex items-center justify-end gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      {formatCurrency(p.total, business.currency)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={3} className="px-5 py-2.5 text-sm font-semibold text-muted-foreground">
                  Total ({purchases.length} sales)
                </td>
                <td className="px-5 py-2.5 text-right font-bold text-[#0F4C81]">
                  {formatCurrency(customer.total_spent, business.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
