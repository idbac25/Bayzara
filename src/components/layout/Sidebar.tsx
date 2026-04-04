'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBusiness, useFeature } from '@/contexts/BusinessContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, FileText, Receipt, ShoppingCart,
  CreditCard, Store, Package, PieChart, Wallet, Zap, Settings, ShoppingBag,
  ChevronLeft, ChevronRight, UserCheck, FileCheck, FileX, FileOutput,
  BarChart3, Kanban, X, Monitor, UserRound, BookOpen
} from 'lucide-react'

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

function buildNav(slug: string, hasEvc: boolean, hasPos: boolean): NavSection[] {
  const base = `/app/${slug}`
  return [
    {
      items: [
        { label: 'Dashboard', href: base, icon: LayoutDashboard },
      ]
    },
    {
      title: 'SALES',
      items: [
        ...(hasPos ? [{ label: 'POS', href: `${base}/pos`, icon: Monitor }] : []),
        ...(hasPos ? [{ label: 'Customers', href: `${base}/customers`, icon: UserRound }] : []),
        ...(hasPos ? [{ label: 'Debt Book', href: `${base}/debt-book`, icon: BookOpen }] : []),
        { label: 'Clients', href: `${base}/clients`, icon: Users },
        { label: 'Quotations', href: `${base}/quotations`, icon: FileText },
        { label: 'Invoices', href: `${base}/invoices`, icon: Receipt },
      ]
    },
    {
      title: 'PURCHASES',
      items: [
        { label: 'Vendors', href: `${base}/vendors`, icon: Store },
        { label: 'Purchases & Bills', href: `${base}/purchases`, icon: ShoppingCart },
      ]
    },
    {
      title: 'CRM',
      items: [
        { label: 'Leads', href: `${base}/leads`, icon: Kanban },
        { label: 'Pipelines', href: `${base}/leads/pipelines`, icon: BarChart3 },
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        ...(hasPos ? [{ label: 'Products', href: `${base}/products`, icon: ShoppingBag }] : []),
        { label: 'Items', href: `${base}/inventory`, icon: Package },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { label: 'Reports', href: `${base}/reports`, icon: PieChart },
      ]
    },
    {
      title: 'FINANCE',
      items: [
        { label: 'Bank & Payments', href: `${base}/bank-accounts`, icon: Wallet },
        { label: 'EVC Plus', href: `${base}/evc`, icon: Zap, badge: hasEvc ? 'live' : undefined },
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        { label: 'Settings', href: `${base}/settings`, icon: Settings },
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

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const hasEvc = !!(business as unknown as Record<string, unknown>).has_evc
  const nav = buildNav(business.slug, hasEvc, hasPos)

  const isActive = (href: string) => {
    if (href === `/app/${business.slug}`) return pathname === href
    return pathname.startsWith(href)
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

      {/* Plan badge */}
      {(!collapsed || mobile) && (
        <div className="p-3 border-t border-white/10">
          <div className="bg-white/10 rounded-md px-3 py-2 text-xs text-white/60">
            <span className="uppercase font-semibold text-white/40 text-[10px]">Plan</span>
            <p className="font-medium text-white capitalize">{business.plan}</p>
          </div>
        </div>
      )}
    </div>
  )
}
