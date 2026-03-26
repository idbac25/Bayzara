import { createClient } from '@/lib/supabase/server'
import { InventoryClient } from './InventoryClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function InventoryPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('business_id', business?.id)
    .order('name')

  return (
    <InventoryClient
      items={items ?? []}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      slug={slug}
    />
  )
}
