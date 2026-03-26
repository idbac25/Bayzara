'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Building2, Phone, Mail, MapPin, Plus, TrendingDown, AlertCircle } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  country: string | null
  tax_number: string | null
  notes: string | null
}

interface Purchase {
  id: string
  document_number: string
  date: string
  total: number
  amount_due: number
  status: string
  type: string
}

interface Props {
  vendor: Vendor
  purchases: Purchase[]
  currency: string
  totalPurchased: number
  totalOutstanding: number
  slug: string
}

export function VendorDetailClient({ vendor, purchases, currency, totalPurchased, totalOutstanding, slug }: Props) {
  return (
    <div>
      <PageHeader
        title={vendor.name}
        breadcrumbs={[
          { label: 'Vendors', href: `/app/${slug}/vendors` },
          { label: vendor.name },
        ]}
        action={
          <Button asChild className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Link href={`/app/${slug}/purchases/new?vendor_id=${vendor.id}`}>
              <Plus className="mr-2 h-4 w-4" />New Purchase
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />Vendor Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {vendor.contact_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{vendor.contact_name}</p>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`tel:${vendor.phone}`} className="text-[#0F4C81] hover:underline">{vendor.phone}</a>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={`mailto:${vendor.email}`} className="text-[#0F4C81] hover:underline">{vendor.email}</a>
                </div>
              )}
              {(vendor.address_line1 || vendor.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    {[vendor.address_line1, vendor.city, vendor.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {vendor.tax_number && (
                <div>
                  <p className="text-xs text-muted-foreground">Tax Number</p>
                  <p className="font-mono text-xs">{vendor.tax_number}</p>
                </div>
              )}
              {vendor.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{vendor.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-[#0F4C81]" />
                  <span className="text-xs text-muted-foreground">Purchased</span>
                </div>
                <p className="font-bold text-sm">{formatCurrency(totalPurchased, currency)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Owed</span>
                </div>
                <p className="font-bold text-sm text-amber-600">{formatCurrency(totalOutstanding, currency)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Purchases */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Purchase History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {purchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No purchases yet
                </div>
              ) : (
                <div className="divide-y">
                  {purchases.map(p => (
                    <Link
                      key={p.id}
                      href={`/app/${slug}/purchases/${p.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.document_number}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)} · {p.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={p.status} />
                        <p className="text-sm font-medium">{formatCurrency(p.total, currency)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
