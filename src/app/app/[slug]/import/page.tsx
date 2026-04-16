import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportClient } from './ImportClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ImportPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  const { data: history } = await supabase
    .from('import_history')
    .select('id, import_type, source, imported, skipped, errors_count, errors, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(25)

  return <ImportClient business={business} slug={slug} history={history ?? []} />
}
