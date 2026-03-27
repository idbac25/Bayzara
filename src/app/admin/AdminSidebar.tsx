'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Zap, CreditCard,
  Shield, Megaphone, Activity, Settings, ArrowLeft, ChevronRight
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',     href: '/admin',                icon: LayoutDashboard },
  { label: 'Businesses',    href: '/admin/businesses',     icon: Building2 },
  { label: 'Users',         href: '/admin/users',          icon: Users },
  { label: 'Roles',         href: '/admin/roles',          icon: Shield },
  { label: 'Plans',         href: '/admin/plans',          icon: CreditCard },
  { label: 'EVC',           href: '/admin/evc',            icon: Zap },
  { label: 'Announcements', href: '/admin/announcements',  icon: Megaphone },
  { label: 'Activity Log',  href: '/admin/activity',       icon: Activity },
  { label: 'Settings',      href: '/admin/settings',       icon: Settings },
]

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-56 shrink-0 bg-[#0a2747] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0F4C81, #1a6db5)' }}
          >
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none">Bayzara</p>
            <span className="text-[10px] font-semibold text-[#F5A623] uppercase tracking-wider">Admin</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? 'bg-[#0F4C81] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-white/40 group-hover:text-white/80'}`} />
              {item.label}
              {active && <ChevronRight className="h-3 w-3 ml-auto text-white/40" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <p className="text-xs text-white/40 truncate">{adminName}</p>
        <Link
          href="/app"
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
