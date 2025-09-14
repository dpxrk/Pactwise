import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { updateSession } from '@/utils/supabase/middleware'
import { withSecurityHeaders } from '@/middleware/security'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/profile'
]

// Admin routes that require admin role
const adminRoutes = [
  '/dashboard/admin',
  '/dashboard/settings/enterprise',
  '/dashboard/settings/users'
]

// Rate limiting configuration
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

// API routes with stricter rate limits
const API_RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute for API routes

// Security headers for API routes
const apiSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Rate limiting function
function checkRateLimit(identifier: string, maxRequests: number): boolean {
  const now = Date.now()
  const limit = rateLimitStore.get(identifier)
  
  if (!limit || now > limit.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }
  
  if (limit.count >= maxRequests) {
    return false
  }
  
  limit.count++
  return true
}

// Clean up old rate limit entries on each request
function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Clean up old rate limit entries
  cleanupRateLimits()

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const identifier = `${ip}-${pathname}`
    const maxRequests = pathname.startsWith('/api/') ? API_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS
    
    if (!checkRateLimit(identifier, maxRequests)) {
      const response = new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
        }
      })
      // Apply security headers even on rate limit responses
      const securityResponse = withSecurityHeaders(request)
      response.headers.forEach((value, key) => {
        securityResponse.headers.set(key, value)
      })
      return securityResponse
    }

    // CSRF Protection for state-changing operations
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')
      
      if (origin && host) {
        const originUrl = new URL(origin)
        const expectedOrigin = `${originUrl.protocol}//${host}`
        
        if (origin !== expectedOrigin && !origin.includes('localhost')) {
          return new NextResponse('CSRF token validation failed', { status: 403 })
        }
      }
    }

    // Input validation for suspicious patterns
    const url = request.url
    const suspiciousPatterns = [
      /<script[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /\.\.[\\/\\]/g,
      /%2e%2e[\\/\\]/gi
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return new NextResponse('Invalid request', { status: 400 })
      }
    }

    // Check request body size (if applicable)
    const contentLength = request.headers.get('content-length')
    const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB
    
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return new NextResponse('Request body too large', { status: 413 })
    }

    const { supabase, supabaseResponse } = createClient(request)
    
    // Get user session - refresh it to ensure it's current
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth error:', error)
    }
    
    // Debug log
    console.log('Middleware session check:', { 
      pathname, 
      hasSession: !!session,
      sessionUser: session?.user?.email 
    })

    // Check if route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    
    // Redirect to sign-in if not authenticated and accessing protected route
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth/sign-in', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      const redirectResponse = NextResponse.redirect(redirectUrl)
      
      // Preserve cookies in redirect
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      return redirectResponse
    }
    
    // If authenticated and trying to access auth pages (except sign-up), redirect to dashboard
    // Allow authenticated users to access sign-up page if they want to create another account
    if (session && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/sign-up')) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      
      // Preserve cookies in redirect
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      return redirectResponse
    }
    
    // If authenticated and accessing root path, redirect to dashboard
    if (session && pathname === '/') {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      
      // Preserve cookies in redirect
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie)
      })
      
      return redirectResponse
    }
    
    // For admin routes, we'll check permissions on the client side
    // since we need to fetch the user profile to check role
    
    // Add rate limit headers to response
    const limit = rateLimitStore.get(identifier)
    if (limit) {
      supabaseResponse.headers.set('X-RateLimit-Limit', maxRequests.toString())
      supabaseResponse.headers.set('X-RateLimit-Remaining', (maxRequests - limit.count).toString())
      supabaseResponse.headers.set('X-RateLimit-Reset', new Date(limit.resetTime).toISOString())
    }
    
    // Apply security headers while preserving the supabase cookies
    const securityHeaders = withSecurityHeaders(request)
    
    // Copy security headers to supabaseResponse (which has the auth cookies)
    securityHeaders.headers.forEach((value, key) => {
      if (!key.toLowerCase().includes('cookie')) {
        supabaseResponse.headers.set(key, value)
      }
    })
    
    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any files with extensions (e.g., .png, .jpg, .svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.\\w+).*)',
  ],
};