import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from './ClientsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ClientsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  return <ClientsClient clients={clients ?? []} slug={slug} />
}
