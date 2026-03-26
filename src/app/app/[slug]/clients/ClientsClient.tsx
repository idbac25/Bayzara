'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import type { Client } from '@/types/database'
import { Users, MoreHorizontal, Plus, Pencil, Trash2, Archive, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['client', 'prospect']),
  industry: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  evc_phone: z.string().optional(),
})

type ClientForm = z.infer<typeof clientSchema>

interface ClientsClientProps {
  clients: Client[]
  slug: string
}

export function ClientsClient({ clients: initialClients, slug }: ClientsClientProps) {
  const { business } = useBusiness()
  const router = useRouter()
  const [clients, setClients] = useState(initialClients)
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: { type: 'client' },
  })

  const filtered = clients.filter(c => tab === 'active' ? !c.archived : c.archived)

  const openAdd = () => {
    setEditingClient(null)
    reset({ type: 'client' })
    setSheetOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    reset({
      name: client.name,
      type: client.type as 'client' | 'prospect',
      industry: client.industry ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address_line1: client.address_line1 ?? '',
      city: client.city ?? '',
      state: client.state ?? '',
      country: client.country ?? '',
      notes: client.notes ?? '',
      evc_phone: client.evc_phone ?? '',
    })
    setSheetOpen(true)
  }

  const onSave = async (data: ClientForm) => {
    setSaving(true)
    const supabase = createSupabaseClient()

    const payload = {
      business_id: business.id,
      name: data.name,
      type: data.type,
      industry: data.industry || null,
      email: data.email || null,
      phone: data.phone || null,
      address_line1: data.address_line1 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      notes: data.notes || null,
      evc_phone: data.evc_phone || null,
    }

    if (editingClient) {
      const { data: updated, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editingClient.id)
        .select()
        .single()

      if (error) { toast.error(error.message); setSaving(false); return }
      setClients(prev => prev.map(c => c.id === editingClient.id ? updated : c))
      toast.success('Client updated')
    } else {
      const { data: created, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single()

      if (error) { toast.error(error.message); setSaving(false); return }
      setClients(prev => [created, ...prev])
      toast.success('Client added')
    }

    setSaving(false)
    setSheetOpen(false)
  }

  const handleArchive = async (client: Client) => {
    const supabase = createSupabaseClient()
    const { data: updated } = await supabase
      .from('clients')
      .update({ archived: !client.archived })
      .eq('id', client.id)
      .select()
      .single()
    if (updated) {
      setClients(prev => prev.map(c => c.id === client.id ? updated : c))
      toast.success(client.archived ? 'Client restored' : 'Client archived')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    const supabase = createSupabaseClient()
    const { error } = await supabase.from('clients').delete().eq('id', deleteDialog.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setClients(prev => prev.filter(c => c.id !== deleteDialog.id))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Client deleted')
  }

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link href={`/app/${slug}/clients/${row.original.id}`} className="flex items-center gap-3 hover:text-[#0F4C81] group">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.logo_url ?? undefined} />
            <AvatarFallback className="bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-semibold">
              {row.original.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium group-hover:underline">{row.original.name}</span>
        </Link>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <Badge variant="outline" className="capitalize">{String(getValue())}</Badge>
      ),
    },
    {
      accessorKey: 'industry',
      header: 'Industry',
      cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Added',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>,
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
            <DropdownMenuItem asChild>
              <Link href={`/app/${slug}/clients/${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />View
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleArchive(row.original)}>
              <Archive className="mr-2 h-4 w-4" />
              {row.original.archived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteDialog(row.original)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Clients"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Clients' }]}
        action={
          <Button className="bg-[#0F4C81] hover:bg-[#0d3f6e]" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />Add Client
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={v => setTab(v as 'active' | 'archived')} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Active ({clients.filter(c => !c.archived).length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({clients.filter(c => c.archived).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 && !sheetOpen ? (
        <EmptyState
          icon={Users}
          title={tab === 'active' ? 'No clients yet' : 'No archived clients'}
          description={tab === 'active' ? 'Add your first client to start creating invoices.' : undefined}
          actionLabel={tab === 'active' ? 'Add Client' : undefined}
          onAction={tab === 'active' ? openAdd : undefined}
        />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Search clients..."
        />
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingClient ? 'Edit Client' : 'Add Client'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name *</Label>
              <Input id="c-name" {...register('name')} placeholder="Client name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select defaultValue="client" onValueChange={v => setValue('type', v as 'client' | 'prospect')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Input {...register('industry')} placeholder="e.g. Retail" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="+252..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="email@example.com" />
            </div>

            <div className="space-y-2">
              <Label>EVC Phone Number</Label>
              <Input {...register('evc_phone')} placeholder="e.g. 615001234" />
              <p className="text-xs text-muted-foreground">Used to auto-match EVC Plus payments to this client</p>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register('address_line1')} placeholder="Street address" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...register('city')} placeholder="Mogadishu" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input {...register('country')} placeholder="Somalia" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                {...register('notes')}
                placeholder="Any notes about this client..."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-[#0F4C81] hover:bg-[#0d3f6e]" disabled={saving}>
                {saving ? 'Saving...' : editingClient ? 'Update' : 'Add Client'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete "${deleteDialog?.name}"?`}
        description="This will permanently delete the client and cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
