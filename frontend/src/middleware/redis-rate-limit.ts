import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default configurations
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

// Fallback to in-memory store if Redis is unavailable
const fallbackStore = new Map<string, { count: number; resetTime: number }>();

// Clean up fallback store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fallbackStore.entries()) {
    if (value.resetTime < now) {
      fallbackStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<NextResponse> {
  const windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;

  const key = keyGenerator(request);
  const now = Date.now();

  try {
    // Try to use Redis
    const redis = await getRedisClient();
    
    if (redis) {
      // Use Redis-based rate limiting
      const resetTime = now + windowMs;
      const windowStart = now - windowMs;
      
      // Use Redis sorted set for sliding window rate limiting
      const rateLimitKey = `ratelimit:${key}`;
      
      // Remove old entries
      await redis.zremrangebyscore(rateLimitKey, '-inf', windowStart);
      
      // Count current requests in window
      const currentCount = await redis.zcard(rateLimitKey);
      
      if (currentCount >= maxRequests) {
        // Get the oldest entry to calculate retry after
        const oldestEntry = await redis.zrange(rateLimitKey, 0, 0, 'WITHSCORES');
        const oldestTime = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
        const retryAfter = Math.ceil((oldestTime + windowMs - now) / 1000);
        
        logger.warn('Rate limit exceeded (Redis)', {
          key,
          count: currentCount,
          maxRequests,
          path: request.nextUrl.pathname,
        });

        return createRateLimitResponse(429, {
          maxRequests,
          remaining: 0,
          resetTime: new Date(oldestTime + windowMs).toISOString(),
          retryAfter,
        });
      }
      
      // Add current request
      await redis.zadd(rateLimitKey, now, `${now}-${Math.random()}`);
      await redis.expire(rateLimitKey, Math.ceil(windowMs / 1000));
      
      // Return response with headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount - 1).toString());
      response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
      
      return response;
    }
  } catch (error) {
    logger.error('Redis rate limit error, falling back to in-memory', { errorMessage: error instanceof Error ? error.message : String(error) } as any);
  }

  // Fallback to in-memory rate limiting
  return inMemoryRateLimit(request, key, windowMs, maxRequests);
}

function inMemoryRateLimit(
  request: NextRequest,
  key: string,
  windowMs: number,
  maxRequests: number
): NextResponse {
  const now = Date.now();
  
  // Get or create rate limit entry
  let rateLimit = fallbackStore.get(key);
  if (!rateLimit || rateLimit.resetTime < now) {
    rateLimit = {
      count: 0,
      resetTime: now + windowMs,
    };
    fallbackStore.set(key, rateLimit);
  }
  
  rateLimit.count++;
  
  // Check if limit exceeded
  if (rateLimit.count > maxRequests) {
    logger.warn('Rate limit exceeded (In-memory fallback)', {
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

export const userKeyGenerator = (req: NextRequest) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0]!.trim() : 'anonymous';
    const userId = req.headers.get('x-user-id') || 'anonymous';
    return `${ip}:${userId}`;
};

export const rateLimitPresets = {
  default: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  strict: { windowMs: 5 * 60 * 1000, maxRequests: 10 },
  api: { windowMs: 1 * 60 * 1000, maxRequests: 200 },
  search: { windowMs: 1 * 60 * 1000, maxRequests: 50 },
};

export const withRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>, options?: RateLimitOptions) => async (req: NextRequest) => {
    const response = await rateLimitMiddleware(req, options);
    if (response.status === 429) {
        return response;
    }
    return handler(req);
};