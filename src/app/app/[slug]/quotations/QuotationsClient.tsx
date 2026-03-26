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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import {
  FileText, Plus, MoreHorizontal, Eye, Pencil, Trash2,
  Copy, Receipt, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface QuotationRow {
  id: string
  document_number: string
  date: string
  due_date: string | null
  total: number
  amount_paid: number
  amount_due: number
  status: string
  deleted_at: string | null
  created_at: string
  clients: Array<{ id: string; name: string }> | null
}

interface QuotationsClientProps {
  quotations: QuotationRow[]
  currency: string
  businessId: string
  slug: string
}

export function QuotationsClient({ quotations: initial, currency, businessId, slug }: QuotationsClientProps) {
  const { business } = useBusiness()
  const router = useRouter()
  const [quotations, setQuotations] = useState(initial)
  const [tab, setTab] = useState<'all' | 'deleted'>('all')
  const [deleteDialog, setDeleteDialog] = useState<QuotationRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = quotations.filter(q => {
    if (tab === 'deleted') return !!q.deleted_at
    return !q.deleted_at
  })

  const handleSoftDelete = async (q: QuotationRow) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', q.id)

    if (error) { toast.error(error.message); setDeleting(false); return }
    setQuotations(prev => prev.map(i => i.id === q.id ? { ...i, deleted_at: new Date().toISOString() } : i))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Quotation moved to trash')
  }

  const handleConvertToInvoice = async (q: QuotationRow) => {
    const supabase = createClient()
    const { data: original } = await supabase
      .from('documents')
      .select('*, line_items(*)')
      .eq('id', q.id)
      .single()

    if (!original) return

    const { data: nextNumber } = await supabase
      .rpc('get_next_document_number', { p_business_id: businessId, p_type: 'invoice' })

    const { data: newDoc, error } = await supabase
      .from('documents')
      .insert({
        ...original,
        id: undefined,
        type: 'invoice',
        document_number: nextNumber,
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        amount_paid: 0,
        amount_due: original.total,
        pdf_url: null,
        public_token: undefined,
        created_at: undefined,
        updated_at: undefined,
      })
      .select()
      .single()

    if (error) { toast.error(error.message); return }

    if (newDoc && original.line_items) {
      await supabase.from('line_items').insert(
        original.line_items.map((li: Record<string, unknown>) => ({ ...li, id: undefined, document_id: newDoc.id }))
      )
    }

    toast.success('Converted to invoice')
    router.push(`/app/${slug}/invoices/${newDoc?.id}`)
  }

  const handleDuplicate = async (q: QuotationRow) => {
    const supabase = createClient()
    const { data: original } = await supabase
      .from('documents')
      .select('*, line_items(*)')
      .eq('id', q.id)
      .single()

    if (!original) return

    const { data: nextNumber } = await supabase
      .rpc('get_next_document_number', { p_business_id: businessId, p_type: 'quotation' })

    const { data: newDoc } = await supabase
      .from('documents')
      .insert({
        ...original,
        id: undefined,
        document_number: nextNumber,
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        pdf_url: null,
        public_token: undefined,
        created_at: undefined,
        updated_at: undefined,
        deleted_at: null,
      })
      .select()
      .single()

    if (newDoc && original.line_items) {
      await supabase.from('line_items').insert(
        original.line_items.map((li: Record<string, unknown>) => ({ ...li, id: undefined, document_id: newDoc.id }))
      )
    }

    toast.success('Quotation duplicated')
    router.push(`/app/${slug}/quotations/${newDoc?.id}/edit`)
  }

  const columns: ColumnDef<QuotationRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-sm">{formatDate(String(getValue()))}</span>,
    },
    {
      accessorKey: 'document_number',
      header: 'Quotation #',
      cell: ({ row }) => (
        <Link href={`/app/${slug}/quotations/${row.original.id}`} className="font-medium text-[#0F4C81] hover:underline">
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
      header: 'Valid Until',
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
              <Link href={`/app/${slug}/quotations/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />Open
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/${slug}/quotations/${row.original.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConvertToInvoice(row.original)}>
              <Receipt className="mr-2 h-4 w-4" />Convert to Invoice
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
        title="Quotations"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Quotations' }]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href={`/app/${slug}/quotations/new`}>
              <Plus className="mr-2 h-4 w-4" />New Quotation
            </Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({quotations.filter(q => !q.deleted_at).length})</TabsTrigger>
          <TabsTrigger value="deleted">Deleted</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations yet"
          description="Create a quotation to send to your clients."
          actionLabel="New Quotation"
          actionHref={`/app/${slug}/quotations/new`}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search quotations..."
        />
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete quotation ${deleteDialog?.document_number}?`}
        description="This will move the quotation to the trash."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deleteDialog && handleSoftDelete(deleteDialog)}
      />
    </div>
  )
}
