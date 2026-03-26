'use client'

import Link from 'next/link'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Zap, Plus, RefreshCw, AlertTriangle, CheckCircle,
  TrendingUp, Calendar, DollarSign, Eye
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
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-4 w-4 text-[#F5A623]" />
                          <span className="font-semibold">{conn.merchant_name}</span>
                          <Badge
                            className={`text-[10px] ${conn.is_active && conn.sync_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                            variant="outline"
                          >
                            {conn.is_active && conn.sync_enabled ? '● LIVE' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{conn.account_number}</p>
                        {conn.last_synced_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last sync: {new Date(conn.last_synced_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{conn.currency} Balance</p>
                        <p className="text-xl font-bold text-[#27AE60]">
                          {formatCurrency(conn.current_balance, conn.currency)}
                        </p>
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
                            {tx.sender_name ?? tx.sender_phone ?? 'Unknown Sender'}
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
                      <span className={`font-semibold ${tx.direction === 'inbound' ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
                        {tx.direction === 'inbound' ? '+' : '-'}{formatCurrency(tx.amount, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
