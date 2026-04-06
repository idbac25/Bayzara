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
  Zap, Banknote, CreditCard, ShoppingCart, CheckCircle2,
  AlertTriangle, Loader2, Printer, TrendingUp, Lock
} from 'lucide-react'

interface Staff { id: string; name: string; role: string }

interface Rec {
  id: string
  status: 'open' | 'closed'
  opening_cash: number
  closing_cash_counted: number | null
  system_cash_total: number | null
  system_evc_total: number | null
  system_credit_total: number | null
  cash_variance: number | null
  notes: string | null
  opened_by: { name: string } | null
  closed_by: { name: string } | null
}

interface LiveTotals {
  cash: number; evc: number; credit: number; debtPayments: number; salesCount: number
}

interface HistoryRow {
  date: string
  status: string
  system_cash_total: number | null
  system_evc_total: number | null
  system_credit_total: number | null
  cash_variance: number | null
  closing_cash_counted: number | null
  opening_cash: number | null
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

export function ReconciliationClient({ business, todayRec, liveTotals, staff, history, slug, today }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedStaff, setSelectedStaff] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const cur = business.currency
  const isOpen = todayRec?.status === 'open'
  const isClosed = todayRec?.status === 'closed'
  const notStarted = !todayRec

  const grandTotal = liveTotals.cash + liveTotals.evc + liveTotals.credit

  const handleOpen = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reconciliation/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          staff_id: selectedStaff || null,
          opening_cash: parseFloat(openingCash) || 0,
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
    if (!closingCash) return toast.error('Enter the physical cash count')
    setLoading(true)
    try {
      const res = await fetch('/api/reconciliation/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          staff_id: selectedStaff || null,
          closing_cash_counted: parseFloat(closingCash),
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error ?? 'Failed to close shift')
      toast.success('Shift closed and reconciled')
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  const printReport = () => {
    const rec = todayRec
    const w = window.open('', '_blank', 'width=480,height=700,toolbar=0,menubar=0,scrollbars=1')
    if (!w) return
    const cash  = rec?.system_cash_total   ?? liveTotals.cash
    const evc   = rec?.system_evc_total    ?? liveTotals.evc
    const credit = rec?.system_credit_total ?? liveTotals.credit
    const counted = rec?.closing_cash_counted
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
      <div class="row"><span>Sales count</span><span>${liveTotals.salesCount} transactions</span></div>
      <div class="divider"></div>
      <div class="row bold"><span>Cash Sales</span><span>${formatCurrency(cash, cur)}</span></div>
      <div class="row bold"><span>EVC Received</span><span>${formatCurrency(evc, cur)}</span></div>
      <div class="row bold"><span>Credit Sales</span><span>${formatCurrency(credit, cur)}</span></div>
      <div class="divider"></div>
      <div class="row total"><span>GROSS TOTAL</span><span>${formatCurrency(cash + evc + credit, cur)}</span></div>
      ${todayRec?.status === 'closed' ? `
      <div class="divider"></div>
      <div class="row"><span>Opening Cash</span><span>${formatCurrency(rec?.opening_cash ?? 0, cur)}</span></div>
      <div class="row"><span>Counted Cash</span><span>${formatCurrency(counted ?? 0, cur)}</span></div>
      <div class="row variance"><span>Variance</span><span>${(variance ?? 0) >= 0 ? '+' : ''}${formatCurrency(variance ?? 0, cur)}</span></div>
      ` : ''}
      <div class="divider"></div>
      <div class="center" style="color:#aaa;font-size:10px;margin-top:8px">Powered by Bayzara</div>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 250)
  }

  return (
    <div>
      <PageHeader
        title="Daily Reconciliation"
        description={`Today — ${new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Reconciliation' },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="h-4 w-4 mr-1.5" />Print Report
          </Button>
        }
      />

      {/* Live totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Cash Sales', value: liveTotals.cash, icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'EVC Received', value: liveTotals.evc, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Credit Sales', value: liveTotals.credit, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Gross Total', value: grandTotal, icon: TrendingUp, color: 'text-[#0F4C81]', bg: 'bg-[#0F4C81]/10' },
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
              {isClosed
                ? <><Lock className="h-4 w-4 text-green-600" />Shift Closed</>
                : isOpen
                ? <><ShoppingCart className="h-4 w-4 text-blue-600" />Shift Open</>
                : <><ShoppingCart className="h-4 w-4 text-muted-foreground" />Start Shift</>
              }
              {isClosed && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Done</Badge>}
              {isOpen  && <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Active</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notStarted && (
              <>
                <p className="text-sm text-muted-foreground">Open today&apos;s shift to start tracking.</p>
                {staff.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Opened by</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Opening Cash in Drawer ({cur})</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleOpen} disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Opening…</> : 'Open Shift'}
                </Button>
              </>
            )}

            {isOpen && (
              <>
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Opened by</span><span>{(todayRec?.opened_by as { name: string } | null)?.name ?? '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Opening cash</span><span>{formatCurrency(todayRec?.opening_cash ?? 0, cur)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Sales today</span><span>{liveTotals.salesCount}</span></div>
                </div>
                <p className="text-sm font-medium">Close Shift</p>
                {staff.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Closed by</Label>
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Count physical cash in drawer ({cur})</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input placeholder="Any discrepancies or notes…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                {closingCash && (
                  <div className={`flex items-center gap-2 rounded-md p-2 text-sm ${(parseFloat(closingCash) - liveTotals.cash) === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {(parseFloat(closingCash) - liveTotals.cash) === 0
                      ? <CheckCircle2 className="h-4 w-4" />
                      : <AlertTriangle className="h-4 w-4" />
                    }
                    Variance: {parseFloat(closingCash) - liveTotals.cash >= 0 ? '+' : ''}{formatCurrency(parseFloat(closingCash) - liveTotals.cash, cur)}
                  </div>
                )}
                <Button variant="destructive" className="w-full" onClick={handleClose} disabled={loading || !closingCash}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Closing…</> : 'Close & Reconcile Shift'}
                </Button>
              </>
            )}

            {isClosed && (
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Opening cash</span><span>{formatCurrency(todayRec?.opening_cash ?? 0, cur)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Counted cash</span><span>{formatCurrency(todayRec?.closing_cash_counted ?? 0, cur)}</span></div>
                  <div className="flex justify-between font-semibold"><span>Cash variance</span>
                    <span className={(todayRec?.cash_variance ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}>
                      {(todayRec?.cash_variance ?? 0) >= 0 ? '+' : ''}{formatCurrency(todayRec?.cash_variance ?? 0, cur)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Closed by</span><span>{(todayRec?.closed_by as { name: string } | null)?.name ?? '—'}</span></div>
                {todayRec?.notes && <div className="text-muted-foreground italic">"{todayRec.notes}"</div>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Last 14 Days</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">No history yet.</p>
            ) : (
              <div className="divide-y">
                {history.map(h => (
                  <div key={h.date} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{new Date(h.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-muted-foreground">
                        Cash {formatCurrency(h.system_cash_total ?? 0, cur)} · EVC {formatCurrency(h.system_evc_total ?? 0, cur)} · Credit {formatCurrency(h.system_credit_total ?? 0, cur)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={h.status === 'closed' ? 'secondary' : 'outline'} className={`text-[10px] ${h.status === 'closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} border-0`}>
                        {h.status}
                      </Badge>
                      {h.cash_variance != null && (
                        <p className={`text-xs mt-0.5 ${(h.cash_variance) < 0 ? 'text-red-500' : h.cash_variance > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
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
