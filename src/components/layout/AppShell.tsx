'use client'

import { useState } from 'react'
import { BusinessContext } from '@/contexts/BusinessContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { Business, UserRole } from '@/types/database'
import { Toaster } from '@/components/ui/sonner'
import { User } from '@supabase/supabase-js'

interface AppShellProps {
  business: Business
  userRole: UserRole
  user: User
  businesses: Array<{ slug: string; name: string; logo_url?: string; plan: string }>
  children: React.ReactNode
}

export function AppShell({ business, userRole, user, businesses, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <BusinessContext.Provider value={{ business, userRole }}>
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-60">
              <Sidebar mobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            onMenuClick={() => setMobileOpen(true)}
            user={user}
            businesses={businesses}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </BusinessContext.Provider>
  )
}
