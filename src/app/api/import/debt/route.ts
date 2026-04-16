import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logImport } from '@/lib/import/log-history'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { business_id, rows, source } = await req.json()
  if (!business_id || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  let imported = 0, skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const name = String(row.name ?? '').trim()
    if (!name) { skipped++; continue }

    const phone = row.phone ? String(row.phone).trim() : null
    const balance = parseFloat(row.balance ?? row.amount_owed ?? 0) || 0

    // Upsert customer
    const { data: customer, error: custError } = await supabase
      .from('pos_customers')
      .upsert(
        { business_id, name, primary_phone: phone ?? `IMPORT-${Date.now()}-${Math.random()}` },
        { onConflict: 'business_id,primary_phone', ignoreDuplicates: false }
      )
      .select('id')
      .single()

    if (custError || !customer) {
      // Try to find existing
      const { data: existing } = await supabase
        .from('pos_customers')
        .select('id')
        .eq('business_id', business_id)
        .eq('name', name)
        .maybeSingle()

      if (!existing) {
        errors.push(`${name}: could not create customer`)
        skipped++
        continue
      }

      // Upsert debt account for existing customer
      await supabase.from('debt_accounts').upsert(
        { business_id, customer_id: existing.id, current_balance: balance, credit_limit: 0 },
        { onConflict: 'business_id,customer_id' }
      )
      imported++
      continue
    }

    // Create debt account
    const { error: acctError } = await supabase.from('debt_accounts').upsert(
      { business_id, customer_id: customer.id, current_balance: balance, credit_limit: 0 },
      { onConflict: 'business_id,customer_id' }
    )

    if (acctError) {
      errors.push(`${name}: ${acctError.message}`)
      skipped++
    } else {
      imported++
    }
  }

  await logImport(supabase, {
    business_id, user_id: user.id, import_type: 'debt',
    source: source === 'ocr' ? 'ocr' : 'csv',
    imported, skipped, errors,
  })

  return NextResponse.json({ imported, skipped, errors })
}
