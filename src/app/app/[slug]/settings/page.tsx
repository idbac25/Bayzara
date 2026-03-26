import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: teamMembers } = await supabase
    .from('business_users')
    .select('id, role, created_at, profiles(id, full_name, email, avatar_url)')
    .eq('business_id', business?.id)

  const { data: sequences } = await supabase
    .from('document_sequences')
    .select('*')
    .eq('business_id', business?.id)

  return (
    <SettingsClient
      business={business!}
      profile={profile}
      teamMembers={teamMembers ?? []}
      sequences={sequences ?? []}
      slug={slug}
      userId={user.id}
    />
  )
}
