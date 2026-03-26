'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Save, Building2, User, Users, FileText, Shield } from 'lucide-react'

interface Business {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  country: string | null
  currency: string
  timezone: string
  default_tax_rate: number
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  default_terms: string | null
  logo_url: string | null
  plan: string
}

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
}

interface TeamMember {
  id: string
  role: string
  created_at: string
  profiles: Array<{ id: string; full_name: string | null; email: string | null; avatar_url: string | null }> | null
}

interface Sequence {
  id: string
  type: string
  prefix: string
  next_number: number
  padding: number
}

interface Props {
  business: Business
  profile: Profile | null
  teamMembers: TeamMember[]
  sequences: Sequence[]
  slug: string
  userId: string
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'ETB', 'KES', 'TZS', 'SOS']
const TIMEZONES = ['Africa/Mogadishu', 'Africa/Nairobi', 'Africa/Addis_Ababa', 'Asia/Dubai', 'UTC', 'Europe/London']

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Owner',
  admin: 'Admin',
  accountant: 'Accountant',
  viewer: 'Viewer',
}

export function SettingsClient({ business: biz, profile, teamMembers, sequences, slug, userId }: Props) {
  const { business } = useBusiness()
  const router = useRouter()

  // Business form
  const [bizForm, setBizForm] = useState({
    name: biz.name,
    email: biz.email ?? '',
    phone: biz.phone ?? '',
    address_line1: biz.address_line1 ?? '',
    city: biz.city ?? '',
    country: biz.country ?? '',
    currency: biz.currency,
    timezone: biz.timezone,
    default_tax_rate: String(biz.default_tax_rate),
    bank_name: biz.bank_name ?? '',
    bank_account_name: biz.bank_account_name ?? '',
    bank_account_number: biz.bank_account_number ?? '',
    default_terms: biz.default_terms ?? '',
  })
  const [savingBiz, setSavingBiz] = useState(false)

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const handleSaveBusiness = async () => {
    setSavingBiz(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('businesses')
      .update({
        name: bizForm.name,
        email: bizForm.email || null,
        phone: bizForm.phone || null,
        address_line1: bizForm.address_line1 || null,
        city: bizForm.city || null,
        country: bizForm.country || null,
        currency: bizForm.currency,
        timezone: bizForm.timezone,
        default_tax_rate: parseFloat(bizForm.default_tax_rate) || 0,
        bank_name: bizForm.bank_name || null,
        bank_account_name: bizForm.bank_account_name || null,
        bank_account_number: bizForm.bank_account_number || null,
        default_terms: bizForm.default_terms || null,
      })
      .eq('id', biz.id)

    setSavingBiz(false)
    if (error) { toast.error(error.message); return }
    toast.success('Business settings saved')
    router.refresh()
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name || null,
        phone: profileForm.phone || null,
      })
      .eq('id', userId)

    setSavingProfile(false)
    if (error) { toast.error(error.message); return }
    toast.success('Profile updated')
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: business.name, href: `/app/${slug}` }, { label: 'Settings' }]}
      />

      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business"><Building2 className="mr-2 h-4 w-4" />Business</TabsTrigger>
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4" />Documents</TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Business Name</Label>
                    <Input value={bizForm.name} onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={bizForm.email} onChange={e => setBizForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={bizForm.phone} onChange={e => setBizForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input value={bizForm.address_line1} onChange={e => setBizForm(f => ({ ...f, address_line1: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={bizForm.city} onChange={e => setBizForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={bizForm.country} onChange={e => setBizForm(f => ({ ...f, country: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Currency</Label>
                    <Select value={bizForm.currency} onValueChange={v => setBizForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select value={bizForm.timezone} onValueChange={v => setBizForm(f => ({ ...f, timezone: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" value={bizForm.default_tax_rate} onChange={e => setBizForm(f => ({ ...f, default_tax_rate: e.target.value }))} className="mt-1" min={0} max={100} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium">Bank Details (shown on invoices)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Bank Name</Label>
                      <Input value={bizForm.bank_name} onChange={e => setBizForm(f => ({ ...f, bank_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Account Name</Label>
                      <Input value={bizForm.bank_account_name} onChange={e => setBizForm(f => ({ ...f, bank_account_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label>Account Number</Label>
                      <Input value={bizForm.bank_account_number} onChange={e => setBizForm(f => ({ ...f, bank_account_number: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Default Invoice Terms</Label>
                  <Input value={bizForm.default_terms} onChange={e => setBizForm(f => ({ ...f, default_terms: e.target.value }))} placeholder="Payment due within 30 days" className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveBusiness} disabled={savingBiz} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
              <Save className="mr-2 h-4 w-4" />
              {savingBiz ? 'Saving...' : 'Save Business Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile">
          <div className="space-y-6 max-w-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url ?? ''} />
                    <AvatarFallback className="text-lg bg-[#0F4C81] text-white">
                      {profileForm.full_name?.[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile?.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Email cannot be changed here</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Full Name</Label>
                  <Input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />Team Members
                </CardTitle>
                <Badge variant="secondary">{biz.plan} plan</Badge>
              </div>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {teamMembers.map(member => {
                const p = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <div key={member.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={p?.avatar_url ?? ''} />
                        <AvatarFallback className="bg-[#0F4C81]/10 text-[#0F4C81] text-sm">
                          {p?.full_name?.[0]?.toUpperCase() ?? p?.email?.[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{p?.full_name ?? p?.email ?? 'Unknown'}</p>
                        {p?.email && p.full_name && <p className="text-xs text-muted-foreground">{p.email}</p>}
                      </div>
                    </div>
                    <Badge variant={member.role === 'super_admin' ? 'default' : 'secondary'} className="text-xs">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-3">
            Team invites coming soon. Contact support to add team members.
          </p>
        </TabsContent>

        {/* Document Sequences */}
        <TabsContent value="documents">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Document Number Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              {sequences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sequences configured</p>
              ) : (
                <div className="space-y-3">
                  {sequences.map(seq => (
                    <div key={seq.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium capitalize">{seq.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {seq.prefix}{String(seq.next_number).padStart(seq.padding, '0')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        Next: #{seq.next_number}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
