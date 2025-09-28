import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

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
        },
        set(name: string, value: string, options?: any) {
          if (typeof document !== 'undefined') {
            let cookieStr = `${name}=${encodeURIComponent(value)}`
            
            // Check if user wants to stay logged in (30 days)
            const rememberMe = localStorage.getItem('rememberMe') === 'true'
            
            if (options?.maxAge) {
              // If rememberMe is true, extend the maxAge to 30 days (2592000 seconds)
              const maxAge = rememberMe ? 2592000 : options.maxAge
              cookieStr += `; Max-Age=${maxAge}`
            }
            
            if (options?.expires) {
              const expiresDate = rememberMe 
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                : new Date(options.expires)
              cookieStr += `; Expires=${expiresDate.toUTCString()}`
            }
            
            cookieStr += `; Path=${options?.path || '/'}`
            cookieStr += `; SameSite=${options?.sameSite || 'Lax'}`
            
            if (options?.secure) {
              cookieStr += '; Secure'
            }
            
            if (options?.httpOnly) {
              cookieStr += '; HttpOnly'
            }
            
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