import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Mail, Phone, MapPin, FileText, TrendingUp, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, currency')
    .eq('slug', slug)
    .single()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('business_id', business?.id)
    .single()

  if (!client) notFound()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, type, document_number, date, total, amount_due, status')
    .eq('client_id', id)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(50)

  const totalInvoiced = documents?.filter(d => d.type === 'invoice').reduce((s, d) => s + d.total, 0) ?? 0
  const totalOutstanding = documents?.filter(d => d.type === 'invoice').reduce((s, d) => s + d.amount_due, 0) ?? 0
  const currency = business?.currency ?? 'USD'

  return (
    <div>
      <PageHeader
        title={client.name}
        breadcrumbs={[
          { label: 'Clients', href: `/app/${slug}/clients` },
          { label: client.name },
        ]}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/${slug}/invoices/new?client_id=${client.id}`}>
                <FileText className="mr-2 h-4 w-4" />Create Invoice
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0F4C81]" />
              <span className="text-xs text-muted-foreground uppercase font-medium">Total Invoiced</span>
            </div>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalInvoiced, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground uppercase font-medium">Outstanding</span>
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{formatCurrency(totalOutstanding, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase font-medium">Documents</span>
            </div>
            <p className="text-xl font-bold mt-1">{documents?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{client.type}</Badge>
              {client.industry && <Badge variant="secondary">{client.industry}</Badge>}
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:text-[#0F4C81]">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.evc_phone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#F5A623] font-bold text-xs">EVC</span>
                <span>{client.evc_phone}</span>
              </div>
            )}
            {(client.address_line1 || client.city) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {client.address_line1 && <p>{client.address_line1}</p>}
                  {client.city && <p>{[client.city, client.country].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
            )}
            {client.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Added {formatDate(client.created_at)}
            </div>
          </CardContent>
        </Card>

        {/* Activity/Invoices */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="invoices">
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="all">All Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {documents?.filter(d => d.type === 'invoice').length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-sm">No invoices for this client yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {documents?.filter(d => d.type === 'invoice').map(doc => (
                        <Link
                          key={doc.id}
                          href={`/app/${slug}/invoices/${doc.id}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium">{doc.document_number}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(doc.date)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={doc.status} />
                            <p className="text-sm font-semibold">{formatCurrency(doc.total, currency)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {(!documents || documents.length === 0) ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="text-sm">No documents yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {documents?.map(doc => (
                        <Link
                          key={doc.id}
                          href={`/app/${slug}/${doc.type.replace('_', '-')}s/${doc.id}`}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {doc.type.replace(/_/g, ' ')}
                              </Badge>
                              <p className="text-sm font-medium">{doc.document_number}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(doc.date)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={doc.status} />
                            <p className="text-sm font-semibold">{formatCurrency(doc.total, currency)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
