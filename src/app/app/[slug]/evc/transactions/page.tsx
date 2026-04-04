import { createClient } from '@/lib/supabase/server'
import { EVCTransactionsClient } from './EVCTransactionsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EVCTransactionsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  const { data: transactions } = await supabase
    .from('evc_transactions')
    .select('*, evc_connections(merchant_name)')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })
    .limit(200)

  return <EVCTransactionsClient transactions={transactions ?? []} slug={slug} />
}
