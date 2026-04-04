'use client'

import { useMemo, useState } from 'react'
import { useBusiness } from '@/contexts/BusinessContext'
import { formatCurrency } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Zap, FileText, AlertCircle,
  ShoppingBag, CreditCard, Banknote, ArrowUpRight, ArrowDownRight,
  Search, CheckCircle2, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  document_number: string
  date: string
  total: number
  amount_paid: number
  status: string
  source: string | null
  payment_method: string | null
  clients: Array<{ name: string }> | null
}

interface Expense {
  id: string
  document_number: string
  date: string
  total: number
  type: string
}

interface EvcTxn {
  id: string
  tran_id: string
  amount: number
  direction: string
  sender_name: string | null
  sender_phone: string | null
  tran_date: string
  is_recorded: boolean
  matched_sale_id: string | null
}

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

interface Props {
  slug: string
  currency: string
  businessName: string
  invoices: Invoice[]
  expenses: Expense[]
  evcTxns: EvcTxn[]
  openInvoices: OpenInvoice[]
}

// ── Period helpers ────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year' | '12m' | 'custom'

function periodRange(period: Period, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date()
  const end = new Date(now); end.setHours(23, 59, 59, 999)
  switch (period) {
    case 'today': {
      const s = new Date(now); s.setHours(0, 0, 0, 0)
      return [s, end]
    }
    case 'week': {
      const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0)
      return [s, end]
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      return [s, end]
    }
    case 'year': {
      const s = new Date(now.getFullYear(), 0, 1)
      return [s, end]
    }
    case '12m': {
      const s = new Date(now); s.setFullYear(now.getFullYear() - 1); s.setDate(1); s.setHours(0, 0, 0, 0)
      return [s, end]
    }
    case 'custom': {
      const s = customFrom ? new Date(customFrom) : new Date(0)
      const e = customTo ? new Date(customTo + 'T23:59:59') : end
      return [s, e]
    }
  }
}

function inRange(dateStr: string, from: Date, to: Date): boolean {
  const d = new Date(dateStr)
  return d >= from && d <= to
}

// ── Chart grouping ────────────────────────────────────────────────────────────

function groupByPeriod(
  items: { date: string; income: number; expense: number }[],
  from: Date,
  to: Date,
  period: Period,
): { label: string; income: number; expense: number }[] {
  const diffDays = (to.getTime() - from.getTime()) / 86400000

  if (period === 'today') {
    // Group by hour
    const hours: Record<string, { income: number; expense: number }> = {}
    for (let h = 0; h < 24; h++) {
      hours[String(h).padStart(2, '0')] = { income: 0, expense: 0 }
    }
    items.forEach(i => {
      const h = String(new Date(i.date).getHours()).padStart(2, '0')
      if (hours[h]) { hours[h].income += i.income; hours[h].expense += i.expense }
    })
    return Object.entries(hours).map(([h, v]) => ({ label: `${h}:00`, ...v }))
  }

  if (diffDays <= 31) {
    // Group by day
    const days: Record<string, { income: number; expense: number }> = {}
    const cur = new Date(from); cur.setHours(0, 0, 0, 0)
    while (cur <= to) {
      const k = cur.toISOString().split('T')[0]
      days[k] = { income: 0, expense: 0 }
      cur.setDate(cur.getDate() + 1)
    }
    items.forEach(i => {
      const k = i.date.split('T')[0]
      if (days[k]) { days[k].income += i.income; days[k].expense += i.expense }
    })
    return Object.entries(days).map(([k, v]) => ({
      label: new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...v,
    }))
  }

  // Group by month
  const months: Record<string, { income: number; expense: number }> = {}
  const cur = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cur <= to) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    months[k] = { income: 0, expense: 0 }
    cur.setMonth(cur.getMonth() + 1)
  }
  items.forEach(i => {
    const d = new Date(i.date)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (months[k]) { months[k].income += i.income; months[k].expense += i.expense }
  })
  return Object.entries(months).map(([k, v]) => ({
    label: new Date(parseInt(k.split('-')[0]), parseInt(k.split('-')[1]) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    ...v,
  }))
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon, trend,
}: {
  label: string
  value: string
  sub?: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | null
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
        {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>
  label?: string; currency: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: '12m',   label: 'Last 12 Months' },
  { key: 'custom',label: 'Custom' },
]

export function ReportsClient({ slug, currency, invoices, expenses, evcTxns, openInvoices }: Props) {
  const { business } = useBusiness()

  const [period, setPeriod]       = useState<Period>('month')
  const [customFrom, setFrom]     = useState('')
  const [customTo, setTo]         = useState('')
  const [payFilter, setPayFilter] = useState<'all' | 'evc' | 'cash' | 'credit'>('all')
  const [txSearch, setTxSearch]   = useState('')

  const [from, to] = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo])

  // Filtered invoices (all sales — B2B invoices)
  const filtInvoices = useMemo(() =>
    invoices.filter(i => inRange(i.date, from, to) &&
      (payFilter === 'all' || (i.payment_method ?? 'cash') === payFilter || (payFilter === 'evc' && i.source === 'pos' && i.payment_method === 'evc'))
    ), [invoices, from, to, payFilter])

  // POS-only sales
  const filtPos = useMemo(() =>
    invoices.filter(i => i.source === 'pos' && inRange(i.date, from, to) &&
      (payFilter === 'all' || (i.payment_method ?? 'cash') === payFilter)
    ), [invoices, from, to, payFilter])

  // Filtered expenses
  const filtExpenses = useMemo(() =>
    expenses.filter(e => inRange(e.date, from, to)), [expenses, from, to])

  // Filtered EVC (inbound only for revenue)
  const filtEvcIn  = useMemo(() =>
    evcTxns.filter(t => t.direction === 'in' && inRange(t.tran_date, from, to)), [evcTxns, from, to])
  const filtEvcAll = useMemo(() =>
    evcTxns.filter(t => inRange(t.tran_date, from, to)), [evcTxns, from, to])

  // Summary stats
  const totalIncome   = filtInvoices.reduce((s, i) => s + (i.amount_paid ?? i.total), 0)
  const totalExpense  = filtExpenses.reduce((s, e) => s + e.total, 0)
  const netProfit     = totalIncome - totalExpense
  const totalEvc      = filtEvcIn.reduce((s, t) => s + t.amount, 0)
  const posTotal      = filtPos.reduce((s, i) => s + i.total, 0)
  const totalAR       = openInvoices.reduce((s, i) => s + i.amount_due, 0)
  const overdueAR     = openInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount_due, 0)

  // POS payment breakdown
  const posEvc    = filtPos.filter(i => i.payment_method === 'evc').reduce((s, i) => s + i.total, 0)
  const posCash   = filtPos.filter(i => i.payment_method === 'cash' || !i.payment_method).reduce((s, i) => s + i.total, 0)
  const posCredit = filtPos.filter(i => i.payment_method === 'credit').reduce((s, i) => s + i.total, 0)

  // Chart data
  const chartItems = useMemo(() => {
    const map: Record<string, { date: string; income: number; expense: number }> = {}
    filtInvoices.forEach(i => {
      const k = i.date
      if (!map[k]) map[k] = { date: k, income: 0, expense: 0 }
      map[k].income += i.amount_paid ?? i.total
    })
    filtExpenses.forEach(e => {
      const k = e.date
      if (!map[k]) map[k] = { date: k, income: 0, expense: 0 }
      map[k].expense += e.total
    })
    return Object.values(map)
  }, [filtInvoices, filtExpenses])

  const chartData = useMemo(() => groupByPeriod(chartItems, from, to, period), [chartItems, from, to, period])

  // EVC transaction search
  const searchedEvc = useMemo(() => {
    if (!txSearch) return filtEvcAll
    const q = txSearch.toLowerCase()
    return filtEvcAll.filter(t =>
      t.sender_name?.toLowerCase().includes(q) ||
      t.sender_phone?.includes(q) ||
      String(t.tran_id).includes(q)
    )
  }, [filtEvcAll, txSearch])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{business.name}</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden bg-white">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0',
                  period === opt.key
                    ? 'bg-[#0F4C81] text-white'
                    : 'text-muted-foreground hover:bg-gray-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={customFrom} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-36" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={customTo} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-36" />
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Income" value={formatCurrency(totalIncome, currency)}
          sub={`${filtInvoices.length} invoices`}
          color="bg-emerald-500" icon={TrendingUp}
        />
        <StatCard
          label="Expenses" value={formatCurrency(totalExpense, currency)}
          sub={`${filtExpenses.length} bills`}
          color="bg-red-500" icon={TrendingDown}
        />
        <StatCard
          label="Net Profit" value={formatCurrency(netProfit, currency)}
          color={netProfit >= 0 ? 'bg-[#0F4C81]' : 'bg-orange-500'} icon={TrendingUp}
          trend={netProfit >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="EVC Revenue" value={formatCurrency(totalEvc, currency)}
          sub={`${filtEvcIn.length} transactions`}
          color="bg-amber-500" icon={Zap}
        />
        <StatCard
          label="POS Sales" value={formatCurrency(posTotal, currency)}
          sub={`${filtPos.length} sales`}
          color="bg-purple-500" icon={ShoppingBag}
        />
        <StatCard
          label="Receivable" value={formatCurrency(totalAR, currency)}
          sub={overdueAR > 0 ? `${formatCurrency(overdueAR, currency)} overdue` : 'All current'}
          color="bg-slate-500" icon={FileText}
          trend={overdueAR > 0 ? 'down' : null}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white border rounded-lg p-1 h-auto gap-1">
          {[
            { value: 'overview',  label: 'Overview' },
            { value: 'sales',     label: 'Sales' },
            { value: 'pos',       label: 'POS' },
            { value: 'evc',       label: 'EVC' },
            { value: 'expenses',  label: 'Expenses' },
            { value: 'ar',        label: 'Receivables' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-[#0F4C81] data-[state=active]:text-white"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27AE60" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E74C3C" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#E74C3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={v => formatCurrency(v, currency).replace(/\.00$/, '')} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="income" stroke="#27AE60" strokeWidth={2}
                  fill="url(#incomeGrad)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#E74C3C" strokeWidth={2}
                  fill="url(#expenseGrad)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">POS via EVC</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(posEvc, currency)}</p>
              <p className="text-xs text-muted-foreground">{filtPos.filter(i => i.payment_method === 'evc').length} sales</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">POS via Cash</p>
              <p className="text-xl font-bold text-gray-700">{formatCurrency(posCash, currency)}</p>
              <p className="text-xs text-muted-foreground">{filtPos.filter(i => i.payment_method === 'cash' || !i.payment_method).length} sales</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">POS via Credit</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(posCredit, currency)}</p>
              <p className="text-xs text-muted-foreground">{filtPos.filter(i => i.payment_method === 'credit').length} sales</p>
            </div>
          </div>
        </TabsContent>

        {/* ── SALES ── */}
        <TabsContent value="sales" className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-gray-900">All Sales — Invoices</h3>
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {([
                  { key: 'all', label: 'All', icon: FileText },
                  { key: 'evc', label: 'EVC', icon: Zap },
                  { key: 'cash', label: 'Cash', icon: Banknote },
                  { key: 'credit', label: 'Credit', icon: CreditCard },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPayFilter(opt.key)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 border-r last:border-r-0 transition-colors font-medium',
                      payFilter === opt.key
                        ? 'bg-[#0F4C81] text-white'
                        : 'text-muted-foreground hover:bg-gray-50'
                    )}
                  >
                    <opt.icon className="h-3 w-3" />{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filtInvoices.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No sales in this period</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-[#0F4C81] text-xs">{inv.document_number}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {inv.clients?.[0]?.name ?? (inv.source === 'pos' ? 'POS Walk-in' : '—')}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-2.5">
                            {inv.payment_method === 'evc'
                              ? <Badge className="text-[10px] bg-[#F5A623] text-black">EVC Plus</Badge>
                              : inv.payment_method === 'credit'
                                ? <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">Credit</Badge>
                                : <Badge variant="outline" className="text-[10px]">Cash</Badge>
                            }
                          </td>
                          <td className="px-4 py-2.5"><StatusBadge status={inv.status} /></td>
                          <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(inv.total, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                          Total ({filtInvoices.length})
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#0F4C81]">
                          {formatCurrency(totalIncome, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── POS ── */}
        <TabsContent value="pos" className="space-y-4">
          {/* Payment method bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'EVC Plus', value: posEvc, count: filtPos.filter(i => i.payment_method === 'evc').length, color: 'bg-amber-500', text: 'text-amber-600' },
              { label: 'Cash', value: posCash, count: filtPos.filter(i => i.payment_method === 'cash' || !i.payment_method).length, color: 'bg-gray-500', text: 'text-gray-700' },
              { label: 'Credit', value: posCredit, count: filtPos.filter(i => i.payment_method === 'credit').length, color: 'bg-purple-500', text: 'text-purple-600' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full', m.color)} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</span>
                </div>
                <p className={cn('text-xl font-bold', m.text)}>{formatCurrency(m.value, currency)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.count} sale{m.count !== 1 ? 's' : ''}</p>
                {posTotal > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div className={cn('h-full rounded-full', m.color)} style={{ width: `${(m.value / posTotal) * 100}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-gray-900">POS Sales</h3>
              <div className="flex rounded-lg border overflow-hidden text-xs">
                {(['all','evc','cash','credit'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setPayFilter(f)}
                    className={cn(
                      'px-3 py-1.5 border-r last:border-r-0 font-medium capitalize transition-colors',
                      payFilter === f ? 'bg-[#0F4C81] text-white' : 'text-muted-foreground hover:bg-gray-50'
                    )}
                  >{f === 'all' ? 'All' : f === 'evc' ? 'EVC' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
            </div>

            {filtPos.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No POS sales in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtPos.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-[#0F4C81] text-xs">{inv.document_number}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          {inv.payment_method === 'evc'
                            ? <Badge className="text-[10px] bg-[#F5A623] text-black">EVC Plus</Badge>
                            : inv.payment_method === 'credit'
                              ? <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-200">Credit</Badge>
                              : <Badge variant="outline" className="text-[10px]">Cash</Badge>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(inv.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                        Total ({filtPos.length} sales)
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#0F4C81]">
                        {formatCurrency(posTotal, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── EVC ── */}
        <TabsContent value="evc" className="space-y-4">
          {/* EVC summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Received</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(filtEvcIn.reduce((s,t) => s+t.amount, 0), currency)}</p>
              <p className="text-xs text-muted-foreground">{filtEvcIn.length} inbound</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Matched to Sales</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(filtEvcIn.filter(t => t.matched_sale_id).reduce((s,t) => s+t.amount, 0), currency)}
              </p>
              <p className="text-xs text-muted-foreground">{filtEvcIn.filter(t => t.matched_sale_id).length} matched</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Unmatched</p>
              <p className="text-xl font-bold text-muted-foreground">
                {formatCurrency(filtEvcIn.filter(t => !t.matched_sale_id).reduce((s,t) => s+t.amount, 0), currency)}
              </p>
              <p className="text-xs text-muted-foreground">{filtEvcIn.filter(t => !t.matched_sale_id).length} unmatched</p>
            </div>
          </div>

          {/* EVC transaction list */}
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">EVC Transactions</h3>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search sender or ID..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {searchedEvc.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No EVC transactions in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sender</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dir.</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matched</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {searchedEvc.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.tran_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' '}
                          {new Date(tx.tran_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-medium">{tx.sender_name ?? '—'}</p>
                          <p className="text-[11px] text-muted-foreground">{tx.sender_phone ?? ''}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          {tx.direction === 'in'
                            ? <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">IN</Badge>
                            : <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">OUT</Badge>
                          }
                        </td>
                        <td className="px-4 py-2.5">
                          {tx.matched_sale_id
                            ? <span className="flex items-center gap-1 text-[11px] text-green-600">
                                <CheckCircle2 className="h-3 w-3" />Matched
                              </span>
                            : tx.direction === 'in'
                              ? <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />Unmatched
                                </span>
                              : <span className="text-[11px] text-muted-foreground">—</span>
                          }
                        </td>
                        <td className={cn(
                          'px-4 py-2.5 text-right font-semibold text-sm',
                          tx.direction === 'in' ? 'text-green-600' : 'text-red-500'
                        )}>
                          {tx.direction === 'in' ? '+' : '−'}{formatCurrency(tx.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── EXPENSES ── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Expenses & Bills</h3>
            {filtExpenses.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No expenses in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-xs">{e.document_number}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{e.type}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                          {formatCurrency(e.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                        Total ({filtExpenses.length})
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-600">
                        {formatCurrency(totalExpense, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── RECEIVABLES ── */}
        <TabsContent value="ar" className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="font-semibold text-gray-900">Outstanding Invoices</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Total outstanding:</span>
                <span className="font-bold">{formatCurrency(totalAR, currency)}</span>
                {overdueAR > 0 && (
                  <span className="flex items-center gap-1 text-red-600 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formatCurrency(overdueAR, currency)} overdue
                  </span>
                )}
              </div>
            </div>

            {openInvoices.length === 0 ? (
              <p className="text-center py-10 text-sm text-muted-foreground">No outstanding invoices</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {openInvoices.map(inv => {
                      const isOverdue = inv.status === 'overdue'
                      const daysOverdue = inv.due_date
                        ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)
                        : 0
                      return (
                        <tr key={inv.id} className={cn('hover:bg-gray-50/50', isOverdue && 'bg-red-50/30')}>
                          <td className="px-4 py-2.5 font-medium text-[#0F4C81] text-xs">{inv.document_number}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {inv.clients?.[0]?.name ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {inv.due_date
                                ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                                : '—'}
                            </span>
                            {isOverdue && daysOverdue > 0 && (
                              <span className="ml-1 text-red-500 text-[10px]">({daysOverdue}d overdue)</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5"><StatusBadge status={inv.status} /></td>
                          <td className="px-4 py-2.5 text-right font-bold">
                            {formatCurrency(inv.amount_due, currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                        Total receivable
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#0F4C81]">
                        {formatCurrency(totalAR, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
