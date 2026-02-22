/**
 * Supabase Auth Middleware — Session Refresh & Route Protection
 *
 * SECURITY NOTE — Auth Cookie HttpOnly Limitation (Issue #12)
 * -----------------------------------------------------------
 * Although this middleware runs server-side and CAN technically set HttpOnly
 * on cookies, doing so would break Supabase's client-side auth. The browser
 * client (`@supabase/ssr` via `createBrowserClient`) must read auth cookies
 * with `document.cookie` for `supabase.auth.getSession()` and automatic
 * token refresh to work. Setting HttpOnly here would cause the client to see
 * no session, triggering redirect loops (server says authenticated, client
 * says not).
 *
 * Mitigations in place:
 *  1. `Secure` flag — cookies only sent over HTTPS in production.
 *  2. `SameSite=Lax` — blocks cross-origin cookie transmission (CSRF defense).
 *  3. `Path=/` — cookies scoped to the application root.
 *  4. Server-side `getUser()` — every request validates the token against
 *     Supabase Auth server, preventing use of tampered tokens.
 *  5. Nonce-based CSP — primary defense against XSS, which is the main risk
 *     when cookies are accessible to JavaScript.
 *
 * This is a known architectural trade-off in Supabase SSR auth. The official
 * Supabase docs confirm that auth cookies must remain accessible to JS.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
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
            // SECURITY: Cookie attributes hardened for auth tokens.
            // httpOnly is intentionally NOT set — see file-level comment
            // for full rationale. TL;DR: @supabase/ssr's browser client
            // needs document.cookie access; HttpOnly would break auth.
            // XSS (the risk of non-HttpOnly cookies) is mitigated by CSP.
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

  // Get user securely - validates with Supabase Auth server
  // SECURITY: Use getUser() instead of getSession() per Supabase best practices
  let user = null
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      user = authUser
    }
  } catch {
    // Continue with user = null, don't block the request
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/settings', '/profile']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Redirect logic
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/sign-in', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages (except callback)
  if (user && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/callback')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect authenticated users from home to dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}