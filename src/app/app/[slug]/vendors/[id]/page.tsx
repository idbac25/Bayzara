import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VendorDetailClient } from './VendorDetailClient'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function VendorDetailPage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, name, contact_name, phone, evc_phone, city, country, notes')
    .eq('id', id)
    .eq('business_id', business?.id)
    .single()

  if (!vendor) notFound()

  const { data: restocks } = await supabase
    .from('stock_restocks')
    .select(`
      id, date, due_date, quantity, cost_per_unit, total_cost,
      payment_method, status,
      inventory_items ( name, unit )
    `)
    .eq('vendor_id', id)
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const normalised = (restocks ?? []).map(r => ({
    ...r,
    inventory_items: Array.isArray(r.inventory_items) ? (r.inventory_items[0] ?? null) : r.inventory_items,
  }))

  const totalRestocked = normalised.reduce((s, r) => s + (r.total_cost ?? 0), 0)
  const totalOwed = normalised
    .filter(r => r.status === 'unpaid')
    .reduce((s, r) => s + (r.total_cost ?? 0), 0)

  return (
    <VendorDetailClient
      vendor={vendor}
      restocks={normalised}
      currency={business?.currency ?? 'USD'}
      totalRestocked={totalRestocked}
      totalOwed={totalOwed}
      slug={slug}
    />
  )
}
