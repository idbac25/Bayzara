import { createClient } from '@/lib/supabase/server'
import { InvoicesClient } from './InvoicesClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function InvoicesPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: invoices } = await supabase
    .from('documents')
    .select(`
      id, document_number, date, due_date, total, amount_paid, amount_due,
      status, is_recurring, deleted_at, created_at,
      clients(id, name)
    `)
    .eq('business_id', business?.id)
    .eq('type', 'invoice')
    .order('created_at', { ascending: false })

  return (
    <InvoicesClient
      invoices={invoices ?? []}
      currency={business?.currency ?? 'USD'}
      businessId={business?.id ?? ''}
      slug={slug}
    />
  )
}
