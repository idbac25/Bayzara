// POST /api/restocks
// Creates a restock entry and increments inventory stock_quantity
// Body: { business_id, inventory_item_id, new_product?, vendor_id, quantity, cost_per_unit, payment_method, due_date, date, notes }

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    business_id,
    inventory_item_id,   // null if new product
    new_product,         // { name, sale_price, purchase_price, unit } — only when creating
    vendor_id,
    quantity,
    cost_per_unit,
    payment_method,
    due_date,
    date,
    notes,
  } = body

  if (!business_id || !quantity || quantity <= 0) {
    return NextResponse.json({ error: 'business_id and quantity are required' }, { status: 400 })
  }
  if (!inventory_item_id && !new_product?.name) {
    return NextResponse.json({ error: 'Either select a product or provide a product name' }, { status: 400 })
  }

  let itemId = inventory_item_id

  // Create product on the fly if it doesn't exist
  if (!itemId && new_product?.name) {
    const { data: created, error: createErr } = await supabase
      .from('inventory_items')
      .insert({
        business_id,
        name: new_product.name.trim(),
        unit: new_product.unit ?? 'pcs',
        sale_price: parseFloat(new_product.sale_price ?? 0),
        purchase_price: parseFloat(cost_per_unit ?? 0),
        stock_quantity: 0,
        type: 'product',
      })
      .select('id')
      .single()

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    itemId = created.id
  }

  const qty = parseFloat(quantity)
  const cpu = parseFloat(cost_per_unit ?? 0)
  const total = qty * cpu
  const isPaid = payment_method === 'cash'

  // Insert the restock record
  const { data: restock, error: restockErr } = await supabase
    .from('stock_restocks')
    .insert({
      business_id,
      vendor_id: vendor_id ?? null,
      inventory_item_id: itemId,
      quantity: qty,
      cost_per_unit: cpu,
      total_cost: total,
      payment_method,
      status: isPaid ? 'paid' : 'unpaid',
      due_date: due_date ?? null,
      date: date ?? new Date().toISOString().split('T')[0],
      notes: notes ?? null,
      paid_at: isPaid ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (restockErr) return NextResponse.json({ error: restockErr.message }, { status: 500 })

  // Increment stock quantity
  const { error: stockErr } = await supabase.rpc('increment_stock', {
    p_item_id: itemId,
    p_qty: qty,
  })

  // Fallback: manual update if RPC not available
  if (stockErr) {
    const { data: current } = await supabase
      .from('inventory_items')
      .select('stock_quantity')
      .eq('id', itemId)
      .single()

    await supabase
      .from('inventory_items')
      .update({ stock_quantity: (current?.stock_quantity ?? 0) + qty })
      .eq('id', itemId)
  }

  return NextResponse.json({ success: true, id: restock.id, inventory_item_id: itemId })
}
