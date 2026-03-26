'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Download, Copy, CreditCard, Loader2, CheckCircle } from 'lucide-react'

interface DocRecord {
  id: string
  document_number: string
  type: string
  date: string
  due_date?: string | null
  status: string
  currency: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  additional_charges: number
  additional_charges_label?: string | null
  total: number
  amount_paid: number
  amount_due: number
  notes?: string | null
  terms?: string | null
  client_id?: string | null
  business_id: string
  public_token: string
}

interface LineItemRecord {
  id: string
  name: string
  description?: string | null
  quantity: number
  rate: number
  amount: number
}

interface ClientRecord {
  name: string
  email?: string | null
  phone?: string | null
  address_line1?: string | null
}

interface PaymentRecord {
  id: string
  amount: number
  date: string
  payment_method: string
  auto_recorded?: boolean
}

interface BusinessRecord {
  name: string
  address_line1?: string | null
  city?: string | null
  phone?: string | null
  logo_url?: string | null
}

interface Props {
  document: DocRecord
  lineItems: LineItemRecord[]
  client: ClientRecord | null
  payments: PaymentRecord[]
  paymentAccounts: Array<{ id: string; name: string; type: string }>
  business: BusinessRecord
  slug: string
}

export function InvoiceDetailClient({ document: doc, lineItems, client, payments, paymentAccounts, business, slug }: Props) {
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(String(doc.amount_due))
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const currency = doc.currency

  const recordPayment = async () => {
    setSaving(true)
    const supabase = createClient()
    const amount = parseFloat(paymentAmount)

    const { error } = await supabase.from('payment_records').insert({
      document_id: doc.id,
      business_id: doc.business_id,
      amount,
      date: paymentDate,
      payment_method: paymentMethod,
      payment_account_id: paymentAccountId || null,
      reference_number: paymentRef || null,
      notes: paymentNotes || null,
    })

    if (error) { toast.error(error.message); setSaving(false); return }

    // Update document payment status
    const newPaid = (doc.amount_paid) + amount
    const newDue = (doc.total) - newPaid
    const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : doc.status

    await supabase
      .from('documents')
      .update({ amount_paid: newPaid, amount_due: Math.max(0, newDue), status: newStatus })
      .eq('id', doc.id)

    toast.success('Payment recorded')
    setSaving(false)
    setShowPaymentModal(false)
    router.refresh()
  }

  const typeLabel = (doc.type).replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div>
      <PageHeader
        title={`${typeLabel} ${doc.document_number}`}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Invoices', href: `/app/${slug}/invoices` },
          { label: String(doc.document_number) },
        ]}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={doc.status} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${slug}/invoices/${doc.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/pdf/invoice/${doc.id}`} target="_blank">
                <Download className="mr-2 h-4 w-4" />PDF
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/i/${doc.public_token}`)
                toast.success('Public link copied')
              }}
            >
              <Copy className="mr-2 h-4 w-4" />Share
            </Button>
            {doc.status !== 'paid' && (
              <Button
                size="sm"
                className="bg-[#0F4C81] hover:bg-[#0d3f6e]"
                onClick={() => setShowPaymentModal(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" />Record Payment
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-8">
              {/* Invoice Header */}
              <div className="flex justify-between mb-8">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                    style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
                    <span className="text-white font-bold">B</span>
                  </div>
                  <h2 className="font-bold">{business.name}</h2>
                  {business.address_line1 && <p className="text-sm text-muted-foreground">{business.address_line1}</p>}
                  {business.city && <p className="text-sm text-muted-foreground">{business.city}</p>}
                </div>
                <div className="text-right">
                  <h1 className="text-3xl font-bold text-[#0F4C81] mb-1">{typeLabel.toUpperCase()}</h1>
                  <p className="text-muted-foreground">#{doc.document_number}</p>
                  <p className="text-sm">Date: {formatDate(doc.date)}</p>
                  {doc.due_date && <p className="text-sm">Due: {formatDate(doc.due_date)}</p>}
                </div>
              </div>

              {client && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
                  <p className="font-semibold">{client.name}</p>
                  {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
                  {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
                </div>
              )}

              {/* Line Items */}
              <table className="w-full mb-6 text-sm">
                <thead>
                  <tr className="border-b-2 border-[#0F4C81]">
                    <th className="text-left py-2 font-semibold text-[#0F4C81]">Item</th>
                    <th className="text-right py-2 font-semibold text-[#0F4C81]">Qty</th>
                    <th className="text-right py-2 font-semibold text-[#0F4C81]">Rate</th>
                    <th className="text-right py-2 font-semibold text-[#0F4C81]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(li => (
                    <tr key={li.id} className="border-b border-gray-100">
                      <td className="py-2">
                        <p className="font-medium">{li.name}</p>
                        {li.description && <p className="text-xs text-muted-foreground">{li.description}</p>}
                      </td>
                      <td className="py-2 text-right">{li.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(li.rate, currency)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(li.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(doc.subtotal, currency)}</span>
                  </div>
                  {(doc.discount_amount) > 0 && (
                    <div className="flex justify-between text-[#27AE60]">
                      <span>Discount</span>
                      <span>-{formatCurrency(doc.discount_amount, currency)}</span>
                    </div>
                  )}
                  {(doc.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(doc.tax_amount, currency)}</span>
                    </div>
                  )}
                  {(doc.additional_charges) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{doc.additional_charges_label}</span>
                      <span>{formatCurrency(doc.additional_charges, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-[#0F4C81]">
                    <span>Total</span>
                    <span className="text-[#0F4C81]">{formatCurrency(doc.total, currency)}</span>
                  </div>
                  {(doc.amount_paid) > 0 && (
                    <>
                      <div className="flex justify-between text-[#27AE60]">
                        <span>Amount Paid</span>
                        <span>-{formatCurrency(doc.amount_paid, currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Balance Due</span>
                        <span className={(doc.amount_due) > 0 ? 'text-[#E74C3C]' : 'text-[#27AE60]'}>
                          {formatCurrency(doc.amount_due, currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {doc.notes && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                  <p className="text-sm">{doc.notes}</p>
                </div>
              )}
              {doc.terms && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Terms</p>
                  <p className="text-sm text-muted-foreground">{doc.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Total</span>
                <span className="font-medium">{formatCurrency(doc.total, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-medium text-[#27AE60]">{formatCurrency(doc.amount_paid, currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Balance Due</span>
                <span className={(doc.amount_due) > 0 ? 'text-[#E74C3C]' : 'text-[#27AE60]'}>
                  {formatCurrency(doc.amount_due, currency)}
                </span>
              </div>
              {doc.status !== 'paid' && (
                <Button
                  className="w-full mt-3 bg-[#0F4C81] hover:bg-[#0d3f6e]"
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />Record Payment
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="flex items-start justify-between text-sm">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-[#27AE60]" />
                        <span className="font-medium">{formatCurrency(p.amount, currency)}</span>
                        {p.auto_recorded && (
                          <Badge className="text-[10px] bg-[#F5A623]/20 text-[#F5A623] border-0 py-0">EVC</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(p.payment_method).replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="evc_plus">EVC Plus</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentAccounts.length > 0 && (
              <div className="space-y-2">
                <Label>Payment Account</Label>
                <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account (optional)" /></SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={saving} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
