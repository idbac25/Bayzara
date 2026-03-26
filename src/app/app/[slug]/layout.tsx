import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function AppLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load business + role
  const { data: bizUser } = await supabase
    .from('business_users')
    .select(`
      role,
      businesses (
        id, slug, name, logo_url, email, phone, address_line1, address_line2,
        city, state, country, postal_code, currency, timezone, fiscal_year_start,
        tax_type, default_tax_rate, bank_account_name, bank_account_number,
        bank_name, default_terms, plan, plan_expires_at, owner_id, created_at, updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('businesses.slug', slug)
    .not('businesses', 'is', null)
    .maybeSingle()

  if (!bizUser?.businesses) {
    redirect('/app')
  }

  // Load all user businesses for switcher
  const { data: allBizUsers } = await supabase
    .from('business_users')
    .select('businesses(slug, name, logo_url, plan)')
    .eq('user_id', user.id)

  const businesses = (allBizUsers ?? [])
    .flatMap(bu => (Array.isArray(bu.businesses) ? bu.businesses : bu.businesses ? [bu.businesses] : []))
    .filter(Boolean) as Array<{ slug: string; name: string; logo_url?: string; plan: string }>

  const bizData = Array.isArray(bizUser.businesses) ? bizUser.businesses[0] : bizUser.businesses

  return (
    <AppShell
      business={bizData as unknown as Parameters<typeof AppShell>[0]['business']}
      userRole={bizUser.role as Parameters<typeof AppShell>[0]['userRole']}
      user={user}
      businesses={businesses}
    >
      {children}
    </AppShell>
  )
}
