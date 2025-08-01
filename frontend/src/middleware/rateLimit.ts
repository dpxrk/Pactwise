import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore: RateLimitStore = {};

// Configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000); // Clean up every minute

export function rateLimitMiddleware(
  request: NextRequest,
  options?: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: NextRequest) => string;
  }
) {
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW_MS;
  const maxRequests = options?.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  const keyGenerator = options?.keyGenerator || defaultKeyGenerator;

  const key = keyGenerator(request);
  const now = Date.now();

  // Get or create rate limit entry
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  const rateLimit = rateLimitStore[key];
  rateLimit.count++;

  // Check if limit exceeded
  if (rateLimit.count > maxRequests) {
    logger.warn('Rate limit exceeded', {
      key,
      count: rateLimit.count,
      maxRequests,
      path: request.nextUrl.pathname,
    });

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimit.resetTime - now) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set(
    'X-RateLimit-Remaining',
    Math.max(0, maxRequests - rateLimit.count).toString()
  );
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  return response;
}

// Default key generator (by IP address)
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : 'anonymous';
  return `ratelimit:${ip}`;
}

// Specialized rate limiters for different endpoints
export const apiRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  });

export const authRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Stricter for auth endpoints
  });

export const uploadRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // Limit file uploads
  });