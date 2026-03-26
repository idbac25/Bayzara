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
    .select('*')
    .eq('id', id)
    .eq('business_id', business?.id)
    .single()

  if (!vendor) notFound()

  const { data: purchases } = await supabase
    .from('documents')
    .select('id, document_number, date, total, amount_due, status, type')
    .eq('vendor_id', id)
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const totalPurchased = (purchases ?? []).reduce((s, p) => s + (p.total ?? 0), 0)
  const totalOutstanding = (purchases ?? []).reduce((s, p) => s + (p.amount_due ?? 0), 0)

  return (
    <VendorDetailClient
      vendor={vendor}
      purchases={purchases ?? []}
      currency={business?.currency ?? 'USD'}
      totalPurchased={totalPurchased}
      totalOutstanding={totalOutstanding}
      slug={slug}
    />
  )
}
