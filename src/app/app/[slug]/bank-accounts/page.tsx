import { createClient } from '@/lib/supabase/server'
import { BankAccountsClient } from './BankAccountsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BankAccountsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: accounts } = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('business_id', business?.id)
    .order('name')

  return (
    <BankAccountsClient
      accounts={accounts ?? []}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      slug={slug}
    />
  )
}
