import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { AppShell } from '@/components/layout/AppShell'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function AppLayout({ children, params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client to bypass RLS — user identity validated above
  const { data: business } = await admin
    .from('businesses')
    .select('id, slug, name, logo_url, email, phone, address_line1, address_line2, city, state, country, postal_code, currency, timezone, fiscal_year_start, tax_type, default_tax_rate, bank_account_name, bank_account_number, bank_name, default_terms, plan, plan_expires_at, owner_id, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) redirect('/app')

  // Check this user is actually a member
  const { data: membership } = await admin
    .from('business_users')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/app')

  // Load all businesses for the switcher
  const { data: allMemberships } = await admin
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)

  let businesses: Array<{ slug: string; name: string; logo_url?: string; plan: string }> = []
  if (allMemberships && allMemberships.length > 0) {
    const ids = allMemberships.map(m => m.business_id)
    const { data: bizList } = await admin
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
