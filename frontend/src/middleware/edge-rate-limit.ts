import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: NextRequest) => string;
}

// Default configurations
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// In-memory store for Edge runtime
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
if (typeof globalThis.setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse> {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;

  const key = keyGenerator(request);
  const now = Date.now();
  
  // Get or create rate limit entry
  let rateLimit = rateLimitStore.get(key);
  if (!rateLimit || rateLimit.resetTime < now) {
    rateLimit = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, rateLimit);
  }
  
  rateLimit.count++;
  
  // Check if limit exceeded
  if (rateLimit.count > maxRequests) {
    console.warn('Rate limit exceeded', {
      key,
      count: rateLimit.count,
      maxRequests,
      path: request.nextUrl.pathname,
    });

    return createRateLimitResponse(429, {
      maxRequests,
      remaining: 0,
      resetTime: new Date(rateLimit.resetTime).toISOString(),
      retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
    });
  }
  
  // Return response with headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimit.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  
  return response;
}

function createRateLimitResponse(
  status: number,
  { maxRequests, remaining, resetTime, retryAfter }: {
    maxRequests: number;
    remaining: number;
    resetTime: string;
    retryAfter: number;
  }
): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    },
    {
      status,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime,
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

// Default key generator (by IP address and user ID if authenticated)
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : 'anonymous';
  
  // Try to get user ID from various sources
  const userId = request.headers.get('x-user-id') || 
                 request.cookies.get('userId')?.value ||
                 'anonymous';
  
  return `${ip}:${userId}`;
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

export const stripeWebhookRateLimit = (request: NextRequest) =>
  rateLimitMiddleware(request, {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 50, // Allow bursts from Stripe
    keyGenerator: () => 'stripe-webhook', // Global limit for all Stripe webhooks
  });