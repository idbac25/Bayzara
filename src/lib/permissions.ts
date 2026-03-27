import type { UserRole } from '@/types/database'

const RANK: Record<UserRole, number> = {
  viewer: 0,
  sales: 1,
  accountant: 2,
  manager: 3,
  admin: 4,
  super_admin: 5,
}

export const canCreate = (role: UserRole): boolean => RANK[role] >= 1
export const canEdit = (role: UserRole): boolean => RANK[role] >= 2
export const canDelete = (role: UserRole): boolean => RANK[role] >= 4
export const canManageSettings = (role: UserRole): boolean => RANK[role] >= 4
export const canManageTeam = (role: UserRole): boolean => role === 'super_admin'
