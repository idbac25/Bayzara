import { createClient } from '@/lib/supabase/server'
import { EVCHubClient } from './EVCHubClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function EVCPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .single()

  const { data: connections } = await supabase
    .from('evc_connections')
    .select('*')
    .eq('business_id', business?.id)
    .order('created_at', { ascending: false })

  const { data: recentTxs } = await supabase
    .from('evc_transactions')
    .select('*')
    .eq('business_id', business?.id)
    .order('tran_date', { ascending: false })
    .limit(20)

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const { data: todayTxs } = await supabase
    .from('evc_transactions')
    .select('amount')
    .eq('business_id', business?.id)
    .eq('direction', 'inbound')
    .gte('tran_date', today)

  const { data: monthTxs } = await supabase
    .from('evc_transactions')
    .select('amount')
    .eq('business_id', business?.id)
    .eq('direction', 'inbound')
    .gte('tran_date', monthStart)

  const stats = {
    todayTotal: todayTxs?.reduce((s, t) => s + t.amount, 0) ?? 0,
    monthTotal: monthTxs?.reduce((s, t) => s + t.amount, 0) ?? 0,
    autoRecorded: recentTxs?.filter(t => t.is_recorded).length ?? 0,
    needsReview: recentTxs?.filter(t => t.needs_review).length ?? 0,
  }

  return (
    <EVCHubClient
      connections={connections ?? []}
      recentTxs={recentTxs ?? []}
      stats={stats}
      slug={slug}
    />
  )
}
