import { createClient } from '@/lib/supabase/server'
import { PurchaseForm } from '../PurchaseForm'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ vendor_id?: string; type?: string }>
}

export default async function NewPurchasePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { vendor_id, type = 'purchase' } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency, default_tax_rate, bank_account_name, bank_account_number, bank_name, default_terms')
    .eq('slug', slug)
    .single()

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

  const docType = ['purchase', 'expense', 'purchase_order'].includes(type) ? type : 'purchase'

  const { data: nextNumber } = await supabase
    .rpc('get_next_document_number', { p_business_id: business?.id, p_type: docType })

  return (
    <PurchaseForm
      slug={slug}
      businessId={business?.id ?? ''}
      currency={business?.currency ?? 'USD'}
      defaultTaxRate={business?.default_tax_rate ?? 0}
      defaultTerms={business?.default_terms ?? ''}
      vendors={vendors ?? []}
      inventory={inventory ?? []}
      nextDocNumber={nextNumber ?? 'BILL-0001'}
      documentType={docType}
      defaultVendorId={vendor_id}
    />
  )
}
