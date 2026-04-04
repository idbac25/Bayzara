import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CustomerProfileClient } from './CustomerProfileClient'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function CustomerProfilePage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  const { data: customer } = await supabase
    .from('pos_customers')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .single()

  if (!customer) notFound()

  const { data: altPhones } = await supabase
    .from('customer_phones')
    .select('id, phone, label, added_at')
    .eq('customer_id', id)
    .order('added_at', { ascending: true })

  // Recent purchase history (last 50)
  const { data: purchases } = await supabase
    .from('documents')
    .select('id, document_number, date, total, payment_method, evc_sender_phone, status')
    .eq('pos_customer_id', id)
    .eq('source', 'pos')
    .order('date', { ascending: false })
    .limit(50)

  return (
    <CustomerProfileClient
      business={business}
      customer={customer}
      altPhones={altPhones ?? []}
      purchases={purchases ?? []}
    />
  )
}
