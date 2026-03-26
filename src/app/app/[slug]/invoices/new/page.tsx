import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '../InvoiceForm'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ client_id?: string }>
}

export default async function NewInvoicePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { client_id } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, default_terms, bank_account_name, bank_account_number, bank_name, default_tax_rate')
    .eq('slug', slug)
    .single()

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

  // Get next invoice number
  const { data: nextNumber } = await supabase
    .rpc('get_next_document_number', { p_business_id: business?.id, p_type: 'invoice' })

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
      nextDocNumber={nextNumber ?? 'INV-0001'}
      documentType="invoice"
      defaultClientId={client_id}
    />
  )
}
