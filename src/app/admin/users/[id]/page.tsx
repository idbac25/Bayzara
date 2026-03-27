import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { UserDetailClient } from './UserDetailClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props { params: Promise<{ id: string }> }

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.from('business_users')
      .select('id, role, created_at, businesses(id, name, slug, plan, country)')
      .eq('user_id', id),
  ])

  if (!profile) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <UserDetailClient profile={profile} memberships={(memberships ?? []) as any} />
}
