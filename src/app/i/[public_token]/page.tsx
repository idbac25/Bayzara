import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ public_token: string }>
}

export default async function PublicInvoicePage({ params }: Props) {
  const { public_token } = await params
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('public_token', public_token)
    .is('deleted_at', null)
    .single()

  if (!doc) notFound()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, address_line1, city, country, phone, email, logo_url')
    .eq('id', doc.business_id)
    .single()

  const { data: lineItems } = await supabase
    .from('line_items')
    .select('*')
    .eq('document_id', doc.id)
    .order('sort_order')

  const { data: client } = doc.client_id ? await supabase
    .from('clients')
    .select('name, email, phone, address_line1, city, country')
    .eq('id', doc.client_id)
    .single() : { data: null }

  // Get EVC connection for payment info
  const { data: evcConnections } = await supabase
    .from('evc_connections')
    .select('account_number, merchant_name, currency')
    .eq('business_id', doc.business_id)
    .eq('is_active', true)
    .limit(1)

  const evc = evcConnections?.[0] ?? null
  const currency = doc.currency as string
  const typeLabel = (doc.type as string).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Bayzara branding */}
        <div className="text-center mb-6 text-sm text-muted-foreground">
          <span>Powered by </span>
          <span className="font-semibold text-[#0F4C81]">Bayzara</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8">
          {/* Header */}
          <div className="flex justify-between mb-8">
            <div>
              {business?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo_url} alt={business.name} className="h-12 object-contain mb-2" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
                  <span className="text-white font-bold text-xl">B</span>
                </div>
              )}
              <h2 className="font-bold text-lg">{business?.name}</h2>
              {business?.address_line1 && <p className="text-sm text-muted-foreground">{business.address_line1}</p>}
              {business?.city && <p className="text-sm text-muted-foreground">{business.city}</p>}
              {business?.phone && <p className="text-sm text-muted-foreground">{business.phone}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-[#0F4C81] mb-1">{typeLabel.toUpperCase()}</h1>
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-muted-foreground text-sm">#{doc.document_number}</span>
                <Badge className={doc.status === 'paid' ? 'bg-green-100 text-green-700' :
                  doc.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                  {doc.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Date: {formatDate(doc.date)}</p>
              {doc.due_date && <p className="text-sm text-muted-foreground">Due: {formatDate(doc.due_date)}</p>}
            </div>
          </div>

          {client && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold">{client.name}</p>
              {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
              {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
            </div>
          )}

          {/* Line Items */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="border-b-2 border-[#0F4C81]">
                <th className="text-left py-2 font-semibold text-[#0F4C81]">Item</th>
                <th className="text-right py-2 font-semibold text-[#0F4C81]">Qty</th>
                <th className="text-right py-2 font-semibold text-[#0F4C81]">Rate</th>
                <th className="text-right py-2 font-semibold text-[#0F4C81]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems?.map(li => (
                <tr key={li.id} className="border-b border-gray-100">
                  <td className="py-2">
                    <p className="font-medium">{li.name}</p>
                    {li.description && <p className="text-xs text-muted-foreground">{li.description}</p>}
                  </td>
                  <td className="py-2 text-right">{li.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(li.rate, currency)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(li.amount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(doc.subtotal, currency)}</span>
              </div>
              {doc.discount_amount > 0 && (
                <div className="flex justify-between text-[#27AE60]">
                  <span>Discount</span>
                  <span>-{formatCurrency(doc.discount_amount, currency)}</span>
                </div>
              )}
              {doc.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(doc.tax_amount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-[#0F4C81]">
                <span>Total</span>
                <span className="text-[#0F4C81]">{formatCurrency(doc.total, currency)}</span>
              </div>
              {doc.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-[#27AE60]">
                    <span>Paid</span>
                    <span>-{formatCurrency(doc.amount_paid, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Balance Due</span>
                    <span className={doc.amount_due > 0 ? 'text-[#E74C3C]' : 'text-[#27AE60]'}>
                      {formatCurrency(doc.amount_due, currency)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* EVC Payment section */}
          {evc && doc.status !== 'paid' && doc.amount_due > 0 && (
            <div className="border-2 border-[#F5A623]/30 rounded-xl p-5 mb-6 bg-[#F5A623]/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-[#F5A623]">⚡</span>
                Pay via EVC Plus
              </h3>
              <div className="space-y-2 text-sm">
                <p>Send <strong>{formatCurrency(doc.amount_due, currency)}</strong> to:</p>
                <div className="bg-white rounded-lg p-3 border">
                  <p className="font-mono text-lg font-bold text-center text-[#0F4C81]">
                    {evc.account_number}
                  </p>
                  <p className="text-center text-xs text-muted-foreground mt-1">{evc.merchant_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment will be automatically recorded when received.
                </p>
              </div>
            </div>
          )}

          {doc.notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</p>
              <p className="text-sm">{doc.notes}</p>
            </div>
          )}
          {doc.terms && (
            <div className="mb-4 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Terms</p>
              <p className="text-sm text-muted-foreground">{doc.terms}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Generated by <a href="/" className="text-[#0F4C81] hover:underline">Bayzara</a> — Business clarity for Somalia<br />
          <span className="text-gray-400">Built by Keyd Solutions</span>
        </p>
      </div>
    </div>
  )
}
