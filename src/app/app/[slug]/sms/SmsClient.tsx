'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Smartphone, Plus, Loader2, Check, X, Inbox,
  ArrowDownCircle, ArrowUpCircle, AlertCircle, Copy, Trash2
} from 'lucide-react'

interface Device {
  id: string
  name: string | null
  device_phone: string | null
  paired_at: string | null
  last_seen_at: string | null
  app_version: string | null
  revoked_at: string | null
  created_at: string
}

interface Event {
  id: string
  raw_sms: string
  direction: 'in' | 'out' | 'unknown' | null
  amount: number | null
  currency: string | null
  counterparty_phone: string | null
  status: 'pending' | 'recorded' | 'ignored' | 'error'
  occurred_at: string | null
  received_at: string
  matched_customer_id: string | null
  matched_vendor_id: string | null
  matched_customer_name: string | null
  matched_vendor_name: string | null
}

interface Customer {
  id: string
  name: string
  primary_phone: string | null
  current_balance: number
}

interface Props {
  business: { id: string; name: string; slug: string }
  devices: Device[]
  events: Event[]
  customers: Customer[]
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function fmtCurrency(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  const sym = currency === 'USD' ? '$' : currency === 'SOS' ? 'Sh' : (currency ?? '')
  return `${sym}${amount.toFixed(2)}`
}

function PairDialog({
  businessId,
  open,
  onOpenChange,
}: {
  businessId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(600)

  useEffect(() => {
    if (!expiresAt) return
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName('')
      setCode(null)
      setExpiresAt(null)
    }
  }, [open])

  async function generateCode() {
    setCreating(true)
    try {
      const res = await fetch('/api/sms/pair/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not start pairing')
        return
      }
      setCode(data.pairing_code)
      setExpiresAt(data.expires_at)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  function copyCode() {
    if (code) {
      navigator.clipboard.writeText(code)
      toast.success('Copied')
    }
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pair an SMS Listener phone</DialogTitle>
        </DialogHeader>

        {!code ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dev-name">Name this device (optional)</Label>
              <Input
                id="dev-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Shop main phone"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use the phone that has the EVC SIM card and receives Hormuud SMS.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={generateCode} disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</> : 'Generate code'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              On the Bayzara SMS app, tap <strong>Pair device</strong> and enter this code:
            </p>
            <div className="bg-gray-50 rounded-2xl p-6">
              <p className="text-5xl font-mono font-bold tracking-[0.3em] text-[#0F4C81]">
                {code}
              </p>
              <button
                onClick={copyCode}
                className="mt-3 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className={cn(
              'text-xs',
              secondsLeft < 60 ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {secondsLeft > 0
                ? <>Expires in {mins}:{secs.toString().padStart(2, '0')}</>
                : <>Code expired — generate a new one</>}
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SmsClient({ business, devices, events, customers }: Props) {
  const router = useRouter()
  const [pairOpen, setPairOpen] = useState(false)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [applying, setApplying] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const activeDevices = devices.filter(d => !d.revoked_at)

  function openEvent(e: Event) {
    setActiveEvent(e)
    setSelectedCustomer(e.matched_customer_id ?? '')
    setCustomerSearch('')
  }

  function closeEvent() {
    setActiveEvent(null)
    setSelectedCustomer('')
  }

  async function applyToDebt() {
    if (!activeEvent || !selectedCustomer) return
    setApplying(true)
    try {
      const res = await fetch(`/api/sms/events/${activeEvent.id}/apply-debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: selectedCustomer }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not apply payment')
        return
      }
      toast.success('Payment recorded')
      closeEvent()
      router.refresh()
    } finally {
      setApplying(false)
    }
  }

  async function ignoreEvent(eventId: string) {
    const res = await fetch(`/api/sms/events/${eventId}/ignore`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error ?? 'Could not ignore')
      return
    }
    toast.success('Marked as ignored')
    closeEvent()
    router.refresh()
  }

  async function revoke(deviceId: string) {
    if (!confirm('Revoke this device? It will stop forwarding SMS until re-paired.')) return
    const res = await fetch(`/api/sms/devices/${deviceId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error ?? 'Could not revoke')
      return
    }
    toast.success('Device revoked')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SMS Recorder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pair your shop phone with Bayzara so EVC payment SMS notifications are
              recorded automatically.
            </p>
          </div>
          <Button onClick={() => setPairOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Pair phone
          </Button>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-base font-semibold">Paired Phones</h2>
          </div>
          {activeDevices.length === 0 ? (
            <div className="p-10 text-center">
              <Smartphone className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No phone paired yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Install the Bayzara SMS app on your shop phone, then tap "Pair phone" above
                to generate a connection code.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activeDevices.map(d => (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {d.name ?? 'Unnamed device'}
                      {!d.paired_at && (
                        <span className="ml-2 text-xs text-amber-600 font-normal">
                          waiting to pair...
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.device_phone && <>{d.device_phone} · </>}
                      Last seen {relativeTime(d.last_seen_at)}
                      {d.app_version && <> · v{d.app_version}</>}
                    </p>
                  </div>
                  <button
                    onClick={() => revoke(d.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Revoke"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-white rounded-2xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Inbox className="h-4 w-4 text-gray-500" />
            <h2 className="text-base font-semibold">Recent SMS</h2>
            <span className="text-xs text-muted-foreground">({events.length})</span>
          </div>
          {events.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No SMS events recorded yet. Once a paired phone receives an EVC SMS it will appear here.
            </p>
          ) : (
            <div className="divide-y">
              {events.map(e => {
                const Icon = e.direction === 'in' ? ArrowDownCircle
                  : e.direction === 'out' ? ArrowUpCircle
                  : AlertCircle
                const color = e.direction === 'in' ? 'text-green-600 bg-green-50'
                  : e.direction === 'out' ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 bg-gray-50'
                const matchName = e.matched_customer_name ?? e.matched_vendor_name
                const isActionable = e.direction === 'in' && e.status === 'pending' && (e.amount ?? 0) > 0
                return (
                  <button
                    key={e.id}
                    onClick={() => isActionable ? openEvent(e) : undefined}
                    disabled={!isActionable}
                    className={cn(
                      'w-full px-5 py-3 flex items-start gap-3 text-left transition-colors',
                      isActionable && 'hover:bg-blue-50/40 cursor-pointer',
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {e.direction === 'in' ? 'Received from ' : e.direction === 'out' ? 'Sent to ' : 'Unknown · '}
                          {matchName ?? e.counterparty_phone ?? '—'}
                          {matchName && e.counterparty_phone && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                              {e.counterparty_phone}
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-sm shrink-0">{fmtCurrency(e.amount, e.currency)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {relativeTime(e.received_at)}
                        {e.status === 'recorded' && <span className="ml-2 text-green-600 font-medium">✓ recorded</span>}
                        {e.status === 'pending' && isActionable && <span className="ml-2 text-blue-600 font-medium">tap to apply</span>}
                        {e.status === 'pending' && !isActionable && <span className="ml-2 text-muted-foreground">pending</span>}
                        {e.status === 'ignored' && <span className="ml-2 text-muted-foreground">ignored</span>}
                        {e.status === 'error' && <span className="ml-2 text-red-600">error</span>}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <PairDialog
        businessId={business.id}
        open={pairOpen}
        onOpenChange={setPairOpen}
      />

      {/* Apply-to-debt dialog */}
      <Dialog open={!!activeEvent} onOpenChange={v => !v && closeEvent()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply payment to debt</DialogTitle>
          </DialogHeader>

          {activeEvent && (() => {
            const filtered = customers.filter(c => {
              if (!customerSearch) return true
              const q = customerSearch.toLowerCase()
              return c.name.toLowerCase().includes(q) || (c.primary_phone ?? '').includes(q)
            })

            return (
              <div className="space-y-4">
                {/* Event summary */}
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-green-700 font-semibold mb-1">
                    Received from {activeEvent.counterparty_phone ?? 'unknown'}
                  </p>
                  <p className="text-3xl font-bold text-green-700">
                    {fmtCurrency(activeEvent.amount, activeEvent.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {relativeTime(activeEvent.received_at)}
                  </p>
                </div>

                {/* Customer picker */}
                <div>
                  <Label>Apply to which customer?</Label>
                  {customers.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      No customers have an open debt balance. Add credit to a customer first from the Debt Book.
                    </p>
                  ) : (
                    <>
                      <Input
                        type="search"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        placeholder="Search by name or phone..."
                        className="mt-1.5"
                      />
                      <div className="mt-2 max-h-56 overflow-y-auto border rounded-lg divide-y">
                        {filtered.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground text-center">No matching customer</p>
                        ) : filtered.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCustomer(c.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                              selectedCustomer === c.id ? 'bg-blue-50' : 'hover:bg-gray-50',
                            )}
                          >
                            <div>
                              <p className="font-medium">{c.name}</p>
                              {c.primary_phone && (
                                <p className="text-xs text-muted-foreground">{c.primary_phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">owes</p>
                              <p className="font-semibold text-amber-600">
                                {fmtCurrency(c.current_balance, activeEvent.currency)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => ignoreEvent(activeEvent.id)}
                    className="sm:mr-auto"
                  >
                    Ignore
                  </Button>
                  <Button variant="outline" onClick={closeEvent}>Cancel</Button>
                  <Button
                    onClick={applyToDebt}
                    disabled={!selectedCustomer || applying}
                  >
                    {applying
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Applying...</>
                      : 'Apply payment'}
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
