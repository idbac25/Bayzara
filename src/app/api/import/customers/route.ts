import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logImport } from '@/lib/import/log-history'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, rows } = await req.json()
  if (!business_id || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  let imported = 0, skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const name = String(row.name ?? '').trim()
    const phone = String(row.phone ?? '').trim() || null
    if (!name) { skipped++; continue }

    const { error } = await supabase.from('pos_customers').insert({
      business_id,
      name,
      primary_phone: phone ?? `IMPORT-${Date.now()}-${Math.random()}`,
    })

    if (error) {
      if (error.code === '23505') skipped++ // duplicate
      else { errors.push(`${name}: ${error.message}`); skipped++ }
    } else {
      imported++
    }
  }

  await logImport(supabase, {
    business_id, user_id: user.id, import_type: 'customers', source: 'csv',
    imported, skipped, errors,
  })

  return NextResponse.json({ imported, skipped, errors })
}
