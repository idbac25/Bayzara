import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvoiceForm } from '../../../invoices/InvoiceForm'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function EditQuotationPage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, default_terms, bank_account_name, bank_account_number, bank_name, default_tax_rate')
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

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, phone, address_line1, city, country')
    .eq('business_id', business?.id)
    .eq('archived', false)
    .order('name')

  const { data: inventory } = await supabase
    .from('inventory_items')
    .select('id, name, sku, sale_price, tax_rate, unit, description')
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
    group_name: li.group_name ?? '',
    is_group_header: false,
  }))

  return (
    <InvoiceForm
      slug={slug}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      defaultTerms={business?.default_terms ?? ''}
      bankDetails={{
        bank_name: business?.bank_name,
        account_name: business?.bank_account_name,
        account_number: business?.bank_account_number,
      }}
      defaultTaxRate={business?.default_tax_rate ?? 0}
      clients={clients ?? []}
      inventory={inventory ?? []}
      nextDocNumber={doc.document_number}
      documentType={doc.type}
      existingDocument={doc}
      existingLineItems={existingLineItems}
    />
  )
}
