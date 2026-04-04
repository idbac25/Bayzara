'use client'

import { useEffect } from 'react'
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

export function POSReceipt({ sale, business, onClose, onNewSale }: Props) {
  useEffect(() => {
    // Auto-print after a short delay
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const methodLabel: Record<string, string> = {
    cash: 'Cash',
    evc: 'EVC Plus',
    credit: 'Credit',
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .pos-receipt-print { display: block !important; }
          .pos-receipt-no-print { display: none !important; }
        }
        .pos-receipt-print { display: none; }
      `}</style>

      {/* Screen overlay */}
      <div className="pos-receipt-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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
                <span>{methodLabel[sale.paymentMethod]}</span>
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
            <Button size="sm" variant="outline" className="flex-1" onClick={() => window.print()}>
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

      {/* Printable receipt */}
      <div className="pos-receipt-print" style={{ fontFamily: 'monospace', fontSize: '12px', maxWidth: '300px', margin: '0 auto', padding: '10px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{business.name}</div>
          {business.phone && <div>{business.phone}</div>}
          {business.city && <div>{business.city}</div>}
        </div>
        <div style={{ borderTop: '1px dashed #000', marginBottom: '4px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>{sale.invoiceNumber}</span>
          <span>{new Date(sale.date).toLocaleDateString()}</span>
        </div>
        {sale.customerName && <div style={{ marginBottom: '4px' }}>Customer: {sale.customerName}</div>}
        {sale.customerPhone && <div style={{ marginBottom: '4px' }}>Phone: {sale.customerPhone}</div>}
        <div style={{ borderTop: '1px dashed #000', marginBottom: '4px' }} />
        {sale.items.map((item, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            <div>{item.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{item.quantity} x {formatCurrency(item.rate, sale.currency)}</span>
              <span>{formatCurrency(item.quantity * item.rate, sale.currency)}</span>
            </div>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed #000', marginBottom: '4px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span><span>{formatCurrency(sale.subtotal, sale.currency)}</span>
        </div>
        {sale.taxAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax</span><span>{formatCurrency(sale.taxAmount, sale.currency)}</span>
          </div>
        )}
        <div style={{ borderTop: '1px dashed #000', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', margin: '4px 0' }}>
          <span>TOTAL</span><span>{formatCurrency(sale.total, sale.currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Payment</span><span>{methodLabel[sale.paymentMethod]}</span>
        </div>
        <div style={{ borderTop: '1px dashed #000', textAlign: 'center', marginTop: '8px', paddingTop: '4px' }}>
          <div>Thank you for your business</div>
          <div style={{ fontSize: '10px', color: '#666' }}>Powered by Bayzara</div>
        </div>
      </div>
    </>
  )
}

const methodLabel: Record<string, string> = {
  cash: 'Cash',
  evc: 'EVC Plus',
  credit: 'Credit',
}
