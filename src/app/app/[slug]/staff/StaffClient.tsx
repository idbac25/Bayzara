'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, UserCog, ShieldCheck, ShieldOff, Loader2, Clock, Activity } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  phone: string | null
  role: 'owner' | 'manager' | 'cashier'
  is_active: boolean
  has_pin: boolean
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  entity_type: string | null
  details: Record<string, unknown>
  created_at: string
  staff_members: { name: string } | null
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  staff: StaffMember[]
  logs: AuditLog[]
  slug: string
}

const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' }
const ROLE_COLOR = { owner: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', cashier: 'bg-slate-100 text-slate-700' }

const ACTION_LABEL: Record<string, string> = {
  pos_sale: 'Completed a sale',
  debt_charge: 'Recorded credit sale',
  debt_payment: 'Recorded payment',
  shift_open: 'Opened shift',
  shift_close: 'Closed shift',
  staff_created: 'Added staff member',
}

export function StaffClient({ business, staff, logs, slug }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', role: 'cashier' as StaffMember['role'], pin: '', confirmPin: '' })
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    setForm({ name: '', phone: '', role: 'cashier', pin: '', confirmPin: '' })
    setIsNew(true)
    setEditTarget(null)
  }

  const openEdit = (s: StaffMember) => {
    setForm({ name: s.name, phone: s.phone ?? '', role: s.role, pin: '', confirmPin: '' })
    setIsNew(false)
    setEditTarget(s)
  }

  const closeDialog = () => { setEditTarget(null); setIsNew(false) }

  const validatePin = () => {
    if (!form.pin) return true // PIN is optional
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      toast.error('PIN must be exactly 4 digits')
      return false
    }
    if (form.pin !== form.confirmPin) {
      toast.error('PINs do not match')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!validatePin()) return
    setSaving(true)
    try {
      const body = isNew
        ? { business_id: business.id, name: form.name.trim(), phone: form.phone || undefined, role: form.role, pin: form.pin || undefined }
        : { id: editTarget!.id, business_id: business.id, name: form.name.trim(), phone: form.phone || undefined, role: form.role, pin: form.pin || undefined }

      const res = await fetch('/api/staff', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error ?? 'Failed to save')
      toast.success(isNew ? 'Staff member added' : 'Staff member updated')
      closeDialog()
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: StaffMember) => {
    const res = await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, business_id: business.id, is_active: !s.is_active }),
    })
    if (res.ok) {
      toast.success(s.is_active ? 'Staff member deactivated' : 'Staff member activated')
      startTransition(() => router.refresh())
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage your team and track activity"
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Staff' },
        ]}
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />Add Staff
          </Button>
        }
      />

      <Tabs defaultValue="team">
        <TabsList className="mb-4">
          <TabsTrigger value="team">Team ({staff.length})</TabsTrigger>
          <TabsTrigger value="log">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          {staff.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border rounded-lg bg-white">
              <UserCog className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No staff yet</p>
              <p className="text-sm mt-1">Add your first team member to enable POS cashier login.</p>
              <Button className="mt-4" size="sm" onClick={openNew}>Add Staff Member</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map(s => (
                <Card key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        {s.phone && <p className="text-xs text-muted-foreground mt-0.5">{s.phone}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[s.role]}`}>
                        {ROLE_LABEL[s.role]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      {s.has_pin
                        ? <><ShieldCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">PIN set</span></>
                        : <><ShieldOff className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-600">No PIN</span></>
                      }
                      {!s.is_active && <Badge variant="secondary" className="text-[10px] h-4">Inactive</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(s)}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 h-7 text-xs ${s.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg bg-white">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              {logs.map((log, i) => (
                <div key={log.id} className={`flex items-start gap-3 px-4 py-3 ${i !== 0 ? 'border-t' : ''}`}>
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{(log.staff_members as { name: string } | null)?.name ?? 'System'}</span>
                      {' '}{ACTION_LABEL[log.action] ?? log.action}
                      {(log.details as Record<string, unknown>)?.amount != null && <span className="text-muted-foreground"> · ${String((log.details as Record<string, unknown>).amount)}</span>}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <Dialog open={isNew || !!editTarget} onOpenChange={open => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add Staff Member' : 'Edit Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Ahmed Hassan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="252..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as StaffMember['role'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">POS PIN (4 digits)</p>
              <div className="space-y-1.5">
                <Label>New PIN <span className="text-muted-foreground text-xs">{editTarget?.has_pin ? '(leave blank to keep current)' : '(optional)'}</span></Label>
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
              </div>
              {form.pin && (
                <div className="space-y-1.5">
                  <Label>Confirm PIN</Label>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={form.confirmPin} onChange={e => setForm(f => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
