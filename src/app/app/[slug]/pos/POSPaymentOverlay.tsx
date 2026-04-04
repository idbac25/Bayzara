'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Loader2, CheckCircle2, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SenderInfo {
  tranId: string
  senderName: string | null
  senderPhone: string | null
}

interface Props {
  businessId: string
  expectedAmount: number
  currency: string
  onConfirmed: (info: SenderInfo) => void
  onCancel: () => void
}

type Status = 'waiting' | 'confirmed'

export function POSPaymentOverlay({ businessId, expectedAmount, currency, onConfirmed, onCancel }: Props) {
  const [status, setStatus] = useState<Status>('waiting')
  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null)
  const [dots, setDots] = useState(0)
  const sinceRef = useRef(new Date().toISOString())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  // Animate waiting dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 600)
    return () => clearInterval(t)
  }, [])

  // Supabase Realtime subscription — instant path
  useEffect(() => {
    const channel = supabase
      .channel(`pos-evc-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'evc_transactions',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const tx = payload.new as { amount: number; direction: string; tran_id: string; is_recorded: boolean; sender_name: string | null; sender_phone: string | null }
          if (
            tx.direction === 'in' &&
            !tx.is_recorded &&
            Math.abs(tx.amount - expectedAmount) <= 0.5
          ) {
            handleConfirmed({ tranId: String(tx.tran_id), senderName: tx.sender_name ?? null, senderPhone: tx.sender_phone ?? null })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, expectedAmount])

  // 3-second polling — fallback path
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/evc/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: businessId,
            expected_amount: expectedAmount,
            since: sinceRef.current,
          }),
        })
        const data = await res.json()
        if (data.found && data.transaction) {
          handleConfirmed({
            tranId: String(data.transaction.tran_id ?? data.transaction.id),
            senderName: data.transaction.sender_name ?? null,
            senderPhone: data.transaction.sender_phone ?? null,
          })
        }
      } catch { /* non-fatal */ }
    }

    intervalRef.current = setInterval(poll, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, expectedAmount])

  const handleConfirmed = (info: SenderInfo) => {
    if (status === 'confirmed') return
    setStatus('confirmed')
    setSenderInfo(info)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimeout(() => onConfirmed(info), 1200)
  }

  const waitingDots = '.'.repeat(dots)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {status === 'waiting' ? (
          <>
            <div className="bg-[#0F4C81] px-6 py-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-[#F5A623]" />
                <span className="font-semibold text-lg">EVC Plus Payment</span>
              </div>
              <p className="text-white/70 text-sm">Waiting for customer to send payment</p>
            </div>

            <div className="px-6 py-8 text-center">
              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Amount Due</p>
                <p className="text-4xl font-bold text-[#0F4C81]">{formatCurrency(expectedAmount, currency)}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-8">
                <Loader2 className="h-4 w-4 animate-spin text-[#F5A623]" />
                <span className="text-sm">Listening for payment{waitingDots}</span>
              </div>

              <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground text-left space-y-1 mb-6">
                <p>1. Ask the customer to open their Hormud EVC app</p>
                <p>2. Send exactly <strong>{formatCurrency(expectedAmount, currency)}</strong></p>
                <p>3. This screen will update automatically</p>
              </div>

              <Button variant="outline" className="w-full" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 mb-2">Payment Received!</p>
            <p className="text-muted-foreground text-sm">{formatCurrency(expectedAmount, currency)} confirmed</p>
            {(senderInfo?.senderName || senderInfo?.senderPhone) && (
              <div className="mt-3 bg-green-50 rounded-lg px-4 py-2.5 text-sm">
                {senderInfo.senderName && <p className="font-semibold text-green-800">{senderInfo.senderName}</p>}
                {senderInfo.senderPhone && <p className="text-green-600 text-xs mt-0.5">{senderInfo.senderPhone}</p>}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">Completing sale...</p>
          </div>
        )}
      </div>
    </div>
  )
}
