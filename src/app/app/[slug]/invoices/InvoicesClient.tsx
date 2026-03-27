'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'
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
  Receipt, Plus, MoreHorizontal, Eye, Pencil, Trash2,
  Copy, CreditCard, Download, TrendingUp, CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface InvoiceRow {
  id: string
  document_number: string
  date: string
  due_date: string | null
  total: number
  amount_paid: number
  amount_due: number
  status: string
  is_recurring: boolean
  deleted_at: string | null
  created_at: string
  clients: Array<{ id: string; name: string }> | null
}

interface InvoicesClientProps {
  invoices: InvoiceRow[]
  currency: string
  businessId: string
  slug: string
}

export function InvoicesClient({ invoices: initial, currency, businessId, slug }: InvoicesClientProps) {
  const { business } = useBusiness()
  const router = useRouter()
  const [invoices, setInvoices] = useState(initial)
  const [tab, setTab] = useState<'all' | 'recurring' | 'deleted'>('all')
  const [deleteDialog, setDeleteDialog] = useState<InvoiceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = invoices.filter(inv => {
    if (tab === 'deleted') return !!inv.deleted_at
    if (tab === 'recurring') return inv.is_recurring && !inv.deleted_at
    return !inv.deleted_at
  })

  // Summary stats
  const activeInvoices = invoices.filter(i => !i.deleted_at)
  const stats = {
    total: activeInvoices.reduce((s, i) => s + i.total, 0),
    paid: activeInvoices.reduce((s, i) => s + i.amount_paid, 0),
    outstanding: activeInvoices.reduce((s, i) => s + i.amount_due, 0),
    overdue: activeInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount_due, 0),
  }

  const handleSoftDelete = async (inv: InvoiceRow) => {
    setDeleting(true)
    try {
      await api.invoices.delete(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, deleted_at: new Date().toISOString() } : i))
      setDeleteDialog(null)
      toast.success('Invoice moved to trash')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete invoice')
    }
    setDeleting(false)
  }

  const handleDuplicate = async (inv: InvoiceRow) => {
    try {
      const { invoice: original, payments: _ } = await api.invoices.get(inv.id)
      const lineItems = (original.line_items ?? []).map((li, i) => ({
        name: li.name,
        description: li.description ?? null,
        sku: li.sku ?? null,
        quantity: li.quantity,
        rate: li.rate,
        unit: li.unit,
        tax_rate: li.tax_rate,
        discount_percentage: li.discount_percentage,
        sort_order: li.sort_order ?? i,
      }))

      const newDoc = await api.invoices.create(slug, {
        client_id: original.client_id,
        title: original.title,
        date: new Date().toISOString().split('T')[0],
        due_date: null,
        currency: original.currency,
        notes: original.notes,
        terms: original.terms,
        bank_details: original.bank_details as Record<string, unknown> | null,
        discount_type: original.discount_type as 'percent' | 'fixed',
        discount_value: original.discount_value,
        additional_charges: original.additional_charges,
        line_items: lineItems,
      })

      toast.success('Invoice duplicated')
      router.push(`/app/${slug}/invoices/${newDoc.id}/edit`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate invoice')
    }
  }

  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-sm">{formatDate(String(getValue()))}</span>,
    },
    {
      accessorKey: 'document_number',
      header: 'Invoice #',
      cell: ({ row }) => (
        <Link href={`/app/${slug}/invoices/${row.original.id}`} className="font-medium text-[#0F4C81] hover:underline">
          {row.original.document_number}
        </Link>
      ),
    },
    {
      accessorKey: 'clients',
      header: 'Client',
      cell: ({ getValue }) => {
        const c = getValue() as Array<{ name: string }> | null
        const name = Array.isArray(c) ? c[0]?.name : null
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
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ getValue }) => {
        const v = getValue()
        return v ? <span className="text-sm text-muted-foreground">{formatDate(String(v))}</span> : <span className="text-muted-foreground">—</span>
      },
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
              <Link href={`/app/${slug}/invoices/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />Open
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/${slug}/invoices/${row.original.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
              <Copy className="mr-2 h-4 w-4" />Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/api/pdf/invoice/${row.original.id}`} target="_blank">
                <Download className="mr-2 h-4 w-4" />Download PDF
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
        title="Invoices"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Invoices' }]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href={`/app/${slug}/invoices/new`}>
              <Plus className="mr-2 h-4 w-4" />Create Invoice
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-[#0F4C81]" />
              <span className="text-xs text-muted-foreground">Total</span>
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
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-[#E74C3C]" />
              <span className="text-xs text-muted-foreground">Overdue</span>
            </div>
            <p className="font-bold text-[#E74C3C]">{formatCurrency(stats.overdue, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({invoices.filter(i => !i.deleted_at).length})</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create your first invoice to get paid faster."
          actionLabel="Create Invoice"
          actionHref={`/app/${slug}/invoices/new`}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search invoices..."
        />
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete invoice ${deleteDialog?.document_number}?`}
        description="This will move the invoice to the trash. You can restore it from the Deleted tab."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deleteDialog && handleSoftDelete(deleteDialog)}
      />
    </div>
  )
}
