'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Landmark, Plus, Pencil, Trash2, Zap, Banknote, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Account {
  id: string
  name: string
  type: string
  account_number: string | null
  bank_name: string | null
  current_balance: number
  is_active: boolean
  evc_connection_id: string | null
  created_at: string
}

interface BankAccountsClientProps {
  accounts: Account[]
  businessId: string
  currency: string
  slug: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  bank: Landmark,
  cash: Banknote,
  evc: Zap,
  card: CreditCard,
}

const emptyForm = {
  name: '',
  type: 'bank',
  account_number: '',
  bank_name: '',
  current_balance: '0',
}

export function BankAccountsClient({ accounts: initial, businessId, currency, slug }: BankAccountsClientProps) {
  const { business } = useBusiness()
  const [accounts, setAccounts] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)

  const active = accounts.filter(a => a.is_active)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({
      name: a.name,
      type: a.type,
      account_number: a.account_number ?? '',
      bank_name: a.bank_name ?? '',
      current_balance: String(a.current_balance),
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Account name is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      type: form.type,
      account_number: form.account_number || null,
      bank_name: form.bank_name || null,
      current_balance: parseFloat(form.current_balance) || 0,
      is_active: true,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('payment_accounts')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setAccounts(prev => prev.map(a => a.id === editing.id ? data : a))
      toast.success('Account updated')
    } else {
      const { data, error } = await supabase
        .from('payment_accounts')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setAccounts(prev => [...prev, data])
      toast.success('Account added')
    }
    setSaving(false)
    setSheetOpen(false)
  }

  const handleDeactivate = async (a: Account) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_active: false })
      .eq('id', a.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setAccounts(prev => prev.map(acc => acc.id === a.id ? { ...acc, is_active: false } : acc))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Account deactivated')
  }

  const totalBalance = active.reduce((s, a) => s + a.current_balance, 0)

  return (
    <div>
      <PageHeader
        title="Bank Accounts"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Bank Accounts' }]}
        action={
          <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Plus className="mr-2 h-4 w-4" />Add Account
          </Button>
        }
      />

      {active.length > 0 && (
        <Card className="mb-6 bg-gradient-to-br from-[#0F4C81] to-[#1a6db5] text-white border-0">
          <CardContent className="p-6">
            <p className="text-sm text-white/70 mb-1">Total Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance, currency)}</p>
            <p className="text-xs text-white/50 mt-1">{active.length} active account{active.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      )}

      {active.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No accounts yet"
          description="Add your bank accounts, cash accounts, and EVC accounts to track balances."
          actionLabel="Add Account"
          onAction={openNew}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map(account => {
            const Icon = TYPE_ICONS[account.type] ?? Landmark
            return (
              <Card key={account.id} className="group relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-[#0F4C81]/10">
                      <Icon className="h-5 w-5 text-[#0F4C81]" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(account)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteDialog(account)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-semibold">{account.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 mb-3">
                    <Badge variant="secondary" className="text-xs capitalize">{account.type}</Badge>
                    {account.evc_connection_id && (
                      <Badge className="text-xs bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/20">EVC Connected</Badge>
                    )}
                  </div>
                  {account.bank_name && (
                    <p className="text-xs text-muted-foreground mb-1">{account.bank_name}</p>
                  )}
                  {account.account_number && (
                    <p className="text-xs text-muted-foreground font-mono mb-3">
                      ···· {account.account_number.slice(-4)}
                    </p>
                  )}
                  <p className="text-xl font-bold">{formatCurrency(account.current_balance, currency)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Account' : 'Add Account'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Account Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Bank Account" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="evc">EVC Plus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Dahabshiil, Premier Bank..." className="mt-1" />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Last 4 digits or full number" className="mt-1" />
            </div>
            <div>
              <Label>Opening Balance ({currency})</Label>
              <Input type="number" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} className="mt-1" step="0.01" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]">
              {saving ? 'Saving...' : editing ? 'Update Account' : 'Add Account'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Deactivate ${deleteDialog?.name}?`}
        description="This account will be hidden from new transactions but history is preserved."
        confirmLabel="Deactivate"
        loading={deleting}
        onConfirm={() => deleteDialog && handleDeactivate(deleteDialog)}
      />
    </div>
  )
}
