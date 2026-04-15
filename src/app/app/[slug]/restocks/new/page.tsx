import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestockFormClient } from './RestockFormClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function NewRestockPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const [{ data: products }, { data: vendors }] = await Promise.all([
    supabase
      .from('inventory_items')
      .select('id, name, unit, purchase_price, stock_quantity')
      .eq('business_id', business.id)
      .eq('archived', false)
      .eq('type', 'product')
      .order('name'),
    supabase
      .from('vendors')
      .select('id, name, phone, city')
      .eq('business_id', business.id)
      .eq('archived', false)
      .order('name'),
  ])

  return (
    <RestockFormClient
      business={business}
      products={products ?? []}
      vendors={vendors ?? []}
    />
  )
}
