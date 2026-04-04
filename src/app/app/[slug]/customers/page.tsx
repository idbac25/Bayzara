import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomersClient } from './CustomersClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CustomersPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, currency')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  const { data: customers } = await supabase
    .from('pos_customers')
    .select('id, name, primary_phone, total_spent, visit_count, last_seen_at, first_seen_at')
    .eq('business_id', business.id)
    .order('last_seen_at', { ascending: false })

  return (
    <CustomersClient
      business={business}
      customers={customers ?? []}
    />
  )
}
