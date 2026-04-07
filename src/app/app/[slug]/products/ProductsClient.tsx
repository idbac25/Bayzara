'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Package,
  Upload, X, ImageIcon, AlertTriangle, ScanLine
} from 'lucide-react'
import { BarcodeScanner } from '../pos/BarcodeScanner'
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  unit: string
  sale_price: number
  purchase_price: number
  tax_rate: number
  stock_quantity: number | null
  reorder_level: number | null
  type: string
  category: string | null
  image_url: string | null
  archived: boolean
}

interface Props {
  products: Product[]
  businessId: string
  slug: string
  currency: string
}

const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen', 'pair', 'set']

const PLACEHOLDER_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-emerald-400 to-emerald-600',
  'from-orange-400 to-orange-600',
  'from-rose-400 to-rose-600',
  'from-teal-400 to-teal-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
]

function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length]
}

const emptyForm = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  unit: 'pcs',
  sale_price: '',
  purchase_price: '',
  tax_rate: '0',
  stock_quantity: '',
  reorder_level: '',
  category: '',
  track_stock: false,
}

export function ProductsClient({ products: initialProducts, businessId, slug, currency }: Props) {
  const { business } = useBusiness()
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))] as string[]
    return cats.sort()
  }, [products])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
      const matchesCat = !categoryFilter || p.category === categoryFilter
      return matchesSearch && matchesCat
    })
  }, [products, search, categoryFilter])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setImageFile(null)
    setImagePreview(null)
    setSheetOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      description: p.description ?? '',
      unit: p.unit,
      sale_price: String(p.sale_price),
      purchase_price: String(p.purchase_price),
      tax_rate: String(p.tax_rate),
      stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : '',
      reorder_level: p.reorder_level != null ? String(p.reorder_level) : '',
      category: p.category ?? '',
      track_stock: p.stock_quantity != null,
    })
    setImageFile(null)
    setImagePreview(p.image_url)
    setSheetOpen(true)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return editing?.image_url ?? null
    setUploadingImage(true)
    try {
      const ext = imageFile.name.split('.').pop()
      const path = `${businessId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(path, imageFile, { upsert: true })
      if (error) {
        toast.error('Image upload failed: ' + error.message)
        return null
      }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path)
      return publicUrl
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.sale_price || isNaN(Number(form.sale_price))) { toast.error('Valid price is required'); return }

    setSaving(true)
    try {
      const imageUrl = await uploadImage()

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        unit: form.unit,
        sale_price: parseFloat(form.sale_price) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
        stock_quantity: form.track_stock && form.stock_quantity ? parseInt(form.stock_quantity) : null,
        reorder_level: form.track_stock && form.reorder_level ? parseInt(form.reorder_level) : null,
        category: form.category.trim() || null,
        image_url: imageUrl,
        type: 'product',
        business_id: businessId,
        archived: false,
      }

      if (editing) {
        const { data, error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single()
        if (error) throw error
        setProducts(prev => prev.map(p => p.id === editing.id ? data as Product : p))
        toast.success('Product updated')
      } else {
        const { data, error } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        setProducts(prev => [data as Product, ...prev])
        toast.success('Product added')
      }

      setSheetOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ archived: true })
        .eq('id', deleteTarget.id)
      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Product removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog for the POS"
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Products' },
        ]}
        action={
          <Button onClick={openAdd} className="bg-[#0F4C81] hover:bg-[#0d3d6b]">
            <Plus className="h-4 w-4 mr-2" />Add Product
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              !categoryFilter
                ? 'bg-[#0F4C81] text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? null : cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                categoryFilter === cat
                  ? 'bg-[#0F4C81] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat} ({products.filter(p => p.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Package className="h-14 w-14 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium text-foreground">
            {products.length === 0 ? 'No products yet' : 'No products match your search'}
          </p>
          {products.length === 0 && (
            <p className="text-sm mt-1 mb-6">Add your first product to start selling</p>
          )}
          {products.length === 0 && (
            <Button onClick={openAdd} className="bg-[#0F4C81] hover:bg-[#0d3d6b]">
              <Plus className="h-4 w-4 mr-2" />Add Product
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(product => {
            const low = product.stock_quantity != null && product.stock_quantity <= (product.reorder_level ?? 5)
            const outOfStock = product.stock_quantity != null && product.stock_quantity <= 0
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={cn(
                      'w-full h-full flex items-center justify-center bg-gradient-to-br',
                      getColor(product.name)
                    )}>
                      <span className="text-white text-3xl font-bold opacity-80">
                        {product.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Stock badge overlay */}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  {!outOfStock && low && product.stock_quantity != null && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />{product.stock_quantity} left
                      </span>
                    </div>
                  )}

                  {/* Actions overlay on hover */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm hover:bg-white">
                          <MoreHorizontal className="h-3.5 w-3.5 text-gray-700" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => openEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  {product.category && (
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      {product.category}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </p>
                  <p className="text-base font-bold text-[#0F4C81]">
                    {formatCurrency(product.sale_price, currency)}
                  </p>
                  {product.stock_quantity != null && !outOfStock && !low && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {product.stock_quantity} in stock
                    </p>
                  )}
                  {product.sku && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                      {product.sku}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!open && !saving) setSheetOpen(false) }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Product' : 'Add Product'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {/* Image Upload */}
            <div>
              <Label className="mb-2 block">Product Image</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative w-full aspect-video rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden',
                  imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-[#0F4C81]/40 bg-gray-50'
                )}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />Change Image
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(editing?.image_url ?? null) }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground/60">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                className="mt-1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Chicken Burger"
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                className="mt-1"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Food, Drinks, Electronics"
                list="existing-categories"
              />
              <datalist id="existing-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Price row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sale_price">Sale Price <span className="text-destructive">*</span></Label>
                <Input
                  id="sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={form.sale_price}
                  onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="purchase_price">Cost Price</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={form.purchase_price}
                  onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Unit + Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1"
                  value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                />
              </div>
            </div>

            {/* SKU + Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  className="mt-1 font-mono"
                  value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                  placeholder="Internal code"
                />
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  className="mt-1 font-mono"
                  value={form.barcode}
                  onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="EAN-13 / UPC"
                />
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="mt-1.5 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#0F4C81]/40 bg-[#0F4C81]/5 hover:bg-[#0F4C81]/10 text-[#0F4C81] text-sm font-medium py-2.5 transition-colors active:scale-95"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan Barcode with Camera
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional product description"
              />
            </div>

            {/* Track Stock */}
            <div className="border rounded-xl p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Track Inventory</p>
                  <p className="text-xs text-muted-foreground">Monitor stock levels for this product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, track_stock: !f.track_stock }))}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.track_stock ? 'bg-[#0F4C81]' : 'bg-gray-200'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                    form.track_stock ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </label>

              {form.track_stock && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="stock_qty">Current Stock</Label>
                    <Input
                      id="stock_qty"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={form.stock_quantity}
                      onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder">Reorder Level</Label>
                    <Input
                      id="reorder"
                      type="number"
                      min="0"
                      className="mt-1"
                      value={form.reorder_level}
                      onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))}
                      placeholder="5"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-[#0F4C81] hover:bg-[#0d3d6b]"
              onClick={handleSave}
              disabled={saving || uploadingImage}
            >
              {saving || uploadingImage ? 'Saving...' : editing ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title={`Remove "${deleteTarget?.name}"?`}
        description="This will hide the product from the POS. It won't delete sales history."
        confirmLabel="Remove"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />

      {/* Barcode camera scanner — fills the barcode field */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onDetected={(code) => {
            setForm(f => ({ ...f, barcode: code }))
            setShowBarcodeScanner(false)
            toast.success(`Barcode scanned: ${code}`)
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  )
}
