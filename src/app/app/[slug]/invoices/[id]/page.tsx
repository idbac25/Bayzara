import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceDetailClient } from './InvoiceDetailClient'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, name, address_line1, city, country, phone, email, bank_name, bank_account_name, bank_account_number')
    .eq('slug', slug)
    .single()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('business_id', business?.id)
    .single()

  if (!doc) notFound()

  const { data: lineItems } = await supabase
    .from('line_items')
    .select('*')
    .eq('document_id', id)
    .order('sort_order')

  const { data: client } = doc.client_id ? await supabase
    .from('clients')
    .select('*')
    .eq('id', doc.client_id)
    .single() : { data: null }

  const { data: payments } = await supabase
    .from('payment_records')
    .select('*')
    .eq('document_id', id)
    .order('date', { ascending: false })

  const { data: paymentAccounts } = await supabase
    .from('payment_accounts')
    .select('id, name, type')
    .eq('business_id', business?.id)
    .eq('is_active', true)

  return (
    <InvoiceDetailClient
      document={doc}
      lineItems={lineItems ?? []}
      client={client}
      payments={payments ?? []}
      paymentAccounts={paymentAccounts ?? []}
      business={business!}
      slug={slug}
    />
  )
}
