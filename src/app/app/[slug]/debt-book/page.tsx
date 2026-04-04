import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DebtBookClient } from './DebtBookClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DebtBookPage({ params }: Props) {
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

  // All debt accounts with customer info, newest activity first
  const { data: accounts } = await supabase
    .from('debt_accounts')
    .select(`
      id,
      current_balance,
      credit_limit,
      updated_at,
      pos_customers (
        id,
        name,
        primary_phone
      )
    `)
    .eq('business_id', business.id)
    .order('updated_at', { ascending: false })

  const totalOutstanding = (accounts ?? []).reduce((sum, a) => sum + (a.current_balance ?? 0), 0)
  const customersInDebt = (accounts ?? []).filter(a => a.current_balance > 0).length

  // Supabase returns joined rows as arrays — normalise to single object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalised = (accounts ?? []).map((a: any) => ({
    ...a,
    pos_customers: Array.isArray(a.pos_customers) ? a.pos_customers[0] ?? null : a.pos_customers,
  }))

  return (
    <DebtBookClient
      business={business}
      accounts={normalised}
      totalOutstanding={totalOutstanding}
      customersInDebt={customersInDebt}
      slug={slug}
    />
  )
}
