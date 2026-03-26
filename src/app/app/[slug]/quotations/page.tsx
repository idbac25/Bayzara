import { createClient } from '@/lib/supabase/server'
import { QuotationsClient } from './QuotationsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function QuotationsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: quotations } = await supabase
    .from('documents')
    .select(`
      id, document_number, date, due_date, total, amount_paid, amount_due,
      status, deleted_at, created_at,
      clients(id, name)
    `)
    .eq('business_id', business?.id)
    .eq('type', 'quotation')
    .order('created_at', { ascending: false })

  return (
    <QuotationsClient
      quotations={quotations ?? []}
      currency={business?.currency ?? 'USD'}
      businessId={business?.id ?? ''}
      slug={slug}
    />
  )
}
