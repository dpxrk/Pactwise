import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from '@/lib/supabase/middleware'

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    const { supabase, supabaseResponse } = createClient(request)
    
    // Get user session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth error:', error)
    }

    // Check if route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    
    // Redirect to sign-in if not authenticated and accessing protected route
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth/sign-in', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // If authenticated and trying to access auth pages (except sign-up), redirect to dashboard
    // Allow authenticated users to access sign-up page if they want to create another account
    if (session && pathname.startsWith('/auth/') && !pathname.startsWith('/auth/sign-up')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // For admin routes, we'll check permissions on the client side
    // since we need to fetch the user profile to check role
    
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