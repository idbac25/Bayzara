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
    .single()

  if (data?.businesses && 'slug' in data.businesses) {
    redirect(`/app/${data.businesses.slug}`)
  }

  redirect('/onboarding')
}
