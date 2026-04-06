import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasFeature } from '@/lib/features'
import { ProductsClient } from './ProductsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProductsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency, features')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  if (!hasFeature(business.features as Record<string, boolean | number> | null, 'pos')) {
    redirect(`/app/${slug}`)
  }

  const { data: products } = await supabase
    .from('inventory_items')
    .select('id, name, sku, barcode, description, unit, sale_price, purchase_price, tax_rate, stock_quantity, reorder_level, type, category, image_url, archived')
    .eq('business_id', business.id)
    .eq('archived', false)
    .order('name')

  return (
    <ProductsClient
      products={products ?? []}
      businessId={business.id}
      slug={slug}
      currency={business.currency}
    />
  )
}
