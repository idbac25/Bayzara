'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ShoppingCart, Plus, MoreHorizontal, Eye, Pencil, Trash2,
  TrendingDown, CheckCircle, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface PurchaseRow {
  id: string
  document_number: string
  date: string
  due_date: string | null
  total: number
  amount_paid: number
  amount_due: number
  status: string
  type: string
  deleted_at: string | null
  created_at: string
  vendors: Array<{ id: string; name: string }> | null
}

interface PurchasesClientProps {
  purchases: PurchaseRow[]
  currency: string
  businessId: string
  slug: string
}

export function PurchasesClient({ purchases: initial, currency, businessId, slug }: PurchasesClientProps) {
  const { business } = useBusiness()
  const [purchases, setPurchases] = useState(initial)
  const [tab, setTab] = useState<'all' | 'purchase_order' | 'expense' | 'deleted'>('all')
  const [deleteDialog, setDeleteDialog] = useState<PurchaseRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = purchases.filter(p => {
    if (tab === 'deleted') return !!p.deleted_at
    if (tab === 'all') return !p.deleted_at
    return p.type === tab && !p.deleted_at
  })

  const active = purchases.filter(p => !p.deleted_at)
  const stats = {
    total: active.reduce((s, p) => s + p.total, 0),
    paid: active.reduce((s, p) => s + p.amount_paid, 0),
    outstanding: active.reduce((s, p) => s + p.amount_due, 0),
  }

  const handleSoftDelete = async (p: PurchaseRow) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', p.id)

    if (error) { toast.error(error.message); setDeleting(false); return }
    setPurchases(prev => prev.map(i => i.id === p.id ? { ...i, deleted_at: new Date().toISOString() } : i))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Purchase moved to trash')
  }

  const TYPE_LABELS: Record<string, string> = {
    purchase: 'Bill',
    expense: 'Expense',
    purchase_order: 'PO',
  }

  const columns: ColumnDef<PurchaseRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-sm">{formatDate(String(getValue()))}</span>,
    },
    {
      accessorKey: 'document_number',
      header: 'Number',
      cell: ({ row }) => (
        <Link href={`/app/${slug}/purchases/${row.original.id}`} className="font-medium text-[#0F4C81] hover:underline">
          {row.original.document_number}
        </Link>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
          {TYPE_LABELS[String(getValue())] ?? String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'vendors',
      header: 'Vendor',
      cell: ({ getValue }) => {
        const v = getValue() as Array<{ name: string }> | null
        const name = Array.isArray(v) ? v[0]?.name : null
        return <span className="text-sm">{name ?? <span className="text-muted-foreground">—</span>}</span>
      },
    },
    {
      accessorKey: 'total',
      header: 'Amount',
      cell: ({ getValue }) => <span className="font-medium">{formatCurrency(Number(getValue()), currency)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/app/${slug}/purchases/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />Open
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/${slug}/purchases/${row.original.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialog(row.original)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Purchases"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Purchases' }]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href={`/app/${slug}/purchases/new`}>
              <Plus className="mr-2 h-4 w-4" />Record Purchase
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-[#0F4C81]" />
              <span className="text-xs text-muted-foreground">Total Purchases</span>
            </div>
            <p className="font-bold">{formatCurrency(stats.total, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-[#27AE60]" />
              <span className="text-xs text-muted-foreground">Paid</span>
            </div>
            <p className="font-bold text-[#27AE60]">{formatCurrency(stats.paid, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Outstanding</span>
            </div>
            <p className="font-bold text-amber-600">{formatCurrency(stats.outstanding, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({active.length})</TabsTrigger>
          <TabsTrigger value="purchase_order">Orders</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchases yet"
          description="Record bills, expenses, and purchase orders."
          actionLabel="Record Purchase"
          actionHref={`/app/${slug}/purchases/new`}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search purchases..."
        />
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.document_number}?`}
        description="This will move the purchase to the trash."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deleteDialog && handleSoftDelete(deleteDialog)}
      />
    </div>
  )
}
