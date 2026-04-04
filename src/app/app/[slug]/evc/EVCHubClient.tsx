'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Zap, Plus, RefreshCw, AlertTriangle, CheckCircle,
  Calendar, DollarSign, Eye, Trash2, Send, Loader2, UserCheck
} from 'lucide-react'

interface EVCConnection {
  id: string
  merchant_name: string
  account_number: string
  current_balance: number
  last_synced_at: string | null
  is_active: boolean
  sync_enabled: boolean
  currency: string
}

interface EVCTransaction {
  id: string
  amount: number
  direction: string
  sender_name: string | null
  sender_phone: string | null
  receiver_phone: string | null
  tran_date: string
  is_recorded: boolean
  needs_review: boolean
  description: string | null
}

interface Props {
  connections: EVCConnection[]
  recentTxs: EVCTransaction[]
  stats: {
    todayTotal: number
    monthTotal: number
    autoRecorded: number
    needsReview: number
  }
  slug: string
}

export function EVCHubClient({ connections, recentTxs, stats, slug }: Props) {
  const { business } = useBusiness()
  const router = useRouter()
  const [disconnectTarget, setDisconnectTarget] = useState<EVCConnection | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [sendConn, setSendConn] = useState<EVCConnection | null>(null)
  const [sendForm, setSendForm] = useState({ phone: '', amount: '', description: '', pin: '' })
  const [sendLookup, setSendLookup] = useState<{ name: string } | null>(null)
  const [sendLooking, setSendLooking] = useState(false)
  const [sending, setSending] = useState(false)

  const lookupPhone = async () => {
    if (!sendConn || !sendForm.phone) return
    setSendLooking(true)
    setSendLookup(null)
    try {
      const res = await fetch('/api/evc/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, phone: sendForm.phone }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Account not found'); return }
      setSendLookup({ name: data.name })
    } finally {
      setSendLooking(false)
    }
  }

  const handleSend = async () => {
    if (!sendConn || !sendForm.phone || !sendForm.amount || !sendForm.pin) {
      toast.error('Fill in all required fields')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/evc/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id:    business.id,
          receiver_phone: sendForm.phone,
          receiver_name:  sendLookup?.name ?? '',
          amount:         parseFloat(sendForm.amount),
          description:    sendForm.description || 'refund',
          pin:            sendForm.pin,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Transfer failed'); return }
      toast.success(`Sent ${formatCurrency(parseFloat(sendForm.amount), 'USD')} to ${sendLookup?.name ?? sendForm.phone}`)
      setSendConn(null)
      setSendForm({ phone: '', amount: '', description: '', pin: '' })
      setSendLookup(null)
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  // Poll every 5 seconds so new transactions appear automatically
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(interval)
  }, [router])

  const handleDisconnect = async () => {
    if (!disconnectTarget) return
    setDisconnecting(true)
    const supabase = createClient()
    const { error } = await supabase.from('evc_connections').delete().eq('id', disconnectTarget.id)
    if (error) {
      toast.error(error.message)
      setDisconnecting(false)
      return
    }
    setDisconnectTarget(null)
    setDisconnecting(false)
    toast.success(`"${disconnectTarget.merchant_name}" disconnected`)
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="EVC Plus Integration"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'EVC Plus' }]}
        action={
          <Button asChild className="bg-[#F5A623] hover:bg-[#e09520] text-black font-semibold">
            <Link href={`/app/${slug}/evc/connect`}>
              <Plus className="mr-2 h-4 w-4" />Connect EVC Account
            </Link>
          </Button>
        }
      />

      {connections.length === 0 ? (
        <Card className="border-dashed border-2 border-[#F5A623]/30">
          <CardContent className="py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-[#F5A623]/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-10 w-10 text-[#F5A623]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Connect Hormud EVC Plus</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              The world&apos;s first accounting platform with native EVC Plus integration.
              Every payment sent to your merchant account is automatically recorded.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <RefreshCw className="h-5 w-5 text-[#0F4C81] mx-auto mb-1" />
                <p className="font-medium">Auto-sync</p>
                <p className="text-xs text-muted-foreground">Every 60 seconds</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <CheckCircle className="h-5 w-5 text-[#27AE60] mx-auto mb-1" />
                <p className="font-medium">Auto-record</p>
                <p className="text-xs text-muted-foreground">Match & record payments</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Zap className="h-5 w-5 text-[#F5A623] mx-auto mb-1" />
                <p className="font-medium">Real-time</p>
                <p className="text-xs text-muted-foreground">Instant notifications</p>
              </div>
            </div>
            <Button asChild size="lg" className="bg-[#F5A623] hover:bg-[#e09520] text-black font-semibold">
              <Link href={`/app/${slug}/evc/connect`}>
                <Zap className="mr-2 h-5 w-5" />Connect Your EVC Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-[#27AE60]" />
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
                <p className="font-bold">{formatCurrency(stats.todayTotal, 'USD')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-[#0F4C81]" />
                  <span className="text-xs text-muted-foreground">This Month</span>
                </div>
                <p className="font-bold">{formatCurrency(stats.monthTotal, 'USD')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-[#27AE60]" />
                  <span className="text-xs text-muted-foreground">Auto-recorded</span>
                </div>
                <p className="font-bold">{stats.autoRecorded}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Needs Review</span>
                </div>
                <p className="font-bold text-amber-600">{stats.needsReview}</p>
              </CardContent>
            </Card>
          </div>

          {/* Connected Accounts */}
          <div>
            <h2 className="text-base font-semibold mb-3">Connected Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map(conn => (
                <Card key={conn.id} className={`border ${conn.is_active ? 'border-[#F5A623]/30' : 'border-gray-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4 text-[#F5A623] shrink-0" />
                          <span className="font-semibold">{conn.merchant_name}</span>
                          <Badge
                            className={`text-[10px] ${conn.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                            variant="outline"
                          >
                            {conn.is_active ? '● LIVE' : 'Pending'}
                          </Badge>
                        </div>
                        {conn.account_number && (
                          <p className="text-sm text-muted-foreground font-mono">{conn.account_number}</p>
                        )}
                        {conn.last_synced_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last sync: {new Date(conn.last_synced_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="text-xl font-bold text-[#27AE60]">
                            {formatCurrency(conn.current_balance, 'USD')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => { setSendConn(conn); setSendForm({ phone: '', amount: '', description: '', pin: '' }); setSendLookup(null) }}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />Send
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                            onClick={() => setDisconnectTarget(conn)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />Disconnect
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent EVC Transactions</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[#0F4C81]">
                  <Link href={`/app/${slug}/evc/transactions`}>
                    View all <Eye className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentTxs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No transactions yet. Sync will start automatically.
                </p>
              ) : (
                <div className="divide-y">
                  {recentTxs.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {tx.direction === 'out'
                              ? ((tx as EVCTransaction & { receiver_name?: string }).receiver_name ?? tx.receiver_phone ?? 'Sent')
                              : (tx.sender_name ?? tx.sender_phone ?? 'Unknown')}
                          </p>
                          {tx.needs_review && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              Review
                            </span>
                          )}
                          {tx.is_recorded && !tx.needs_review && (
                            <CheckCircle className="h-3.5 w-3.5 text-[#27AE60]" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.tran_date).toLocaleString()}
                        </p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[280px]">{tx.description}</p>
                        )}
                      </div>
                      <span className={`font-semibold ${tx.direction === 'in' ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
                        {tx.direction === 'in' ? '+' : '-'}{formatCurrency(tx.amount, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!disconnectTarget}
        onOpenChange={o => !o && setDisconnectTarget(null)}
        title={`Disconnect "${disconnectTarget?.merchant_name}"?`}
        description="This will remove the EVC connection. Existing recorded payments won't be affected. You can reconnect at any time."
        confirmLabel="Disconnect"
        loading={disconnecting}
        onConfirm={handleDisconnect}
      />

      {/* Send Money Modal */}
      <Dialog open={!!sendConn} onOpenChange={o => !o && setSendConn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4 text-[#F5A623]" />
              Send Money via EVC Plus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Recipient Phone *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="619xxxxxx"
                  value={sendForm.phone}
                  onChange={e => { setSendForm(f => ({ ...f, phone: e.target.value })); setSendLookup(null) }}
                  className="h-9"
                />
                <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={lookupPhone} disabled={sendLooking || !sendForm.phone}>
                  {sendLooking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                </Button>
              </div>
              {sendLookup && (
                <p className="text-xs text-[#27AE60] flex items-center gap-1 mt-1">
                  <UserCheck className="h-3 w-3" />{sendLookup.name}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Amount (USD) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={sendForm.amount}
                onChange={e => setSendForm(f => ({ ...f, amount: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Refund, payment, etc."
                value={sendForm.description}
                onChange={e => setSendForm(f => ({ ...f, description: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">EVC PIN *</Label>
              <Input
                type="password"
                placeholder="••••"
                value={sendForm.pin}
                onChange={e => setSendForm(f => ({ ...f, pin: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <Button
              className="w-full bg-[#F5A623] hover:bg-[#e09520] text-black font-semibold"
              onClick={handleSend}
              disabled={sending || !sendForm.phone || !sendForm.amount || !sendForm.pin}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? 'Sending...' : 'Send Money'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
