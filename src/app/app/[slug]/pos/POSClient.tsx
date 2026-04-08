'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { POSPaymentOverlay, type SenderInfo } from './POSPaymentOverlay'
import { POSReceipt } from './POSReceipt'
import { POSCashierLogin } from './POSCashierLogin'
import { BarcodeScanner } from './BarcodeScanner'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, ArrowLeft,
  Banknote, Zap, CreditCard, User, ChevronDown, Maximize2, Minimize2,
  UserCircle, RefreshCw, ScanBarcode, ScanLine
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeature } from '@/contexts/BusinessContext'

const CASHIER_SESSION_KEY = 'bayzara_pos_cashier'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

interface CashierSession {
  id: string
  name: string
  role: string
  business_id: string
  at: number
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface POSItem {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  unit: string
  sale_price: number
  tax_rate: number
  stock_quantity: number | null
  type: string
  category: string | null
  image_url: string | null
}

interface POSCustomer {
  id: string
  name: string
  primary_phone: string
}

interface EvcConnection {
  id: string
  merchant_name: string
  merchant_number: string
  current_balance: number
  is_active: boolean
}

interface Business {
  id: string
  name: string
  slug: string
  currency: string
  logo_url: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  country: string | null
}

interface CartItem {
  item: POSItem
  quantity: number
}

interface CompletedSale {
  invoiceId: string
  invoiceNumber: string
  date: string
  items: { name: string; quantity: number; rate: number; tax_rate: number }[]
  subtotal: number
  taxAmount: number
  total: number
  paymentMethod: 'cash' | 'evc' | 'credit'
  currency: string
  customerName?: string
  customerPhone?: string
}

interface StaffMember {
  id: string
  name: string
  role: 'owner' | 'manager' | 'cashier'
  has_pin: boolean
}

interface Props {
  business: Business
  items: POSItem[]
  posCustomers: POSCustomer[]
  evcConnections: EvcConnection[]
  staff: StaffMember[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function POSClient({ business, items, posCustomers, evcConnections, staff }: Props) {
  const router = useRouter()
  const [cashier, setCashier] = useState<CashierSession | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<POSCustomer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'evc' | 'credit'>('cash')
  const [selectedEvc, setSelectedEvc] = useState<EvcConnection | null>(evcConnections[0] ?? null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showEvcOverlay, setShowEvcOverlay] = useState(false)
  const [evcInitiatedAt, setEvcInitiatedAt] = useState<Date | null>(null)
  const [pendingEvcTranId, setPendingEvcTranId] = useState<string | null>(null)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCameraScanner, setShowCameraScanner] = useState(false)
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products')
  const hasCreditCustomers = useFeature('credit_customers')
  const hasEvcFeature = useFeature('evc_plus')

  // Barcode buffer refs — populated by USB scanner useEffect (defined after addToCart)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always point at the latest items — avoids stale closure in handleBarcodeDetected
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  // Restore or prompt cashier session on mount
  useEffect(() => {
    const hasStaffWithPin = staff.some(s => s.has_pin)
    if (!hasStaffWithPin) return // no staff set up — skip login

    try {
      const stored = localStorage.getItem(CASHIER_SESSION_KEY)
      if (stored) {
        const session: CashierSession = JSON.parse(stored)
        const valid = session.business_id === business.id && (Date.now() - session.at) < SESSION_TTL_MS
        if (valid) { setCashier(session); return }
      }
    } catch { /* ignore */ }
    setShowLogin(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = (session: { id: string; name: string; role: string }) => {
    const full: CashierSession = { ...session, business_id: business.id, at: Date.now() }
    localStorage.setItem(CASHIER_SESSION_KEY, JSON.stringify(full))
    setCashier(full)
    setShowLogin(false)
  }

  const handleSkip = () => {
    localStorage.removeItem(CASHIER_SESSION_KEY)
    setCashier(null)
    setShowLogin(false)
  }

  const switchCashier = () => {
    localStorage.removeItem(CASHIER_SESSION_KEY)
    setCashier(null)
    setShowLogin(true)
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category ?? i.type).filter(Boolean))]
    return cats as string[]
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = !categoryFilter || (item.category ?? item.type) === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [items, search, categoryFilter])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return posCustomers.slice(0, 10)
    const q = customerSearch.toLowerCase()
    return posCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.primary_phone.includes(q)
    ).slice(0, 10)
  }, [posCustomers, customerSearch])

  const subtotal = cart.reduce((s, ci) => s + ci.item.sale_price * ci.quantity, 0)
  const taxAmount = cart.reduce((s, ci) => {
    const amount = ci.item.sale_price * ci.quantity
    return s + amount * (ci.item.tax_rate / 100)
  }, 0)
  const total = subtotal + taxAmount
  const cartCount = cart.reduce((s, ci) => s + ci.quantity, 0)

  // ── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = (item: POSItem) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id)
      if (existing) {
        return prev.map(ci =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(ci => ci.item.id === itemId ? { ...ci, quantity: ci.quantity + delta } : ci)
        .filter(ci => ci.quantity > 0)
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== itemId))
  }

  const clearCart = () => {
    setCart([])
    setCustomer(null)
    setCustomerSearch('')
    setPaymentMethod('cash')
    setPendingEvcTranId(null)
    setEvcInitiatedAt(null)
  }

  // ── Inline add customer ───────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) return
    setSavingCustomer(true)
    try {
      const res = await fetch('/api/pos/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          name: newCustomerName.trim(),
          primary_phone: newCustomerPhone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to add customer'); return }
      const newC: POSCustomer = { id: data.id, name: data.name, primary_phone: data.primary_phone }
      setCustomer(newC)
      setAddingCustomer(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setShowCustomerSearch(false)
      setPaymentMethod('credit')
      toast.success(`${newC.name} added`)
    } finally {
      setSavingCustomer(false)
    }
  }

  // ── Barcode scanner (USB HID + camera) ────────────────────────────────────
  const handleBarcodeDetected = useCallback((barcode: string) => {
    const code = barcode.trim()
    if (!code) return
    // Use ref so this always searches the latest product list, never a stale snapshot
    const match = itemsRef.current.find(i =>
      (i.barcode && i.barcode.trim() === code) ||
      (i.sku && i.sku.trim() === code)
    )
    if (match) {
      if (match.stock_quantity != null && match.stock_quantity <= 0) {
        toast.error(`${match.name} is out of stock`)
      } else {
        addToCart(match)
        toast.success(`Added: ${match.name}`, { duration: 1500 })
      }
    } else {
      toast(`Barcode not registered: ${code}`, {
        description: 'Tap Add Product to register it now.',
        duration: 6000,
        action: {
          label: 'Add Product',
          onClick: () => router.push(`/app/${business.slug}/products?barcode=${encodeURIComponent(code)}`),
        },
      })
    }
    setShowCameraScanner(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, business.slug])

  // USB HID scanner: detects rapid keystroke sequences ending with Enter
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim()
        if (code.length >= 4) handleBarcodeDetected(code)
        barcodeBuffer.current = ''
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        return
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => {
          if (barcodeBuffer.current.length < 4) barcodeBuffer.current = ''
        }, 100)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handleBarcodeDetected])

  // ── Sale completion ────────────────────────────────────────────────────────

  const buildSalePayload = (evcTranId?: string, txUuid?: string, senderName?: string | null, senderPhone?: string | null) => ({
    slug: business.slug,
    line_items: cart.map(ci => ({
      name: ci.item.name,
      sku: ci.item.sku,
      quantity: ci.quantity,
      rate: ci.item.sale_price,
      unit: ci.item.unit,
      tax_rate: ci.item.tax_rate,
      inventory_item_id: ci.item.id,
    })),
    payment_method: paymentMethod,
    customer_id: null,
    pos_customer_id_override: customer?.id ?? null,
    evc_tran_id: evcTranId ?? null,
    evc_tx_uuid: txUuid ?? null,
    evc_connection_id: selectedEvc?.id ?? null,
    evc_sender_name: senderName ?? null,
    evc_sender_phone: senderPhone ?? null,
    staff_id: cashier?.id ?? null,
  })

  const submitSale = async (evcTranId?: string, txUuid?: string, senderName?: string | null, senderPhone?: string | null) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSalePayload(evcTranId, txUuid, senderName, senderPhone)),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Sale failed')
        return
      }

      setCompletedSale({
        invoiceId: data.invoice_id,
        invoiceNumber: data.invoice_number,
        date: data.date,
        items: cart.map(ci => ({
          name: ci.item.name,
          quantity: ci.quantity,
          rate: ci.item.sale_price,
          tax_rate: ci.item.tax_rate,
        })),
        subtotal,
        taxAmount,
        total,
        paymentMethod,
        currency: business.currency,
        customerName: senderName ?? customer?.name,
        customerPhone: senderPhone ?? customer?.primary_phone ?? undefined,
      })

      clearCart()
    } catch {
      toast.error('Failed to process sale. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }
    if (paymentMethod === 'credit' && !customer) {
      toast.error('Select a customer for credit sales')
      return
    }

    if (paymentMethod === 'evc') {
      if (!selectedEvc) {
        toast.error('No EVC connection available')
        return
      }
      setEvcInitiatedAt(new Date())
      setShowEvcOverlay(true)
      return
    }

    await submitSale()
  }

  const handleEvcConfirmed = async ({ tranId, txUuid, senderName, senderPhone }: SenderInfo) => {
    setShowEvcOverlay(false)
    setPendingEvcTranId(tranId)
    await submitSale(tranId, txUuid, senderName, senderPhone)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const posContent = (
    <div className={cn(
      'flex flex-col bg-gray-50 overflow-hidden',
      isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-64px)] -m-6'
    )}>
      {/* Top bar */}
      <div className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <Link href={`/app/${business.slug}`} className="text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <span className="font-semibold">Point of Sale</span>
          <Badge className="bg-[#F5A623] text-black text-[10px] font-bold">LIVE</Badge>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile cart tab toggle */}
          <button
            className={cn(
              'lg:hidden flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors',
              mobileView === 'cart'
                ? 'bg-[#F5A623] text-black font-bold'
                : 'bg-white/10 text-white/70'
            )}
            onClick={() => setMobileView(v => v === 'cart' ? 'products' : 'cart')}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {cartCount > 0 ? `Cart (${cartCount})` : 'Cart'}
          </button>
          {cashier && (
            <button
              onClick={switchCashier}
              className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors"
              title="Switch cashier"
            >
              <UserCircle className="h-4 w-4" />
              <span>{cashier.name}</span>
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <span className="text-white/30 text-xs hidden sm:block">{business.name}</span>
          <button
            onClick={() => router.refresh()}
            className="text-white/60 hover:text-white p-1 rounded"
            title="Refresh product list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            className="text-white/60 hover:text-white p-1 rounded hidden sm:block"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left: Product Grid ─────────────────────────────────────── */}
        <div className={cn(
          'flex-1 flex-col min-w-0 border-r border-gray-200',
          mobileView === 'cart' ? 'hidden lg:flex' : 'flex'
        )}>
          {/* Search + category filter */}
          <div className="p-3 bg-white border-b flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-9 h-9 text-sm"
                placeholder="Search or scan barcode..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => setShowCameraScanner(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#0F4C81] transition-colors"
                title="Scan barcode with camera"
              >
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    !categoryFilter
                      ? 'bg-[#0F4C81] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                      categoryFilter === cat
                        ? 'bg-[#0F4C81] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-3 pb-24 lg:pb-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredItems.map(item => {
                  const inCart = cart.find(ci => ci.item.id === item.id)
                  const outOfStock = item.stock_quantity != null && item.stock_quantity <= 0
                  return (
                    <button
                      key={item.id}
                      onClick={() => !outOfStock && addToCart(item)}
                      disabled={outOfStock}
                      className={cn(
                        'relative bg-white rounded-xl border p-3 text-left transition-all hover:shadow-md hover:border-[#0F4C81]/30 active:scale-95',
                        inCart && 'border-[#0F4C81] bg-[#0F4C81]/5',
                        outOfStock && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 bg-[#0F4C81] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                      <div className="w-full aspect-square rounded-lg mb-2 overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn(
                            'w-full h-full flex items-center justify-center',
                            (() => {
                              const colors = ['bg-blue-100','bg-purple-100','bg-emerald-100','bg-orange-100','bg-rose-100','bg-teal-100','bg-amber-100','bg-cyan-100']
                              let hash = 0; for (let i = 0; i < item.name.length; i++) hash = item.name.charCodeAt(i) + ((hash << 5) - hash)
                              return colors[Math.abs(hash) % colors.length]
                            })()
                          )}>
                            <span className="text-lg font-bold text-gray-500/60">
                              {item.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold line-clamp-2 leading-tight mb-1">{item.name}</p>
                      <p className="text-sm font-bold text-[#0F4C81]">{formatCurrency(item.sale_price, business.currency)}</p>
                      {item.stock_quantity != null && (
                        <p className={cn('text-[10px] mt-0.5', item.stock_quantity <= 5 ? 'text-amber-500' : 'text-muted-foreground')}>
                          {item.stock_quantity} in stock
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mobile floating cart button */}
          {cartCount > 0 && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20">
              <button
                onClick={() => setMobileView('cart')}
                className="w-full bg-[#0F4C81] text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-[#F5A623] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                  <span className="font-semibold">View Cart</span>
                </div>
                <span className="font-bold">{formatCurrency(total, business.currency)}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Cart + Checkout ──────────────────────────────────── */}
        <div className={cn(
          'flex-col bg-white flex-shrink-0',
          'w-full lg:w-80',
          mobileView === 'products' ? 'hidden lg:flex' : 'flex'
        )}>
          {/* Cart header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileView('products')}
                className="lg:hidden text-muted-foreground hover:text-foreground mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <ShoppingCart className="h-4 w-4 text-[#0F4C81]" />
              <span className="font-semibold text-sm">Cart</span>
              {cartCount > 0 && (
                <span className="bg-[#0F4C81] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {cartCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive">
                Clear
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Tap products to add</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(ci => (
                  <div key={ci.item.id} className="px-4 py-2.5 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ci.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(ci.item.sale_price, business.currency)} / {ci.item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(ci.item.id, -1)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{ci.quantity}</span>
                      <button
                        onClick={() => updateQty(ci.item.id, 1)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className="text-sm font-semibold">{formatCurrency(ci.item.sale_price * ci.quantity, business.currency)}</p>
                      <button
                        onClick={() => removeFromCart(ci.item.id)}
                        className="text-muted-foreground hover:text-destructive mt-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + payment section */}
          <div className="border-t p-4 space-y-3">
            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, business.currency)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatCurrency(taxAmount, business.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span className="text-[#0F4C81]">{formatCurrency(total, business.currency)}</span>
              </div>
            </div>

            {/* Customer selector */}
            <div>
              <button
                onClick={() => { setShowCustomerSearch(!showCustomerSearch); setAddingCustomer(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  customer ? 'border-[#0F4C81]/30 bg-[#0F4C81]/5' : 'border-dashed hover:border-[#0F4C81]/30'
                )}
              >
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className={cn('flex-1 text-left truncate', !customer && 'text-muted-foreground')}>
                  {customer ? customer.name : 'Add customer (optional)'}
                </span>
                {customer && (
                  <>
                    <span className="text-xs text-muted-foreground truncate">{customer.primary_phone}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCustomer(null); setCustomerSearch('') }}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >×</button>
                  </>
                )}
                {!customer && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {showCustomerSearch && (
                <div className="mt-1 border rounded-lg bg-white shadow-lg z-10 relative">
                  {!addingCustomer ? (
                    <>
                      <div className="p-2">
                        <Input
                          autoFocus
                          placeholder="Search by name or phone..."
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCustomer(c)
                              setShowCustomerSearch(false)
                              setCustomerSearch('')
                              setPaymentMethod('credit')
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 text-left text-sm"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#0F4C81]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[11px] font-bold text-[#0F4C81]">{c.name[0].toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.primary_phone}</p>
                            </div>
                          </button>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No match — add as new customer below</p>
                        )}
                      </div>
                      <div className="p-2 border-t">
                        <button
                          onClick={() => {
                            setAddingCustomer(true)
                            setNewCustomerName(customerSearch)
                            setNewCustomerPhone('')
                          }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs text-[#0F4C81] font-medium py-1.5 hover:bg-[#0F4C81]/5 rounded"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add new customer
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Customer</p>
                      <Input
                        autoFocus
                        placeholder="Full name"
                        value={newCustomerName}
                        onChange={e => setNewCustomerName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Phone number"
                        value={newCustomerPhone}
                        onChange={e => setNewCustomerPhone(e.target.value)}
                        className="h-8 text-sm"
                        type="tel"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setAddingCustomer(false)}
                          className="flex-1 text-xs text-muted-foreground py-1.5 border rounded hover:bg-muted/40"
                        >Cancel</button>
                        <button
                          onClick={handleAddCustomer}
                          disabled={savingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()}
                          className="flex-1 text-xs bg-[#0F4C81] text-white py-1.5 rounded font-medium disabled:opacity-50"
                        >{savingCustomer ? 'Saving…' : 'Add & Select'}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1.5">Payment</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'cash', label: 'Cash', Icon: Banknote, enabled: true },
                  { id: 'evc', label: 'EVC', Icon: Zap, enabled: hasEvcFeature && evcConnections.length > 0 },
                  { id: 'credit', label: 'Credit', Icon: CreditCard, enabled: hasCreditCustomers },
                ] as const).filter(m => m.enabled).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border text-xs font-medium transition-colors',
                      paymentMethod === id
                        ? 'bg-[#0F4C81] text-white border-[#0F4C81]'
                        : 'bg-white text-muted-foreground border-gray-200 hover:border-[#0F4C81]/30 hover:text-[#0F4C81]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* EVC connection selector */}
              {paymentMethod === 'evc' && evcConnections.length > 1 && (
                <div className="mt-2">
                  <select
                    className="w-full text-sm border rounded-lg px-3 py-1.5 bg-white"
                    value={selectedEvc?.id ?? ''}
                    onChange={e => setSelectedEvc(evcConnections.find(c => c.id === e.target.value) ?? null)}
                  >
                    {evcConnections.map(c => (
                      <option key={c.id} value={c.id}>{c.merchant_name} ({c.merchant_number})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Credit customer warning */}
              {paymentMethod === 'credit' && !customer && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  Select a customer for credit sales
                </p>
              )}
            </div>

            {/* Complete sale button */}
            <Button
              className="w-full bg-[#0F4C81] hover:bg-[#0d3d6b] h-11 text-base font-semibold"
              disabled={cart.length === 0 || isProcessing || (paymentMethod === 'credit' && !customer)}
              onClick={handleCompleteSale}
            >
              {isProcessing ? 'Processing...' : `Complete Sale · ${formatCurrency(total, business.currency)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* EVC payment overlay */}
      {showEvcOverlay && evcInitiatedAt && (
        <POSPaymentOverlay
          businessId={business.id}
          expectedAmount={total}
          currency={business.currency}
          initiatedAt={evcInitiatedAt}
          onConfirmed={handleEvcConfirmed}
          onCancel={() => { setShowEvcOverlay(false); setEvcInitiatedAt(null) }}
        />
      )}

      {/* Receipt overlay */}
      {completedSale && (
        <POSReceipt
          sale={completedSale}
          business={business}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => setCompletedSale(null)}
        />
      )}
    </div>
  )

  return (
    <>
      {showLogin && (
        <POSCashierLogin
          businessName={business.name}
          businessId={business.id}
          staff={staff}
          onLogin={handleLogin}
          onSkip={handleSkip}
        />
      )}
      {posContent}
      {showCameraScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </>
  )
}
