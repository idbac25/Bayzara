import { createClient } from '@/lib/supabase/server'
import { PurchasesClient } from './PurchasesClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PurchasesPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: purchases } = await supabase
    .from('documents')
    .select(`
      id, document_number, date, due_date, total, amount_paid, amount_due,
      status, type, deleted_at, created_at,
      vendors(id, name)
    `)
    .eq('business_id', business?.id)
    .in('type', ['purchase', 'expense', 'purchase_order'])
    .order('created_at', { ascending: false })

  return (
    <PurchasesClient
      purchases={purchases ?? []}
      currency={business?.currency ?? 'USD'}
      businessId={business?.id ?? ''}
      slug={slug}
    />
  )
}
