'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Zap, Loader2, CheckCircle, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AccountInfo {
  merchant_name: string
  subscription_id: string
  partner_uid: string
  account_id: string
  account_number: string
  current_balance: number
  session_id: string
  session_token: string
  session_cookie: string
  connection_id: string
}

export default function ConnectEVCPage() {
  const { business } = useBusiness()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [step, setStep] = useState<'credentials' | 'confirm'>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/evc/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          business_id: business.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Connection failed')
        setLoading(false)
        return
      }

      setAccountInfo(data)
      setStep('confirm')
    } catch {
      toast.error('Failed to connect. Check your credentials.')
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!accountInfo) return
    setLoading(true)
    try {
      const res = await fetch('/api/evc/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: accountInfo.connection_id,
          business_id: business.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Activation failed')
        setLoading(false)
        return
      }

      toast.success('EVC account connected and syncing!')
      router.push(`/app/${slug}/evc`)
    } catch {
      toast.error('Activation failed')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Connect EVC Plus Account"
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'EVC Plus', href: `/app/${slug}/evc` },
          { label: 'Connect' },
        ]}
      />

      {step === 'credentials' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-[#F5A623]" />
              </div>
              <div>
                <CardTitle>Hormud EVC Plus</CardTitle>
                <CardDescription>Enter your merchant portal credentials</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Shield className="h-4 w-4 inline mr-2" />
              Your credentials are encrypted and stored securely. They are only used to sync transactions.
            </div>

            <div className="space-y-2">
              <Label>Merchant Username (phone number)</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. 615001234"
                type="text"
              />
              <p className="text-xs text-muted-foreground">
                This is the phone number you use to log in to merchant.hormuud.com
              </p>
            </div>

            <div className="space-y-2">
              <Label>Merchant Password</Label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="Your merchant portal password"
              />
            </div>

            <Button
              className="w-full bg-[#F5A623] hover:bg-[#e09520] text-black font-semibold"
              onClick={handleConnect}
              disabled={loading || !username || !password}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" />Connect Account</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : accountInfo ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-6 w-6 text-[#27AE60]" />
              <CardTitle>Account Found!</CardTitle>
            </div>
            <CardDescription>Confirm your EVC merchant account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant Name</span>
                <span className="font-semibold">{accountInfo.merchant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number</span>
                <span className="font-mono font-semibold">{accountInfo.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Balance</span>
                <span className="font-bold text-[#27AE60]">
                  {formatCurrency(accountInfo.current_balance, 'USD')}
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <Zap className="h-4 w-4 inline mr-2 text-[#F5A623]" />
              This account will automatically sync every 60 seconds. New payments will be instantly recorded.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('credentials')}>
                Back
              </Button>
              <Button
                className="flex-1 bg-[#27AE60] hover:bg-[#229954] text-white font-semibold"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" />Confirm & Activate</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
