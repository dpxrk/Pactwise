'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/app/_components/common/LoadingStates'
import { hasPermission, hasRoleOrHigher, Permission, UserRole } from '@/lib/auth-utils'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requiredPermission?: Permission
  requiredRole?: UserRole
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredPermission,
  requiredRole,
  fallback,
  redirectTo = '/auth/sign-in'
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return // Wait for auth to load

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo)
      return
    }

    if (requiredRole && !hasRoleOrHigher(userProfile?.role, requiredRole)) {
      router.push('/unauthorized')
      return
    }

    if (requiredPermission && !hasPermission(userProfile?.role, requiredPermission)) {
      router.push('/unauthorized')
      return
    }
  }, [
    isAuthenticated,
    isLoading,
    userProfile?.role,
    requireAuth,
    requiredPermission,
    requiredRole,
    router,
    redirectTo
  ])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Not authenticated and requires auth
  if (requireAuth && !isAuthenticated) {
    return fallback || null
  }

  // Missing required permissions
  if (requiredPermission && !hasPermission(userProfile?.role, requiredPermission)) {
    return fallback || null
  }

  if (requiredRole && !hasRoleOrHigher(userProfile?.role, requiredRole)) {
    return fallback || null
  }

  // All checks passed
  return <>{children}</>
}

// Convenience wrapper for admin routes
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="admin" {...props}>
      {children}
    </ProtectedRoute>
  )
}

// Convenience wrapper for manager routes
export function ManagerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="manager" {...props}>
      {children}
    </ProtectedRoute>
  )
}