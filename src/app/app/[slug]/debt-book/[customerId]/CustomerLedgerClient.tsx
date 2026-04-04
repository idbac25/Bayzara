'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowDownLeft, ArrowUpRight, Printer, Loader2, Phone, AlertCircle
} from 'lucide-react'

interface DebtTx {
  id: string
  type: 'credit' | 'payment' | 'adjustment'
  amount: number
  description: string | null
  created_at: string
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  customer: { id: string; name: string; primary_phone: string; notes: string | null }
  account: { id: string; current_balance: number; credit_limit: number; notes: string | null; created_at: string } | null
  transactions: DebtTx[]
  slug: string
}

type DialogMode = 'charge' | 'pay' | null

export function CustomerLedgerClient({ business, customer, account, transactions, slug }: Props) {
  const router = useRouter()
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  const balance = account?.current_balance ?? 0

  const openDialog = (mode: DialogMode) => {
    setDialogMode(mode)
    setAmount('')
    setDescription('')
  }

  const handleSubmit = async () => {
    if (!amount) return
    const endpoint = dialogMode === 'charge' ? '/api/debt/charge' : '/api/debt/pay'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        customer_id: customer.id,
        amount: parseFloat(amount),
        description: description || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed')
    } else {
      toast.success(dialogMode === 'charge' ? 'Credit recorded' : 'Payment recorded')
      setDialogMode(null)
      startTransition(() => router.refresh())
    }
  }

  const printStatement = () => {
    const w = window.open('', '_blank', 'width=520,height=700,toolbar=0,menubar=0,scrollbars=1')
    if (!w) return

    // Compute running balance (transactions are newest-first, reverse for print)
    const sorted = [...transactions].reverse()
    let running = 0
    const rows = sorted.map(tx => {
      if (tx.type === 'credit') running += tx.amount
      else running = Math.max(0, running - tx.amount)
      return `
        <tr>
          <td>${new Date(tx.created_at).toLocaleDateString()}</td>
          <td>${tx.description ?? '—'}</td>
          <td style="color:${tx.type === 'credit' ? '#e74c3c' : '#27ae60'}">${tx.type === 'credit' ? `+${formatCurrency(tx.amount, business.currency)}` : `-${formatCurrency(tx.amount, business.currency)}`}</td>
          <td style="font-weight:600">${formatCurrency(running, business.currency)}</td>
        </tr>`
    }).join('')

    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Debt Statement — ${customer.name}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; max-width: 500px; margin: 0 auto; }
        h2 { margin: 0 0 4px; } .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f5f5f5; text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #ddd; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        .total { margin-top: 16px; text-align: right; font-size: 14px; font-weight: bold; }
        .footer { margin-top: 24px; text-align: center; color: #aaa; font-size: 10px; }
        @media print { @page { margin: 8mm; } }
      </style>
    </head><body>
      <h2>${business.name}</h2>
      <div class="sub">Debt Statement — Printed ${new Date().toLocaleDateString()}</div>
      <hr/>
      <strong>${customer.name}</strong><br/>
      <span style="color:#666">${customer.primary_phone}</span>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Outstanding Balance: ${formatCurrency(balance, business.currency)}</div>
      <div class="footer">Powered by Bayzara</div>
    </body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 250)
  }

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.primary_phone}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Debt Book', href: `/app/${slug}/debt-book` },
          { label: customer.name },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={printStatement}>
              <Printer className="h-4 w-4 mr-1.5" />Print Statement
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => openDialog('charge')}
            >
              + Credit
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => openDialog('pay')}
              disabled={balance <= 0}
            >
              Record Payment
            </Button>
          </div>
        }
      />

      {/* Balance card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className={`border-2 ${balance > 0 ? 'border-red-200' : 'border-green-200'}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
            <p className={`text-3xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance, business.currency)}
            </p>
            {balance <= 0 && <Badge className="mt-1 bg-green-100 text-green-700 border-0">All settled</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Credit Limit</p>
            <p className="text-xl font-semibold">
              {account?.credit_limit ? formatCurrency(account.credit_limit, business.currency) : 'No limit'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-semibold">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact quick action */}
      <div className="flex items-center gap-2 mb-5">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <a href={`tel:${customer.primary_phone}`} className="text-sm text-[#0F4C81] hover:underline">
          {customer.primary_phone}
        </a>
      </div>

      {/* Transaction ledger */}
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-white">
          <p>No transactions yet. Use "+ Credit" to record the first credit sale.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
            <span>Date</span>
            <span className="col-span-2">Description</span>
            <span className="text-right">Amount</span>
          </div>
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              className={`grid grid-cols-4 gap-2 px-4 py-3 items-center ${i !== 0 ? 'border-t' : ''} hover:bg-muted/20`}
            >
              <span className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleDateString()}
              </span>
              <span className="col-span-2 text-sm flex items-center gap-1.5">
                {tx.type === 'credit'
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                  : <ArrowDownLeft className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                }
                {tx.description ?? (tx.type === 'credit' ? 'Credit sale' : 'Payment')}
              </span>
              <span className={`text-right font-semibold text-sm ${tx.type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, business.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={!!dialogMode} onOpenChange={open => { if (!open) setDialogMode(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'charge' ? 'Record Credit Sale' : 'Record Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">{customer.name}</p>
              <p className="mt-1">
                Current balance:{' '}
                <span className={`font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(balance, business.currency)}
                </span>
              </p>
            </div>
            {dialogMode === 'pay' && balance > 0 && (
              <button
                className="text-xs text-[#0F4C81] hover:underline"
                onClick={() => setAmount(String(balance))}
              >
                Pay full amount ({formatCurrency(balance, business.currency)})
              </button>
            )}
            <div className="space-y-1.5">
              <Label>Amount ({business.currency})</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder={dialogMode === 'charge' ? 'e.g. Groceries, Rice 5kg' : 'e.g. Cash payment'}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            {dialogMode === 'charge' && account?.credit_limit && account.credit_limit > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-md p-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                Remaining credit: {formatCurrency(Math.max(0, account.credit_limit - balance), business.currency)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || isPending}
              className={dialogMode === 'charge' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>
                : dialogMode === 'charge' ? 'Record Credit' : 'Record Payment'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
