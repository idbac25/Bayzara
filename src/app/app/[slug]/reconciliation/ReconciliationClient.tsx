'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Zap, Smartphone, CreditCard, TrendingUp, CheckCircle2,
  AlertTriangle, Loader2, Printer, Lock, ShoppingCart,
  Plus, X, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'

interface Staff { id: string; name: string; role: string }

interface Rec {
  id: string
  status: string
  system_cash_total: number | null
  system_evc_total: number | null
  system_credit_total: number | null
  cash_variance: number | null
  notes: string | null
  opened_by: { name: string } | null
  closed_by: { name: string } | null
}

interface LiveTotals {
  cash: number   // mobile money (non-EVC)
  evc: number
  credit: number
  salesCount: number
}

interface HistoryRow {
  date: string
  status: string
  system_cash_total: number | null
  system_evc_total: number | null
  system_credit_total: number | null
  cash_variance: number | null
}

interface OtherPayment {
  id: string
  provider: string
  amount: string
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  todayRec: Rec | null
  liveTotals: LiveTotals
  staff: Staff[]
  history: HistoryRow[]
  slug: string
  today: string
}

const OTHER_PROVIDERS = ['Edahab', 'Premier Wallet', 'Bank Transfer', 'Other']

export function ReconciliationClient({ business, todayRec, liveTotals, staff, history, slug, today }: Props) {
  const t = useT()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedStaff, setSelectedStaff] = useState('')
  const [evcReceived, setEvcReceived] = useState('')
  const [otherPayments, setOtherPayments] = useState<OtherPayment[]>([
    { id: '1', provider: 'Edahab', amount: '' },
  ])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const cur = business.currency
  const isOpen    = todayRec?.status === 'open'
  const isPending2 = todayRec?.status === 'pending_approval'
  const isApproved = todayRec?.status === 'approved'
  const notStarted = !todayRec

  const grandTotal = liveTotals.cash + liveTotals.evc + liveTotals.credit

  // Calculate variances live
  const enteredEvc   = parseFloat(evcReceived) || 0
  const enteredOther = otherPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const evcVariance   = enteredEvc   - liveTotals.evc
  const otherVariance = enteredOther - liveTotals.cash

  function addOtherPayment() {
    setOtherPayments(prev => [...prev, { id: Date.now().toString(), provider: 'Edahab', amount: '' }])
  }
  function removeOtherPayment(id: string) {
    setOtherPayments(prev => prev.filter(p => p.id !== id))
  }
  function updateOtherPayment(id: string, field: 'provider' | 'amount', value: string) {
    setOtherPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleOpen = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconciliation/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          staff_id: selectedStaff || null,
          opening_cash: 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error ?? 'Failed to open shift')
      toast.success('Shift opened')
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async () => {
    if (!evcReceived && enteredOther === 0) {
      return toast.error('Enter at least EVC received or other payments')
    }
    setLoading(true)
    try {
      const res = await fetch('/api/reconciliation/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          staff_id: selectedStaff || null,
          evc_received: parseFloat(evcReceived) || 0,
          other_payments: otherPayments
            .filter(p => p.amount && parseFloat(p.amount) > 0)
            .map(p => ({ provider: p.provider, amount: parseFloat(p.amount) })),
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error ?? 'Failed to close shift')
      toast.success('Shift closed — sent for manager approval')
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  const printReport = () => {
    const rec = todayRec
    const w = window.open('', '_blank', 'width=480,height=700,toolbar=0,menubar=0,scrollbars=1')
    if (!w) return
    const evc     = rec?.system_evc_total    ?? liveTotals.evc
    const mobile  = rec?.system_cash_total   ?? liveTotals.cash
    const credit  = rec?.system_credit_total ?? liveTotals.credit
    const variance = rec?.cash_variance

    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/><title>Daily Report — ${today}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 400px; margin: 0 auto; }
        h2 { margin: 0; font-size: 15px; }
        .center { text-align: center; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .bold { font-weight: bold; }
        .total { font-size: 14px; font-weight: bold; }
        .variance { color: ${(variance ?? 0) < 0 ? '#e74c3c' : (variance ?? 0) > 0 ? '#27ae60' : '#000'}; }
        @media print { @page { margin: 6mm; } }
      </style>
    </head><body>
      <div class="center"><h2>${business.name}</h2></div>
      <div class="center" style="margin-bottom:8px;color:#666">Daily Reconciliation — ${today}</div>
      <div class="divider"></div>
      <div class="row"><span>Transactions</span><span>${liveTotals.salesCount} sales</span></div>
      <div class="divider"></div>
      <div class="row bold"><span>EVC Plus</span><span>${formatCurrency(evc, cur)}</span></div>
      <div class="row bold"><span>Other Mobile Money</span><span>${formatCurrency(mobile, cur)}</span></div>
      <div class="row bold"><span>Credit Sales</span><span>${formatCurrency(credit, cur)}</span></div>
      <div class="divider"></div>
      <div class="row total"><span>GROSS TOTAL</span><span>${formatCurrency(evc + mobile + credit, cur)}</span></div>
      ${(isPending2 || isApproved) ? `
      <div class="divider"></div>
      <div class="row variance"><span>Net Variance</span><span>${(variance ?? 0) >= 0 ? '+' : ''}${formatCurrency(variance ?? 0, cur)}</span></div>
      <div class="row"><span>Status</span><span>${rec?.status ?? ''}</span></div>
      ` : ''}
      <div class="divider"></div>
      <div class="center" style="color:#aaa;font-size:10px;margin-top:8px">Powered by Bayzara</div>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 250)
  }

  function VariancePill({ variance }: { variance: number }) {
    if (variance === 0) return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" />{t.reconciliation.balanced}
      </span>
    )
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', variance < 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
        <AlertTriangle className="h-3 w-3" />
        {variance >= 0 ? '+' : ''}{formatCurrency(variance, cur)}
      </span>
    )
  }

  return (
    <div>
      <PageHeader
        title={t.reconciliation.title}
        description={`${new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: t.reconciliation.title },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="h-4 w-4 mr-1.5" />{t.common.print}
          </Button>
        }
      />

      {/* Live totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t.reconciliation.evcPlus,     value: liveTotals.evc,    icon: Zap,         color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: t.reconciliation.mobileMoney, value: liveTotals.cash,   icon: Smartphone,  color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t.reconciliation.creditSales, value: liveTotals.credit, icon: CreditCard,  color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: t.reconciliation.grossTotal,  value: grandTotal,        icon: TrendingUp,  color: 'text-[#0F4C81]',  bg: 'bg-[#0F4C81]/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{formatCurrency(value, cur)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shift control */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isApproved
                ? <><Lock className="h-4 w-4 text-green-600" />{t.common.approved}</>
                : isPending2
                ? <><Lock className="h-4 w-4 text-amber-500" />{t.reconciliation.awaitingApproval}</>
                : isOpen
                ? <><ShoppingCart className="h-4 w-4 text-blue-600" />{t.reconciliation.shiftOpen}</>
                : <><ShoppingCart className="h-4 w-4 text-muted-foreground" />{t.reconciliation.startShift}</>
              }
              {isApproved && <Badge className="bg-green-100 text-green-700 border-0 text-xs">{t.common.approved}</Badge>}
              {isPending2 && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{t.common.pending}</Badge>}
              {isOpen     && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{t.common.active}</Badge>}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ── NOT STARTED ── */}
            {notStarted && (
              <>
                <p className="text-sm text-muted-foreground">{t.reconciliation.openShiftDesc}</p>
                {staff.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Opened by</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger><SelectValue placeholder={t.reconciliation.selectStaff} /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" onClick={handleOpen} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{t.reconciliation.openShift}…</> : t.reconciliation.openShift}
                </Button>
              </>
            )}

            {/* ── OPEN — close form ── */}
            {isOpen && (
              <>
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.reconciliation.openedBy}</span>
                    <span>{(todayRec?.opened_by as { name: string } | null)?.name ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.reconciliation.salesToday}</span>
                    <span>{liveTotals.salesCount} {t.reconciliation.transactions}</span>
                  </div>
                </div>

                <p className="text-sm font-semibold">{t.reconciliation.closeAndReconcile}</p>
                <p className="text-xs text-muted-foreground -mt-2">{t.reconciliation.enterReceived}</p>

                {staff.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Closed by</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger><SelectValue placeholder={t.reconciliation.selectStaff} /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* EVC */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-blue-500" />
                    {t.reconciliation.evcReceivedToday} ({cur})
                    <span className="text-muted-foreground font-normal text-xs">{t.reconciliation.fromEvcAccount}</span>
                  </Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={evcReceived}
                    onChange={e => setEvcReceived(e.target.value)}
                    className="h-11"
                  />
                  {evcReceived && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">System: {formatCurrency(liveTotals.evc, cur)}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <VariancePill variance={evcVariance} />
                    </div>
                  )}
                </div>

                {/* Other mobile money breakdown */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-purple-500" />
                    {t.reconciliation.otherMobileReceived} ({cur})
                    <span className="text-muted-foreground font-normal text-xs">{t.reconciliation.edahabPremier}</span>
                  </Label>
                  {otherPayments.map(p => (
                    <div key={p.id} className="flex gap-2 items-center">
                      <select
                        value={p.provider}
                        onChange={e => updateOtherPayment(p.id, 'provider', e.target.value)}
                        className="w-36 h-10 rounded-md border border-input bg-background px-2 text-sm shrink-0"
                      >
                        {OTHER_PROVIDERS.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <Input
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={p.amount}
                        onChange={e => updateOtherPayment(p.id, 'amount', e.target.value)}
                        className="h-10 flex-1"
                      />
                      {otherPayments.length > 1 && (
                        <button onClick={() => removeOtherPayment(p.id)} className="text-muted-foreground hover:text-red-500 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addOtherPayment}
                    className="flex items-center gap-1 text-xs text-[#0F4C81] hover:underline"
                  >
                    <Plus className="h-3 w-3" />{t.reconciliation.addAnotherProvider}
                  </button>
                  {enteredOther > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">System: {formatCurrency(liveTotals.cash, cur)}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <VariancePill variance={otherVariance} />
                    </div>
                  )}
                </div>

                {/* Credit is auto */}
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <CreditCard className="h-3.5 w-3.5" />{t.reconciliation.creditSalesAuto}
                  </span>
                  <span className="font-semibold text-amber-700">{formatCurrency(liveTotals.credit, cur)}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.common.notes} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
                  <Input
                    placeholder="Any discrepancies or remarks…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-[#0F4C81] hover:bg-[#0d3d6b]"
                  onClick={handleClose}
                  disabled={loading || isPending}
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{t.reconciliation.closeAndSend}…</>
                    : t.reconciliation.closeAndSend
                  }
                </Button>
              </>
            )}

            {/* ── PENDING APPROVAL ── */}
            {isPending2 && (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                  <p className="font-medium text-amber-800 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5" />{t.reconciliation.waitingApproval}
                  </p>
                  <p className="text-xs text-amber-700">{t.reconciliation.submittedAwaiting}</p>
                </div>
                {[
                  { label: t.reconciliation.evcSystem, value: todayRec?.system_evc_total ?? 0 },
                  { label: t.reconciliation.mobileMoneySys, value: todayRec?.system_cash_total ?? 0 },
                  { label: t.reconciliation.creditSales, value: todayRec?.system_credit_total ?? 0 },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{formatCurrency(row.value, cur)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>{t.reconciliation.netVariance}</span>
                  <span className={cn((todayRec?.cash_variance ?? 0) < 0 ? 'text-red-600' : (todayRec?.cash_variance ?? 0) > 0 ? 'text-amber-600' : 'text-green-600')}>
                    {(todayRec?.cash_variance ?? 0) >= 0 ? '+' : ''}{formatCurrency(todayRec?.cash_variance ?? 0, cur)}
                  </span>
                </div>
                {todayRec?.notes && <p className="text-muted-foreground italic text-xs">&ldquo;{todayRec.notes}&rdquo;</p>}
              </div>
            )}

            {/* ── APPROVED ── */}
            {isApproved && (
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1.5">
                  <p className="font-medium text-green-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />{t.reconciliation.approvedByManager}
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net variance</span>
                    <span className={cn('font-semibold', (todayRec?.cash_variance ?? 0) < 0 ? 'text-red-600' : 'text-green-700')}>
                      {(todayRec?.cash_variance ?? 0) >= 0 ? '+' : ''}{formatCurrency(todayRec?.cash_variance ?? 0, cur)}
                    </span>
                  </div>
                </div>
                {todayRec?.notes && <p className="text-muted-foreground italic">&ldquo;{todayRec.notes}&rdquo;</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.reconciliation.last14Days}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">{t.reconciliation.noHistoryYet}</p>
            ) : (
              <div className="divide-y">
                {history.map(h => (
                  <div key={h.date} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(h.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        EVC {formatCurrency(h.system_evc_total ?? 0, cur)}
                        {' · '}Mobile {formatCurrency(h.system_cash_total ?? 0, cur)}
                        {' · '}Credit {formatCurrency(h.system_credit_total ?? 0, cur)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge
                        className={cn('text-[10px] border-0',
                          h.status === 'approved'   ? 'bg-green-100 text-green-700'
                        : h.status === 'pending_approval' ? 'bg-amber-100 text-amber-700'
                        : h.status === 'open'       ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {h.status === 'pending_approval' ? 'Pending' : h.status}
                      </Badge>
                      {h.cash_variance != null && (
                        <p className={cn('text-xs mt-0.5', h.cash_variance < 0 ? 'text-red-500' : h.cash_variance > 0 ? 'text-amber-500' : 'text-green-600')}>
                          {h.cash_variance >= 0 ? '+' : ''}{formatCurrency(h.cash_variance, cur)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
