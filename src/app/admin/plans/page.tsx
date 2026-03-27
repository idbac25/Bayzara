import { createClient as createAdminClient } from '@supabase/supabase-js'
import { PlansClient } from './PlansClient'

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PlansPage() {
  const { data: plans } = await admin
    .from('plan_templates')
    .select('*')
    .order('sort_order')

  return <PlansClient plans={plans ?? []} />
}
