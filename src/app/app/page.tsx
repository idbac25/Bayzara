import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('business_users')
    .select('businesses(slug)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const biz = data?.businesses
  const slug = Array.isArray(biz) ? biz[0]?.slug : (biz as unknown as { slug: string } | null)?.slug

  if (slug) {
    redirect(`/app/${slug}`)
  }

  redirect('/onboarding')
}
