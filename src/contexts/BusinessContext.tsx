'use client'

import { createContext, useContext } from 'react'
import type { Business, UserRole } from '@/types/database'
import { canCreate, canEdit, canDelete, canManageSettings, canManageTeam } from '@/lib/permissions'
import { hasFeature, type FeatureKey } from '@/lib/features'

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

export function useRole() {
  const { userRole } = useBusiness()
  return {
    role: userRole,
    canCreate: canCreate(userRole),
    canEdit: canEdit(userRole),
    canDelete: canDelete(userRole),
    canManageSettings: canManageSettings(userRole),
    canManageTeam: canManageTeam(userRole),
    isOwner: userRole === 'super_admin',
  }
}

export function useFeature(key: FeatureKey): boolean {
  const { business } = useBusiness()
  return hasFeature(business.features, key)
}
