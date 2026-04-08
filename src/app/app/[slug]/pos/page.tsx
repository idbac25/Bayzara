import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { hasFeature } from '@/lib/features'
import { POSClient } from './POSClient'

// Always fetch fresh product/staff data — never serve a cached version
export const dynamic = 'force-dynamic'

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
    .select('id, name, sku, barcode, unit, sale_price, tax_rate, stock_quantity, type, category, image_url')
    .eq('business_id', business.id)
    .eq('archived', false)
    .order('name')

  // Load retail (POS) customers for credit sales
  const { data: posCustomers } = await supabase
    .from('pos_customers')
    .select('id, name, primary_phone')
    .eq('business_id', business.id)
    .order('name')

  // Load active EVC connections
  const { data: evcConnections } = await supabase
    .from('evc_connections')
    .select('id, merchant_name, merchant_number, current_balance, is_active')
    .eq('business_id', business.id)
    .eq('is_active', true)

  // Load active staff members with PIN set
  const { data: rawStaff } = await supabase
    .from('staff_members')
    .select('id, name, role, pin_hash, is_active')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .order('name')

  const staff = (rawStaff ?? []).map(s => ({ ...s, has_pin: !!s.pin_hash, pin_hash: undefined }))

  return (
    <POSClient
      business={business}
      items={items ?? []}
      posCustomers={posCustomers ?? []}
      evcConnections={evcConnections ?? []}
      staff={staff}
    />
  )
}
