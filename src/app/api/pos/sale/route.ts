import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface SaleLineItem {
  name: string
  sku?: string | null
  quantity: number
  rate: number
  unit?: string
  tax_rate?: number
  inventory_item_id?: string | null
}

interface SalePayload {
  slug: string
  line_items: SaleLineItem[]
  payment_method: 'cash' | 'evc' | 'credit'
  customer_id?: string | null
  evc_tran_id?: string | null
  evc_connection_id?: string | null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: SalePayload = await req.json()
  const { slug, line_items, payment_method, customer_id, evc_tran_id, evc_connection_id } = body

  if (!slug || !line_items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, default_tax_rate')
    .eq('slug', slug)
    .single()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Get credit terms if credit sale
  let creditTermsDays = 30
  if (payment_method === 'credit' && customer_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('credit_terms_days, credit_limit')
      .eq('id', customer_id)
      .single()
    if (client) creditTermsDays = client.credit_terms_days ?? 30
  }

  // Calculate totals
  const itemsWithAmounts = line_items.map(item => {
    const taxRate = item.tax_rate ?? 0
    const amount = item.quantity * item.rate
    const taxAmount = amount * (taxRate / 100)
    return { ...item, amount, taxAmount }
  })

  const subtotal = itemsWithAmounts.reduce((s, i) => s + i.amount, 0)
  const taxAmount = itemsWithAmounts.reduce((s, i) => s + i.taxAmount, 0)
  const total = subtotal + taxAmount

  // Get next invoice number
  const { data: docNumber } = await supabase
    .rpc('get_next_document_number', {
      p_business_id: business.id,
      p_type: 'invoice',
    })

  if (!docNumber) {
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  const dueDate = payment_method === 'credit'
    ? new Date(Date.now() + creditTermsDays * 86400000).toISOString().split('T')[0]
    : today

  // Insert document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      business_id: business.id,
      type: 'invoice',
      document_number: docNumber,
      date: today,
      due_date: dueDate,
      client_id: customer_id ?? null,
      status: 'sent',
      currency: business.currency,
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      amount_due: total,
      title: 'POS Sale',
      source: 'pos',
    })
    .select()
    .single()

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  // Insert line items
  const { error: lineError } = await supabase
    .from('line_items')
    .insert(
      itemsWithAmounts.map((item, idx) => ({
        document_id: doc.id,
        name: item.name,
        sku: item.sku ?? null,
        quantity: item.quantity,
        rate: item.rate,
        unit: item.unit ?? 'pcs',
        tax_rate: item.tax_rate ?? 0,
        amount: item.amount,
        inventory_item_id: item.inventory_item_id ?? null,
        sort_order: idx,
      }))
    )

  if (lineError) {
    return NextResponse.json({ error: lineError.message }, { status: 500 })
  }

  // For cash and EVC: insert payment record → trigger auto-updates invoice to 'paid'
  if (payment_method === 'cash' || payment_method === 'evc') {
    // Find default payment account for this method
    const { data: payAcct } = await supabase
      .from('payment_accounts')
      .select('id')
      .eq('business_id', business.id)
      .eq('type', payment_method === 'evc' ? 'evc' : 'cash')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    const { error: payError } = await supabase
      .from('payment_records')
      .insert({
        business_id: business.id,
        document_id: doc.id,
        payment_account_id: payAcct?.id ?? null,
        amount: total,
        date: today,
        method: payment_method,
        reference: evc_tran_id ?? null,
        evc_tran_id: evc_tran_id ?? null,
        notes: `POS sale - ${payment_method.toUpperCase()}`,
      })

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 })
    }

    // Deduct stock for tracked inventory items
    for (const item of line_items) {
      if (item.inventory_item_id) {
        await supabase.rpc('decrement_stock', {
          p_item_id: item.inventory_item_id,
          p_qty: item.quantity,
        }).maybeSingle()
      }
    }
  }

  return NextResponse.json({
    invoice_id: doc.id,
    invoice_number: doc.document_number,
    total,
    currency: business.currency,
    payment_method,
    date: today,
  })
}
