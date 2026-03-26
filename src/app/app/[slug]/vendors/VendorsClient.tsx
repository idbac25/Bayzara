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
import { Building2, Plus, MoreHorizontal, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Vendor {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  country: string | null
  tax_number: string | null
  notes: string | null
  archived: boolean
  created_at: string
}

interface VendorsClientProps {
  vendors: Vendor[]
  businessId: string
  currency: string
  slug: string
}

const emptyForm = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  address_line1: '',
  city: '',
  country: '',
  tax_number: '',
  notes: '',
}

export function VendorsClient({ vendors: initial, businessId, currency, slug }: VendorsClientProps) {
  const { business } = useBusiness()
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
      email: v.email ?? '',
      phone: v.phone ?? '',
      address_line1: v.address_line1 ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      tax_number: v.tax_number ?? '',
      notes: v.notes ?? '',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      address_line1: form.address_line1 || null,
      city: form.city || null,
      country: form.country || null,
      tax_number: form.tax_number || null,
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
      toast.success('Vendor updated')
    } else {
      const { data, error } = await supabase
        .from('vendors')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setVendors(prev => [data, ...prev])
      toast.success('Vendor added')
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
    toast.success('Vendor archived')
  }

  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: 'Vendor',
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
        ? <a href={`tel:${getValue()}`} className="flex items-center gap-1 text-sm text-[#0F4C81] hover:underline"><Phone className="h-3 w-3" />{String(getValue())}</a>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => getValue()
        ? <a href={`mailto:${getValue()}`} className="flex items-center gap-1 text-sm text-[#0F4C81] hover:underline"><Mail className="h-3 w-3" />{String(getValue())}</a>
        : <span className="text-muted-foreground">—</span>,
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
        title="Vendors"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Vendors' }]}
        action={
          <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Plus className="mr-2 h-4 w-4" />Add Vendor
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No vendors yet"
          description="Add your suppliers and service providers."
          actionLabel="Add Vendor"
          onAction={openNew}
        />
      ) : (
        <DataTable
          data={active}
          columns={columns}
          searchPlaceholder="Search vendors..."
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Vendor Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier Co." className="mt-1" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252..." className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="vendor@example.com" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} placeholder="Street address" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Mogadishu" className="mt-1" />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Somalia" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Tax Number</Label>
              <Input value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]">
              {saving ? 'Saving...' : editing ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Archive ${deleteDialog?.name}?`}
        description="This vendor will be hidden from lists but purchase history is preserved."
        confirmLabel="Archive"
        loading={deleting}
        onConfirm={() => deleteDialog && handleArchive(deleteDialog)}
      />
    </div>
  )
}
