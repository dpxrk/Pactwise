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
            const cookieOptions: {
              httpOnly?: boolean
              secure?: boolean
              sameSite?: 'lax' | 'strict' | 'none'
              path?: string
              maxAge?: number
              expires?: Date
            } = {
              ...options,
              httpOnly: true,
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

  // Refresh session and get user
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/settings', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Redirect logic
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect authenticated users from home to dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}