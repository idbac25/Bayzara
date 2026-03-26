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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, Check, Save, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

interface Vendor {
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
  purchase_price: number
  tax_rate: number
  unit: string
  description: string | null
}

interface LineItem {
  id: string
  name: string
  description: string
  quantity: number
  rate: number
  unit: string
  tax_rate: number
  amount: number
}

interface PurchaseFormProps {
  slug: string
  businessId: string
  currency: string
  defaultTaxRate: number
  defaultTerms: string
  vendors: Vendor[]
  inventory: InventoryItem[]
  nextDocNumber: string
  documentType: string
  defaultVendorId?: string
  existingDocument?: Record<string, unknown>
  existingLineItems?: LineItem[]
}

const DOC_LABELS: Record<string, string> = {
  purchase: 'Bill',
  expense: 'Expense',
  purchase_order: 'Purchase Order',
}

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    quantity: 1,
    rate: 0,
    unit: 'pcs',
    tax_rate: 0,
    amount: 0,
  }
}

function calcLine(line: LineItem): number {
  const base = line.quantity * line.rate
  return base + base * (line.tax_rate / 100)
}

export function PurchaseForm({
  slug, businessId, currency, defaultTaxRate, defaultTerms,
  vendors, inventory, nextDocNumber, documentType,
  defaultVendorId, existingDocument, existingLineItems,
}: PurchaseFormProps) {
  const router = useRouter()
  const { business } = useBusiness()
  const isEdit = !!existingDocument

  const [docType, setDocType] = useState(documentType)
  const [docNumber, setDocNumber] = useState(String(existingDocument?.document_number ?? nextDocNumber))
  const [date, setDate] = useState(String(existingDocument?.date ?? new Date().toISOString().split('T')[0]))
  const [dueDate, setDueDate] = useState(String(existingDocument?.due_date ?? ''))
  const [selectedVendorId, setSelectedVendorId] = useState(
    String(existingDocument?.vendor_id ?? defaultVendorId ?? '')
  )
  const [vendorOpen, setVendorOpen] = useState(false)
  const [notes, setNotes] = useState(String(existingDocument?.notes ?? ''))
  const [terms, setTerms] = useState(String(existingDocument?.terms ?? defaultTerms))
  const [discountPercent, setDiscountPercent] = useState(Number(existingDocument?.discount_percent ?? 0))
  const [additionalCharges, setAdditionalCharges] = useState(Number(existingDocument?.additional_charges ?? 0))
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState(
    String(existingDocument?.additional_charges_label ?? 'Shipping & Handling')
  )
  const [lines, setLines] = useState<LineItem[]>(existingLineItems ?? [createEmptyLine()])
  const [saving, setSaving] = useState(false)

  const selectedVendor = vendors.find(v => v.id === selectedVendorId)

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const taxAmount = lines.reduce((s, l) => {
    const base = l.quantity * l.rate
    return s + base * (l.tax_rate / 100)
  }, 0)
  const total = subtotal - discountAmount + taxAmount + additionalCharges

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      updated.amount = calcLine(updated)
      return updated
    }))
  }

  function selectInventory(lineId: string, item: InventoryItem) {
    setLines(prev => prev.map(l => {
      if (l.id !== lineId) return l
      const updated = {
        ...l,
        name: item.name,
        description: item.description ?? '',
        rate: item.purchase_price,
        unit: item.unit,
        tax_rate: item.tax_rate,
      }
      updated.amount = calcLine(updated)
      return updated
    }))
  }

  const handleSave = async (status = 'draft') => {
    if (!docNumber.trim()) { toast.error('Document number is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      type: docType,
      document_number: docNumber,
      date,
      due_date: dueDate || null,
      vendor_id: selectedVendorId || null,
      status,
      currency,
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      additional_charges: additionalCharges,
      additional_charges_label: additionalChargesLabel,
      total,
      amount_paid: Number(existingDocument?.amount_paid ?? 0),
      amount_due: total - Number(existingDocument?.amount_paid ?? 0),
      notes: notes || null,
      terms: terms || null,
    }

    let docId: string | undefined

    if (isEdit) {
      const { error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', String(existingDocument!.id))
      if (error) { toast.error(error.message); setSaving(false); return }
      docId = String(existingDocument!.id)
      await supabase.from('line_items').delete().eq('document_id', docId)
    } else {
      const { data, error } = await supabase
        .from('documents')
        .insert(payload)
        .select('id')
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      docId = data.id
    }

    if (lines.filter(l => l.name).length > 0) {
      await supabase.from('line_items').insert(
        lines.filter(l => l.name).map((l, i) => ({
          document_id: docId,
          name: l.name,
          description: l.description || null,
          quantity: l.quantity,
          rate: l.rate,
          unit: l.unit,
          tax_rate: l.tax_rate,
          amount: l.amount,
          sort_order: i,
        }))
      )
    }

    toast.success(isEdit ? 'Purchase updated' : 'Purchase saved')
    router.push(`/app/${slug}/purchases/${docId}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={isEdit ? `Edit ${DOC_LABELS[docType] ?? 'Purchase'}` : `New ${DOC_LABELS[docType] ?? 'Purchase'}`}
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Purchases', href: `/app/${slug}/purchases` },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Bill</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number</Label>
                <Input value={docNumber} onChange={e => setDocNumber(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Vendor selector */}
            <div>
              <Label>Vendor</Label>
              <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-between">
                    {selectedVendor?.name ?? 'Select vendor...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <Command>
                    <CommandInput placeholder="Search vendors..." />
                    <CommandList>
                      <CommandEmpty>No vendors found.</CommandEmpty>
                      <CommandGroup>
                        {vendors.map(v => (
                          <CommandItem
                            key={v.id}
                            value={v.name}
                            onSelect={() => { setSelectedVendorId(v.id); setVendorOpen(false) }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedVendorId === v.id ? 'opacity-100' : 'opacity-0'}`} />
                            {v.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedVendor && (
                <p className="text-xs text-muted-foreground mt-1">
                  {[selectedVendor.phone, selectedVendor.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Input
                          placeholder="Item name"
                          value={line.name}
                          onChange={e => updateLine(line.id, 'name', e.target.value)}
                        />
                      </PopoverTrigger>
                      {inventory.length > 0 && (
                        <PopoverContent className="w-64 p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                              <CommandEmpty>No items found.</CommandEmpty>
                              <CommandGroup>
                                {inventory.filter(i =>
                                  i.name.toLowerCase().includes(line.name.toLowerCase())
                                ).slice(0, 8).map(item => (
                                  <CommandItem
                                    key={item.id}
                                    onSelect={() => selectInventory(line.id, item)}
                                  >
                                    <div>
                                      <p className="text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{formatCurrency(item.purchase_price, currency)}</p>
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
                      placeholder="Description"
                      value={line.description}
                      onChange={e => updateLine(line.id, 'description', e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={e => updateLine(line.id, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Tax %"
                      value={line.tax_rate}
                      onChange={e => updateLine(line.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1 text-right pt-2">
                    <span className="text-sm font-medium">{formatCurrency(calcLine(line), currency)}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines(prev => [...prev, createEmptyLine()])}
              className="mt-3"
            >
              <Plus className="mr-2 h-3.5 w-3.5" />Add Line
            </Button>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-[#E74C3C]">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(taxAmount, currency)}</span>
                  </div>
                )}
                {additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{additionalChargesLabel}</span>
                    <span>{formatCurrency(additionalCharges, currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extras */}
        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                value={discountPercent}
                onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="mt-1"
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label>{additionalChargesLabel}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Label"
                  value={additionalChargesLabel}
                  onChange={e => setAdditionalChargesLabel(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={additionalCharges}
                  onChange={e => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                  className="w-28"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Terms</Label>
              <Input
                value={terms}
                onChange={e => setTerms(e.target.value)}
                placeholder="Payment terms"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <Button
            onClick={() => handleSave('draft')}
            disabled={saving}
            variant="outline"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave('sent')}
            disabled={saving}
            className="bg-[#0F4C81] hover:bg-[#0d3f6e]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Update' : 'Save Purchase'}
          </Button>
        </div>
      </div>
    </div>
  )
}
