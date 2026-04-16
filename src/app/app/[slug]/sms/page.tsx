import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SmsClient } from './SmsClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SmsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!business) redirect('/app')

  const { data: devices } = await supabase
    .from('sms_listener_devices')
    .select('id, name, device_phone, paired_at, last_seen_at, app_version, revoked_at, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  const { data: events } = await supabase
    .from('sms_events')
    .select(`
      id, raw_sms, direction, amount, currency, counterparty_phone, status,
      occurred_at, received_at, matched_customer_id, matched_vendor_id,
      pos_customers!matched_customer_id ( name ),
      vendors!matched_vendor_id ( name )
    `)
    .eq('business_id', business.id)
    .order('received_at', { ascending: false })
    .limit(50)

  // Customers with debt for the action dialog
  const { data: customersWithDebt } = await supabase
    .from('debt_accounts')
    .select('customer_id, current_balance, pos_customers(id, name, primary_phone)')
    .eq('business_id', business.id)
    .gt('current_balance', 0)

  type CustWithDebt = {
    id: string
    name: string
    primary_phone: string | null
    current_balance: number
  }
  const customers: CustWithDebt[] = (customersWithDebt ?? []).flatMap(d => {
    const c = Array.isArray(d.pos_customers) ? d.pos_customers[0] : d.pos_customers
    if (!c) return []
    return [{
      id: c.id,
      name: c.name,
      primary_phone: c.primary_phone,
      current_balance: Number(d.current_balance),
    }]
  })

  const normalisedEvents = (events ?? []).map(e => ({
    id: e.id,
    raw_sms: e.raw_sms,
    direction: e.direction,
    amount: e.amount,
    currency: e.currency,
    counterparty_phone: e.counterparty_phone,
    status: e.status,
    occurred_at: e.occurred_at,
    received_at: e.received_at,
    matched_customer_id: e.matched_customer_id,
    matched_vendor_id: e.matched_vendor_id,
    matched_customer_name: Array.isArray(e.pos_customers)
      ? (e.pos_customers[0]?.name ?? null)
      : (e.pos_customers as { name: string } | null)?.name ?? null,
    matched_vendor_name: Array.isArray(e.vendors)
      ? (e.vendors[0]?.name ?? null)
      : (e.vendors as { name: string } | null)?.name ?? null,
  }))

  return (
    <SmsClient
      business={business}
      devices={devices ?? []}
      events={normalisedEvents}
      customers={customers}
    />
  )
}
