import { createClient } from '@/lib/supabase/server'
import { LeadsClient } from './LeadsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LeadsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('id, name, stages')
    .eq('business_id', business?.id)
    .order('created_at')

  return (
    <LeadsClient
      leads={leads ?? []}
      pipelines={pipelines ?? []}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      slug={slug}
    />
  )
}
