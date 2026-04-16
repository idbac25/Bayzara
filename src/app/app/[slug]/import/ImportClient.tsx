'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Upload, ArrowRight, Check, X, RefreshCw, Camera,
  Users, Package, Store, BookOpen, Loader2, Link2, ChevronDown, CreditCard,
  History, AlertTriangle, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Types ──────────────────────────────────────────────────────────────────

type ImportType = 'customers' | 'products' | 'suppliers' | 'debt' | 'vendor-debts'

interface Business {
  id: string
  name: string
  slug: string
  currency: string
}

interface FieldDef {
  key: string
  label: string
  required?: boolean
  hint?: string
}

interface MappedRow {
  [key: string]: string | number | null
}

// ─── Field definitions per import type ──────────────────────────────────────

const FIELDS: Record<ImportType, FieldDef[]> = {
  customers: [
    { key: 'name', label: 'Name', required: true },
    { key: 'phone', label: 'Phone', hint: 'Primary phone number' },
  ],
  products: [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'sku', label: 'SKU / Barcode' },
    { key: 'unit', label: 'Unit', hint: 'e.g. pcs, kg, box' },
    { key: 'type', label: 'Type', hint: 'product or service' },
    { key: 'sale_price', label: 'Sale Price' },
    { key: 'purchase_price', label: 'Purchase / Cost Price' },
    { key: 'stock_quantity', label: 'Stock Quantity' },
    { key: 'reorder_level', label: 'Reorder Level' },
    { key: 'tax_rate', label: 'Tax Rate %' },
  ],
  suppliers: [
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'contact_name', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'evc_phone', label: 'EVC Phone' },
    { key: 'city', label: 'City' },
    { key: 'country', label: 'Country' },
    { key: 'notes', label: 'Notes' },
  ],
  debt: [
    { key: 'name', label: 'Customer Name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'balance', label: 'Amount Owed', hint: 'Current outstanding balance' },
    { key: 'notes', label: 'Notes' },
  ],
  'vendor-debts': [
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'evc_phone', label: 'EVC Phone' },
    { key: 'balance', label: 'Amount We Owe', hint: 'Outstanding payable balance' },
    { key: 'notes', label: 'Notes' },
  ],
}

const TYPE_CONFIG: Record<ImportType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  customers: { label: 'Customers', icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  products: { label: 'Products', icon: Package, color: 'bg-green-50 border-green-200 text-green-700' },
  suppliers: { label: 'Suppliers', icon: Store, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  debt: { label: 'Debt Book', icon: BookOpen, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  'vendor-debts': { label: 'Vendor Debts', icon: CreditCard, color: 'bg-red-50 border-red-200 text-red-700' },
}

// ─── Fuzzy auto-match ────────────────────────────────────────────────────────

function autoMatch(csvHeaders: string[], fields: FieldDef[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const used = new Set<string>()

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

  const aliases: Record<string, string[]> = {
    name: ['name', 'customername', 'clientname', 'fullname', 'suppliername', 'productname', 'itemname', 'title'],
    phone: ['phone', 'mobile', 'tel', 'telephone', 'contact', 'phonenumber', 'mobilenumber'],
    evc_phone: ['evcphone', 'evc', 'evcmobile', 'evcnumber'],
    sku: ['sku', 'barcode', 'code', 'productcode', 'itemcode', 'ref'],
    unit: ['unit', 'uom', 'unitofmeasure'],
    type: ['type', 'itemtype', 'producttype', 'category'],
    sale_price: ['saleprice', 'price', 'sellingprice', 'retail', 'unitprice'],
    purchase_price: ['purchaseprice', 'cost', 'costprice', 'buyprice', 'wholesale'],
    stock_quantity: ['stockquantity', 'stock', 'quantity', 'qty', 'onhand', 'currentstock'],
    reorder_level: ['reorderlevel', 'reorder', 'minstock', 'minimumstock'],
    tax_rate: ['taxrate', 'tax', 'vat', 'vatrate'],
    contact_name: ['contactname', 'contact', 'contactperson', 'person'],
    city: ['city', 'town', 'location'],
    country: ['country', 'nation'],
    notes: ['notes', 'note', 'description', 'remarks', 'comment', 'comments'],
    balance: ['balance', 'amountowed', 'debt', 'outstanding', 'owes', 'amount', 'total'],
  }

  for (const field of fields) {
    const fieldAliases = aliases[field.key] ?? [normalize(field.key)]
    for (const csvHeader of csvHeaders) {
      if (used.has(csvHeader)) continue
      const norm = normalize(csvHeader)
      if (fieldAliases.includes(norm) || norm === normalize(field.key)) {
        mapping[field.key] = csvHeader
        used.add(csvHeader)
        break
      }
    }
  }

  return mapping
}

// ─── Column Mapper Component ─────────────────────────────────────────────────

interface MapperProps {
  csvHeaders: string[]
  fields: FieldDef[]
  mapping: Record<string, string>
  onChange: (mapping: Record<string, string>) => void
}

function ColumnMapper({ csvHeaders, fields, mapping, onChange }: MapperProps) {
  const [activeSource, setActiveSource] = useState<string | null>(null)

  // Reverse mapping: csvHeader → fieldKey
  const reverseMap = Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]))

  function handleSourceClick(header: string) {
    if (activeSource === header) {
      setActiveSource(null)
      return
    }
    // If this CSV header is already mapped, clicking it again allows remapping
    setActiveSource(header)
  }

  function handleTargetClick(fieldKey: string) {
    if (!activeSource) return

    const newMapping = { ...mapping }
    // Remove any existing mapping that used this CSV header
    for (const [k, v] of Object.entries(newMapping)) {
      if (v === activeSource) delete newMapping[k]
    }
    // Remove any existing mapping for this field
    delete newMapping[fieldKey]
    // Set new mapping
    newMapping[fieldKey] = activeSource
    onChange(newMapping)
    setActiveSource(null)
  }

  function removeMapping(fieldKey: string) {
    const newMapping = { ...mapping }
    delete newMapping[fieldKey]
    onChange(newMapping)
  }

  const unmappedHeaders = csvHeaders.filter(h => !Object.values(mapping).includes(h))
  const mappedHeaders = csvHeaders.filter(h => Object.values(mapping).includes(h))

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 rounded-lg px-3 py-2">
        <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
        <span>
          {activeSource
            ? <><strong className="text-blue-700">"{activeSource}"</strong> selected — now tap a field below to connect it</>
            : 'Tap a CSV column on the left, then tap a field on the right to connect them'}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
        {/* Left: CSV headers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your CSV columns</p>
          {csvHeaders.map(header => {
            const isMapped = mappedHeaders.includes(header)
            const isActive = activeSource === header
            return (
              <button
                key={header}
                onClick={() => handleSourceClick(header)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                  isActive && 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-300',
                  isMapped && !isActive && 'border-green-300 bg-green-50 text-green-700',
                  !isMapped && !isActive && 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="truncate">{header}</span>
                  {isMapped && <Check className="h-3.5 w-3.5 shrink-0" />}
                </span>
              </button>
            )
          })}
        </div>

        {/* Middle: arrow */}
        <div className="flex flex-col items-center pt-7 gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Right: system fields */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">System fields</p>
          {fields.map(field => {
            const mappedFrom = mapping[field.key]
            const isTarget = activeSource !== null

            return (
              <button
                key={field.key}
                onClick={() => handleTargetClick(field.key)}
                disabled={!isTarget && !mappedFrom}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all',
                  mappedFrom && 'border-green-300 bg-green-50',
                  !mappedFrom && isTarget && 'border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer',
                  !mappedFrom && !isTarget && 'border-gray-200 bg-gray-50 cursor-default',
                )}
              >
                <span className="flex items-center justify-between gap-1">
                  <span>
                    <span className={cn('font-medium', mappedFrom ? 'text-green-700' : 'text-gray-700')}>
                      {field.label}
                    </span>
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    {mappedFrom && (
                      <span className="ml-1.5 text-xs text-green-600">← {mappedFrom}</span>
                    )}
                  </span>
                  {mappedFrom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeMapping(field.key) }}
                      className="text-green-600 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                {field.hint && !mappedFrom && (
                  <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Unmapped warning */}
      {unmappedHeaders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{unmappedHeaders.length} column{unmappedHeaders.length > 1 ? 's' : ''} not mapped</span> and will be ignored:{' '}
          {unmappedHeaders.join(', ')}
        </p>
      )}
    </div>
  )
}

// ─── Preview Table ────────────────────────────────────────────────────────────

function PreviewTable({ rows, fields }: { rows: MappedRow[]; fields: FieldDef[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, 5)

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              {fields.map(f => (
                <th key={f.key} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {fields.map(f => (
                  <td key={f.key} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                    {row[f.key] != null ? String(row[f.key]) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  )
}

// ─── OCR Debt Import ──────────────────────────────────────────────────────────

interface OCRSectionProps {
  businessId: string
  onImported: (count: number) => void
}

function OCRSection({ businessId, onImported }: OCRSectionProps) {
  const router = useRouter()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<string>('image/jpeg')
  const [ocrRows, setOcrRows] = useState<MappedRow[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      // Strip the data URL prefix to get base64 only
      const base64 = result.split(',')[1]
      setImageBase64(base64)
      setOcrRows(null)
    }
    reader.readAsDataURL(file)
  }

  async function runOCR() {
    if (!imageBase64) return
    setScanning(true)
    try {
      const res = await fetch('/api/import/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not read image')
        return
      }
      setOcrRows(data.rows)
      toast.success(`Found ${data.rows.length} records in the ledger`)
    } catch {
      toast.error('Failed to scan image')
    } finally {
      setScanning(false)
    }
  }

  function updateRow(index: number, key: string, value: string) {
    setOcrRows(rows => rows?.map((r, i) => i === index ? { ...r, [key]: value } : r) ?? null)
  }

  function removeRow(index: number) {
    setOcrRows(rows => rows?.filter((_, i) => i !== index) ?? null)
  }

  async function importOCRRows() {
    if (!ocrRows || ocrRows.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/import/debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, rows: ocrRows, source: 'ocr' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed')
        return
      }
      toast.success(`Imported ${data.imported} records${data.skipped ? `, skipped ${data.skipped}` : ''}`)
      onImported(data.imported)
      setOcrRows(null)
      setImagePreview(null)
      setImageBase64(null)
      router.refresh()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Ledger" className="max-h-64 mx-auto rounded-lg object-contain" />
        ) : (
          <>
            <Camera className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Take a photo or upload your debt book</p>
            <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WebP</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
      </div>

      {imageBase64 && !ocrRows && (
        <Button onClick={runOCR} disabled={scanning} className="w-full">
          {scanning ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Reading ledger...</> : 'Extract records from image'}
        </Button>
      )}

      {/* Editable OCR results */}
      {ocrRows && ocrRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{ocrRows.length} records found — review before importing</p>
            <button onClick={() => setOcrRows(null)} className="text-xs text-muted-foreground hover:text-red-500">
              Clear
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Balance</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Notes</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {ocrRows.map((row, i) => (
                  <tr key={i}>
                    {(['name', 'phone', 'balance', 'notes'] as const).map(key => (
                      <td key={key} className="px-2 py-1">
                        <input
                          className="w-full bg-transparent border-0 outline-none focus:bg-blue-50 rounded px-1 py-0.5 text-gray-700"
                          value={row[key] != null ? String(row[key]) : ''}
                          onChange={e => updateRow(i, key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={importOCRRows} disabled={importing} className="w-full">
            {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing...</> : `Import ${ocrRows.length} records into Debt Book`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main ImportClient ────────────────────────────────────────────────────────

interface ImportHistoryRow {
  id: string
  import_type: ImportType
  source: 'csv' | 'ocr' | 'manual'
  imported: number
  skipped: number
  errors_count: number
  errors: string[] | null
  created_at: string
}

interface Props {
  business: Business
  slug: string
  history: ImportHistoryRow[]
}

type Step = 'upload' | 'map' | 'preview' | 'done'

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function HistoryList({ history }: { history: ImportHistoryRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  if (history.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-gray-500" />
        <h2 className="text-base font-semibold">Import History</h2>
        <span className="text-xs text-muted-foreground">({history.length})</span>
      </div>

      <div className="divide-y -mx-2">
        {history.map(h => {
          const cfg = TYPE_CONFIG[h.import_type] ?? TYPE_CONFIG.customers
          const Icon = cfg.icon
          const isOpen = expanded === h.id
          const hasErrors = h.errors_count > 0
          return (
            <div key={h.id} className="px-2 py-3">
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', cfg.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {cfg.label}
                    {h.source === 'ocr' && <span className="ml-2 text-xs text-orange-600 font-normal">via photo</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelative(h.created_at)} · {h.imported} imported
                    {h.skipped > 0 && <>, {h.skipped} skipped</>}
                    {hasErrors && <>, <span className="text-red-600 font-medium">{h.errors_count} errors</span></>}
                  </p>
                </div>
                {hasErrors && (
                  <ChevronDown className={cn('h-4 w-4 text-gray-400 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                )}
              </button>

              {isOpen && hasErrors && h.errors && (
                <div className="mt-2 ml-12 bg-red-50 rounded-lg p-3 text-xs text-red-700 space-y-0.5 max-h-48 overflow-y-auto">
                  {h.errors.map((e, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{e}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ImportClient({ business, slug, history }: Props) {
  const router = useRouter()
  const [importType, setImportType] = useState<ImportType>('customers')
  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fields = FIELDS[importType]
  const config = TYPE_CONFIG[importType]

  function reset() {
    setStep('upload')
    setCsvHeaders([])
    setRawRows([])
    setMapping({})
    setMappedRows([])
    setResult(null)
  }

  function handleTypeChange(t: ImportType) {
    setImportType(t)
    reset()
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? []
        setCsvHeaders(headers)
        setRawRows(results.data)
        const autoMap = autoMatch(headers, fields)
        setMapping(autoMap)
        setStep('map')
      },
      error() {
        toast.error('Could not parse CSV file')
      },
    })
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function buildMappedRows(): MappedRow[] {
    return rawRows.map(row => {
      const out: MappedRow = {}
      for (const field of fields) {
        const csvCol = mapping[field.key]
        if (csvCol && row[csvCol] !== undefined) {
          const val = row[csvCol]?.trim() ?? ''
          if (['sale_price', 'purchase_price', 'tax_rate', 'balance'].includes(field.key)) {
            out[field.key] = parseFloat(val) || 0
          } else if (['stock_quantity', 'reorder_level'].includes(field.key)) {
            out[field.key] = val ? parseInt(val) : null
          } else {
            out[field.key] = val || null
          }
        } else {
          out[field.key] = null
        }
      }
      return out
    })
  }

  function goToPreview() {
    const requiredFields = fields.filter(f => f.required)
    for (const f of requiredFields) {
      if (!mapping[f.key]) {
        toast.error(`Please map the "${f.label}" field — it's required`)
        return
      }
    }
    const rows = buildMappedRows()
    const valid = rows.filter(r => {
      const nameKey = fields.find(f => f.required)?.key
      return nameKey ? r[nameKey] : true
    })
    setMappedRows(valid)
    setStep('preview')
  }

  async function runImport() {
    setImporting(true)
    try {
      const endpoint = `/api/import/${importType}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, rows: mappedRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Import failed')
        return
      }
      setResult(data)
      setStep('done')
      router.refresh()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const isDebt = importType === 'debt'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Migrate your existing customer lists, products, suppliers, and debt records into {business.name}.
          </p>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(TYPE_CONFIG) as ImportType[]).map(type => {
            const cfg = TYPE_CONFIG[type]
            const Icon = cfg.icon
            const active = importType === type
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                  active
                    ? 'border-[#1a2744] bg-[#1a2744] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                )}
              >
                <Icon className="h-5 w-5" />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <>
              {isDebt ? (
                // Debt book: two options — CSV or Photo
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-semibold mb-1">Import Debt Book</h2>
                    <p className="text-sm text-muted-foreground">
                      Import from a CSV file, or take a photo of your handwritten ledger and let AI read it automatically.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* CSV option */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-center"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Upload CSV</p>
                        <p className="text-xs text-muted-foreground mt-0.5">From spreadsheet or digital system</p>
                      </div>
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />

                    {/* Photo option — rendered below */}
                    <div
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/30 text-center cursor-default"
                    >
                      <Camera className="h-8 w-8 text-orange-400" />
                      <div>
                        <p className="text-sm font-semibold text-orange-700">Scan Physical Book</p>
                        <p className="text-xs text-orange-600/70 mt-0.5">AI reads your handwritten ledger</p>
                      </div>
                    </div>
                  </div>

                  {/* OCR section always visible for debt */}
                  <div className="border-t pt-5">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Camera className="h-4 w-4 text-orange-500" />
                      Scan Handwritten Debt Book
                    </h3>
                    <OCRSection businessId={business.id} onImported={() => {}} />
                  </div>
                </div>
              ) : (
                // Non-debt: CSV upload only
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-semibold mb-1">Upload {config.label} CSV</h2>
                    <p className="text-sm text-muted-foreground">
                      Export your data from any system as a CSV file and upload it here.
                    </p>
                  </div>

                  {/* CSV template hint */}
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-gray-600">Suggested columns:</p>
                    <p>{fields.map(f => f.label + (f.required ? '*' : '')).join(', ')}</p>
                    <p className="text-gray-400">* required &nbsp;• Column names can vary — you'll map them on the next step.</p>
                  </div>

                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-3 p-10 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  >
                    <Upload className="h-10 w-10 text-gray-300" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-600">Click to upload CSV</p>
                      <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
                </div>
              )}
            </>
          )}

          {/* ── Step: Map ── */}
          {step === 'map' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Match Columns</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{rawRows.length} rows found in your file</p>
                </div>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>

              <ColumnMapper
                csvHeaders={csvHeaders}
                fields={fields}
                mapping={mapping}
                onChange={setMapping}
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setMapping(autoMatch(csvHeaders, fields)) }} className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Auto-match
                </Button>
                <Button onClick={goToPreview} className="flex-1">
                  Preview import <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Preview</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{mappedRows.length} rows ready to import</p>
                </div>
                <button onClick={() => setStep('map')} className="text-xs text-blue-600 hover:underline">
                  ← Edit mapping
                </button>
              </div>

              <PreviewTable rows={mappedRows} fields={fields} />

              <Button onClick={runImport} disabled={importing} className="w-full">
                {importing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing...</>
                  : `Import ${mappedRows.length} ${config.label}`}
              </Button>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && result && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Import complete</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.imported} imported{result.skipped > 0 ? `, ${result.skipped} skipped (duplicates)` : ''}
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="text-left bg-red-50 rounded-lg p-3 text-xs text-red-700 space-y-1">
                  <p className="font-semibold">Errors:</p>
                  {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={reset}>
                  Import more
                </Button>
                <Button asChild>
                  <a href={`/app/${slug}/${
                    importType === 'customers' ? 'customers'
                      : importType === 'products' ? 'inventory'
                      : importType === 'suppliers' || importType === 'vendor-debts' ? 'vendors'
                      : 'debt-book'
                  }`}>
                    View {config.label}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Import History archive */}
        <HistoryList history={history} />
      </div>
    </div>
  )
}
