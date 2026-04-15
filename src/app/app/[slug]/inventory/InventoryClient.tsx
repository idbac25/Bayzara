'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import { Package, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { useT } from '@/contexts/LanguageContext'

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  description: string | null
  unit: string
  sale_price: number
  purchase_price: number
  tax_rate: number
  stock_quantity: number | null
  reorder_level: number | null
  type: string
  archived: boolean
  created_at: string
}

interface InventoryClientProps {
  items: InventoryItem[]
  businessId: string
  currency: string
  slug: string
}

const emptyForm = {
  name: '',
  sku: '',
  description: '',
  unit: 'pcs',
  sale_price: '0',
  purchase_price: '0',
  tax_rate: '0',
  stock_quantity: '',
  reorder_level: '',
  type: 'product',
}

export function InventoryClient({ items: initial, businessId, currency, slug }: InventoryClientProps) {
  const { business } = useBusiness()
  const t = useT()
  const [items, setItems] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const active = items.filter(i => !i.archived)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({
      name: item.name,
      sku: item.sku ?? '',
      description: item.description ?? '',
      unit: item.unit,
      sale_price: String(item.sale_price),
      purchase_price: String(item.purchase_price),
      tax_rate: String(item.tax_rate),
      stock_quantity: item.stock_quantity != null ? String(item.stock_quantity) : '',
      reorder_level: item.reorder_level != null ? String(item.reorder_level) : '',
      type: item.type,
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      sku: form.sku || null,
      description: form.description || null,
      unit: form.unit,
      sale_price: parseFloat(form.sale_price) || 0,
      purchase_price: parseFloat(form.purchase_price) || 0,
      tax_rate: parseFloat(form.tax_rate) || 0,
      stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : null,
      reorder_level: form.reorder_level ? parseInt(form.reorder_level) : null,
      type: form.type,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setItems(prev => prev.map(i => i.id === editing.id ? data : i))
      toast.success('Item updated')
    } else {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setItems(prev => [data, ...prev])
      toast.success('Item added')
    }
    setSaving(false)
    setSheetOpen(false)
  }

  const handleArchive = async (item: InventoryItem) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('inventory_items')
      .update({ archived: true })
      .eq('id', item.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, archived: true } : i))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Item archived')
  }

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'name',
      header: 'Item',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.sku && <p className="text-xs text-muted-foreground font-mono">{row.original.sku}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="text-xs capitalize">{String(getValue())}</Badge>
      ),
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue())}</span>,
    },
    {
      accessorKey: 'sale_price',
      header: 'Sale Price',
      cell: ({ getValue }) => <span className="font-medium">{formatCurrency(Number(getValue()), currency)}</span>,
    },
    {
      accessorKey: 'purchase_price',
      header: 'Purchase Price',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatCurrency(Number(getValue()), currency)}</span>,
    },
    {
      accessorKey: 'stock_quantity',
      header: 'Stock',
      cell: ({ row }) => {
        const qty = row.original.stock_quantity
        const reorder = row.original.reorder_level
        if (qty == null) return <span className="text-muted-foreground">—</span>
        const low = reorder != null && qty <= reorder
        return (
          <span className={`font-medium ${low ? 'text-[#E74C3C]' : ''}`}>
            {qty} {row.original.unit}
            {low && <span className="ml-1 text-xs">(low)</span>}
          </span>
        )
      },
    },
    {
      accessorKey: 'tax_rate',
      header: 'Tax',
      cell: ({ getValue }) => <span className="text-sm">{Number(getValue())}%</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteDialog(row.original)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t.inventory.title}
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: t.inventory.title }]}
        action={
          <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Plus className="mr-2 h-4 w-4" />{t.inventory.addItem}
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t.inventory.noItemsYet}
          description={t.inventory.noItemsDesc}
          actionLabel={t.inventory.addItem}
          onAction={openNew}
        />
      ) : (
        <DataTable
          data={active}
          columns={columns}
          searchPlaceholder="Search items..."
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? t.inventory.editItem : t.inventory.addItem}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{t.inventory.itemName}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.inventory.itemNamePlaceholder} className="mt-1" />
              </div>
              <div>
                <Label>{t.inventory.skuCode}</Label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU-001" className="mt-1" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">{t.inventory.product}</SelectItem>
                    <SelectItem value="service">{t.inventory.service}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs" className="mt-1" />
              </div>
              <div>
                <Label>Tax Rate %</Label>
                <Input type="number" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} className="mt-1" min={0} />
              </div>
              <div>
                <Label>Sale Price ({currency})</Label>
                <Input type="number" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} className="mt-1" min={0} step="0.01" />
              </div>
              <div>
                <Label>Purchase Price ({currency})</Label>
                <Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} className="mt-1" min={0} step="0.01" />
              </div>
              <div>
                <Label>Stock Qty</Label>
                <Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="Leave blank if N/A" className="mt-1" />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} placeholder="Alert threshold" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="mt-1" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]">
              {saving ? t.common.saving : editing ? `${t.common.update} ${t.inventory.item}` : t.inventory.addItem}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Archive ${deleteDialog?.name}?`}
        description={t.inventory.archiveConfirm}
        confirmLabel={t.common.archive}
        loading={deleting}
        onConfirm={() => deleteDialog && handleArchive(deleteDialog)}
      />
    </div>
  )
}
