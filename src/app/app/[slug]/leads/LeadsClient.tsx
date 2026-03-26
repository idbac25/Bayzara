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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, Plus, MoreHorizontal, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  value: number | null
  status: string
  stage: string | null
  pipeline_id: string | null
  notes: string | null
  source: string | null
  created_at: string
}

interface Pipeline {
  id: string
  name: string
  stages: string[]
}

interface LeadsClientProps {
  leads: Lead[]
  pipelines: Pipeline[]
  businessId: string
  currency: string
  slug: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-amber-100 text-amber-700',
  proposal: 'bg-orange-100 text-orange-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
}

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email', 'event', 'other']

const emptyForm = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  value: '',
  status: 'new',
  stage: '',
  pipeline_id: '',
  notes: '',
  source: '',
}

export function LeadsClient({ leads: initial, pipelines, businessId, currency, slug }: LeadsClientProps) {
  const { business } = useBusiness()
  const [leads, setLeads] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  const defaultPipeline = pipelines[0]
  const stages = defaultPipeline?.stages ?? STATUSES

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, pipeline_id: defaultPipeline?.id ?? '' })
    setSheetOpen(true)
  }

  function openEdit(lead: Lead) {
    setEditing(lead)
    setForm({
      name: lead.name,
      contact_name: lead.contact_name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      value: lead.value != null ? String(lead.value) : '',
      status: lead.status,
      stage: lead.stage ?? '',
      pipeline_id: lead.pipeline_id ?? '',
      notes: lead.notes ?? '',
      source: lead.source ?? '',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Lead name is required'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      contact_name: form.contact_name || null,
      email: form.email || null,
      phone: form.phone || null,
      value: form.value ? parseFloat(form.value) : null,
      status: form.status,
      stage: form.stage || null,
      pipeline_id: form.pipeline_id || null,
      notes: form.notes || null,
      source: form.source || null,
    }

    if (editing) {
      const { data, error } = await supabase.from('leads').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setLeads(prev => prev.map(l => l.id === editing.id ? data : l))
      toast.success('Lead updated')
    } else {
      const { data, error } = await supabase.from('leads').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setLeads(prev => [data, ...prev])
      toast.success('Lead added')
    }
    setSaving(false)
    setSheetOpen(false)
  }

  const handleDelete = async (lead: Lead) => {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setLeads(prev => prev.filter(l => l.id !== lead.id))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Lead deleted')
  }

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id)
    if (error) { toast.error(error.message); return }
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l))
  }

  const totalValue = leads.filter(l => l.status !== 'lost').reduce((s, l) => s + (l.value ?? 0), 0)
  const wonValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + (l.value ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="CRM / Leads"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Leads' }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView(view === 'kanban' ? 'list' : 'kanban')}>
              {view === 'kanban' ? 'List View' : 'Kanban View'}
            </Button>
            <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
              <Plus className="mr-2 h-4 w-4" />Add Lead
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Pipeline</p>
            <p className="font-bold">{formatCurrency(totalValue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Won</p>
            <p className="font-bold text-[#27AE60]">{formatCurrency(wonValue, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Active Leads</p>
            <p className="font-bold">{leads.filter(l => !['won', 'lost'].includes(l.status)).length}</p>
          </CardContent>
        </Card>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No leads yet"
          description="Track your sales pipeline and close more deals."
          actionLabel="Add Lead"
          onAction={openNew}
        />
      ) : view === 'kanban' ? (
        // Kanban view
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const statusLeads = leads.filter(l => l.status === status)
            const statusValue = statusLeads.reduce((s, l) => s + (l.value ?? 0), 0)
            return (
              <div key={status} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[status]}`}>
                      {status}
                    </span>
                    <span className="text-xs text-muted-foreground">{statusLeads.length}</span>
                  </div>
                  {statusValue > 0 && (
                    <span className="text-xs text-muted-foreground">{formatCurrency(statusValue, currency)}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {statusLeads.map(lead => (
                    <Card key={lead.id} className="cursor-pointer hover:border-[#0F4C81]/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium truncate flex-1">{lead.name}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1 shrink-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(lead)}>
                                <Pencil className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              {STATUSES.filter(s => s !== status).map(s => (
                                <DropdownMenuItem key={s} onClick={() => handleStatusChange(lead, s)}>
                                  Move to {s}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem onClick={() => setDeleteDialog(lead)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {lead.contact_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{lead.contact_name}</p>
                        )}
                        {lead.value && (
                          <p className="text-xs font-semibold text-[#0F4C81] mt-1">{formatCurrency(lead.value, currency)}</p>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{lead.phone}</span>
                          </div>
                        )}
                        {lead.source && (
                          <Badge variant="secondary" className="text-xs mt-1 capitalize">{lead.source.replace('_', ' ')}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {statusLeads.length === 0 && (
                    <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // List view
        <div className="space-y-2">
          {leads.map(lead => (
            <Card key={lead.id} className="hover:border-[#0F4C81]/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    {lead.contact_name && <p className="text-xs text-muted-foreground">{lead.contact_name}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{lead.phone}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{lead.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {lead.value && <span className="font-medium text-sm">{formatCurrency(lead.value, currency)}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(lead)}>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteDialog(lead)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Lead' : 'Add Lead'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Company / Lead Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" className="mt-1" />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="John Doe" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+252..." className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deal Value ({currency})</Label>
                <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]">
              {saving ? 'Saving...' : editing ? 'Update Lead' : 'Add Lead'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete lead "${deleteDialog?.name}"?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => deleteDialog && handleDelete(deleteDialog)}
      />
    </div>
  )
}
