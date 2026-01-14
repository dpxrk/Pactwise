import { User } from '@supabase/supabase-js'

import { Tables } from '@/types/database.types'

export type UserRole = 'owner' | 'admin' | 'manager' | 'user' | 'viewer'

// Permission types for different operations
export type Permission = 
  // Contract permissions
  | 'contracts:view'
  | 'contracts:create' 
  | 'contracts:edit:own'
  | 'contracts:edit:all'
  | 'contracts:delete'
  // Vendor permissions
  | 'vendors:view'
  | 'vendors:create'
  | 'vendors:edit'
  | 'vendors:delete'
  // Budget permissions
  | 'budgets:view'
  | 'budgets:create'
  | 'budgets:edit'
  | 'budgets:delete'
  // Analytics permissions
  | 'analytics:view'
  | 'analytics:export'
  // Admin permissions
  | 'admin:users:view'
  | 'admin:users:manage'
  | 'admin:enterprise:manage'
  | 'admin:system:manage'

// Role hierarchy (higher roles inherit permissions from lower roles)
const roleHierarchy: Record<UserRole, number> = {
  'viewer': 1,
  'user': 2,
  'manager': 3,
  'admin': 4,
  'owner': 5
}

// Permission matrix - what each role can do
const rolePermissions: Record<UserRole, Permission[]> = {
  'viewer': [
    'contracts:view',
    'vendors:view',
    'budgets:view',
    'analytics:view'
  ],
  'user': [
    'contracts:view',
    'contracts:create',
    'contracts:edit:own',
    'vendors:view',
    'vendors:create',
    'budgets:view',
    'analytics:view'
  ],
  'manager': [
    'contracts:view',
    'contracts:create',
    'contracts:edit:own',
    'contracts:edit:all',
    'vendors:view',
    'vendors:create',
    'vendors:edit',
    'budgets:view',
    'budgets:create',
    'budgets:edit',
    'analytics:view',
    'analytics:export'
  ],
  'admin': [
    'contracts:view',
    'contracts:create',
    'contracts:edit:own',
    'contracts:edit:all',
    'contracts:delete',
    'vendors:view',
    'vendors:create',
    'vendors:edit',
    'vendors:delete',
    'budgets:view',
    'budgets:create',
    'budgets:edit',
    'budgets:delete',
    'analytics:view',
    'analytics:export',
    'admin:users:view',
    'admin:users:manage',
    'admin:enterprise:manage'
  ],
  'owner': [
    'contracts:view',
    'contracts:create',
    'contracts:edit:own',
    'contracts:edit:all',
    'contracts:delete',
    'vendors:view',
    'vendors:create',
    'vendors:edit',
    'vendors:delete',
    'budgets:view',
    'budgets:create',
    'budgets:edit',
    'budgets:delete',
    'analytics:view',
    'analytics:export',
    'admin:users:view',
    'admin:users:manage',
    'admin:enterprise:manage',
    'admin:system:manage'
  ]
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userRole: UserRole | null | undefined,
  permission: Permission
): boolean {
  if (!userRole) return false
  
  const permissions = rolePermissions[userRole] || []
  return permissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userRole: UserRole | null | undefined,
  permissions: Permission[]
): boolean {
  if (!userRole) return false
  
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userRole: UserRole | null | undefined,
  permissions: Permission[]
): boolean {
  if (!userRole) return false
  
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Check if a role is equal to or higher than another role
 */
export function hasRoleOrHigher(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || []
}

/**
 * Get user display name with fallbacks
 */
export function getUserDisplayName(
  user: User | null,
  userProfile: Tables<'users'> | null
): string {
  // Combine first_name and last_name for display name
  if (userProfile?.first_name || userProfile?.last_name) {
    return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
  }

  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  if (user?.email) {
    return user.email.split('@')[0]
  }

  return 'Unknown User'
}

/**
 * Get user avatar URL with fallbacks
 */
export function getUserAvatarUrl(
  user: User | null,
  userProfile: Tables<'users'> | null
): string | null {
  // Check metadata for avatar_url
  if ((userProfile as any)?.avatar_url) {
    return (userProfile as any).avatar_url
  }

  if (user?.user_metadata?.avatar_url) {
    return user.user_metadata.avatar_url
  }
  
  return null
}

/**
 * Check if user is authenticated and has a valid session
 */
export function isAuthenticated(user: User | null): boolean {
  return !!user && !!user.id
}

/**
 * Format user role for display
 */
export function formatUserRole(role: UserRole): string {
  const roleLabels: Record<UserRole, string> = {
    'viewer': 'Viewer',
    'user': 'User',
    'manager': 'Manager',
    'admin': 'Administrator',
    'owner': 'Owner'
  }
  
  return roleLabels[role] || 'Unknown'
}