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
  profileError: Error | null // NEW: Track profile fetch errors

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
  const [profileError, setProfileError] = useState<Error | null>(null)

  // Create supabase client once - memoized to prevent recreation
  const supabase = useMemo(() => createClient(), [])

  // Request deduplication and caching
  const profileCache = useMemo(() => new Map<string, { data: Tables<'users'> | null; timestamp: number }>(), [])
  const inFlightRequests = useMemo(() => new Map<string, Promise<Tables<'users'> | null>>(), [])
  const CACHE_TTL = 60000 // 60 seconds cache

  // Fetch user profile from our custom users table - memoized to prevent recreation
  const fetchUserProfile = useCallback(async (authUserId: string, isPublicPage = false): Promise<Tables<'users'> | null> => {
    const startTime = Date.now()
    try {
      // Guard against null/undefined auth_id
      if (!authUserId) {
        if (!isPublicPage) {
          console.warn('[AuthContext] fetchUserProfile called with invalid auth_id:', authUserId)
        }
        return null
      }

      // Check cache first
      const cached = profileCache.get(authUserId)
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - startTime}ms] Cache HIT for auth_id:`, authUserId)
        }
        return cached.data
      }

      // Check if request is already in flight (deduplication)
      const inFlight = inFlightRequests.get(authUserId)
      if (inFlight) {
        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - startTime}ms] Request already in flight, reusing promise for:`, authUserId)
        }
        return await inFlight
      }

      if (!isPublicPage) {
        console.log(`[AuthContext] [${Date.now() - startTime}ms] Fetching profile for auth_id:`, authUserId)
      }

      // Create the fetch promise and store it (deduplication)
      const fetchPromise = (async () => {
        try {
          // Quick health check to verify Supabase is responding - faster timeout for public pages
          const healthTimeout = isPublicPage ? 500 : 3000 // Increased timeout from 1000ms to 3000ms
          const { error: healthError } = await Promise.race([
            supabase.from('users').select('count').limit(0),
            new Promise<{ error: any }>((resolve) => setTimeout(() => resolve({ error: { code: 'HEALTH_TIMEOUT' } }), healthTimeout))
          ])

          if (healthError && healthError.code === 'HEALTH_TIMEOUT') {
            if (!isPublicPage) {
              console.warn(`[AuthContext] [${Date.now() - startTime}ms] Supabase health check TIMEOUT - continuing anyway`)
            }
            // Don't return null - continue with the actual profile fetch
          } else if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - startTime}ms] Supabase health check OK`)
          }

      // First try to fetch by auth_id (correct field name)
      if (!isPublicPage) {
        console.log(`[AuthContext] [${Date.now() - startTime}ms] Starting database query...`)
      }

      // Add timeout to the query - much faster for public pages
      const queryTimeout = isPublicPage ? 1000 : 10000 // Increased to 10s for initial queries
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUserId)
        .single()

      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          if (!isPublicPage) {
            console.error(`[AuthContext] [${Date.now() - startTime}ms] Query TIMEOUT after ${queryTimeout}ms!`)
          }
          resolve({ data: null, error: { code: 'TIMEOUT', message: `Query timeout after ${queryTimeout}ms` } })
        }, queryTimeout)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (!isPublicPage) {
        console.log(`[AuthContext] [${Date.now() - startTime}ms] Query completed`, { hasData: !!data, hasError: !!error, errorCode: error?.code })
      }

      if (error) {
        // Extract error properties safely
        const errorDetails = {
          code: error?.code || 'UNKNOWN',
          message: error?.message || 'No error message',
          details: error?.details || null,
          hint: error?.hint || null,
          name: error?.name || null
        }

        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - startTime}ms] User profile fetch error:`, errorDetails)
        }

        // If user profile doesn't exist, we need to create enterprise first, then user
        if (error.code === 'PGRST116') {
          if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - startTime}ms] Profile not found (PGRST116), setting up new user...`)
          }
          const { data: { user } } = await supabase.auth.getUser()
          if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - startTime}ms] Got user from auth:`, user?.id)
          }
          if (user) {
            // Use the database function to set up the user
            if (!isPublicPage) {
              console.log(`[AuthContext] [${Date.now() - startTime}ms] Calling setup_new_user RPC...`)
            }
            const { data: setupResult, error: setupError } = await supabase
              .rpc('setup_new_user', {
                p_auth_id: user.id,
                p_email: user.email || '',
                p_first_name: user.user_metadata?.full_name?.split(' ')[0] || '',
                p_last_name: user.user_metadata?.full_name?.split(' ')[1] || '',
                p_metadata: { source: 'web_signup' }
              } as any)

            if (!isPublicPage) {
              console.log(`[AuthContext] [${Date.now() - startTime}ms] RPC call completed`)
            }

            if (setupError) {
              if (!isPublicPage) {
                console.error(`[AuthContext] [${Date.now() - startTime}ms] Error setting up user:`, {
                  message: setupError.message,
                  details: setupError.details,
                  hint: setupError.hint,
                  code: setupError.code
                })
              }
              return null
            }

            if (!isPublicPage) {
              console.log(`[AuthContext] [${Date.now() - startTime}ms] User setup complete:`, setupResult)
            }

            // The setup_new_user RPC returns the user data directly, so we can use that
            // instead of fetching again
            if (setupResult && setupResult.length > 0) {
              const setupData = setupResult[0]
              if (!isPublicPage) {
                console.log(`[AuthContext] [${Date.now() - startTime}ms] Using profile data from setup_new_user response`)
              }

              // Fetch the full profile to get all fields
              if (!isPublicPage) {
                console.log(`[AuthContext] [${Date.now() - startTime}ms] Fetching complete profile...`)
              }
              const { data: newProfile, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', setupData.user_id)
                .single()

              if (!isPublicPage) {
                console.log(`[AuthContext] [${Date.now() - startTime}ms] Profile fetch completed`)
              }

              if (fetchError) {
                if (!isPublicPage) {
                  console.error(`[AuthContext] [${Date.now() - startTime}ms] Error fetching newly created profile:`, {
                    code: fetchError.code,
                    message: fetchError.message,
                    details: fetchError.details
                  })
                }
                return null
              }

              if (newProfile) {
                if (!isPublicPage) {
                  console.log(`[AuthContext] [${Date.now() - startTime}ms] Profile created successfully:`, newProfile.id)
                }
                return newProfile
              }
            } else {
              if (!isPublicPage) {
                console.error(`[AuthContext] [${Date.now() - startTime}ms] setup_new_user returned unexpected data:`, setupResult)
              }
              return null
            }
          }
          // If we reach here, user doesn't exist in auth or setup failed
          if (!isPublicPage) {
            console.error(`[AuthContext] [${Date.now() - startTime}ms] Cannot create profile - no auth user found`)
          }
          return null
        }

        // For non-PGRST116 errors, log and return null
        if (!isPublicPage) {
          console.error(`[AuthContext] [${Date.now() - startTime}ms] Unhandled error fetching user profile:`, errorDetails)
        }
        return null
      }

      if (!isPublicPage) {
        console.log(`[AuthContext] [${Date.now() - startTime}ms] Profile fetched successfully:`, data)
      }
      return data
      } catch (innerError) {
        if (!isPublicPage) {
          const errorMessage = innerError instanceof Error ? innerError.message : String(innerError)
          const errorStack = innerError instanceof Error ? innerError.stack : undefined
          const errorName = innerError instanceof Error ? innerError.name : typeof innerError

          console.error('[AuthContext] Exception in fetch logic:', {
            name: errorName,
            message: errorMessage,
            stack: errorStack
          })
        }
        return null
      }
      })()

      // Store the promise for deduplication
      inFlightRequests.set(authUserId, fetchPromise)

      try {
        // Execute the fetch
        const result = await fetchPromise

        // Cache the result
        profileCache.set(authUserId, { data: result, timestamp: Date.now() })

        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - startTime}ms] Profile cached for:`, authUserId)
        }

        return result
      } finally {
        // Clean up the in-flight request
        inFlightRequests.delete(authUserId)
      }
    } catch (error) {
      if (!isPublicPage) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        const errorName = error instanceof Error ? error.name : typeof error

        console.error('[AuthContext] Exception in fetchUserProfile:', {
          name: errorName,
          message: errorMessage,
          stack: errorStack,
          authUserId
        })
      }
      return null
    }
  }, [supabase, profileCache, inFlightRequests, CACHE_TTL])

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const initStartTime = Date.now()

      // Detect if we're on a public page (no auth required)
      const isPublicPage = typeof window !== 'undefined' &&
        (window.location.pathname === '/' ||
         window.location.pathname.startsWith('/demo') ||
         window.location.pathname === '/landing-animated' ||
         window.location.pathname === '/terms' ||
         window.location.pathname === '/privacy')

      try {
        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Initializing auth...`)
        }

        // Get initial session - with faster timeout on public pages
        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Getting session...`)
        }

        const sessionTimeout = isPublicPage ? 500 : 2000
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), sessionTimeout)
        )

        const { data: { session: initialSession }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise])

        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Session retrieved`)
        }

        if (sessionError) {
          if (!isPublicPage) {
            console.error(`[AuthContext] [${Date.now() - initStartTime}ms] Error getting session:`, sessionError)
          }
          setSession(null)
          setUser(null)
          setUserProfile(null)
          setIsLoading(false)
          return
        }

        if (!isPublicPage && initialSession) {
          console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Initial session:`, {
            hasSession: !!initialSession,
            email: initialSession?.user?.email,
            userId: initialSession?.user?.id,
            expiresAt: initialSession?.expires_at
          })
        }

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - initStartTime}ms] User session exists, fetching profile for:`, initialSession.user.id)
          }
          const profile = await fetchUserProfile(initialSession.user.id, isPublicPage)
          if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Profile fetch completed:`, profile ? 'Success' : 'Failed')
          }

          if (profile) {
            setUserProfile(profile)
            setProfileError(null)
          } else {
            setUserProfile(null)
            setProfileError(new Error('Failed to fetch or create user profile'))
          }

          // Note: We DON'T auto-signOut here to prevent infinite loops
          // The user can still use the app with a valid auth session even if profile fetch fails
          // The fetchUserProfile function handles creating missing profiles via setup_new_user
        } else {
          if (!isPublicPage) {
            console.log(`[AuthContext] [${Date.now() - initStartTime}ms] No session found - user is not signed in`)
          }
          setUserProfile(null)
          setProfileError(null)
        }

        if (!isPublicPage) {
          console.log(`[AuthContext] [${Date.now() - initStartTime}ms] Auth initialization complete`)
        }
        setIsLoading(false)
      } catch (error) {
        if (!isPublicPage) {
          console.error(`[AuthContext] [${Date.now() - initStartTime}ms] Error initializing auth:`, error)
        }
        setIsLoading(false)
      }
    }

    // Detect if we're on a public page for timeout logic
    const isPublicPage = typeof window !== 'undefined' &&
      (window.location.pathname === '/' ||
       window.location.pathname.startsWith('/demo') ||
       window.location.pathname === '/landing-animated' ||
       window.location.pathname === '/terms' ||
       window.location.pathname === '/privacy')

    // Add timeout to prevent infinite loading - much faster for public pages
    const timeoutDuration = isPublicPage ? 2000 : 5000
    const timeout = setTimeout(() => {
      if (!isPublicPage) {
        console.error('[AuthContext] Auth initialization timed out, forcing loading to false')
      }
      setIsLoading(false)
    }, timeoutDuration)

    initializeAuth().finally(() => clearTimeout(timeout))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Detect if we're on a public page
        const isPublicPageNow = typeof window !== 'undefined' &&
          (window.location.pathname === '/' ||
           window.location.pathname.startsWith('/demo') ||
           window.location.pathname === '/landing-animated' ||
           window.location.pathname === '/terms' ||
           window.location.pathname === '/privacy')

        if (!isPublicPageNow) {
          console.log('[AuthContext] Auth state change:', {
            event,
            hasSession: !!session,
            email: session?.user?.email,
            userId: session?.user?.id
          })
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id, isPublicPageNow)

          if (profile) {
            setUserProfile(profile)
            setProfileError(null)
          } else {
            setUserProfile(null)
            setProfileError(new Error('Failed to fetch or create user profile'))
          }

          // Note: We DON'T auto-signOut here to prevent infinite loops
          // fetchUserProfile handles creating missing profiles via setup_new_user
        } else {
          if (!isPublicPageNow) {
            console.log('[AuthContext] Auth state change: No session - user signed out')
          }
          setUserProfile(null)
          setProfileError(null)
        }

        setIsLoading(false)
      }
    )

    return () => {
      clearTimeout(timeout)
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
      console.log('[AuthContext] signIn called', { email, passwordLength: password?.length, rememberMe })

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

      console.log('[AuthContext] Calling supabase.auth.signInWithPassword...')
      console.log('[AuthContext] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('[AuthContext] Sign in error:', {
          message: error.message,
          status: error.status,
          code: error.code,
          fullError: error
        })
      } else {
        console.log('[AuthContext] Sign in successful!', data.user?.email)
      }

      return { user: data.user, error }
    } catch (error) {
      console.error('[AuthContext] Sign in exception:', error)
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
      console.log('[AuthContext] Manual profile refresh requested for user:', user.id)
      const profile = await fetchUserProfile(user.id)

      if (profile) {
        setUserProfile(profile)
        setProfileError(null)
        console.log('[AuthContext] Profile refresh successful')
      } else {
        setUserProfile(null)
        setProfileError(new Error('Failed to fetch or create user profile'))
        console.error('[AuthContext] Profile refresh failed')
      }
    }
  }

  const value: AuthContextType = {
    // State
    user,
    userProfile,
    session,
    isLoading,
    isAuthenticated: !!user,
    profileError,

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