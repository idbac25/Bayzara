import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestocksClient } from './RestocksClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function RestocksPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const { data: restocks } = await supabase
    .from('stock_restocks')
    .select(`
      id, date, due_date, quantity, cost_per_unit, total_cost,
      payment_method, status, notes,
      inventory_items ( name, unit ),
      vendors ( name )
    `)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Supabase returns joins as arrays; normalise to single objects for the client
  const normalised = (restocks ?? []).map(r => ({
    ...r,
    inventory_items: Array.isArray(r.inventory_items) ? (r.inventory_items[0] ?? null) : r.inventory_items,
    vendors: Array.isArray(r.vendors) ? (r.vendors[0] ?? null) : r.vendors,
  }))

  return (
    <RestocksClient
      business={business}
      restocks={normalised}
    />
  )
}
