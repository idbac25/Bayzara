'use client'

import { createContext, useContext } from 'react'
import type { Business, UserRole } from '@/types/database'

interface BusinessContextType {
  business: Business
  userRole: UserRole
}

export const BusinessContext = createContext<BusinessContextType | null>(null)

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider')
  return ctx
}
