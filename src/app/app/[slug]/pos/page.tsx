import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasFeature } from '@/lib/features'
import { POSClient } from './POSClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function POSPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency, logo_url, phone, address_line1, city, country, features')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  // Gate behind 'pos' feature flag — default true if not set (backward-compatible)
  if (!hasFeature(business.features as Record<string, boolean | number> | null, 'pos')) {
    redirect(`/app/${slug}`)
  }

  // Load active inventory items available for sale
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, sku, unit, sale_price, tax_rate, stock_quantity, type, category, image_url')
    .eq('business_id', business.id)
    .eq('archived', false)
    .order('name')

  // Load active clients for customer search
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, evc_phone, payment_terms, credit_limit, credit_terms_days')
    .eq('business_id', business.id)
    .eq('archived', false)
    .order('name')

  // Load active EVC connections
  const { data: evcConnections } = await supabase
    .from('evc_connections')
    .select('id, merchant_name, merchant_number, current_balance, is_active')
    .eq('business_id', business.id)
    .eq('is_active', true)

  return (
    <POSClient
      business={business}
      items={items ?? []}
      clients={clients ?? []}
      evcConnections={evcConnections ?? []}
    />
  )
}
