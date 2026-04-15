'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness, useFeature } from '@/contexts/BusinessContext'
import { useLanguage, useT } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, FileText, Receipt, ShoppingCart,
  Store, Package, PieChart, Wallet, Zap, Settings, ShoppingBag,
  ChevronLeft, ChevronRight, BarChart3, Kanban, X, Monitor,
  UserRound, BookOpen, UserCog, ClipboardCheck, RefreshCw
} from 'lucide-react'
import type { Translations } from '@/lib/i18n'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

interface NavSection {
  title?: string
  items: NavItem[]
}

function buildShopNav(slug: string, hasEvc: boolean, t: Translations): NavSection[] {
  const base = `/app/${slug}`
  return [
    {
      items: [
        { label: t.nav.dashboard, href: base, icon: LayoutDashboard },
      ]
    },
    {
      title: t.nav.sales,
      items: [
        { label: t.nav.pos, href: `${base}/pos`, icon: Monitor },
        { label: t.nav.customers, href: `${base}/customers`, icon: UserRound },
        { label: t.nav.debtBook, href: `${base}/debt-book`, icon: BookOpen },
      ]
    },
    {
      title: t.nav.inventory,
      items: [
        { label: t.nav.products, href: `${base}/products`, icon: ShoppingBag },
        { label: t.nav.stock, href: `${base}/inventory`, icon: Package },
        { label: t.nav.restock, href: `${base}/restocks`, icon: RefreshCw },
        { label: t.nav.suppliers, href: `${base}/vendors`, icon: Store },
      ]
    },
    {
      title: t.nav.operations,
      items: [
        { label: t.nav.reconciliation, href: `${base}/reconciliation`, icon: ClipboardCheck },
        { label: t.nav.staff, href: `${base}/staff`, icon: UserCog },
      ]
    },
    {
      title: t.nav.finance,
      items: [
        { label: t.nav.evcPlus, href: `${base}/evc`, icon: Zap, badge: hasEvc ? 'live' : undefined },
      ]
    },
    {
      title: t.nav.settings_section,
      items: [
        { label: t.nav.settings, href: `${base}/settings`, icon: Settings },
      ]
    },
  ]
}

function buildB2BNav(slug: string, hasEvc: boolean, t: Translations): NavSection[] {
  const base = `/app/${slug}`
  return [
    {
      items: [
        { label: t.nav.dashboard, href: base, icon: LayoutDashboard },
      ]
    },
    {
      title: t.nav.sales,
      items: [
        { label: t.nav.clients, href: `${base}/clients`, icon: Users },
        { label: t.nav.quotations, href: `${base}/quotations`, icon: FileText },
        { label: t.nav.invoices, href: `${base}/invoices`, icon: Receipt },
      ]
    },
    {
      title: t.nav.purchases,
      items: [
        { label: t.nav.vendors, href: `${base}/vendors`, icon: Store },
        { label: t.nav.purchasesAndBills, href: `${base}/purchases`, icon: ShoppingCart },
      ]
    },
    {
      title: t.nav.crm,
      items: [
        { label: t.nav.leads, href: `${base}/leads`, icon: Kanban },
        { label: t.nav.pipelines, href: `${base}/leads/pipelines`, icon: BarChart3 },
      ]
    },
    {
      title: t.nav.inventory,
      items: [
        { label: t.nav.items, href: `${base}/inventory`, icon: Package },
      ]
    },
    {
      title: t.nav.finance,
      items: [
        { label: t.nav.reports, href: `${base}/reports`, icon: PieChart },
        { label: t.nav.bankAndPayments, href: `${base}/bank-accounts`, icon: Wallet },
        { label: t.nav.evcPlus, href: `${base}/evc`, icon: Zap, badge: hasEvc ? 'live' : undefined },
      ]
    },
    {
      title: t.nav.settings_section,
      items: [
        { label: t.nav.settings, href: `${base}/settings`, icon: Settings },
      ]
    },
  ]
}

function buildAllNav(slug: string, hasEvc: boolean, hasPos: boolean, t: Translations): NavSection[] {
  const base = `/app/${slug}`
  return [
    {
      items: [
        { label: t.nav.dashboard, href: base, icon: LayoutDashboard },
      ]
    },
    {
      title: t.nav.sales,
      items: [
        ...(hasPos ? [{ label: t.nav.pos, href: `${base}/pos`, icon: Monitor }] : []),
        ...(hasPos ? [{ label: t.nav.customers, href: `${base}/customers`, icon: UserRound }] : []),
        ...(hasPos ? [{ label: t.nav.debtBook, href: `${base}/debt-book`, icon: BookOpen }] : []),
        { label: t.nav.clients, href: `${base}/clients`, icon: Users },
        { label: t.nav.quotations, href: `${base}/quotations`, icon: FileText },
        { label: t.nav.invoices, href: `${base}/invoices`, icon: Receipt },
      ]
    },
    {
      title: t.nav.purchases,
      items: [
        { label: t.nav.vendors, href: `${base}/vendors`, icon: Store },
        { label: t.nav.purchasesAndBills, href: `${base}/purchases`, icon: ShoppingCart },
      ]
    },
    {
      title: t.nav.crm,
      items: [
        { label: t.nav.leads, href: `${base}/leads`, icon: Kanban },
        { label: t.nav.pipelines, href: `${base}/leads/pipelines`, icon: BarChart3 },
      ]
    },
    {
      title: t.nav.inventory,
      items: [
        ...(hasPos ? [{ label: t.nav.products, href: `${base}/products`, icon: ShoppingBag }] : []),
        { label: t.nav.items, href: `${base}/inventory`, icon: Package },
        ...(hasPos ? [{ label: t.nav.restock, href: `${base}/restocks`, icon: RefreshCw }] : []),
        ...(hasPos ? [{ label: t.nav.suppliers, href: `${base}/vendors`, icon: Store }] : []),
      ]
    },
    {
      title: t.nav.operations,
      items: [
        ...(hasPos ? [{ label: t.nav.reconciliation, href: `${base}/reconciliation`, icon: ClipboardCheck }] : []),
        { label: t.nav.staff, href: `${base}/staff`, icon: UserCog },
      ]
    },
    {
      title: t.nav.finance,
      items: [
        { label: t.nav.reports, href: `${base}/reports`, icon: PieChart },
        { label: t.nav.bankAndPayments, href: `${base}/bank-accounts`, icon: Wallet },
        { label: t.nav.evcPlus, href: `${base}/evc`, icon: Zap, badge: hasEvc ? 'live' : undefined },
      ]
    },
    {
      title: t.nav.settings_section,
      items: [
        { label: t.nav.settings, href: `${base}/settings`, icon: Settings },
      ]
    },
  ]
}

interface SidebarProps {
  onClose?: () => void
  mobile?: boolean
}

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const { business } = useBusiness()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const hasPos = useFeature('pos')
  const hasEvc = !!(business as unknown as Record<string, unknown>).has_evc
  const { language, setLanguage } = useLanguage()
  const t = useT()

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const mode = business.mode ?? 'shop'
  const nav =
    mode === 'b2b' ? buildB2BNav(business.slug, hasEvc, t) :
    mode === 'all' ? buildAllNav(business.slug, hasEvc, hasPos, t) :
    buildShopNav(business.slug, hasEvc, t)

  const isActive = (href: string) => {
    const cleanHref = href.split('?')[0]
    if (cleanHref === `/app/${business.slug}`) return pathname === cleanHref
    return pathname.startsWith(cleanHref)
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-[#1a2744] text-white transition-all duration-200',
      collapsed && !mobile ? 'w-16' : 'w-60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-sm truncate">{business.name}</span>
          </div>
        )}
        {collapsed && !mobile && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto" style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}>
            <span className="text-white font-bold text-sm">B</span>
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="text-white/60 hover:text-white ml-auto">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleCollapse}
            className="text-white/60 hover:text-white p-0.5 rounded ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {nav.map((section, si) => (
          <div key={si} className="mt-2">
            {section.title && (!collapsed || mobile) && (
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-2 mb-1 mt-3">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={mobile ? onClose : undefined}
                  title={collapsed && !mobile ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-white/15 text-white border-l-2 border-[#F5A623]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-[#F5A623]')} />
                  {(!collapsed || mobile) && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge === 'live' && (
                        <span className="ml-auto text-[10px] bg-[#F5A623] text-black px-1.5 py-0.5 rounded-full font-semibold">
                          LIVE
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: language toggle + plan badge */}
      <div className="border-t border-white/10">
        {/* Language toggle */}
        <div className={cn('px-3 pt-3', collapsed && !mobile ? 'flex justify-center' : '')}>
          {(!collapsed || mobile) ? (
            <div className="flex items-center gap-1 bg-white/10 rounded-md p-1">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  'flex-1 text-xs font-semibold py-1 rounded transition-colors',
                  language === 'en'
                    ? 'bg-white text-[#1a2744]'
                    : 'text-white/50 hover:text-white'
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('so')}
                className={cn(
                  'flex-1 text-xs font-semibold py-1 rounded transition-colors',
                  language === 'so'
                    ? 'bg-white text-[#1a2744]'
                    : 'text-white/50 hover:text-white'
                )}
              >
                SO
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLanguage(language === 'en' ? 'so' : 'en')}
              title={language === 'en' ? 'Switch to Somali' : 'Switch to English'}
              className="text-white/50 hover:text-white text-xs font-bold"
            >
              {language.toUpperCase()}
            </button>
          )}
        </div>

        {/* Plan badge */}
        {(!collapsed || mobile) && (
          <div className="p-3">
            <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/60">
              <span className="uppercase font-semibold text-white/40 text-[10px]">Plan</span>
              <p className="font-medium text-white capitalize">{business.plan}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
