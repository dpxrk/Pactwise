import { createBrowserClient } from '@supabase/ssr'
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

            // Note: HttpOnly cannot be set from JavaScript
            // It should be set by the server (middleware)

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