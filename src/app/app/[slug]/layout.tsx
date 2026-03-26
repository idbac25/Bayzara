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

  // Step 1: find the business by slug
  const { data: business } = await supabase
    .from('businesses')
    .select('id, slug, name, logo_url, email, phone, address_line1, address_line2, city, state, country, postal_code, currency, timezone, fiscal_year_start, tax_type, default_tax_rate, bank_account_name, bank_account_number, bank_name, default_terms, plan, plan_expires_at, owner_id, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) redirect('/app')

  // Step 2: check user is a member and get role
  const { data: membership } = await supabase
    .from('business_users')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/app')

  // Load all user businesses for switcher
  const { data: allMemberships } = await supabase
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)

  let businesses: Array<{ slug: string; name: string; logo_url?: string; plan: string }> = []
  if (allMemberships && allMemberships.length > 0) {
    const ids = allMemberships.map(m => m.business_id)
    const { data: bizList } = await supabase
      .from('businesses')
      .select('slug, name, logo_url, plan')
      .in('id', ids)
    businesses = bizList ?? []
  }

  return (
    <AppShell
      business={business as unknown as Parameters<typeof AppShell>[0]['business']}
      userRole={membership.role as Parameters<typeof AppShell>[0]['userRole']}
      user={user}
      businesses={businesses}
    >
      {children}
    </AppShell>
  )
}
