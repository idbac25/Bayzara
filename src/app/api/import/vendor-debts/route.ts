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

    const balance = parseFloat(row.balance ?? row.amount_owed ?? 0) || 0
    const phone = row.phone ? String(row.phone).trim() : null
    const evcPhone = row.evc_phone ? String(row.evc_phone).trim() : null
    const notes = row.notes ? String(row.notes).trim() : null

    // Find existing vendor by name (case-insensitive)
    const { data: existing } = await supabase
      .from('vendors')
      .select('id, opening_balance')
      .eq('business_id', business_id)
      .ilike('name', name)
      .maybeSingle()

    if (existing) {
      // Update opening balance + any new contact info
      const updates: Record<string, unknown> = {
        opening_balance: balance,
        opening_balance_date: new Date().toISOString().slice(0, 10),
      }
      if (phone) updates.phone = phone
      if (evcPhone) updates.evc_phone = evcPhone
      if (notes) updates.opening_balance_notes = notes

      const { error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', existing.id)

      if (error) {
        errors.push(`${name}: ${error.message}`)
        skipped++
      } else {
        imported++
      }
    } else {
      // Create new vendor with opening balance
      const { error } = await supabase.from('vendors').insert({
        business_id,
        name,
        phone,
        evc_phone: evcPhone,
        opening_balance: balance,
        opening_balance_date: new Date().toISOString().slice(0, 10),
        opening_balance_notes: notes,
      })

      if (error) {
        if (error.code === '23505') skipped++
        else { errors.push(`${name}: ${error.message}`); skipped++ }
      } else {
        imported++
      }
    }
  }

  await logImport(supabase, {
    business_id, user_id: user.id, import_type: 'vendor-debts', source: 'csv',
    imported, skipped, errors,
  })

  return NextResponse.json({ imported, skipped, errors })
}
