/**
 * Supabase Browser Client
 *
 * SECURITY NOTE — Auth Cookie HttpOnly Limitation (Issue #12)
 * -----------------------------------------------------------
 * Supabase's @supabase/ssr architecture requires the browser client to read
 * and write auth cookies via `document.cookie` so that
 * `supabase.auth.getSession()` and token refresh work client-side.
 * This means auth cookies CANNOT be set as HttpOnly.
 *
 * If we were to mark these cookies HttpOnly (via the server middleware), the
 * client-side Supabase SDK would be unable to read session tokens, causing
 * auth failures and infinite redirect loops.
 *
 * Mitigations in place:
 *  1. `Secure` flag — set in production so cookies are only sent over HTTPS.
 *  2. `SameSite=Lax` — prevents cookies from being sent with cross-site
 *     requests, mitigating CSRF attacks.
 *  3. `Path=/` — scopes cookies to the application root.
 *  4. Content-Security-Policy with nonces — the primary defense against XSS,
 *     which is the main threat vector when cookies are not HttpOnly.
 *  5. Server-side validation — middleware uses `getUser()` (not `getSession()`)
 *     to validate tokens against the Supabase Auth server on every request.
 *
 * The combination of CSP (to prevent XSS) and SameSite=Lax (to prevent CSRF)
 * provides defense-in-depth even without HttpOnly cookies.
 */
import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/env'
import { Database } from '@/types/database.types'

/**
 * Get the rememberMe preference from cookie (most reliable) or localStorage (fallback)
 */
function getRememberMePreference(): boolean {
  if (typeof document === 'undefined') return false

  // Check cookie first (most reliable)
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('rememberMe='))
    ?.split('=')[1]

  if (cookieValue === 'true') return true

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('rememberMe') === 'true'
  }

  return false
}

export function createClient() {
  return createBrowserClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          if (typeof document !== 'undefined') {
            const cookie = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
            return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined
          }
          return undefined
        },
        set(name: string, value: string, options?: any) {
          if (typeof document !== 'undefined') {
            let cookieStr = `${name}=${encodeURIComponent(value)}`

            // Check if user wants to stay logged in (30 days)
            const rememberMe = getRememberMePreference()

            // Calculate expiry based on rememberMe preference
            // For auth tokens, extend to 30 days if rememberMe is true
            if (options?.maxAge) {
              const maxAge = rememberMe ? 2592000 : options.maxAge // 30 days or default
              cookieStr += `; Max-Age=${maxAge}`
            } else if (rememberMe) {
              // If no maxAge is provided but rememberMe is true, set 30 days
              cookieStr += `; Max-Age=2592000`
            }

            if (options?.expires) {
              const expiresDate = rememberMe
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                : new Date(options.expires)
              cookieStr += `; Expires=${expiresDate.toUTCString()}`
            } else if (rememberMe) {
              // If no expires is provided but rememberMe is true, set 30 days
              const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              cookieStr += `; Expires=${expiresDate.toUTCString()}`
            }

            cookieStr += `; Path=${options?.path || '/'}`
            cookieStr += `; SameSite=${options?.sameSite || 'Lax'}`

            if (options?.secure || process.env.NODE_ENV === 'production') {
              cookieStr += '; Secure'
            }

            // SECURITY: HttpOnly cannot be set from document.cookie (browser
            // limitation) and must not be set server-side either, because
            // @supabase/ssr needs JS access to auth cookies. See file-level
            // comment for full explanation and mitigations.

            document.cookie = cookieStr
          }
        },
        remove(name: string, options?: any) {
          if (typeof document !== 'undefined') {
            document.cookie = `${name}=; Max-Age=0; Path=${options?.path || '/'}`
          }
        }
      }
    }
  )
}