'use client'

import { User, Session, AuthError } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'

import { createClient } from '@/utils/supabase/client'
import { Tables } from '@/types/database.types'
import { isPublicEmailDomain, generateEnterpriseName } from '@/lib/email-domain-validator'

interface AuthContextType {
  // Auth state
  user: User | null
  userProfile: Tables<'users'> | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Auth methods
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ user: User | null; error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  
  // Profile methods
  updateProfile: (updates: Partial<Tables<'users'>>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<Tables<'users'> | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create supabase client once - memoized to prevent recreation
  const supabase = useMemo(() => createClient(), [])

  // Fetch user profile from our custom users table - memoized to prevent recreation
  const fetchUserProfile = useCallback(async (authUserId: string): Promise<Tables<'users'> | null> => {
    try {
      // First try to fetch by auth_id (correct field name)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .single()

      if (error) {
        console.log('User profile fetch error:', error.code, error.message)
        // If user profile doesn't exist, we need to create enterprise first, then user
        if (error.code === 'PGRST116') {
          console.log('Profile not found, setting up new user...')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Use the database function to set up the user
            const { data: setupResult, error: setupError } = await supabase
              .rpc('setup_new_user', {
                p_auth_id: user.id,
                p_email: user.email || '',
                p_first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
                p_last_name: user.user_metadata?.full_name?.split(' ')[1] || '',
                p_metadata: { source: 'web_signup' }
              })
              
            if (setupError) {
              console.error('Error setting up user:', setupError.message, setupError.details, setupError.hint)
              return null
            }
            
            console.log('User setup complete:', setupResult)
            
            // Now fetch the created profile
            const { data: newProfile } = await supabase
              .from('users')
              .select('*')
              .eq('auth_id', user.id)
              .single()
              
            if (newProfile) {
              console.log('Profile created successfully:', newProfile)
              return newProfile
            }
          }
        }
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        console.log('Initial session:', initialSession?.user?.email)
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user) {
          console.log('Fetching user profile for:', initialSession.user.id)
          const profile = await fetchUserProfile(initialSession.user.id)
          console.log('Profile fetched:', profile)
          setUserProfile(profile)
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error initializing auth:', error)
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile])

  // Auth methods
  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      // If signup successful and user created, create user profile
      if (data.user && !error) {
        const email = data.user.email || ''
        const isPublicDomain = isPublicEmailDomain(email)
        const domain = email.split('@')[1] || null
        
        // Check if there's an existing enterprise for this domain (only for non-public domains)
        let enterpriseId = crypto.randomUUID()
        let isNewEnterprise = true
        let userRole = 'owner' // Default role for new enterprises
        
        if (!isPublicDomain && domain) {
          // Try to find existing enterprise with this domain
          const { data: existingEnterprise } = await supabase
            .from('enterprises')
            .select('id, name')
            .eq('domain', domain)
            .is('deleted_at', null)
            .single()
          
          if (existingEnterprise) {
            enterpriseId = existingEnterprise.id
            isNewEnterprise = false
            userRole = 'viewer' // New users joining existing enterprise start as viewers
          }
        }
        
        // Create enterprise only if it doesn't exist
        if (isNewEnterprise) {
          const { error: entError } = await supabase
            .from('enterprises')
            .insert({
              id: enterpriseId,
              name: generateEnterpriseName(email, metadata),
              domain: isPublicDomain ? null : domain, // Only set domain for corporate emails
              industry: metadata?.industry || 'Technology',
              size: metadata?.company_size || 'Small',
              contract_volume: 0,
              primary_use_case: metadata?.use_case || 'Contract Management',
              settings: { 
                demo: true,
                is_personal: isPublicDomain
              },
              metadata: { created_via: 'signup' }
            })

        if (entError) {
          console.error('Error creating enterprise:', entError.message, entError.details, entError.hint)
        }

          if (entError) {
            console.error('Error creating enterprise:', entError.message, entError.details, entError.hint)
          }
        }
        
        // Create user profile in our users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_id: data.user.id,
            email: data.user.email || '',
            first_name: metadata?.first_name || metadata?.full_name?.split(' ')[0] || '',
            last_name: metadata?.last_name || metadata?.full_name?.split(' ')[1] || '',
            enterprise_id: enterpriseId,
            role: userRole,
            department: metadata?.department,
            title: metadata?.title
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }

      return { user: data.user, error }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      // IMPORTANT: Set rememberMe BEFORE signing in so the cookie handler and middleware can extend session duration
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        // Set a cookie with 30-day expiry so middleware can read it and extend auth session cookies
        const isProduction = process.env.NODE_ENV === 'production'
        const secureFlag = isProduction ? '; Secure' : ''
        document.cookie = `rememberMe=true; Path=/; Max-Age=2592000; SameSite=Lax${secureFlag}`
      } else {
        localStorage.removeItem('rememberMe')
        // Clear the cookie by setting Max-Age=0
        document.cookie = `rememberMe=false; Path=/; Max-Age=0; SameSite=Lax`
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      return { user: data.user, error }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      // Clear the loading screen session storage so it shows on next sign-in
      // Clear all keys that start with 'hasShownDataLoading'
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('hasShownDataLoading')) {
          sessionStorage.removeItem(key)
        }
      })

      // Clear rememberMe preference
      localStorage.removeItem('rememberMe')
      document.cookie = `rememberMe=false; Path=/; Max-Age=0; SameSite=Lax`

      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  const updateProfile = async (updates: Partial<Tables<'users'>>) => {
    if (!user) {
      return { error: new Error('No authenticated user') }
    }

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_id', user.id)

      if (!error) {
        // Refresh profile
        await refreshProfile()
      }

      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id)
      setUserProfile(profile)
    }
  }

  const value: AuthContextType = {
    // State
    user,
    userProfile,
    session,
    isLoading,
    isAuthenticated: !!user,
    
    // Methods
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}