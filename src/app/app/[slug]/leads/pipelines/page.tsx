import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PipelinesClient } from './PipelinesClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PipelinesPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: business } = await admin
    .from('businesses')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) return null

  const { data: pipelines } = await admin
    .from('pipelines')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  return (
    <PipelinesClient
      pipelines={pipelines ?? []}
      businessId={business.id}
      slug={slug}
    />
  )
}
