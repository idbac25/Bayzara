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

    const { error } = await supabase.from('inventory_items').insert({
      business_id,
      name,
      sku: row.sku ? String(row.sku).trim() : null,
      unit: String(row.unit ?? 'pcs').trim() || 'pcs',
      type: row.type === 'service' ? 'service' : 'product',
      sale_price: parseFloat(row.sale_price ?? 0) || 0,
      purchase_price: parseFloat(row.purchase_price ?? 0) || 0,
      tax_rate: parseFloat(row.tax_rate ?? 0) || 0,
      stock_quantity: row.stock_quantity != null ? parseInt(row.stock_quantity) : null,
      reorder_level: row.reorder_level != null ? parseInt(row.reorder_level) : null,
    })

    if (error) {
      if (error.code === '23505') skipped++
      else { errors.push(`${name}: ${error.message}`); skipped++ }
    } else {
      imported++
    }
  }

  await logImport(supabase, {
    business_id, user_id: user.id, import_type: 'products', source: 'csv',
    imported, skipped, errors,
  })

  return NextResponse.json({ imported, skipped, errors })
}
