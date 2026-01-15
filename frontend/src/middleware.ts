import { type NextRequest } from 'next/server'

import { compressionMiddleware } from '@/middleware/compression'
import { withSecurityHeaders, withRateLimit } from '@/middleware/security'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply compression headers
  let response = compressionMiddleware(request)

  // Update session
  response = await updateSession(request)

  // Apply security headers
  response = withSecurityHeaders(request)

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Stricter rate limiting for auth endpoints
    if (pathname.startsWith('/api/auth/')) {
      response = withRateLimit(request, {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 requests per 15 minutes for auth
      });
    } else {
      // Standard rate limiting for other API endpoints
      response = withRateLimit(request, {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60, // 60 requests per minute
      });
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}