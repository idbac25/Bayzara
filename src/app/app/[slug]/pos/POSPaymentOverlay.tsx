'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Loader2, X, Zap, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScoredTransaction } from '@/lib/evc-score'

export interface SenderInfo {
  tranId: string
  txUuid: string
  senderName: string | null
  senderPhone: string | null
}

interface Props {
  businessId: string
  expectedAmount: number
  currency: string
  initiatedAt: Date
  onConfirmed: (info: SenderInfo) => void
  onCancel: () => void
}

type ViewState = 'loading' | 'empty' | 'list' | 'matched'

const POLL_INTERVAL = 5000

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-gray-100 text-gray-500 border-gray-200',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high:   'Best match',
  medium: 'Possible',
  low:    'Unlikely',
}

function formatAge(secondsAgo: number): string {
  const abs = Math.abs(Math.round(secondsAgo))
  if (abs < 60) return `${abs}s ago`
  return `${Math.floor(abs / 60)}m ${abs % 60}s ago`
}

export function POSPaymentOverlay({
  businessId,
  expectedAmount,
  currency,
  initiatedAt,
  onConfirmed,
  onCancel,
}: Props) {
  const [view, setView] = useState<ViewState>('loading')
  const [transactions, setTransactions] = useState<ScoredTransaction[]>([])
  const [matchedTx, setMatchedTx] = useState<ScoredTransaction | null>(null)
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000)
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const pollTimer   = useRef<ReturnType<typeof setInterval> | null>(null)
  const countTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const confirmedRef = useRef(false)

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        business_id:     businessId,
        expected_amount: String(expectedAmount),
        initiated_at:    initiatedAt.toISOString(),
      })
      const res  = await fetch(`/api/evc/recent-transactions?${params}`)
      const data = await res.json()

      if (data.transactions?.length > 0) {
        setTransactions(data.transactions)
        setView('list')
      } else {
        setView(prev => prev === 'loading' ? 'empty' : prev === 'list' ? 'list' : 'empty')
      }
    } catch {
      // non-fatal — keep showing whatever state we're in
    }
    setCountdown(POLL_INTERVAL / 1000)
  }, [businessId, expectedAmount, initiatedAt])

  // Initial fetch + polling
  useEffect(() => {
    fetchTransactions()
    pollTimer.current  = setInterval(fetchTransactions, POLL_INTERVAL)
    countTimer.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => {
      if (pollTimer.current)  clearInterval(pollTimer.current)
      if (countTimer.current) clearInterval(countTimer.current)
    }
  }, [fetchTransactions])

  const handleMatch = (tx: ScoredTransaction) => {
    if (confirmedRef.current) return
    confirmedRef.current = true
    setMatchingId(tx.id)

    if (pollTimer.current)  clearInterval(pollTimer.current)
    if (countTimer.current) clearInterval(countTimer.current)

    setMatchedTx(tx)
    setView('matched')

    setTimeout(() => {
      onConfirmed({
        tranId:      tx.tran_id,
        txUuid:      tx.id,
        senderName:  tx.sender_name,
        senderPhone: tx.sender_phone,
      })
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-[#0F4C81] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#F5A623]" />
              <span className="font-semibold">EVC Plus Payment</span>
            </div>
            {view !== 'matched' && (
              <button onClick={onCancel} className="text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2">
            <p className="text-xs text-white/60 uppercase tracking-wide">Amount due</p>
            <p className="text-3xl font-bold">{formatCurrency(expectedAmount, currency)}</p>
          </div>
        </div>

        {/* Body */}
        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F4C81]" />
            <p className="text-sm">Checking for payments...</p>
          </div>
        )}

        {view === 'empty' && (
          <div className="px-5 py-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-[#F5A623]" />
              <p className="text-sm">Waiting for customer to send payment...</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1 mb-4">
              <p>1. Ask the customer to open their EVC Plus app</p>
              <p>2. Send exactly <strong>{formatCurrency(expectedAmount, currency)}</strong></p>
              <p>3. Select the matching payment below when it appears</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>Refreshing in {countdown}s</span>
              </div>
              <button
                onClick={() => { setCountdown(POLL_INTERVAL / 1000); fetchTransactions() }}
                className="text-[#0F4C81] hover:underline font-medium"
              >
                Refresh now
              </button>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}

        {view === 'list' && (
          <div className="flex flex-col max-h-[60vh]">
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Select the matching payment
              </p>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={cn(
                    'px-5 py-3 flex items-center gap-3',
                    i === 0 && tx.confidence === 'high' && 'bg-green-50/60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold truncate">
                        {tx.sender_name ?? 'Unknown sender'}
                      </p>
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                        CONFIDENCE_STYLES[tx.confidence]
                      )}>
                        {CONFIDENCE_LABELS[tx.confidence]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tx.sender_phone ?? '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-[#0F4C81]">
                        {formatCurrency(tx.amount, currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatAge(tx.secondsAgo)}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className={cn(
                      'flex-shrink-0 h-8 px-3 text-xs',
                      i === 0 && tx.confidence === 'high'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-[#0F4C81] hover:bg-[#0d3d6b] text-white'
                    )}
                    disabled={matchingId !== null}
                    onClick={() => handleMatch(tx)}
                  >
                    Match
                  </Button>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t bg-white">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Refreshing in {countdown}s</span>
                </div>
                <button
                  onClick={() => { setCountdown(POLL_INTERVAL / 1000); fetchTransactions() }}
                  className="text-[#0F4C81] hover:underline font-medium"
                >
                  Refresh now
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {view === 'matched' && matchedTx && (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-green-700 mb-1">Payment Matched!</p>
            <p className="text-muted-foreground text-sm">{formatCurrency(matchedTx.amount, currency)}</p>
            {(matchedTx.sender_name || matchedTx.sender_phone) && (
              <div className="mt-3 bg-green-50 rounded-lg px-4 py-2.5 text-sm inline-block">
                {matchedTx.sender_name && (
                  <p className="font-semibold text-green-800">{matchedTx.sender_name}</p>
                )}
                {matchedTx.sender_phone && (
                  <p className="text-green-600 text-xs mt-0.5">{matchedTx.sender_phone}</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">Completing sale...</p>
          </div>
        )}
      </div>
    </div>
  )
}
