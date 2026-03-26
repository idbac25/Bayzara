import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PurchaseForm } from '../../PurchaseForm'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function EditPurchasePage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, default_tax_rate, bank_account_name, bank_account_number, bank_name, default_terms')
    .eq('slug', slug)
    .single()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('business_id', business?.id)
    .single()

  if (!doc) notFound()

  const { data: lineItems } = await supabase
    .from('line_items')
    .select('*')
    .eq('document_id', id)
    .order('sort_order')

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, email, phone, address_line1, city, country')
    .eq('business_id', business?.id)
    .eq('archived', false)
    .order('name')

  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('id, name, sku, purchase_price, tax_rate, unit, description')
    .eq('business_id', business?.id)
    .eq('archived', false)
    .order('name')

  const existingLineItems = (lineItems ?? []).map(li => ({
    id: li.id,
    name: li.name,
    description: li.description ?? '',
    quantity: li.quantity,
    rate: li.rate,
    unit: li.unit ?? 'pcs',
    tax_rate: li.tax_rate ?? 0,
    amount: li.amount,
  }))

  return (
    <PurchaseForm
      slug={slug}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      defaultTaxRate={business?.default_tax_rate ?? 0}
      defaultTerms={business?.default_terms ?? ''}
      vendors={vendors ?? []}
      inventory={inventory ?? []}
      nextDocNumber={doc.document_number}
      documentType={doc.type}
      existingDocument={doc}
      existingLineItems={existingLineItems}
    />
  )
}
