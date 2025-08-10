import { useAuth as useAuthContext } from '@/contexts/AuthContext'

// Re-export the useAuth hook from context for convenience
export { useAuth as default } from '@/contexts/AuthContext'
export { useAuth } from '@/contexts/AuthContext'

// Additional convenience hook for user data
export const useUser = () => {
  const { user, userProfile, isLoading } = useAuthContext()
  
  return {
    user,
    userProfile,
    isLoading,
    isSignedIn: !!user
  }
}

// Hook for auth state checks
export const useAuthState = () => {
  const { isAuthenticated, isLoading, session } = useAuthContext()
  
  return {
    isAuthenticated,
    isLoading,
    session
  }
}