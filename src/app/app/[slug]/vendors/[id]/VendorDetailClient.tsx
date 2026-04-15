'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Store, Phone, MapPin, Zap, Plus, TrendingDown, AlertCircle,
  CheckCircle2, Clock, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vendor {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  evc_phone: string | null
  city: string | null
  country: string | null
  notes: string | null
}

interface RestockRow {
  id: string
  date: string
  due_date: string | null
  quantity: number
  cost_per_unit: number
  total_cost: number
  payment_method: string
  status: string
  inventory_items: { name: string; unit: string } | null
}

interface Props {
  vendor: Vendor
  restocks: RestockRow[]
  currency: string
  totalRestocked: number
  totalOwed: number
  slug: string
}

export function VendorDetailClient({ vendor, restocks: initial, currency, totalRestocked, totalOwed, slug }: Props) {
  const router = useRouter()
  const [restocks, setRestocks] = useState(initial)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  const handleMarkPaid = async (id: string) => {
    setPayingId(id)
    try {
      const res = await fetch(`/api/restocks/${id}/pay`, { method: 'PATCH' })
      if (!res.ok) { toast.error('Failed to mark as paid'); return }
      setRestocks(prev => prev.map(r => r.id === id ? { ...r, status: 'paid' } : r))
      toast.success('Marked as paid')
      startTransition(() => router.refresh())
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={vendor.name}
        breadcrumbs={[
          { label: 'Suppliers', href: `/app/${slug}/vendors` },
          { label: vendor.name },
        ]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href={`/app/${slug}/restocks/new`}>
              <Plus className="mr-2 h-4 w-4" />Restock
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Supplier info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Store className="h-4 w-4" />Supplier Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {vendor.contact_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{vendor.contact_name}</p>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${vendor.phone}`} className="text-[#0F4C81] hover:underline">{vendor.phone}</a>
                </div>
              )}
              {vendor.evc_phone && (
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">EVC Phone</p>
                    <a href={`tel:${vendor.evc_phone}`} className="text-blue-600 hover:underline">{vendor.evc_phone}</a>
                  </div>
                </div>
              )}
              {(vendor.city || vendor.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    {[vendor.city, vendor.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {vendor.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{vendor.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-[#0F4C81]" />
                  <span className="text-xs text-muted-foreground">Total Bought</span>
                </div>
                <p className="font-bold text-sm">{formatCurrency(totalRestocked, currency)}</p>
              </CardContent>
            </Card>
            <Card className={cn(totalOwed > 0 && 'border-amber-200')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className={cn('h-3.5 w-3.5', totalOwed > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                  <span className="text-xs text-muted-foreground">Owed</span>
                </div>
                <p className={cn('font-bold text-sm', totalOwed > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {formatCurrency(totalOwed, currency)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Restock history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Restock History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {restocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No restocks from this supplier yet</p>
                  <Button asChild variant="outline" className="mt-3" size="sm">
                    <Link href={`/app/${slug}/restocks/new`}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Record First Restock
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {restocks.map(r => {
                    const isOverdue = r.status === 'unpaid' && r.due_date && r.due_date < today
                    return (
                      <div key={r.id} className={cn('px-4 py-3', isOverdue && 'bg-red-50/40')}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{r.inventory_items?.name ?? '—'}</p>
                              <Badge className={cn(
                                'text-[10px] border-0 shrink-0',
                                r.status === 'paid' ? 'bg-green-100 text-green-700'
                                  : isOverdue ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              )}>
                                {r.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {r.quantity} {r.inventory_items?.unit ?? 'units'} ·{' '}
                              {new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {r.status === 'unpaid' && r.due_date && (
                              <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                                {isOverdue ? 'Overdue · ' : 'Due '}
                                {new Date(r.due_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatCurrency(r.total_cost, currency)}</p>
                            {r.status === 'unpaid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] mt-1 border-green-300 text-green-700 hover:bg-green-50 px-2"
                                onClick={() => handleMarkPaid(r.id)}
                                disabled={payingId === r.id}
                              >
                                {payingId === r.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><CheckCircle2 className="h-3 w-3 mr-1" />Paid</>
                                }
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
