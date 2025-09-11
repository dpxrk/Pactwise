import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers configuration for production-ready deployment
 * Implements OWASP recommended security headers
 */
export function withSecurityHeaders(request: NextRequest) {
  const response = NextResponse.next();
  
  // Content Security Policy - Strict policy with necessary exceptions
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Apply security headers
  response.headers.set('Content-Security-Policy', cspDirectives);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  return response;
}

/**
 * Rate limiting configuration for API endpoints
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  request: NextRequest,
  config: {
    windowMs?: number;
    maxRequests?: number;
    identifier?: (req: NextRequest) => string;
  } = {}
) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 60, // 60 requests per minute
    identifier = (req) => req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
  } = config;

  const clientId = identifier(request);
  const now = Date.now();
  
  // Clean up expired entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || clientData.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    return NextResponse.next();
  }
  
  if (clientData.count >= maxRequests) {
    // Rate limit exceeded
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((clientData.resetTime - now) / 1000)),
        'X-RateLimit-Limit': String(maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
      }
    });
  }
  
  // Increment counter
  clientData.count++;
  rateLimitStore.set(clientId, clientData);
  
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(maxRequests - clientData.count));
  response.headers.set('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
  
  return response;
}

/**
 * CORS configuration for API routes
 */
export function withCORS(request: NextRequest, allowedOrigins: string[] = []) {
  const origin = request.headers.get('origin');
  const response = NextResponse.next();
  
  // Default allowed origins
  const defaultAllowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const allAllowedOrigins = [...defaultAllowedOrigins, ...allowedOrigins];
  
  if (origin && allAllowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  
  return response;
}