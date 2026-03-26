import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('business_users')
    .select('business_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership?.business_id) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('slug')
      .eq('id', membership.business_id)
      .maybeSingle()

    if (biz?.slug) {
      redirect(`/app/${biz.slug}`)
    }
  }

  redirect('/onboarding')
}
