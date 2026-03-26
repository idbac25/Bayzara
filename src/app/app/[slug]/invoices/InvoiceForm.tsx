'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, Check, Save, Eye, Loader2, Copy, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  country: string | null
}

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  sale_price: number
  tax_rate: number
  unit: string
  description: string | null
}

interface LineItemRow {
  id: string
  name: string
  description: string
  quantity: number
  rate: number
  unit: string
  tax_rate: number
  amount: number
  group_name: string
  is_group_header: boolean
}

interface InvoiceFormProps {
  slug: string
  businessId: string
  currency: string
  defaultTerms: string
  bankDetails: { bank_name?: string | null; account_name?: string | null; account_number?: string | null }
  defaultTaxRate: number
  clients: Client[]
  inventory: InventoryItem[]
  nextDocNumber: string
  documentType: string
  defaultClientId?: string
  existingDocument?: Record<string, unknown>
  existingLineItems?: LineItemRow[]
}

const DOCUMENT_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  proforma_invoice: 'Proforma Invoice',
  sales_order: 'Sales Order',
  delivery_challan: 'Delivery Challan',
  credit_note: 'Credit Note',
  payment_receipt: 'Payment Receipt',
  purchase: 'Purchase',
  expense: 'Expense',
  purchase_order: 'Purchase Order',
  payout_receipt: 'Payout Receipt',
  debit_note: 'Debit Note',
}

function createEmptyLine(): LineItemRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    quantity: 1,
    rate: 0,
    unit: 'pcs',
    tax_rate: 0,
    amount: 0,
    group_name: '',
    is_group_header: false,
  }
}

function calcLine(line: LineItemRow): number {
  const base = line.quantity * line.rate
  const tax = base * (line.tax_rate / 100)
  return base + tax
}

export function InvoiceForm({
  slug,
  businessId,
  currency,
  defaultTerms,
  bankDetails,
  defaultTaxRate,
  clients,
  inventory,
  nextDocNumber,
  documentType,
  defaultClientId,
  existingDocument,
  existingLineItems,
}: InvoiceFormProps) {
  const { business } = useBusiness()
  const router = useRouter()

  const label = DOCUMENT_LABELS[documentType] ?? 'Document'

  // Form state
  const [docNumber, setDocNumber] = useState((existingDocument?.document_number as string) ?? nextDocNumber)
  const [title, setTitle] = useState((existingDocument?.title as string) ?? label)
  const [date, setDate] = useState((existingDocument?.date as string) ?? new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState((existingDocument?.due_date as string) ?? '')
  const [selectedClientId, setSelectedClientId] = useState(
    (existingDocument?.client_id as string) ?? defaultClientId ?? ''
  )
  const [notes, setNotes] = useState((existingDocument?.notes as string) ?? '')
  const [terms, setTerms] = useState((existingDocument?.terms as string) ?? defaultTerms)
  const [showBankDetails, setShowBankDetails] = useState(true)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    (existingDocument?.discount_type as 'percentage' | 'fixed') ?? 'percentage'
  )
  const [discountValue, setDiscountValue] = useState(Number(existingDocument?.discount_value ?? 0))
  const [additionalCharges, setAdditionalCharges] = useState(Number(existingDocument?.additional_charges ?? 0))
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState(
    (existingDocument?.additional_charges_label as string) ?? 'Shipping'
  )

  const [lines, setLines] = useState<LineItemRow[]>(
    existingLineItems ?? [createEmptyLine()]
  )

  const [clientSearch, setClientSearch] = useState('')
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'edit' | 'preview'>('edit')
  const [savedDocId, setSavedDocId] = useState((existingDocument?.id as string) ?? null)

  const selectedClient = clients.find(c => c.id === selectedClientId)

  // Calculations
  const subtotal = lines.filter(l => !l.is_group_header).reduce((s, l) => s + calcLine(l), 0)
  const taxTotal = lines.filter(l => !l.is_group_header).reduce((s, l) => {
    const base = l.quantity * l.rate
    return s + base * (l.tax_rate / 100)
  }, 0)
  const discountAmount = discountType === 'percentage'
    ? subtotal * (discountValue / 100)
    : discountValue
  const total = subtotal - discountAmount + additionalCharges

  const updateLine = (id: string, field: keyof LineItemRow, value: unknown) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      if (['quantity', 'rate', 'tax_rate'].includes(field)) {
        updated.amount = calcLine(updated)
      }
      return updated
    }))
  }

  const addLine = () => setLines(prev => [...prev, createEmptyLine()])

  const addGroup = () => setLines(prev => [...prev, {
    ...createEmptyLine(),
    name: 'Group Header',
    is_group_header: true,
  }])

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id))

  const selectInventoryItem = (lineId: string, item: InventoryItem) => {
    setLines(prev => prev.map(l => l.id === lineId ? {
      ...l,
      name: item.name,
      description: item.description ?? '',
      rate: item.sale_price,
      unit: item.unit,
      tax_rate: item.tax_rate,
      amount: calcLine({ ...l, name: item.name, rate: item.sale_price, tax_rate: item.tax_rate }),
    } : l))
  }

  const saveDocument = async (status: 'draft' | 'sent') => {
    setSaving(true)
    const supabase = createClient()

    const docPayload = {
      business_id: businessId,
      type: documentType,
      document_number: docNumber,
      title,
      date,
      due_date: dueDate || null,
      client_id: selectedClientId || null,
      status,
      currency,
      subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount,
      tax_amount: taxTotal,
      additional_charges: additionalCharges,
      additional_charges_label: additionalChargesLabel,
      total,
      amount_paid: Number(existingDocument?.amount_paid ?? 0),
      amount_due: total - Number(existingDocument?.amount_paid ?? 0),
      notes: notes || null,
      terms: terms || null,
      bank_details: showBankDetails ? bankDetails : null,
    }

    let docId = savedDocId

    if (docId) {
      const { error } = await supabase
        .from('documents')
        .update(docPayload)
        .eq('id', docId)
      if (error) { toast.error(error.message); setSaving(false); return }

      // Delete old line items and re-insert
      await supabase.from('line_items').delete().eq('document_id', docId)
    } else {
      const { data, error } = await supabase
        .from('documents')
        .insert(docPayload)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      docId = data.id
      setSavedDocId(docId)
    }

    // Insert line items
    const linePayloads = lines
      .filter(l => !l.is_group_header && l.name)
      .map((l, i) => ({
        document_id: docId,
        sort_order: i,
        name: l.name,
        description: l.description || null,
        quantity: l.quantity,
        rate: l.rate,
        unit: l.unit,
        tax_rate: l.tax_rate,
        tax_amount: l.quantity * l.rate * (l.tax_rate / 100),
        amount: calcLine(l),
        group_name: l.group_name || null,
      }))

    if (linePayloads.length > 0) {
      await supabase.from('line_items').insert(linePayloads)
    }

    setSaving(false)
    toast.success(status === 'sent' ? 'Invoice saved & marked as sent' : 'Invoice saved as draft')

    if (status === 'sent') {
      setStep('preview')
    } else {
      router.push(`/app/${slug}/invoices/${docId}`)
    }
  }

  const typeSlug = documentType === 'invoice' ? 'invoices' : `${documentType.replace(/_/g, '-')}s`

  return (
    <div>
      <PageHeader
        title={existingDocument ? `Edit ${label}` : `Create ${label}`}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: `${label}s`, href: `/app/${slug}/${typeSlug}` },
          { label: existingDocument ? 'Edit' : 'New' },
        ]}
      />

      {step === 'edit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header info */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Title</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{label} Number</Label>
                    <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Client selector */}
                <div className="space-y-2">
                  <Label>Billed To</Label>
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        {selectedClient ? selectedClient.name : 'Select client...'}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search clients..." value={clientSearch} onValueChange={setClientSearch} />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2 text-center">
                              <p className="text-sm text-muted-foreground mb-2">No client found</p>
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/app/${slug}/clients`}>Add Client</Link>
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="" onSelect={() => { setSelectedClientId(''); setClientPopoverOpen(false) }}>
                              <span className="text-muted-foreground">No client</span>
                            </CommandItem>
                            {clients.map(c => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => { setSelectedClientId(c.id); setClientPopoverOpen(false) }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${selectedClientId === c.id ? 'opacity-100' : 'opacity-0'}`} />
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedClient && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-0.5">
                      <p className="font-medium">{selectedClient.name}</p>
                      {selectedClient.email && <p className="text-muted-foreground">{selectedClient.email}</p>}
                      {selectedClient.phone && <p className="text-muted-foreground">{selectedClient.phone}</p>}
                      {selectedClient.address_line1 && <p className="text-muted-foreground">{selectedClient.address_line1}, {selectedClient.city}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-1 text-right">Tax%</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="divide-y">
                  {lines.map((line, idx) => (
                    line.is_group_header ? (
                      <div key={line.id} className="flex items-center gap-2 px-4 py-2 bg-blue-50/50">
                        <Input
                          value={line.name}
                          onChange={e => updateLine(line.id, 'name', e.target.value)}
                          className="font-semibold text-sm border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                          placeholder="Group name..."
                        />
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div key={line.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-start">
                        <div className="col-span-4 space-y-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Input
                                value={line.name}
                                onChange={e => updateLine(line.id, 'name', e.target.value)}
                                placeholder="Item name"
                                className="h-8 text-sm"
                              />
                            </PopoverTrigger>
                            {inventory.length > 0 && (
                              <PopoverContent className="p-0 w-64" align="start">
                                <Command>
                                  <CommandInput placeholder="Search items..." />
                                  <CommandList>
                                    <CommandGroup>
                                      {inventory.map(item => (
                                        <CommandItem
                                          key={item.id}
                                          onSelect={() => selectInventoryItem(line.id, item)}
                                        >
                                          <div>
                                            <p className="text-sm font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatCurrency(item.sale_price, currency)}</p>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            )}
                          </Popover>
                          <Input
                            value={line.description}
                            onChange={e => updateLine(line.id, 'description', e.target.value)}
                            placeholder="Description (optional)"
                            className="h-7 text-xs text-muted-foreground border-dashed"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right"
                            min="0"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={line.rate}
                            onChange={e => updateLine(line.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={line.tax_rate}
                            onChange={e => updateLine(line.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm text-right"
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <span className="text-sm font-medium">{formatCurrency(calcLine(line), currency)}</span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeLine(line.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                <div className="flex gap-2 px-4 py-3 border-t">
                  <Button variant="ghost" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add Line Item
                  </Button>
                  <Button variant="ghost" size="sm" onClick={addGroup}>
                    <Plus className="mr-1 h-3.5 w-3.5" />Add Group
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any notes for the client..."
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <textarea
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* Bank details toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-bank"
                    checked={showBankDetails}
                    onChange={e => setShowBankDetails(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="show-bank" className="cursor-pointer">Show bank details on invoice</Label>
                </div>
                {showBankDetails && (bankDetails.bank_name || bankDetails.account_number) && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    {bankDetails.bank_name && <p><span className="text-muted-foreground">Bank:</span> {bankDetails.bank_name}</p>}
                    {bankDetails.account_name && <p><span className="text-muted-foreground">Account Name:</span> {bankDetails.account_name}</p>}
                    {bankDetails.account_number && <p><span className="text-muted-foreground">Account #:</span> {bankDetails.account_number}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Totals + Actions */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={discountType} onValueChange={v => setDiscountType(v as 'percentage' | 'fixed')}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Discount %</SelectItem>
                        <SelectItem value="fixed">Discount $</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={discountValue}
                      onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm flex-1"
                      min="0"
                    />
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-[#27AE60]">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount, currency)}</span>
                    </div>
                  )}
                </div>

                {/* Tax */}
                {taxTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(taxTotal, currency)}</span>
                  </div>
                )}

                {/* Additional Charges */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      value={additionalChargesLabel}
                      onChange={e => setAdditionalChargesLabel(e.target.value)}
                      className="h-8 text-xs flex-1"
                      placeholder="Charge label"
                    />
                    <Input
                      type="number"
                      value={additionalCharges}
                      onChange={e => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-24"
                      min="0"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total, currency)}</span>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]"
                    onClick={() => saveDocument('sent')}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                    Save & Preview
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => saveDocument('draft')}
                    disabled={saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Preview Step */
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('edit')}>
              ← Back to Edit
            </Button>
            {savedDocId && (
              <>
                <Button asChild variant="outline">
                  <Link href={`/api/pdf/invoice/${savedDocId}`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />Download PDF
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/i/${savedDocId}`)
                    toast.success('Link copied')
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />Copy Link
                </Button>
                <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
                  <Link href={`/app/${slug}/invoices/${savedDocId}`}>
                    View Invoice
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Invoice Preview */}
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex justify-between mb-8">
                  <div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
                      <span className="text-white font-bold text-xl">B</span>
                    </div>
                    <h2 className="font-bold text-lg">{business.name}</h2>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-bold text-[#0F4C81] mb-2">{title.toUpperCase()}</h1>
                    <p className="text-muted-foreground text-sm">#{docNumber}</p>
                    <p className="text-sm">Date: {date}</p>
                    {dueDate && <p className="text-sm">Due: {dueDate}</p>}
                  </div>
                </div>

                {selectedClient && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bill To</p>
                    <p className="font-semibold">{selectedClient.name}</p>
                    {selectedClient.email && <p className="text-sm text-muted-foreground">{selectedClient.email}</p>}
                    {selectedClient.phone && <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>}
                  </div>
                )}

                {/* Line items */}
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
                    {lines.filter(l => !l.is_group_header && l.name).map(l => (
                      <tr key={l.id} className="border-b border-gray-100">
                        <td className="py-2">
                          <p className="font-medium">{l.name}</p>
                          {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
                        </td>
                        <td className="py-2 text-right">{l.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(l.rate, currency)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(calcLine(l), currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-56 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#27AE60]">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}
                    {taxTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(taxTotal, currency)}</span>
                      </div>
                    )}
                    {additionalCharges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{additionalChargesLabel}</span>
                        <span>{formatCurrency(additionalCharges, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-[#0F4C81]">
                      <span>Total</span>
                      <span className="text-[#0F4C81]">{formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                </div>

                {notes && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
                    <p className="text-sm">{notes}</p>
                  </div>
                )}
                {terms && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Terms</p>
                    <p className="text-sm text-muted-foreground">{terms}</p>
                  </div>
                )}
                {showBankDetails && bankDetails.account_number && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Bank Details</p>
                    <div className="text-sm space-y-0.5">
                      {bankDetails.bank_name && <p>{bankDetails.bank_name}</p>}
                      {bankDetails.account_name && <p>Account: {bankDetails.account_name}</p>}
                      {bankDetails.account_number && <p>#{bankDetails.account_number}</p>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
