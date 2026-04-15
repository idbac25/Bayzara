'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus, Package, TrendingDown, AlertCircle, CheckCircle2,
  Clock, ChevronRight, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestockRow {
  id: string
  date: string
  due_date: string | null
  quantity: number
  cost_per_unit: number
  total_cost: number
  payment_method: string
  status: string
  notes: string | null
  inventory_items: { name: string; unit: string } | null
  vendors: { name: string } | null
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  restocks: RestockRow[]
}

type Filter = 'all' | 'unpaid' | 'overdue' | 'paid'

export function RestocksClient({ business, restocks: initial }: Props) {
  const router = useRouter()
  const [restocks, setRestocks] = useState(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const cur = business.currency
  const today = new Date().toISOString().split('T')[0]

  const totalOwed = restocks
    .filter(r => r.status === 'unpaid')
    .reduce((s, r) => s + r.total_cost, 0)

  const overdueCount = restocks.filter(
    r => r.status === 'unpaid' && r.due_date && r.due_date < today
  ).length

  const filtered = restocks.filter(r => {
    if (filter === 'paid') return r.status === 'paid'
    if (filter === 'unpaid') return r.status === 'unpaid'
    if (filter === 'overdue') return r.status === 'unpaid' && r.due_date && r.due_date < today
    return true
  })

  const handleMarkPaid = async (r: RestockRow) => {
    setPayingId(r.id)
    try {
      const res = await fetch(`/api/restocks/${r.id}/pay`, { method: 'PATCH' })
      if (!res.ok) { toast.error('Failed to mark as paid'); return }
      setRestocks(prev => prev.map(x => x.id === r.id ? { ...x, status: 'paid' } : x))
      toast.success('Marked as paid')
      startTransition(() => router.refresh())
    } finally {
      setPayingId(null)
    }
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unpaid', label: 'Unpaid' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'paid', label: 'Paid' },
  ]

  return (
    <div>
      <PageHeader
        title="Restocks"
        description="Stock received from suppliers"
        breadcrumbs={[{ label: business.name, href: `/app/${business.slug}` }, { label: 'Restocks' }]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3d6b]">
            <Link href={`/app/${business.slug}/restocks/new`}>
              <Plus className="h-4 w-4 mr-1.5" />Restock
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-[#0F4C81]" />
              <span className="text-xs text-muted-foreground">Total Restocked</span>
            </div>
            <p className="font-bold text-base">
              {formatCurrency(restocks.reduce((s, r) => s + r.total_cost, 0), cur)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Owed to Suppliers</span>
            </div>
            <p className={cn('font-bold text-base', totalOwed > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
              {formatCurrency(totalOwed, cur)}
            </p>
          </CardContent>
        </Card>
        {overdueCount > 0 && (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Overdue</span>
              </div>
              <p className="font-bold text-base text-red-600">{overdueCount} payment{overdueCount !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f.id
                ? 'bg-[#0F4C81] text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No restocks yet</p>
          <p className="text-sm mt-1">Record stock received from your suppliers</p>
          <Button asChild className="mt-4 bg-[#0F4C81] hover:bg-[#0d3d6b]">
            <Link href={`/app/${business.slug}/restocks/new`}>
              <Plus className="h-4 w-4 mr-1.5" />Record First Restock
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const isOverdue = r.status === 'unpaid' && r.due_date && r.due_date < today
            return (
              <div
                key={r.id}
                className={cn(
                  'bg-white rounded-xl border p-4 shadow-sm',
                  isOverdue && 'border-red-200 bg-red-50/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{r.inventory_items?.name ?? '—'}</p>
                      <Badge
                        className={cn(
                          'text-[10px] border-0 shrink-0',
                          r.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : isOverdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {r.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.quantity} {r.inventory_items?.unit ?? 'units'}
                      {r.vendors ? ` · ${r.vendors.name}` : ''}
                      {' · '}
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {r.status === 'unpaid' && r.due_date && (
                      <p className={cn('text-xs mt-1', isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                        {isOverdue ? 'Overdue · ' : 'Due '}
                        {new Date(r.due_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {r.notes && <p className="text-xs text-muted-foreground italic mt-1 truncate">{r.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(r.total_cost, cur)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(r.cost_per_unit, cur)}/{r.inventory_items?.unit ?? 'unit'}</p>
                  </div>
                </div>

                {r.status === 'unpaid' && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {r.payment_method === 'credit' ? 'Bought on credit' : 'Cash purchase'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => handleMarkPaid(r)}
                      disabled={payingId === r.id}
                    >
                      {payingId === r.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><CheckCircle2 className="h-3 w-3 mr-1" />Mark Paid</>
                      }
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
