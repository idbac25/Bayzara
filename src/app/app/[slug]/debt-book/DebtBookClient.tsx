'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBusiness } from '@/contexts/BusinessContext'
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
  BookOpen, Users, DollarSign, Plus, Search,
  ChevronRight, Loader2, AlertCircle
} from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

interface DebtAccount {
  id: string
  current_balance: number
  credit_limit: number
  updated_at: string
  pos_customers: {
    id: string
    name: string
    primary_phone: string
  } | null
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  accounts: DebtAccount[]
  totalOutstanding: number
  customersInDebt: number
  slug: string
}

type DialogMode = 'charge' | 'pay' | null

export function DebtBookClient({ business, accounts, totalOutstanding, customersInDebt, slug }: Props) {
  const t = useT()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedAccount, setSelectedAccount] = useState<DebtAccount | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    return (
      a.pos_customers?.name.toLowerCase().includes(q) ||
      a.pos_customers?.primary_phone.includes(q)
    )
  })

  const openDialog = (mode: DialogMode, account: DebtAccount) => {
    setDialogMode(mode)
    setSelectedAccount(account)
    setAmount('')
    setDescription('')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedAccount(null)
    setAmount('')
    setDescription('')
  }

  const handleSubmit = async () => {
    if (!selectedAccount || !amount) return
    const endpoint = dialogMode === 'charge' ? '/api/debt/charge' : '/api/debt/pay'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        customer_id: selectedAccount.pos_customers?.id,
        amount: parseFloat(amount),
        description: description || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed')
    } else {
      toast.success(dialogMode === 'charge' ? 'Credit recorded' : 'Payment recorded')
      closeDialog()
      startTransition(() => router.refresh())
    }
  }

  return (
    <div>
      <PageHeader
        title={t.debtBook.title}
        description={t.debtBook.subtitle}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: t.debtBook.title },
        ]}
        action={
          <Link href={`/app/${slug}/customers`}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />{t.debtBook.addCustomer}
            </Button>
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.debtBook.totalOutstanding}</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalOutstanding, business.currency)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.debtBook.customersInDebt}</p>
              <p className="text-xl font-bold text-amber-600">{customersInDebt}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.debtBook.totalAccounts}</p>
              <p className="text-xl font-bold text-blue-600">{accounts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Accounts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t.debtBook.noDebtYet}</p>
          <p className="text-sm mt-1">{t.debtBook.noDebtDesc}</p>
          <Link href={`/app/${slug}/customers`}>
            <Button className="mt-4" size="sm">{t.debtBook.addCustomer}</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          {filtered.map((account, i) => {
            const customer = account.pos_customers
            const overLimit = account.credit_limit > 0 && account.current_balance > account.credit_limit
            return (
              <div
                key={account.id}
                className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors ${i !== 0 ? 'border-t' : ''}`}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-[#0F4C81]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-[#0F4C81]">
                    {customer?.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>

                {/* Name & phone */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{customer?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{customer?.primary_phone}</p>
                </div>

                {/* Balance */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${account.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {account.current_balance > 0 ? formatCurrency(account.current_balance, business.currency) : t.common.settled}
                  </p>
                  {account.credit_limit > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Limit: {formatCurrency(account.credit_limit, business.currency)}
                    </p>
                  )}
                  {overLimit && (
                    <Badge variant="destructive" className="text-[10px] h-4 mt-0.5">{t.debtBook.overLimit}</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => openDialog('charge', account)}
                  >
                    {t.debtBook.charge}
                  </Button>
                  {account.current_balance > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => openDialog('pay', account)}
                    >
                      {t.debtBook.pay}
                    </Button>
                  )}
                  <Link href={`/app/${slug}/debt-book/${customer?.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Charge / Pay dialog */}
      <Dialog open={!!dialogMode} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'charge' ? t.debtBook.recordCredit : t.debtBook.recordPayment}
            </DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              {/* Customer summary */}
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{selectedAccount.pos_customers?.name}</p>
                <p className="text-muted-foreground text-xs">{selectedAccount.pos_customers?.primary_phone}</p>
                <p className="mt-1">
                  {t.debtBook.currentBalance}{' '}
                  <span className={`font-semibold ${selectedAccount.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedAccount.current_balance, business.currency)}
                  </span>
                </p>
              </div>

              {dialogMode === 'pay' && selectedAccount.current_balance > 0 && (
                <button
                  className="text-xs text-[#0F4C81] hover:underline"
                  onClick={() => setAmount(String(selectedAccount.current_balance))}
                >
                  {t.debtBook.payFullAmount} ({formatCurrency(selectedAccount.current_balance, business.currency)})
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

              {dialogMode === 'charge' && selectedAccount.credit_limit > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-md p-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  Credit limit: {formatCurrency(selectedAccount.credit_limit, business.currency)}
                  {' '}· Remaining: {formatCurrency(Math.max(0, selectedAccount.credit_limit - selectedAccount.current_balance), business.currency)}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t.common.cancel}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || isPending}
              className={dialogMode === 'charge' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />{t.common.saving}</>
                : dialogMode === 'charge' ? t.debtBook.recordCredit : t.debtBook.recordPayment
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
