'use client'

import { useBusiness } from '@/contexts/BusinessContext'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

interface EvcTx {
  id: string
  tran_id: number
  tran_date: string
  direction: string
  amount: number
  sender_name: string | null
  sender_phone: string | null
  description: string | null
  is_recorded: boolean
  needs_review: boolean
  evc_connections: { merchant_name: string } | null
}

interface Props {
  transactions: EvcTx[]
  slug: string
}

export function EVCTransactionsClient({ transactions, slug }: Props) {
  const { business } = useBusiness()
  const [tab, setTab] = useState<'all' | 'review'>('all')

  const filtered = tab === 'review'
    ? transactions.filter(t => t.needs_review)
    : transactions

  const columns: ColumnDef<EvcTx>[] = [
    {
      accessorKey: 'tran_date',
      header: 'Date/Time',
      cell: ({ getValue }) => (
        <span className="text-sm">{new Date(String(getValue())).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      cell: ({ getValue }) => {
        const dir = String(getValue())
        return dir === 'inbound' ? (
          <span className="flex items-center gap-1 text-[#27AE60] text-sm font-medium">
            <ArrowDownLeft className="h-3.5 w-3.5" />Inbound
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[#E74C3C] text-sm font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />Outbound
          </span>
        )
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className={`font-semibold ${row.original.direction === 'inbound' ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
          {row.original.direction === 'inbound' ? '+' : '-'}{formatCurrency(row.original.amount, 'USD')}
        </span>
      ),
    },
    {
      id: 'sender',
      header: 'Sender',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.sender_name ?? '—'}</p>
          {row.original.sender_phone && (
            <p className="text-xs text-muted-foreground">{row.original.sender_phone}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {String(getValue() ?? '—')}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.original.needs_review) return (
          <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />Needs Review
          </span>
        )
        if (row.original.is_recorded) return (
          <span className="flex items-center gap-1 text-xs text-[#27AE60] bg-green-50 px-2 py-0.5 rounded-full">
            <CheckCircle className="h-3 w-3" />Recorded
          </span>
        )
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" />Pending
          </span>
        )
      },
    },
    {
      accessorKey: 'tran_id',
      header: 'Tran ID',
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-muted-foreground">{String(getValue())}</span>
      ),
    },
  ]

  const reviewCount = transactions.filter(t => t.needs_review).length

  return (
    <div>
      <PageHeader
        title="EVC Transactions"
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'EVC Plus', href: `/app/${slug}/evc` },
          { label: 'Transactions' },
        ]}
      />

      <Tabs value={tab} onValueChange={v => setTab(v as 'all' | 'review')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
          <TabsTrigger value="review" className="relative">
            Needs Review
            {reviewCount > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {reviewCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search transactions..."
      />
    </div>
  )
}
