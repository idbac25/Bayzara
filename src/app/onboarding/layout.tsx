import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If user already has a business, skip onboarding and go straight to dashboard
  const { data: membership } = await admin
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership?.business_id) {
    const { data: biz } = await admin
      .from('businesses')
      .select('slug')
      .eq('id', membership.business_id)
      .maybeSingle()

    if (biz?.slug) redirect(`/app/${biz.slug}`)
  }

  return <>{children}</>
}
