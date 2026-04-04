import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CustomerLedgerClient } from './CustomerLedgerClient'

interface Props {
  params: Promise<{ slug: string; customerId: string }>
}

export default async function CustomerLedgerPage({ params }: Props) {
  const { slug, customerId } = await params
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
    .select('id, name, primary_phone, notes')
    .eq('id', customerId)
    .eq('business_id', business.id)
    .single()

  if (!customer) notFound()

  const { data: account } = await supabase
    .from('debt_accounts')
    .select('id, current_balance, credit_limit, notes, created_at')
    .eq('business_id', business.id)
    .eq('customer_id', customerId)
    .maybeSingle()

  const { data: transactions } = account
    ? await supabase
        .from('debt_transactions')
        .select('id, type, amount, description, created_at')
        .eq('debt_account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] }

  return (
    <CustomerLedgerClient
      business={business}
      customer={customer}
      account={account ?? null}
      transactions={transactions ?? []}
      slug={slug}
    />
  )
}
