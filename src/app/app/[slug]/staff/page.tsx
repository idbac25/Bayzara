import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StaffClient } from './StaffClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StaffPage({ params }: Props) {
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

  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, name, phone, role, is_active, pin_hash, created_at')
    .eq('business_id', business.id)
    .order('name')

  // Mask the pin hash — just send whether it's set
  const staffList = (staff ?? []).map(s => ({ ...s, has_pin: !!s.pin_hash, pin_hash: undefined }))

  // Recent audit log
  const { data: rawLogs } = await supabase
    .from('business_audit_log')
    .select('id, action, entity_type, details, created_at, staff_members(name)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Normalise joined array → single object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = (rawLogs ?? []).map((l: any) => ({
    ...l,
    staff_members: Array.isArray(l.staff_members) ? l.staff_members[0] ?? null : l.staff_members,
  }))

  return <StaffClient business={business} staff={staffList} logs={logs} slug={slug} />
}
