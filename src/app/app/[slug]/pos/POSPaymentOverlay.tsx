'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Loader2, X, Zap, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SenderInfo {
  tranId: string
  txUuid: string
  senderName: string | null
  senderPhone: string | null
}

interface Transaction {
  id: string
  tran_id: string
  amount: number
  sender_name: string | null
  sender_phone: string | null
  tran_date: string
  confidence: 'high' | 'medium' | 'low'
  secondsAgo: number
}

interface Props {
  businessId: string
  expectedAmount: number
  currency: string
  initiatedAt: Date
  onConfirmed: (info: SenderInfo) => void
  onCancel: () => void
}

const POLL_INTERVAL = 5000

function formatAge(seconds: number): string {
  if (seconds < 60)  return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function POSPaymentOverlay({
  businessId,
  expectedAmount,
  currency,
  onConfirmed,
  onCancel,
}: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [matched, setMatched]           = useState<Transaction | null>(null)
  const [matchingId, setMatchingId]     = useState<string | null>(null)
  const [countdown, setCountdown]       = useState(POLL_INTERVAL / 1000)
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const confirmedRef = useRef(false)

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        business_id:     businessId,
        expected_amount: String(expectedAmount),
      })
      const res  = await fetch(`/api/evc/recent-transactions?${params}`)
      const data = await res.json()
      if (Array.isArray(data.transactions)) {
        setTransactions(data.transactions)
      }
    } catch { /* non-fatal */ }
    setLoading(false)
    setCountdown(POLL_INTERVAL / 1000)
  }, [businessId, expectedAmount])

  useEffect(() => {
    fetchTransactions()
    pollRef.current  = setInterval(fetchTransactions, POLL_INTERVAL)
    countRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current)
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [fetchTransactions])

  const handleMatch = (tx: Transaction) => {
    if (confirmedRef.current) return
    confirmedRef.current = true
    setMatchingId(tx.id)
    if (pollRef.current)  clearInterval(pollRef.current)
    if (countRef.current) clearInterval(countRef.current)
    setMatched(tx)
    setTimeout(() => {
      onConfirmed({ tranId: tx.tran_id, txUuid: tx.id, senderName: tx.sender_name, senderPhone: tx.sender_phone })
    }, 900)
  }

  // Success screen
  if (matched) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 px-6 py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
          <p className="text-xl font-bold text-green-700 mb-1">Payment Matched!</p>
          <p className="text-muted-foreground text-sm">{formatCurrency(matched.amount, currency)}</p>
          {(matched.sender_name || matched.sender_phone) && (
            <div className="mt-3 bg-green-50 rounded-lg px-4 py-2.5 inline-block text-sm">
              {matched.sender_name  && <p className="font-semibold text-green-800">{matched.sender_name}</p>}
              {matched.sender_phone && <p className="text-green-600 text-xs mt-0.5">{matched.sender_phone}</p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">Completing sale...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-[#0F4C81] px-5 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#F5A623]" />
              <span className="font-semibold">EVC Plus Payment</span>
            </div>
            <button onClick={onCancel} className="text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-white/60 uppercase tracking-wide">Amount due</p>
          <p className="text-3xl font-bold">{formatCurrency(expectedAmount, currency)}</p>
        </div>

        {/* Sub-header */}
        <div className="px-5 py-3 border-b bg-gray-50 flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Select the matching payment — last 30 min, newest first
          </p>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading payments...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground px-6">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-[#F5A623]" />
              No payments in the last 30 minutes yet.
              <br />Ask the customer to send <strong>{formatCurrency(expectedAmount, currency)}</strong>.
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map(tx => {
                const isExact = tx.confidence === 'high'
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3',
                      isExact && 'bg-green-50/70'
                    )}
                  >
                    {/* Amount badge */}
                    <div className={cn(
                      'flex-shrink-0 w-16 text-center rounded-lg py-1.5 text-xs font-bold border',
                      isExact
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : tx.confidence === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      {formatCurrency(tx.amount, currency)}
                    </div>

                    {/* Sender info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {tx.sender_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{tx.sender_phone ?? '—'}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{formatAge(tx.secondsAgo)}</p>
                    </div>

                    {/* Match button */}
                    <Button
                      size="sm"
                      className={cn(
                        'flex-shrink-0 h-8 px-4 text-xs font-semibold',
                        isExact
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-[#0F4C81] hover:bg-[#0d3d6b] text-white'
                      )}
                      disabled={matchingId !== null}
                      onClick={() => handleMatch(tx)}
                    >
                      {matchingId === tx.id ? '...' : 'Match'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span>Refreshing in {countdown}s</span>
            <button
              onClick={() => { setCountdown(POLL_INTERVAL / 1000); fetchTransactions() }}
              className="ml-1 text-[#0F4C81] hover:underline font-medium"
            >
              Refresh now
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
