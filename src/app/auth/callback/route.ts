import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role to avoid session-cookie race condition right after OAuth exchange
const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure profile exists
      await admin.from('profiles').upsert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name ?? data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url ?? null,
      }, { onConflict: 'id', ignoreDuplicates: false })

      // Use admin client — avoids RLS/cookie race condition right after session exchange
      const { data: membership } = await admin
        .from('business_users')
        .select('business_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .maybeSingle()

      if (membership?.business_id) {
        const { data: biz } = await admin
          .from('businesses')
          .select('slug')
          .eq('id', membership.business_id)
          .maybeSingle()

        if (biz?.slug) {
          return NextResponse.redirect(`${origin}/app/${biz.slug}`)
        }
      }

      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
