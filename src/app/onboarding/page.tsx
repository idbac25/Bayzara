'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Building2, Globe, Upload, Check } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'KES', 'ETB', 'DJF']
const TIMEZONES = [
  { value: 'Africa/Mogadishu', label: 'Mogadishu (EAT, UTC+3)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT, UTC+3)' },
  { value: 'Africa/Addis_Ababa', label: 'Addis Ababa (EAT, UTC+3)' },
  { value: 'Africa/Djibouti', label: 'Djibouti (EAT, UTC+3)' },
  { value: 'UTC', label: 'UTC' },
]

const COUNTRIES = [
  { value: 'SO', label: 'Somalia' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'DJ', label: 'Djibouti' },
  { value: 'ER', label: 'Eritrea' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
]

const DEFAULT_STAGES = [
  { id: 'open', name: 'Open', order: 0, color: '#3B82F6' },
  { id: 'contacted', name: 'Contacted', order: 1, color: '#8B5CF6' },
  { id: 'proposal_sent', name: 'Proposal Sent', order: 2, color: '#F59E0B' },
  { id: 'deal_done', name: 'Deal Done', order: 3, color: '#10B981' },
  { id: 'lost', name: 'Lost', order: 4, color: '#EF4444' },
  { id: 'not_serviceable', name: 'Not Serviceable', order: 5, color: '#6B7280' },
]

const DOCUMENT_TYPES = [
  'invoice', 'quotation', 'proforma_invoice', 'sales_order',
  'delivery_challan', 'credit_note', 'payment_receipt',
  'purchase', 'expense', 'purchase_order', 'payout_receipt', 'debit_note'
]

const step1Schema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

const step2Schema = z.object({
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
})

type Step1Form = z.infer<typeof step1Schema>
type Step2Form = z.infer<typeof step2Schema>

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [businessData, setBusinessData] = useState<Step1Form & Step2Form>({
    name: '',
    slug: '',
    country: 'SO',
    currency: 'USD',
    timezone: 'Africa/Mogadishu',
  })

  const form1 = useForm<Step1Form>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { country: 'SO', currency: 'USD', timezone: 'Africa/Mogadishu' },
  })

  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 2) return
    setCheckingSlug(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    setSlugAvailable(!data)
    setCheckingSlug(false)
  }

  const onStep1Submit = (data: Step1Form) => {
    if (slugAvailable === false) return
    setBusinessData(prev => ({ ...prev, ...data }))
    setStep(2)
  }

  const onStep2Submit = (data: Step2Form) => {
    setBusinessData(prev => ({ ...prev, ...data }))
    setStep(3)
  }

  const onFinish = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    let logoUrl = null

    // Upload logo if provided
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const fileName = `${businessData.slug}-${Date.now()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from('business-logos')
        .upload(fileName, logoFile)
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(uploadData.path)
        logoUrl = publicUrl
      }
    }

    // Create business
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({
        slug: businessData.slug,
        name: businessData.name,
        logo_url: logoUrl,
        country: businessData.country,
        currency: businessData.currency,
        timezone: businessData.timezone,
        owner_id: user.id,
      })
      .select()
      .single()

    if (bizError || !business) {
      setError(bizError?.message ?? 'Failed to create business')
      setLoading(false)
      return
    }

    // Add owner as super_admin
    await supabase.from('business_users').insert({
      business_id: business.id,
      user_id: user.id,
      role: 'super_admin',
      accepted_at: new Date().toISOString(),
    })

    // Create default pipeline
    await supabase.from('pipelines').insert({
      business_id: business.id,
      name: 'Sales Pipeline',
      stages: DEFAULT_STAGES,
      is_default: true,
    })

    // Create document sequences for all types
    const sequences = DOCUMENT_TYPES.map(type => ({
      business_id: business.id,
      document_type: type,
      prefix: '',
      current_number: 0,
    }))
    await supabase.from('document_sequences').insert(sequences)

    router.push(`/app/${business.slug}`)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-[#0F4C81]">Bayzara</span>
          </div>
          <p className="text-sm text-muted-foreground">Let&apos;s set up your business</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s < step ? 'bg-[#27AE60] text-white' :
                s === step ? 'bg-[#0F4C81] text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-[#27AE60]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card className="shadow-sm border-0 bg-white">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#0F4C81]" />
                  <CardTitle className="text-lg">Business Name</CardTitle>
                </div>
                <CardDescription>What&apos;s your business called?</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Business Ltd"
                      {...form1.register('name', {
                        onChange: (e) => {
                          const slug = slugify(e.target.value)
                          form1.setValue('slug', slug)
                          setSlugAvailable(null)
                        }
                      })}
                    />
                    {form1.formState.errors.name && (
                      <p className="text-sm text-destructive">{form1.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug *</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted border rounded-l-md border-r-0">
                        bayzara.com/app/
                      </span>
                      <Input
                        id="slug"
                        className="rounded-l-none"
                        placeholder="my-business"
                        {...form1.register('slug', {
                          onChange: (e) => {
                            setSlugAvailable(null)
                            clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)._slugTimer)
                            ;(window as unknown as Record<string, ReturnType<typeof setTimeout>>)._slugTimer = setTimeout(() => checkSlug(e.target.value), 600)
                          }
                        })}
                      />
                    </div>
                    <div className="text-xs">
                      {checkingSlug && <span className="text-muted-foreground">Checking availability...</span>}
                      {!checkingSlug && slugAvailable === true && <span className="text-[#27AE60]">✓ Available</span>}
                      {!checkingSlug && slugAvailable === false && <span className="text-destructive">✗ Already taken</span>}
                    </div>
                    {form1.formState.errors.slug && (
                      <p className="text-sm text-destructive">{form1.formState.errors.slug.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-[#0F4C81] hover:bg-[#0d3f6e]">
                    Continue
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#0F4C81]" />
                  <CardTitle className="text-lg">Location & Currency</CardTitle>
                </div>
                <CardDescription>Set your business region and currency</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      defaultValue="SO"
                      onValueChange={(v) => form2.setValue('country', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      defaultValue="USD"
                      onValueChange={(v) => form2.setValue('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      defaultValue="Africa/Mogadishu"
                      onValueChange={(v) => form2.setValue('timezone', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#0F4C81] hover:bg-[#0d3f6e]">
                      Continue
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#0F4C81]" />
                  <CardTitle className="text-lg">Business Logo</CardTitle>
                </div>
                <CardDescription>Optional — you can add this later in settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#0F4C81] transition-colors"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {logoFile ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(logoFile)}
                        alt="Logo preview"
                        className="h-16 w-16 object-contain mx-auto rounded"
                      />
                      <p className="text-sm text-muted-foreground">{logoFile.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-[#0F4C81] hover:bg-[#0d3f6e]"
                    onClick={onFinish}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {logoFile ? 'Create Business' : 'Skip & Create'}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
