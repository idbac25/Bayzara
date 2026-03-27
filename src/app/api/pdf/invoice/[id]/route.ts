import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document, Page, View, Text, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import React, { type ReactElement, type JSXElementConstructor } from 'react'

// Force Node.js runtime — @react-pdf/renderer does not run on the Edge runtime
export const runtime = 'nodejs'

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a2e',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  bizName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0F4C81' },
  bizDetail: { fontSize: 9, color: '#666', marginTop: 2 },
  docType: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#0F4C81', textAlign: 'right' },
  docMeta: { fontSize: 9, color: '#555', marginTop: 4, textAlign: 'right' },
  docMetaBold: { fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },

  // Status badge
  badge: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
  },
  badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#2e7d32', textTransform: 'uppercase' },

  // Parties
  parties: {
    flexDirection: 'row',
    gap: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  partyCol: { flex: 1 },
  partyLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  partyName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a2e', marginBottom: 2 },
  partyDetail: { fontSize: 9, color: '#666', marginTop: 2, lineHeight: 1.4 },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#0F4C81', borderRadius: 4 },
  tableHeaderCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8ecf0' },
  tableCell: { paddingVertical: 8, paddingHorizontal: 8, fontSize: 9, color: '#1a1a2e' },
  tableCellBold: { fontFamily: 'Helvetica-Bold' },
  tableCellMuted: { fontSize: 8, color: '#888', marginTop: 2 },

  // Totals
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf0',
  },
  totalsLabel: { fontSize: 10, color: '#444' },
  totalsValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  totalsGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
  },
  totalsGrandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0F4C81' },
  totalsGrandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0F4C81' },

  // Sections
  sectionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  sectionText: { fontSize: 9, color: '#555', lineHeight: 1.5 },

  // Footer
  footer: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#e8ecf0', paddingTop: 12, textAlign: 'center' },
  footerText: { fontSize: 8, color: '#bbb' },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function money(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const DOC_LABEL: Record<string, string> = {
  invoice: 'INVOICE',
  quotation: 'QUOTATION',
  purchase: 'BILL',
  expense: 'EXPENSE',
  purchase_order: 'PURCHASE ORDER',
  proforma_invoice: 'PROFORMA INVOICE',
  sales_order: 'SALES ORDER',
  delivery_challan: 'DELIVERY CHALLAN',
  credit_note: 'CREDIT NOTE',
}

// ── PDF Document component ────────────────────────────────────────────────────

interface InvoicePDFProps {
  doc: Record<string, unknown>
  business: Record<string, unknown> | null
  client: Record<string, unknown> | null
  lineItems: Record<string, unknown>[]
}

function InvoicePDF({ doc, business, client, lineItems }: InvoicePDFProps) {
  const currency = (doc.currency as string) ?? 'USD'
  const label = DOC_LABEL[doc.type as string] ?? String(doc.type ?? '').toUpperCase()
  const isPurchase = ['purchase', 'expense', 'purchase_order'].includes(doc.type as string)

  return (
    React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: s.page },

        // ── Header ──────────────────────────────────────────────────────────
        React.createElement(View, { style: s.header },
          React.createElement(View, null,
            React.createElement(Text, { style: s.bizName }, String(business?.name ?? 'Business')),
            business?.address_line1 ? React.createElement(Text, { style: s.bizDetail }, String(business.address_line1)) : null,
            (business?.city || business?.country)
              ? React.createElement(Text, { style: s.bizDetail }, [business.city, business.country].filter(Boolean).join(', '))
              : null,
            business?.phone ? React.createElement(Text, { style: s.bizDetail }, String(business.phone)) : null,
            business?.email ? React.createElement(Text, { style: s.bizDetail }, String(business.email)) : null,
          ),
          React.createElement(View, null,
            React.createElement(Text, { style: s.docType }, label),
            React.createElement(Text, { style: s.docMeta },
              React.createElement(Text, { style: s.docMetaBold }, `#${doc.document_number as string}`)
            ),
            React.createElement(Text, { style: s.docMeta }, `Date: ${fmtDate(doc.date as string)}`),
            doc.due_date ? React.createElement(Text, { style: s.docMeta }, `Due: ${fmtDate(doc.due_date as string)}`) : null,
            React.createElement(View, { style: s.badge },
              React.createElement(Text, { style: s.badgeText }, String(doc.status ?? '').replace('_', ' '))
            ),
          ),
        ),

        // ── Parties ─────────────────────────────────────────────────────────
        React.createElement(View, { style: s.parties },
          React.createElement(View, { style: s.partyCol },
            React.createElement(Text, { style: s.partyLabel }, 'FROM'),
            React.createElement(Text, { style: s.partyName }, String(business?.name ?? '')),
            business?.address_line1 ? React.createElement(Text, { style: s.partyDetail }, String(business.address_line1)) : null,
            (business?.city || business?.country)
              ? React.createElement(Text, { style: s.partyDetail }, [business.city, business.country].filter(Boolean).join(', '))
              : null,
          ),
          React.createElement(View, { style: s.partyCol },
            React.createElement(Text, { style: s.partyLabel }, isPurchase ? 'TO' : 'BILL TO'),
            client
              ? React.createElement(View, null,
                  React.createElement(Text, { style: s.partyName }, String(client.name ?? '')),
                  client.email ? React.createElement(Text, { style: s.partyDetail }, String(client.email)) : null,
                  client.phone ? React.createElement(Text, { style: s.partyDetail }, String(client.phone)) : null,
                  client.address_line1 ? React.createElement(Text, { style: s.partyDetail }, String(client.address_line1)) : null,
                  (client.city || client.country)
                    ? React.createElement(Text, { style: s.partyDetail }, [client.city, client.country].filter(Boolean).join(', '))
                    : null,
                )
              : React.createElement(Text, { style: s.partyDetail }, '—'),
          ),
        ),

        // ── Line items table ─────────────────────────────────────────────────
        React.createElement(View, { style: s.tableHeader },
          React.createElement(Text, { style: [s.tableHeaderCell, { flex: 3 }] }, 'Item / Description'),
          React.createElement(Text, { style: [s.tableHeaderCell, { width: 36, textAlign: 'center' }] }, 'Qty'),
          React.createElement(Text, { style: [s.tableHeaderCell, { width: 36, textAlign: 'center' }] }, 'Unit'),
          React.createElement(Text, { style: [s.tableHeaderCell, { width: 64, textAlign: 'right' }] }, 'Rate'),
          React.createElement(Text, { style: [s.tableHeaderCell, { width: 36, textAlign: 'right' }] }, 'Tax'),
          React.createElement(Text, { style: [s.tableHeaderCell, { width: 64, textAlign: 'right' }] }, 'Amount'),
        ),

        ...lineItems.map((li, i) =>
          React.createElement(View, { key: i, style: s.tableRow },
            React.createElement(View, { style: [s.tableCell, { flex: 3 }] },
              React.createElement(Text, { style: s.tableCellBold }, String(li.name ?? '')),
              li.description ? React.createElement(Text, { style: s.tableCellMuted }, String(li.description)) : null,
            ),
            React.createElement(Text, { style: [s.tableCell, { width: 36, textAlign: 'center' }] }, String(li.quantity ?? '')),
            React.createElement(Text, { style: [s.tableCell, { width: 36, textAlign: 'center', color: '#888' }] }, String(li.unit ?? 'pcs')),
            React.createElement(Text, { style: [s.tableCell, { width: 64, textAlign: 'right' }] }, money(Number(li.rate ?? 0), currency)),
            React.createElement(Text, { style: [s.tableCell, { width: 36, textAlign: 'right', color: '#888' }] }, `${li.tax_rate ?? 0}%`),
            React.createElement(Text, { style: [s.tableCell, { width: 64, textAlign: 'right' }, s.tableCellBold] }, money(Number(li.amount ?? 0), currency)),
          )
        ),

        // ── Totals ───────────────────────────────────────────────────────────
        React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, marginBottom: 16 } },
          React.createElement(View, { style: { width: 220 } },
            React.createElement(View, { style: s.totalsRow },
              React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
              React.createElement(Text, { style: s.totalsValue }, money(Number(doc.subtotal ?? 0), currency)),
            ),
            Number(doc.discount_amount) > 0
              ? React.createElement(View, { style: s.totalsRow },
                  React.createElement(Text, { style: [s.totalsLabel, { color: '#e74c3c' }] }, 'Discount'),
                  React.createElement(Text, { style: [s.totalsValue, { color: '#e74c3c' }] }, `-${money(Number(doc.discount_amount), currency)}`),
                )
              : null,
            Number(doc.tax_amount) > 0
              ? React.createElement(View, { style: s.totalsRow },
                  React.createElement(Text, { style: s.totalsLabel }, 'Tax'),
                  React.createElement(Text, { style: s.totalsValue }, money(Number(doc.tax_amount), currency)),
                )
              : null,
            Number(doc.additional_charges) > 0
              ? React.createElement(View, { style: s.totalsRow },
                  React.createElement(Text, { style: s.totalsLabel }, String(doc.additional_charges_label ?? 'Additional Charges')),
                  React.createElement(Text, { style: s.totalsValue }, money(Number(doc.additional_charges), currency)),
                )
              : null,
            React.createElement(View, { style: s.totalsGrandRow },
              React.createElement(Text, { style: s.totalsGrandLabel }, 'Total'),
              React.createElement(Text, { style: s.totalsGrandValue }, money(Number(doc.total ?? 0), currency)),
            ),
            Number(doc.amount_paid) > 0
              ? React.createElement(View, null,
                  React.createElement(View, { style: [s.totalsRow, { borderTopWidth: 1, borderTopColor: '#e8ecf0', marginTop: 6, paddingTop: 6 }] },
                    React.createElement(Text, { style: [s.totalsLabel, { color: '#27ae60' }] }, 'Paid'),
                    React.createElement(Text, { style: [s.totalsValue, { color: '#27ae60' }] }, money(Number(doc.amount_paid), currency)),
                  ),
                  React.createElement(View, { style: s.totalsRow },
                    React.createElement(Text, { style: s.totalsLabel }, 'Balance Due'),
                    React.createElement(Text, { style: s.totalsValue }, money(Number(doc.amount_due ?? 0), currency)),
                  ),
                )
              : null,
          ),
        ),

        // ── Bank details ─────────────────────────────────────────────────────
        (business?.bank_name || business?.bank_account_number)
          ? React.createElement(View, { style: s.sectionBox },
              React.createElement(Text, { style: s.sectionLabel }, 'Payment Details'),
              business.bank_name ? React.createElement(Text, { style: s.sectionText }, `Bank: ${business.bank_name}`) : null,
              business.bank_account_name ? React.createElement(Text, { style: s.sectionText }, `Account Name: ${business.bank_account_name}`) : null,
              business.bank_account_number ? React.createElement(Text, { style: s.sectionText }, `Account Number: ${business.bank_account_number}`) : null,
            )
          : null,

        // ── Terms ────────────────────────────────────────────────────────────
        doc.terms
          ? React.createElement(View, { style: s.sectionBox },
              React.createElement(Text, { style: s.sectionLabel }, 'Terms & Conditions'),
              React.createElement(Text, { style: s.sectionText }, String(doc.terms)),
            )
          : null,

        // ── Notes ────────────────────────────────────────────────────────────
        doc.notes
          ? React.createElement(View, { style: s.sectionBox },
              React.createElement(Text, { style: s.sectionLabel }, 'Notes'),
              React.createElement(Text, { style: s.sectionText }, String(doc.notes)),
            )
          : null,

        // ── Footer ───────────────────────────────────────────────────────────
        React.createElement(View, { style: s.footer },
          React.createElement(Text, { style: s.footerText }, 'Generated by Bayzara · Business Clarity for Somalia · Built by Keyd Solutions'),
        ),
      )
    )
  )
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

  const [{ data: business }, { data: lineItems }, clientRes] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', doc.business_id).single(),
    supabase.from('line_items').select('*').eq('document_id', id).order('sort_order'),
    doc.client_id
      ? supabase.from('clients').select('*').eq('id', doc.client_id).single()
      : Promise.resolve({ data: null }),
  ])

  const element = React.createElement(InvoicePDF, {
    doc: doc as Record<string, unknown>,
    business: business as Record<string, unknown> | null,
    client: (clientRes as { data: Record<string, unknown> | null }).data,
    lineItems: (lineItems ?? []) as Record<string, unknown>[],
  }) as unknown as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

  const buffer = await renderToBuffer(element)

  const filename = `${DOC_LABEL[doc.type as string] ?? 'Document'}-${doc.document_number}.pdf`
    .replace(/\s+/g, '-')

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
