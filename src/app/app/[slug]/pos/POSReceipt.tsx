'use client'


import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Printer, X, ArrowRight } from 'lucide-react'

interface ReceiptItem {
  name: string
  quantity: number
  rate: number
  tax_rate: number
}

interface CompletedSale {
  invoiceId: string
  invoiceNumber: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  taxAmount: number
  total: number
  paymentMethod: 'cash' | 'evc' | 'credit'
  currency: string
  customerName?: string
  customerPhone?: string
}

interface Business {
  name: string
  phone?: string | null
  address_line1?: string | null
  city?: string | null
}

interface Props {
  sale: CompletedSale
  business: Business
  onClose: () => void
  onNewSale: () => void
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  evc: 'EVC Plus',
  credit: 'Credit',
}

function printReceipt(sale: CompletedSale, business: Business) {
  const w = window.open('', '_blank', 'width=380,height=600,toolbar=0,menubar=0,scrollbars=1')
  if (!w) return

  const itemRows = sale.items.map(item => `
    <div style="margin-bottom:6px">
      <div style="font-weight:600">${item.name}</div>
      <div style="display:flex;justify-content:space-between;color:#555">
        <span>${item.quantity} &times; ${formatCurrency(item.rate, sale.currency)}</span>
        <span>${formatCurrency(item.quantity * item.rate, sale.currency)}</span>
      </div>
    </div>
  `).join('')

  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Receipt ${sale.invoiceNumber}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', monospace; font-size: 12px; padding: 12px; max-width: 300px; margin: 0 auto; }
      .center { text-align: center; }
      .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .bold { font-weight: bold; }
      .total-row { font-size: 14px; font-weight: bold; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; display: flex; justify-content: space-between; }
      .small { font-size: 10px; color: #666; }
      @media print { @page { margin: 4mm; } }
    </style>
  </head><body>
    <div class="center" style="margin-bottom:8px">
      <div class="bold" style="font-size:14px">${business.name}</div>
      ${business.phone ? `<div>${business.phone}</div>` : ''}
      ${business.city  ? `<div>${business.city}</div>`  : ''}
    </div>
    <div class="divider"></div>
    <div class="row">
      <span>${sale.invoiceNumber}</span>
      <span>${new Date(sale.date).toLocaleDateString()}</span>
    </div>
    ${sale.customerName  ? `<div style="margin-bottom:2px">Customer: ${sale.customerName}</div>`  : ''}
    ${sale.customerPhone ? `<div style="margin-bottom:4px">Phone: ${sale.customerPhone}</div>` : ''}
    <div class="divider"></div>
    ${itemRows}
    <div class="divider"></div>
    <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal, sale.currency)}</span></div>
    ${sale.taxAmount > 0 ? `<div class="row"><span>Tax</span><span>${formatCurrency(sale.taxAmount, sale.currency)}</span></div>` : ''}
    <div class="total-row"><span>TOTAL</span><span>${formatCurrency(sale.total, sale.currency)}</span></div>
    <div class="row" style="margin-top:4px"><span>Payment</span><span>${METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}</span></div>
    <div class="divider" style="margin-top:8px"></div>
    <div class="center small" style="margin-top:6px">Thank you for your business</div>
    <div class="center small" style="margin-top:2px">Powered by Bayzara</div>
  </body></html>`)

  w.document.close()
  w.focus()
  // Small delay so the browser finishes rendering before the print dialog opens
  setTimeout(() => { w.print(); w.close() }, 250)
}

export function POSReceipt({ sale, business, onClose, onNewSale }: Props) {
  return (
    <>
      {/* Screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
          {/* Receipt content (screen) */}
          <div className="p-4 border-b">
            <div className="text-center mb-3">
              <p className="font-bold text-lg">{business.name}</p>
              {business.phone && <p className="text-xs text-muted-foreground">{business.phone}</p>}
              {business.city && <p className="text-xs text-muted-foreground">{business.city}</p>}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>{sale.invoiceNumber}</span>
              <span>{new Date(sale.date).toLocaleDateString()}</span>
            </div>

            {(sale.customerName || sale.customerPhone) && (
              <div className="text-xs mb-2">
                {sale.customerName && <p><span className="text-muted-foreground">Customer:</span> {sale.customerName}</p>}
                {sale.customerPhone && <p><span className="text-muted-foreground">Phone:</span> {sale.customerPhone}</p>}
              </div>
            )}

            <div className="border-t border-dashed pt-2 mb-2">
              {sale.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="truncate block">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.rate, sale.currency)}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.quantity * item.rate, sale.currency)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed pt-2 space-y-0.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(sale.subtotal, sale.currency)}</span>
              </div>
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatCurrency(sale.taxAmount, sale.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-dashed">
                <span>TOTAL</span>
                <span>{formatCurrency(sale.total, sale.currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment</span>
                <span>{METHOD_LABEL[sale.paymentMethod]}</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-3 pt-2 border-t border-dashed">
              Thank you for your business
            </p>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1">
              Powered by Bayzara
            </p>
          </div>

          <div className="p-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => printReceipt(sale, business)}>
              <Printer className="h-4 w-4 mr-1.5" />Print
            </Button>
            <Button size="sm" className="flex-1 bg-[#0F4C81] hover:bg-[#0d3d6b]" onClick={onNewSale}>
              New Sale<ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
