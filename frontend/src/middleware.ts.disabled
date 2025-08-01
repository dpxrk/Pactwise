// src/middleware.ts

import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitMiddleware, authRateLimit, apiRateLimit } from "./middleware/edge-rate-limit";
import { apiVersionMiddleware } from "./middleware/api-version";

// --- Route Matchers ---
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/forum(.*)',
  "/product(.*)",
  "/contracts(.*)",
  "/vendors(.*)",
  "/settings(.*)",
  "/profile(.*)",
  "/agents(.*)",
]);

// Match sign-in/sign-up pages
const isSignInOrSignUpPage = createRouteMatcher([
  '/auth/sign-in(.*)',
  '/auth/sign-up(.*)',
]);

// Match public pages that authenticated users should still be able to access
const isPublicPage = createRouteMatcher([
  '/',
  '/contact',
  '/about',
  '/features',
  '/pricing',
]);

// Match API routes
const isApiRoute = createRouteMatcher([
  '/api(.*)',
]);

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Enhanced CSP with violation reporting
function getCSPHeader(nonce: string, reportUri?: string): string {
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.clerk.io https://*.sentry.io https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.convex.cloud https://*.clerk.io https://*.sentry.io https://api.stripe.com wss://*.convex.cloud",
    "frame-src 'self' https://accounts.google.com https://*.clerk.io https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  // Add violation reporting in production
  if (reportUri && process.env.NODE_ENV === 'production') {
    cspDirectives.push(`report-uri ${reportUri}`);
    cspDirectives.push(`report-to csp-endpoint`);
  }

  return cspDirectives.join('; ');
}

// --- Clerk Middleware ---
export default clerkMiddleware(async (auth, req) => {
  const authResult = await auth();
  const { userId } = authResult;

  const { pathname, search, origin } = req.nextUrl;
  const pathWithQuery = pathname + search;
  const clientIP = getClientIP(req);

  console.log(`Processing path: ${pathWithQuery}, User ID: ${userId || 'Not logged in'}, IP: ${clientIP}`);

  // Apply API versioning for API routes
  if (isApiRoute(req)) {
    const versionResponse = apiVersionMiddleware(req, {
      defaultVersion: 'v1',
      supportedVersions: ['v1'],
      deprecatedVersions: {
        // Example: 'v0': '2024-12-31', // v0 will be removed on this date
      },
    });
    
    if (versionResponse && versionResponse.status !== 200) {
      return versionResponse;
    }
  }

  // Apply rate limiting based on route type
  let rateLimitResponse: NextResponse | null = null;
  
  if (isSignInOrSignUpPage(req)) {
    // Stricter rate limiting for auth routes
    rateLimitResponse = await authRateLimit(req);
  } else if (isApiRoute(req)) {
    // API rate limiting
    rateLimitResponse = await apiRateLimit(req);
  } else {
    // General rate limiting
    rateLimitResponse = await rateLimitMiddleware(req);
  }

  // If rate limited, return early
  if (rateLimitResponse.status === 429) {
    console.log(`Rate limit exceeded for IP: ${clientIP} on route: ${pathname}`);
    return rateLimitResponse;
  }

  // --- Logic for Protected Routes ---
  if (!userId && isProtectedRoute(req)) {
    console.log(`Unauthenticated access attempt to protected route: ${pathname}. Redirecting to sign-in.`);
    // Create a return URL that will redirect to dashboard after sign-in
    const signInUrl = new URL('/auth/sign-in', origin);
    signInUrl.searchParams.set('redirect_url', '/dashboard');
    return NextResponse.redirect(signInUrl);
  }

  // --- Logic for Auth Pages (Sign-in/Sign-up) ---
  if (userId && isSignInOrSignUpPage(req)) {
    console.log(`Authenticated user accessing auth page: ${pathname}. Redirecting to dashboard.`);
    
    // Always redirect authenticated users to dashboard from auth pages
    const dashboardUrl = new URL('/dashboard', origin);
    return NextResponse.redirect(dashboardUrl);
  }

  // --- Handle root path redirect for authenticated users ---
  if (userId && pathname === '/') {
    console.log(`Authenticated user on homepage. Redirecting to dashboard.`);
    const dashboardUrl = new URL('/dashboard', origin);
    return NextResponse.redirect(dashboardUrl);
  }

  // --- Allow Request ---
  console.log(`Allowing request to proceed for path: ${pathname}`);
  
  // Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Continue with the rate limit response which has headers already set
  const response = rateLimitResponse;
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  
  // HTTP/2 Server Push and Resource Hints
  const linkHeaders: string[] = [];
  
  // Common resources for all pages
  linkHeaders.push('<https://convex.cloud>; rel=preconnect');
  linkHeaders.push('<https://api.clerk.dev>; rel=preconnect');
  linkHeaders.push('<https://fonts.googleapis.com>; rel=preconnect');
  linkHeaders.push('<https://fonts.gstatic.com>; rel=preconnect; crossorigin');
  
  // Route-specific resource hints
  if (pathname === '/') {
    // Landing page specific prefetches
  } else if (pathname.startsWith('/dashboard')) {
    linkHeaders.push('</_next/static/chunks/dashboard.js>; rel=prefetch');
    
    if (pathname.includes('/contracts')) {
      linkHeaders.push('</_next/static/chunks/react-window.js>; rel=prefetch');
    } else if (pathname.includes('/analytics')) {
      linkHeaders.push('</_next/static/chunks/three.js>; rel=prefetch');
      linkHeaders.push('</_next/static/chunks/recharts.js>; rel=prefetch');
    }
  }
  
  // Add Link headers for HTTP/2 Server Push
  if (linkHeaders.length > 0) {
    response.headers.set('Link', linkHeaders.join(', '));
  }
  
  // Add Early Hints status (103) support for Cloudflare and other CDNs
  response.headers.set('X-Early-Data', '1');
  
  // HSTS and additional security headers for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set('Expect-CT', 'enforce, max-age=86400');
  }

  // CSP Header with reporting
  const cspReportUri = process.env.CSP_REPORT_URI || '/api/csp-report';
  response.headers.set(
    'Content-Security-Policy',
    getCSPHeader(nonce, cspReportUri)
  );

  // Report-To header for CSP violation reporting
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Report-To',
      JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: cspReportUri }],
        include_subdomains: true,
      })
    );
  }

  // Add nonce to response for inline scripts
  response.headers.set('X-Nonce', nonce);
  
  return response;
});

// --- Middleware Configuration ---
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