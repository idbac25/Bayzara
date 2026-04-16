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
    if (!name) { skipped++; continue }

    const { error } = await supabase.from('vendors').insert({
      business_id,
      name,
      contact_name: row.contact_name ? String(row.contact_name).trim() : null,
      phone: row.phone ? String(row.phone).trim() : null,
      evc_phone: row.evc_phone ? String(row.evc_phone).trim() : null,
      city: row.city ? String(row.city).trim() : null,
      country: row.country ? String(row.country).trim() : 'Somalia',
      notes: row.notes ? String(row.notes).trim() : null,
    })

    if (error) {
      if (error.code === '23505') skipped++
      else { errors.push(`${name}: ${error.message}`); skipped++ }
    } else {
      imported++
    }
  }

  await logImport(supabase, {
    business_id, user_id: user.id, import_type: 'suppliers', source: 'csv',
    imported, skipped, errors,
  })

  return NextResponse.json({ imported, skipped, errors })
}
