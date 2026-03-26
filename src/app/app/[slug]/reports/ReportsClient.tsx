'use client'

import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Zap, FileText, AlertCircle } from 'lucide-react'

interface OpenInvoice {
  id: string
  document_number: string
  date: string
  due_date: string | null
  total: number
  amount_due: number
  status: string
  clients: Array<{ name: string }> | null
}

interface DocRow {
  date: string
  total: number
  amount_paid?: number
  type: string
}

interface EvcTx {
  amount: number
  direction: string
  tran_date: string
}

interface ReportsClientProps {
  slug: string
  currency: string
  businessName: string
  openInvoices: OpenInvoice[]
  invoices: DocRow[]
  purchases: DocRow[]
  evcTransactions: EvcTx[]
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getLast12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function ReportsClient({
  slug, currency, businessName,
  openInvoices, invoices, purchases, evcTransactions,
}: ReportsClientProps) {
  const { business } = useBusiness()
  const months = getLast12Months()

  // Income by month
  const incomeByMonth: Record<string, number> = {}
  months.forEach(m => { incomeByMonth[m] = 0 })
  invoices.forEach(inv => {
    const mk = getMonthKey(inv.date)
    if (incomeByMonth[mk] !== undefined) incomeByMonth[mk] += inv.amount_paid ?? inv.total
  })

  // Expenses by month
  const expensesByMonth: Record<string, number> = {}
  months.forEach(m => { expensesByMonth[m] = 0 })
  purchases.forEach(p => {
    const mk = getMonthKey(p.date)
    if (expensesByMonth[mk] !== undefined) expensesByMonth[mk] += p.total
  })

  // EVC by month
  const evcByMonth: Record<string, number> = {}
  months.forEach(m => { evcByMonth[m] = 0 })
  evcTransactions.filter(t => t.direction === 'in').forEach(t => {
    const mk = getMonthKey(t.tran_date)
    if (evcByMonth[mk] !== undefined) evcByMonth[mk] += t.amount
  })

  const totalIncome = Object.values(incomeByMonth).reduce((s, v) => s + v, 0)
  const totalExpenses = Object.values(expensesByMonth).reduce((s, v) => s + v, 0)
  const totalEvc = Object.values(evcByMonth).reduce((s, v) => s + v, 0)
  const totalAR = openInvoices.reduce((s, i) => s + i.amount_due, 0)
  const overdueAR = openInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount_due, 0)

  const maxBar = Math.max(...months.map(m => Math.max(incomeByMonth[m], expensesByMonth[m])), 1)

  return (
    <div>
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Reports' }]}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#27AE60]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Income (12mo)</span>
            </div>
            <p className="text-xl font-bold text-[#27AE60]">{formatCurrency(totalIncome, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-[#E74C3C]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Expenses (12mo)</span>
            </div>
            <p className="text-xl font-bold text-[#E74C3C]">{formatCurrency(totalExpenses, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-[#0F4C81]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Receivable</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalAR, currency)}</p>
            {overdueAR > 0 && <p className="text-xs text-[#E74C3C] mt-1">{formatCurrency(overdueAR, currency)} overdue</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-[#F5A623]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">EVC (12mo)</span>
            </div>
            <p className="text-xl font-bold text-[#F5A623]">{formatCurrency(totalEvc, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="income">
        <TabsList className="mb-4">
          <TabsTrigger value="income">Income vs Expenses</TabsTrigger>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="evc">EVC Report</TabsTrigger>
        </TabsList>

        {/* Income vs Expenses Chart */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {months.map(m => (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">{monthLabel(m)}</span>
                    <div className="flex-1 space-y-1">
                      {/* Income bar */}
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 rounded-sm bg-[#27AE60] transition-all"
                          style={{ width: `${(incomeByMonth[m] / maxBar) * 100}%`, minWidth: incomeByMonth[m] > 0 ? '4px' : '0' }}
                        />
                        <span className="text-xs text-[#27AE60]">{incomeByMonth[m] > 0 ? formatCurrency(incomeByMonth[m], currency) : ''}</span>
                      </div>
                      {/* Expenses bar */}
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 rounded-sm bg-[#E74C3C]/70 transition-all"
                          style={{ width: `${(expensesByMonth[m] / maxBar) * 100}%`, minWidth: expensesByMonth[m] > 0 ? '4px' : '0' }}
                        />
                        <span className="text-xs text-[#E74C3C]">{expensesByMonth[m] > 0 ? formatCurrency(expensesByMonth[m], currency) : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#27AE60] inline-block" /> Income</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#E74C3C]/70 inline-block" /> Expenses</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Receivable */}
        <TabsContent value="ar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Accounts Receivable</CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold">{formatCurrency(totalAR, currency)}</span>
                  {overdueAR > 0 && (
                    <span className="flex items-center gap-1 text-[#E74C3C] text-xs ml-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {formatCurrency(overdueAR, currency)} overdue
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {openInvoices.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No outstanding invoices</p>
              ) : (
                <div className="divide-y">
                  {openInvoices.map(inv => {
                    const clientName = Array.isArray(inv.clients) ? inv.clients[0]?.name : null
                    const isOverdue = inv.status === 'overdue'
                    const daysOverdue = inv.due_date
                      ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)
                      : 0
                    return (
                      <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium">{inv.document_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {clientName ?? 'No client'} · {formatDate(inv.date)}
                          </p>
                          {isOverdue && daysOverdue > 0 && (
                            <p className="text-xs text-[#E74C3C]">{daysOverdue}d overdue</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={inv.status} />
                          <span className="font-bold text-sm">{formatCurrency(inv.amount_due, currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVC Report */}
        <TabsContent value="evc">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#F5A623]" />
                EVC Plus Monthly Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {months.map(m => (
                  <div key={m} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">{monthLabel(m)}</span>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 rounded-full bg-[#F5A623]"
                        style={{
                          width: `${Math.max((evcByMonth[m] / Math.max(totalEvc / 12, 1)) * 80, evcByMonth[m] > 0 ? 8 : 0)}px`
                        }}
                      />
                      <span className={`text-sm font-medium ${evcByMonth[m] > 0 ? 'text-[#F5A623]' : 'text-muted-foreground'}`}>
                        {evcByMonth[m] > 0 ? formatCurrency(evcByMonth[m], currency) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total EVC Received</span>
                <span className="text-[#F5A623]">{formatCurrency(totalEvc, currency)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
