import { createClient } from '@/lib/supabase/server'
import { VendorsClient } from './VendorsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VendorsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('business_id', business?.id)
    .order('name')

  return (
    <VendorsClient
      vendors={vendors ?? []}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      slug={slug}
    />
  )
}
