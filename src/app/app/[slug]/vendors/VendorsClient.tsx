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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import { Store, Plus, MoreHorizontal, Pencil, Trash2, Phone, Zap } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useT } from '@/contexts/LanguageContext'

interface Vendor {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  evc_phone: string | null
  city: string | null
  country: string | null
  notes: string | null
  archived: boolean
  created_at: string
}

interface Props {
  vendors: Vendor[]
  businessId: string
  slug: string
}

const emptyForm = {
  name: '',
  contact_name: '',
  phone: '',
  evc_phone: '',
  city: '',
  country: 'Somalia',
  notes: '',
}

export function VendorsClient({ vendors: initial, businessId, slug }: Props) {
  const { business } = useBusiness()
  const t = useT()
  const [vendors, setVendors] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Vendor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const active = vendors.filter(v => !v.archived)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm({
      name: v.name,
      contact_name: v.contact_name ?? '',
      phone: v.phone ?? '',
      evc_phone: v.evc_phone ?? '',
      city: v.city ?? '',
      country: v.country ?? 'Somalia',
      notes: v.notes ?? '',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Supplier name is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      evc_phone: form.evc_phone || null,
      city: form.city || null,
      country: form.country || null,
      notes: form.notes || null,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('vendors')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setVendors(prev => prev.map(v => v.id === editing.id ? data : v))
      toast.success('Supplier updated')
    } else {
      const { data, error } = await supabase
        .from('vendors')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setVendors(prev => [data, ...prev])
      toast.success('Supplier added')
    }
    setSaving(false)
    setSheetOpen(false)
  }

  const handleArchive = async (v: Vendor) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('vendors')
      .update({ archived: true })
      .eq('id', v.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setVendors(prev => prev.map(i => i.id === v.id ? { ...i, archived: true } : i))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Supplier archived')
  }

  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: 'Supplier',
      cell: ({ row }) => (
        <Link href={`/app/${slug}/vendors/${row.original.id}`} className="font-medium text-[#0F4C81] hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'contact_name',
      header: 'Contact',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => getValue()
        ? <a href={`tel:${getValue()}`} className="flex items-center gap-1 text-sm text-[#0F4C81] hover:underline">
            <Phone className="h-3 w-3" />{String(getValue())}
          </a>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'evc_phone',
      header: 'EVC Phone',
      cell: ({ getValue }) => getValue()
        ? <span className="flex items-center gap-1 text-sm text-blue-600">
            <Zap className="h-3 w-3" />{String(getValue())}
          </span>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{String(getValue() ?? '—')}</span>,
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
        title={t.suppliers.title}
        description={t.suppliers.subtitle}
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: t.suppliers.title }]}
        action={
          <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Plus className="mr-2 h-4 w-4" />{t.suppliers.addSupplier}
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t.suppliers.noSuppliersYet}
          description={t.suppliers.noSuppliersDesc}
          actionLabel={t.suppliers.addSupplier}
          onAction={openNew}
        />
      ) : (
        <DataTable data={active} columns={columns} searchPlaceholder="Search suppliers..." />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? t.suppliers.editSupplier : t.suppliers.addSupplier}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>{t.suppliers.supplierName}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mogadishu Wholesale Co."
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t.suppliers.contactPerson}</Label>
              <Input
                value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                placeholder="Ahmed Hassan"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+252…"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-500" />{t.suppliers.evcPhone}
              </Label>
              <Input
                value={form.evc_phone}
                onChange={e => setForm(f => ({ ...f, evc_phone: e.target.value }))}
                placeholder="+252…"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Mogadishu"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="Somalia"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Pays every Friday, minimum order 50 units…"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]"
            >
              {saving ? t.common.saving : editing ? `${t.common.update} ${t.suppliers.title.toLowerCase()}` : t.suppliers.addSupplier}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Archive ${deleteDialog?.name}?`}
        description={t.suppliers.archiveConfirm}
        confirmLabel={t.common.archive}
        loading={deleting}
        onConfirm={() => deleteDialog && handleArchive(deleteDialog)}
      />
    </div>
  )
}
