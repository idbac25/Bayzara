import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default async function AdminBusinessesPage() {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select(`
      id, name, slug, plan, currency, country, created_at, email, phone,
      business_users(count),
      documents(count)
    `)
    .order('created_at', { ascending: false })

  // Get invoice totals per business
  const { data: invoiceTotals } = await supabase
    .from('documents')
    .select('business_id, total')
    .eq('type', 'invoice')
    .is('deleted_at', null)

  const totalByBiz: Record<string, number> = {}
  invoiceTotals?.forEach(inv => {
    totalByBiz[inv.business_id] = (totalByBiz[inv.business_id] ?? 0) + inv.total
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-[#0F4C81]" /> All Businesses
        </h1>
        <p className="text-white/50 text-sm mt-1">{businesses?.length ?? 0} total businesses on the platform</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3">Business</th>
              <th className="text-left px-5 py-3">Plan</th>
              <th className="text-left px-5 py-3">Country</th>
              <th className="text-right px-5 py-3">Users</th>
              <th className="text-right px-5 py-3">Invoices</th>
              <th className="text-right px-5 py-3">Volume</th>
              <th className="text-left px-5 py-3">Joined</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(businesses ?? []).map(biz => {
              const userCount = Array.isArray(biz.business_users)
                ? biz.business_users.length
                : (biz.business_users as unknown as { count: number })?.count ?? 0
              const docCount = Array.isArray(biz.documents)
                ? biz.documents.length
                : (biz.documents as unknown as { count: number })?.count ?? 0
              const volume = totalByBiz[biz.id] ?? 0

              return (
                <tr key={biz.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium">{biz.name}</p>
                    <p className="text-white/40 text-xs">{biz.slug}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      biz.plan === 'pro' ? 'bg-[#F5A623]/20 text-[#F5A623]' :
                      biz.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-white/10 text-white/50'
                    }`}>{biz.plan}</span>
                  </td>
                  <td className="px-5 py-3 text-white/60">{biz.country ?? '—'}</td>
                  <td className="px-5 py-3 text-right text-white/60">{userCount}</td>
                  <td className="px-5 py-3 text-right text-white/60">{docCount}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {volume > 0 ? formatCurrency(volume, biz.currency ?? 'USD') : '—'}
                  </td>
                  <td className="px-5 py-3 text-white/40 text-xs">
                    {new Date(biz.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/${biz.slug}`}
                      className="text-xs text-[#0F4C81] hover:text-blue-400"
                      target="_blank"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(businesses ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-white/30">No businesses yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
