'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBusiness } from '@/contexts/BusinessContext'
import { createClient } from '@/lib/supabase/client'
import { Menu, ChevronDown, LogOut, User, Settings, Plus, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface TopBarProps {
  onMenuClick: () => void
  user: { id: string; email?: string; user_metadata?: { full_name?: string; avatar_url?: string } }
  businesses: Array<{ slug: string; name: string; logo_url?: string; plan: string }>
  unreadCount?: number
}

export function TopBar({ onMenuClick, user, businesses, unreadCount = 0 }: TopBarProps) {
  const { business } = useBusiness()
  const router = useRouter()
  const [showBizSwitcher, setShowBizSwitcher] = useState(false)

  const initials = (user.user_metadata?.full_name ?? user.email ?? 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4 gap-4 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="text-muted-foreground hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Business switcher */}
        <button
          onClick={() => setShowBizSwitcher(!showBizSwitcher)}
          className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-[#0F4C81] transition-colors"
        >
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt={business.name} className="h-6 w-6 rounded object-cover" />
          ) : (
            <div className="h-6 w-6 rounded bg-[#0F4C81] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{business.name[0]}</span>
            </div>
          )}
          <span className="max-w-[180px] truncate">{business.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Business switcher dropdown */}
      {showBizSwitcher && (
        <div
          className="absolute top-14 left-0 right-0 md:left-4 md:right-auto md:w-72 z-50 bg-white border rounded-lg shadow-lg p-2"
          onMouseLeave={() => setShowBizSwitcher(false)}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1 mb-1">
            Your Businesses
          </p>
          {businesses.map(biz => (
            <Link
              key={biz.slug}
              href={`/app/${biz.slug}`}
              onClick={() => setShowBizSwitcher(false)}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
            >
              {biz.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={biz.logo_url} alt={biz.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="h-8 w-8 rounded bg-[#0F4C81] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{biz.name[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{biz.name}</p>
                <Badge variant="outline" className="text-[10px] capitalize">{biz.plan}</Badge>
              </div>
              {biz.slug === business.slug && <Check className="h-4 w-4 text-[#27AE60]" />}
            </Link>
          ))}
          <div className="border-t mt-1 pt-1">
            <Link
              href="/onboarding"
              onClick={() => setShowBizSwitcher(false)}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Business
            </Link>
          </div>
        </div>
      )}

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-[#0F4C81]/20 transition-all">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-[#0F4C81] text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user.user_metadata?.full_name ?? 'User'}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/app/${business.slug}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
