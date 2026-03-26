import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Returns the invoice HTML for print/PDF (opens in browser, user can print to PDF)
// A future enhancement can use puppeteer or @vercel/og for server-side PDF generation.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', doc.business_id)
    .single()

  const { data: lineItems } = await supabase
    .from('line_items')
    .select('*')
    .eq('document_id', id)
    .order('sort_order')

  const { data: client } = doc.client_id ? await supabase
    .from('clients')
    .select('*')
    .eq('id', doc.client_id)
    .single() : { data: null }

  const docLabel: Record<string, string> = {
    invoice: 'INVOICE',
    quotation: 'QUOTATION',
    purchase: 'BILL',
    expense: 'EXPENSE',
    purchase_order: 'PURCHASE ORDER',
    proforma_invoice: 'PROFORMA INVOICE',
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: doc.currency ?? 'USD' }).format(n)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${docLabel[doc.type] ?? 'DOCUMENT'} ${doc.document_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: white; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo-section { display: flex; flex-direction: column; gap: 4px; }
  .business-name { font-size: 22px; font-weight: 800; color: #0F4C81; }
  .doc-type { font-size: 28px; font-weight: 900; color: #0F4C81; text-align: right; }
  .doc-meta { text-align: right; font-size: 12px; color: #666; margin-top: 6px; }
  .doc-meta strong { color: #1a1a2e; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; padding: 20px; background: #f8fafc; border-radius: 8px; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
  .party-name { font-size: 15px; font-weight: 700; color: #1a1a2e; }
  .party-detail { font-size: 12px; color: #666; margin-top: 3px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #0F4C81; color: white; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e8ecf0; font-size: 12px; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody tr:last-child td { border-bottom: none; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-table { width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #e8ecf0; }
  .totals-row:last-child { border-bottom: none; font-weight: 800; font-size: 15px; padding-top: 12px; color: #0F4C81; }
  .notes-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e8ecf0; }
  .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 6px; }
  .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #aaa; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e8f5e9; color: #2e7d32; }
  @media print {
    body { padding: 20px; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div class="business-name">${business?.name ?? 'Business'}</div>
      ${business?.address_line1 ? `<div style="font-size:12px;color:#666;margin-top:4px">${business.address_line1}</div>` : ''}
      ${business?.city ? `<div style="font-size:12px;color:#666">${[business.city, business.country].filter(Boolean).join(', ')}</div>` : ''}
      ${business?.phone ? `<div style="font-size:12px;color:#666">${business.phone}</div>` : ''}
      ${business?.email ? `<div style="font-size:12px;color:#666">${business.email}</div>` : ''}
    </div>
    <div>
      <div class="doc-type">${docLabel[doc.type] ?? doc.type.toUpperCase()}</div>
      <div class="doc-meta">
        <div><strong>#${doc.document_number}</strong></div>
        <div>Date: ${new Date(doc.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        ${doc.due_date ? `<div>Due: ${new Date(doc.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
        <div style="margin-top:8px"><span class="status-badge">${doc.status.replace('_', ' ')}</span></div>
      </div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">${business?.name ?? ''}</div>
      ${business?.address_line1 ? `<div class="party-detail">${business.address_line1}</div>` : ''}
      ${business?.city ? `<div class="party-detail">${[business.city, business.country].filter(Boolean).join(', ')}</div>` : ''}
    </div>
    <div>
      <div class="party-label">${['purchase','expense','purchase_order'].includes(doc.type) ? 'To' : 'Bill To'}</div>
      ${client ? `
        <div class="party-name">${client.name}</div>
        ${client.email ? `<div class="party-detail">${client.email}</div>` : ''}
        ${client.phone ? `<div class="party-detail">${client.phone}</div>` : ''}
        ${client.address_line1 ? `<div class="party-detail">${client.address_line1}</div>` : ''}
        ${client.city ? `<div class="party-detail">${[client.city, client.country].filter(Boolean).join(', ')}</div>` : ''}
      ` : '<div class="party-detail">—</div>'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40%">Item / Description</th>
        <th style="width:10%;text-align:center">Qty</th>
        <th style="width:10%;text-align:center">Unit</th>
        <th style="width:15%;text-align:right">Rate</th>
        <th style="width:10%;text-align:right">Tax</th>
        <th style="width:15%;text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${(lineItems ?? []).map(li => `
        <tr>
          <td>
            <strong>${li.name}</strong>
            ${li.description ? `<br/><span style="color:#888;font-size:11px">${li.description}</span>` : ''}
          </td>
          <td style="text-align:center">${li.quantity}</td>
          <td style="text-align:center">${li.unit ?? 'pcs'}</td>
          <td style="text-align:right">${formatMoney(li.rate)}</td>
          <td style="text-align:right">${li.tax_rate ?? 0}%</td>
          <td style="text-align:right">${formatMoney(li.amount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatMoney(doc.subtotal)}</span>
      </div>
      ${doc.discount_amount > 0 ? `
        <div class="totals-row" style="color:#e74c3c">
          <span>Discount</span>
          <span>-${formatMoney(doc.discount_amount)}</span>
        </div>
      ` : ''}
      ${doc.tax_amount > 0 ? `
        <div class="totals-row">
          <span>Tax</span>
          <span>${formatMoney(doc.tax_amount)}</span>
        </div>
      ` : ''}
      ${doc.additional_charges > 0 ? `
        <div class="totals-row">
          <span>${doc.additional_charges_label ?? 'Additional Charges'}</span>
          <span>${formatMoney(doc.additional_charges)}</span>
        </div>
      ` : ''}
      <div class="totals-row">
        <span>Total</span>
        <span>${formatMoney(doc.total)}</span>
      </div>
      ${doc.amount_paid > 0 ? `
        <div class="totals-row" style="color:#27ae60">
          <span>Paid</span>
          <span>${formatMoney(doc.amount_paid)}</span>
        </div>
        <div class="totals-row">
          <span>Balance Due</span>
          <span>${formatMoney(doc.amount_due)}</span>
        </div>
      ` : ''}
    </div>
  </div>

  ${(business?.bank_name || business?.bank_account_number) ? `
    <div style="padding:16px;background:#f8fafc;border-radius:8px;margin-bottom:20px">
      <div class="notes-label">Payment Details</div>
      ${business.bank_name ? `<div style="font-size:12px">Bank: ${business.bank_name}</div>` : ''}
      ${business.bank_account_name ? `<div style="font-size:12px">Account Name: ${business.bank_account_name}</div>` : ''}
      ${business.bank_account_number ? `<div style="font-size:12px">Account Number: ${business.bank_account_number}</div>` : ''}
    </div>
  ` : ''}

  ${doc.terms ? `
    <div class="notes-section">
      <div class="notes-label">Terms & Conditions</div>
      <div style="font-size:12px;color:#666;white-space:pre-wrap">${doc.terms}</div>
    </div>
  ` : ''}

  ${doc.notes ? `
    <div class="notes-section">
      <div class="notes-label">Notes</div>
      <div style="font-size:12px;color:#666;white-space:pre-wrap">${doc.notes}</div>
    </div>
  ` : ''}

  <div class="footer">
    <p>Generated by Bayzara · Business Clarity for Somalia</p>
    <script>window.onload = () => { window.print(); }</script>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
