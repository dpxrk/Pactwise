import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if user wants extended session (30 days)
  // Read this once at the start to use consistently throughout the request
  const rememberMeCookie = request.cookies.get('rememberMe')?.value
  const rememberMe = rememberMeCookie === 'true'

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Create a new response to ensure cookies are set properly
          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            // Build cookie options with proper security settings
            // NOTE: httpOnly is intentionally NOT set here because Supabase's
            // client-side auth requires JavaScript to read auth cookies via
            // document.cookie for supabase.auth.getSession() to work.
            // Setting httpOnly would cause a redirect loop where the server
            // sees the user as authenticated but the client cannot.
            const cookieOptions: {
              httpOnly?: boolean
              secure?: boolean
              sameSite?: 'lax' | 'strict' | 'none'
              path?: string
              maxAge?: number
              expires?: Date
            } = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              path: '/',
            }

            // Extend session duration if rememberMe is true
            if (rememberMe) {
              // Set maxAge to 30 days (2592000 seconds)
              cookieOptions.maxAge = 2592000
              // Also set expires for browser compatibility
              cookieOptions.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            } else if (options?.maxAge) {
              // Use the provided maxAge if rememberMe is false
              cookieOptions.maxAge = options.maxAge
            } else {
              // Default to 1 hour for standard sessions
              cookieOptions.maxAge = 3600
            }

            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // Get session from cookies (fast, no API call)
  let user = null
  try {
    // Use getSession() which reads from cookies - much faster than getUser()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Middleware] ❌ Error getting session:', error)
    } else if (session) {
      user = session.user
      console.log('[Middleware] ✅ User authenticated:', user.email, 'for path:', pathname)
    } else {
      console.log('[Middleware] ⚠️  No session found for path:', pathname)
    }
  } catch (error) {
    console.error('[Middleware] ❌ Exception getting session:', error)
    // Continue with user = null, don't block the request
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/settings', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Redirect logic
  if (isProtectedRoute && !user) {
    console.log('[Middleware] Redirecting to sign-in - protected route without auth:', pathname)
    const redirectUrl = new URL('/auth/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages (except callback)
  if (user && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/callback')) {
    console.log('[Middleware] Redirecting to dashboard - auth page with user:', pathname)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect authenticated users from home to dashboard
  if (user && pathname === '/') {
    console.log('[Middleware] Redirecting to dashboard - home page with user')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}