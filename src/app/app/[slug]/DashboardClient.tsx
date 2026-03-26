'use client'

import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  FileText, Users, Zap, BarChart3,
  TrendingUp, AlertCircle, CheckCircle, Clock,
  ArrowUpRight
} from 'lucide-react'

interface DashboardClientProps {
  user: User | null
  business: { name: string; currency: string } | null
  stats: {
    totalInvoiced: number
    totalPaid: number
    totalOutstanding: number
    totalOverdue: number
    invoiceCount: number
  }
  recentInvoices: Array<{
    id: string
    document_number: string
    date: string
    total: number
    amount_due: number
    status: string
    clients: { name: string } | null
  }>
  evcConnections: Array<{
    id: string
    merchant_name: string
    current_balance: number
    last_synced_at: string | null
    is_active: boolean
  }>
  recentEvc: Array<{
    id: string
    amount: number
    direction: string
    sender_name: string | null
    sender_phone: string | null
    tran_date: string
    is_recorded: boolean
    needs_review: boolean
  }>
  slug: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-slate-100 text-slate-600',
}

export function DashboardClient({ user, business, stats, recentInvoices, evcConnections, recentEvc, slug }: DashboardClientProps) {
  const currency = business?.currency ?? 'USD'
  const userName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there'

  const isNew = stats.invoiceCount === 0 && evcConnections.length === 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening with {business?.name}.</p>
      </div>

      {/* EVC Balance — if connected */}
      {evcConnections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {evcConnections.map(conn => (
            <Card key={conn.id} className="border-[#F5A623]/30 bg-gradient-to-br from-[#F5A623]/5 to-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">EVC Balance</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(conn.current_balance, 'USD')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{conn.merchant_name}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-[#F5A623] flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
                {conn.last_synced_at && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Last sync: {new Date(conn.last_synced_at).toLocaleTimeString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Getting started cards — for new accounts */}
      {isNew && (
        <Card className="border-dashed border-2 border-[#0F4C81]/20">
          <CardHeader>
            <CardTitle className="text-base">Get started with Bayzara</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Create Invoice', href: `invoices/new`, icon: FileText, color: '#0F4C81' },
                { label: 'Add Client', href: `clients/new`, icon: Users, color: '#27AE60' },
                { label: 'Connect EVC', href: `evc/connect`, icon: Zap, color: '#F5A623' },
                { label: 'View Reports', href: `reports`, icon: BarChart3, color: '#8B5CF6' },
              ].map(item => (
                <Link
                  key={item.href}
                  href={`/app/${slug}/${item.href}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:border-[#0F4C81]/30 hover:bg-[#0F4C81]/5 transition-all"
                >
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm font-medium text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoiced</p>
              <TrendingUp className="h-4 w-4 text-[#0F4C81]" />
            </div>
            <p className="text-xl font-bold mt-2">{formatCurrency(stats.totalInvoiced, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.invoiceCount} invoices this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received</p>
              <CheckCircle className="h-4 w-4 text-[#27AE60]" />
            </div>
            <p className="text-xl font-bold mt-2 text-[#27AE60]">{formatCurrency(stats.totalPaid, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Collected this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <Clock className="h-4 w-4 text-[#F39C12]" />
            </div>
            <p className="text-xl font-bold mt-2 text-[#F39C12]">{formatCurrency(stats.totalOutstanding, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p>
              <AlertCircle className="h-4 w-4 text-[#E74C3C]" />
            </div>
            <p className="text-xl font-bold mt-2 text-[#E74C3C]">{formatCurrency(stats.totalOverdue, currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices + EVC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Invoices</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[#0F4C81]">
                  <Link href={`/app/${slug}/invoices`}>
                    View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No invoices yet</p>
                  <Button asChild size="sm" className="mt-3 bg-[#0F4C81] hover:bg-[#0d3f6e]">
                    <Link href={`/app/${slug}/invoices/new`}>Create Invoice</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {recentInvoices.map(inv => (
                    <Link
                      key={inv.id}
                      href={`/app/${slug}/invoices/${inv.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="text-sm font-medium">{inv.document_number}</p>
                          <p className="text-xs text-muted-foreground truncate">{inv.clients?.name ?? 'No client'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {inv.status.replace('_', ' ')}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(inv.total, currency)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* EVC Recent Payments */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#F5A623]" />
                  EVC Payments
                </CardTitle>
                {evcConnections.length > 0 && (
                  <Button asChild variant="ghost" size="sm" className="text-[#0F4C81]">
                    <Link href={`/app/${slug}/evc`}>
                      View all
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {evcConnections.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm mb-1">EVC not connected</p>
                  <p className="text-xs mb-3">Auto-record payments from Hormud EVC Plus</p>
                  <Button asChild size="sm" className="bg-[#F5A623] hover:bg-[#e09520] text-black">
                    <Link href={`/app/${slug}/evc/connect`}>Connect EVC</Link>
                  </Button>
                </div>
              ) : recentEvc.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {recentEvc.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.sender_name ?? tx.sender_phone ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.tran_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          tx.needs_review ? 'bg-amber-100 text-amber-700' :
                          tx.is_recorded ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tx.needs_review ? 'Review' : tx.is_recorded ? '✓' : 'Pending'}
                        </span>
                        <span className="text-sm font-semibold text-[#27AE60]">
                          +{formatCurrency(tx.amount, 'USD')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
