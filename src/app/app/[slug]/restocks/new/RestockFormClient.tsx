'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Package, Store, Banknote, CreditCard, Plus,
  ChevronDown, Check, Loader2, X, Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  unit: string
  purchase_price: number
  stock_quantity: number | null
}

interface Vendor {
  id: string
  name: string
  phone: string | null
  city: string | null
}

interface Props {
  business: { id: string; name: string; slug: string; currency: string }
  products: Product[]
  vendors: Vendor[]
}

type PayMethod = 'cash' | 'credit'

export function RestockFormClient({ business, products, vendors }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Product selection
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDropOpen, setProductDropOpen] = useState(false)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductSalePrice, setNewProductSalePrice] = useState('')
  const [newProductUnit, setNewProductUnit] = useState('pcs')
  const productRef = useRef<HTMLDivElement>(null)

  // Vendor selection
  const [vendorSearch, setVendorSearch] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [vendorDropOpen, setVendorDropOpen] = useState(false)
  const [isNewVendor, setIsNewVendor] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [newVendorPhone, setNewVendorPhone] = useState('')
  const vendorRef = useRef<HTMLDivElement>(null)

  // Quantity & cost
  const [quantity, setQuantity] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')

  // Payment
  const [payMethod, setPayMethod] = useState<PayMethod>('credit')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const cur = business.currency
  const total = (parseFloat(quantity) || 0) * (parseFloat(costPerUnit) || 0)

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  )
  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  )

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductDropOpen(false)
      if (vendorRef.current && !vendorRef.current.contains(e.target as Node)) setVendorDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectProduct(p: Product) {
    setSelectedProduct(p)
    setProductSearch(p.name)
    setProductDropOpen(false)
    setIsNewProduct(false)
    if (p.purchase_price > 0) setCostPerUnit(String(p.purchase_price))
  }

  function startNewProduct(name: string) {
    setIsNewProduct(true)
    setNewProductName(name)
    setSelectedProduct(null)
    setProductDropOpen(false)
    setProductSearch(name)
  }

  function clearProduct() {
    setSelectedProduct(null)
    setIsNewProduct(false)
    setProductSearch('')
    setNewProductName('')
    setNewProductSalePrice('')
    setNewProductUnit('pcs')
  }

  function selectVendor(v: Vendor) {
    setSelectedVendor(v)
    setVendorSearch(v.name)
    setVendorDropOpen(false)
    setIsNewVendor(false)
  }

  function startNewVendor(name: string) {
    setIsNewVendor(true)
    setNewVendorName(name)
    setSelectedVendor(null)
    setVendorDropOpen(false)
    setVendorSearch(name)
  }

  function clearVendor() {
    setSelectedVendor(null)
    setIsNewVendor(false)
    setVendorSearch('')
    setNewVendorName('')
    setNewVendorPhone('')
  }

  const handleSave = async () => {
    if (!selectedProduct && !isNewProduct) return toast.error('Select or create a product')
    if (!quantity || parseFloat(quantity) <= 0) return toast.error('Enter a valid quantity')
    if (payMethod === 'credit' && !dueDate) return toast.error('Select a due date for credit')

    setSaving(true)
    try {
      // Create new vendor first if needed
      let vendorId = selectedVendor?.id ?? null
      if (isNewVendor && newVendorName.trim()) {
        const vRes = await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id: business.id,
            name: newVendorName.trim(),
            phone: newVendorPhone || null,
          }),
        })
        const vData = await vRes.json()
        if (!vRes.ok) { toast.error(vData.error ?? 'Failed to create vendor'); setSaving(false); return }
        vendorId = vData.id
      }

      const res = await fetch('/api/restocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          inventory_item_id: selectedProduct?.id ?? null,
          new_product: isNewProduct ? {
            name: newProductName,
            sale_price: newProductSalePrice,
            unit: newProductUnit,
          } : null,
          vendor_id: vendorId,
          quantity: parseFloat(quantity),
          cost_per_unit: parseFloat(costPerUnit) || 0,
          payment_method: payMethod,
          due_date: payMethod === 'credit' ? dueDate : null,
          notes: notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to save restock'); return }

      toast.success('Stock restocked successfully')
      router.push(`/app/${business.slug}/restocks`)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const productUnit = selectedProduct?.unit ?? newProductUnit ?? 'units'

  return (
    <div>
      <PageHeader
        title="Restock Products"
        description="Record stock received from a supplier"
        breadcrumbs={[
          { label: business.name, href: `/app/${business.slug}` },
          { label: 'Restocks', href: `/app/${business.slug}/restocks` },
          { label: 'New Restock' },
        ]}
      />

      <div className="max-w-lg mx-auto space-y-5 pb-10">

        {/* ── 1. PRODUCT ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-[#0F4C81]/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-[#0F4C81]" />
            </div>
            <h2 className="font-semibold text-sm">Which product?</h2>
          </div>

          {!selectedProduct && !isNewProduct ? (
            <div ref={productRef} className="relative">
              <Input
                placeholder="Search your products…"
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setProductDropOpen(true) }}
                onFocus={() => setProductDropOpen(true)}
                className="text-base h-11"
              />
              {productDropOpen && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {filteredProducts.length > 0 && filteredProducts.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted/60 flex items-center justify-between border-b last:border-0"
                      onMouseDown={() => selectProduct(p)}
                    >
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {p.stock_quantity ?? 0} {p.unit}
                        </p>
                      </div>
                      {p.purchase_price > 0 && (
                        <span className="text-xs text-muted-foreground">{formatCurrency(p.purchase_price, cur)}/{p.unit}</span>
                      )}
                    </button>
                  ))}
                  {productSearch.trim() && (
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-2 text-green-700 font-medium"
                      onMouseDown={() => startNewProduct(productSearch.trim())}
                    >
                      <Plus className="h-4 w-4" />
                      Create &quot;{productSearch.trim()}&quot; as new product
                    </button>
                  )}
                  {filteredProducts.length === 0 && !productSearch.trim() && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Type to search products</p>
                  )}
                </div>
              )}
            </div>
          ) : selectedProduct ? (
            <div className="flex items-center justify-between bg-[#0F4C81]/5 rounded-lg px-3 py-2.5">
              <div>
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  Current stock: {selectedProduct.stock_quantity ?? 0} {selectedProduct.unit}
                </p>
              </div>
              <button onClick={clearProduct} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* New product fields */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-green-700">New product: {newProductName}</p>
                <button onClick={clearProduct} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Selling price ({cur})</Label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={newProductSalePrice}
                    onChange={e => setNewProductSalePrice(e.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <select
                    value={newProductUnit}
                    onChange={e => setNewProductUnit(e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {['pcs', 'kg', 'g', 'litre', 'box', 'bag', 'carton', 'dozen', 'pack'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. QUANTITY & COST ──────────────────────────── */}
        <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <ChevronDown className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="font-semibold text-sm">How much stock?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quantity ({productUnit})</Label>
              <Input
                type="number" min="0.01" step="any" placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="mt-1 h-11 text-base font-semibold"
              />
            </div>
            <div>
              <Label className="text-xs">Cost per {productUnit} ({cur})</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={costPerUnit}
                onChange={e => setCostPerUnit(e.target.value)}
                className="mt-1 h-11 text-base"
              />
            </div>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm text-muted-foreground">Total cost</span>
              <span className="font-bold text-base">{formatCurrency(total, cur)}</span>
            </div>
          )}
        </div>

        {/* ── 3. VENDOR ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center">
              <Store className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <h2 className="font-semibold text-sm">From which supplier?</h2>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
          </div>

          {!selectedVendor && !isNewVendor ? (
            <div ref={vendorRef} className="relative">
              <Input
                placeholder="Search suppliers…"
                value={vendorSearch}
                onChange={e => { setVendorSearch(e.target.value); setVendorDropOpen(true) }}
                onFocus={() => setVendorDropOpen(true)}
                className="text-base h-11"
              />
              {vendorDropOpen && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredVendors.map(v => (
                    <button
                      key={v.id}
                      className="w-full text-left px-4 py-3 hover:bg-muted/60 border-b last:border-0"
                      onMouseDown={() => selectVendor(v)}
                    >
                      <p className="text-sm font-medium">{v.name}</p>
                      {(v.phone || v.city) && (
                        <p className="text-xs text-muted-foreground">{[v.phone, v.city].filter(Boolean).join(' · ')}</p>
                      )}
                    </button>
                  ))}
                  {vendorSearch.trim() && (
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-2 text-green-700 font-medium"
                      onMouseDown={() => startNewVendor(vendorSearch.trim())}
                    >
                      <Plus className="h-4 w-4" />
                      Add &quot;{vendorSearch.trim()}&quot; as new supplier
                    </button>
                  )}
                  {filteredVendors.length === 0 && !vendorSearch.trim() && (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Type to search suppliers</p>
                  )}
                </div>
              )}
            </div>
          ) : selectedVendor ? (
            <div className="flex items-center justify-between bg-purple-50/60 rounded-lg px-3 py-2.5">
              <div>
                <p className="font-medium text-sm">{selectedVendor.name}</p>
                {selectedVendor.phone && <p className="text-xs text-muted-foreground">{selectedVendor.phone}</p>}
              </div>
              <button onClick={clearVendor} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* New vendor fields */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                <p className="text-sm font-medium text-green-700">New supplier: {newVendorName}</p>
                <button onClick={clearVendor} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <Label className="text-xs">Phone number</Label>
                <Input
                  placeholder="+252…"
                  value={newVendorPhone}
                  onChange={e => setNewVendorPhone(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 4. PAYMENT ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-green-50 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-green-600" />
            </div>
            <h2 className="font-semibold text-sm">How are you paying?</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayMethod('cash')}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-3 transition-all',
                payMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-muted-foreground hover:border-gray-300'
              )}
            >
              <Banknote className="h-6 w-6" />
              <span className="font-semibold text-sm">Paid now</span>
              <span className="text-xs opacity-70">Cash / Mobile money</span>
            </button>
            <button
              onClick={() => setPayMethod('credit')}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-3 transition-all',
                payMethod === 'credit'
                  ? 'border-[#0F4C81] bg-[#0F4C81]/5 text-[#0F4C81]'
                  : 'border-gray-200 text-muted-foreground hover:border-gray-300'
              )}
            >
              <CreditCard className="h-6 w-6" />
              <span className="font-semibold text-sm">On credit</span>
              <span className="text-xs opacity-70">Pay later</span>
            </button>
          </div>

          {payMethod === 'credit' && (
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due date *
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 h-11"
              />
            </div>
          )}

          {payMethod === 'cash' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <Check className="h-4 w-4" />
              Stock will be marked as fully paid
            </div>
          )}
        </div>

        {/* ── 5. NOTES ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            placeholder="e.g. Received from warehouse, invoice #123…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="mt-1 h-10"
          />
        </div>

        {/* ── SAVE ────────────────────────────────────────── */}
        {total > 0 && (
          <div className="sticky bottom-4 px-0">
            <div className="bg-white rounded-xl border shadow-lg p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Total cost</p>
                <p className="font-bold text-lg">{formatCurrency(total, cur)}</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0F4C81] hover:bg-[#0d3d6b] h-12 px-6 text-base font-semibold rounded-xl"
              >
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Restock'}
              </Button>
            </div>
          </div>
        )}

        {total === 0 && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#0F4C81] hover:bg-[#0d3d6b] h-12 text-base font-semibold rounded-xl"
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save Restock'}
          </Button>
        )}
      </div>
    </div>
  )
}
