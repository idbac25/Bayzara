import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure profile exists
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name ?? data.user.email,
        avatar_url: data.user.user_metadata?.avatar_url ?? null,
      })

      // Check if user has businesses
      const { data: businesses } = await supabase
        .from('business_users')
        .select('businesses(slug)')
        .eq('user_id', data.user.id)
        .limit(1)
        .single()

      if (businesses?.businesses && 'slug' in businesses.businesses) {
        return NextResponse.redirect(`${origin}/app/${businesses.businesses.slug}`)
      }

      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
