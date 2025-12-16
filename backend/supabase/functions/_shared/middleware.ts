/// <reference path="../../types/global.d.ts" />

import { rateLimitMiddleware } from './rate-limiting.ts';
import { getRateLimitRules, shouldBypassRateLimit } from './rate-limit-config.ts';
import { getCorsHeaders, handleCors } from './cors.ts';
import { getUserFromAuth, type AuthenticatedUser } from './supabase.ts';
import { logSecurityEvent, type SecurityEvent } from './security-monitoring.ts';
import { createErrorResponse } from './responses.ts';
import type { RateLimitInfo } from '../../types/api-types.ts';

/**
 * Standard middleware stack for Edge Functions
 * Includes CORS, rate limiting, and authentication helpers
 */

interface SecurityEventBase {
  event_type: SecurityEvent['event_type'];
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  user_id?: string;
  enterprise_id?: string;
  metadata: Record<string, unknown>;
}

// Helper to create security event with proper optional fields
function createSecurityEvent(baseEvent: SecurityEventBase, req: Request): Omit<SecurityEvent, 'id' | 'created_at'> {
  const userAgent = req.headers.get('user-agent');
  const sourceIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  const event: Omit<SecurityEvent, 'id' | 'created_at'> = {
    event_type: baseEvent.event_type,
    severity: baseEvent.severity,
    title: baseEvent.title,
    description: baseEvent.description,
    source_ip: sourceIp,
    endpoint: `${req.method} ${new URL(req.url).pathname}`,
    metadata: baseEvent.metadata,
  };

  // Only add optional fields if they have values
  if (userAgent) {
    event.user_agent = userAgent;
  }
  if (baseEvent.user_id) {
    event.user_id = baseEvent.user_id;
  }
  if (baseEvent.enterprise_id) {
    event.enterprise_id = baseEvent.enterprise_id;
  }

  return event;
}

import { zeroTrustMiddleware } from './zero-trust-middleware.ts';

import { detectThreats, logThreat } from './threat-detection.ts';

import { checkCompliance, logComplianceIssue } from './compliance.ts';
import { recordMetric } from './performance-monitoring.ts';
import { createTraceContext, TraceContext } from './tracing.ts';
import { checkSla } from './sla-monitoring.ts';

// HTTP Caching imports
import {
  getCachePolicy,
  CachePolicies,
  type CachePolicy,
} from './cache-config.ts';
import {
  generateETag,
  addCacheHeaders,
  checkIfNoneMatch,
  createNotModifiedResponse,
  buildResponseCacheKey,
  createCachedResponse,
  restoreCachedResponse,
  type CachedResponse,
} from './cache-headers-middleware.ts';
import { getCache } from '../../functions-utils/cache-factory.ts';

export interface CacheOptions {
  /** Override default policy by name */
  policy?: string;
  /** Enable Redis response caching (overrides policy setting) */
  enableResponseCache?: boolean;
  /** Custom TTL in seconds (overrides policy setting) */
  customTTL?: number;
  /** Completely skip caching */
  skipCache?: boolean;
}

export interface MiddlewareOptions {
  requireAuth?: boolean;
  rateLimit?: boolean;
  customRateLimitProfile?: string;
  bypassRateLimit?: boolean;
  securityMonitoring?: boolean;
  zeroTrust?: {
    resource: string;
    action: string;
  };
  detectThreats?: boolean;
  compliance?: {
    framework: 'GDPR' | 'HIPAA';
  };
  /** HTTP caching options */
  cache?: CacheOptions;
}

export interface RequestContext {
  req: Request;
  user?: AuthenticatedUser;
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  rateLimitResult?: RateLimitInfo;
  accessResponse?: Record<string, unknown>; // To store the zero-trust access response
  traceContext: TraceContext;
}

export interface RateLimitContext {
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  isSecurityMode?: boolean;
  endpoint?: string;
}

/**
 * Apply standard middleware to an Edge Function
 */
export async function applyMiddleware(
  req: Request,
  options: MiddlewareOptions = {},
  traceContext: TraceContext,
): Promise<{ success: true; context: RequestContext } | { success: false; response: Response }> {

  // 1. Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return { success: false, response: corsResponse };
  }

  let context: RequestContext = {
    req,
    isAuthenticated: false,
    traceContext,
  };

  // 2. Extract user information if auth header present
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      const user = await getUserFromAuth(authHeader);
      context.user = user;
      context.isAuthenticated = true;

      // Determine user tier from profile
      if (user.enterprise_id) {
        // Check enterprise tier (this would typically come from enterprise settings)
        context.userTier = 'enterprise'; // Simplified for now
      } else if (user.profile?.subscription_tier) {
        context.userTier = user.profile.subscription_tier;
      } else {
        context.userTier = 'free';
      }
    } catch (error) {
      // Log authentication failure as security event
      if (options.securityMonitoring !== false) {
        await logSecurityEvent(createSecurityEvent({
          event_type: 'auth_failure',
          severity: 'medium',
          title: 'Authentication Failed',
          description: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: {
            auth_header_present: Boolean(authHeader),
            error: error instanceof Error ? error.message : String(error),
          },
        }, req));
      }

      if (options.requireAuth) {
        return {
          success: false,
          response: new Response(JSON.stringify({ error: 'Invalid authorization' }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 401,
          }),
        };
      }
      // Continue without authentication if not required
    }
  } else if (options.requireAuth) {
    // Log missing authentication as security event
    if (options.securityMonitoring !== false) {
      await logSecurityEvent(createSecurityEvent({
        event_type: 'unauthorized_access',
        severity: 'medium',
        title: 'Unauthorized Access Attempt',
        description: 'Request to protected endpoint without authorization header',
        metadata: {
          requires_auth: true,
          auth_header_present: false,
        },
      }, req));
    }

    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      }),
    };
  }

  // 3. Apply rate limiting
  if (options.rateLimit !== false && !options.bypassRateLimit && !shouldBypassRateLimit(req)) {
    const url = new URL(req.url);
    const endpoint = url.pathname;

    const rateLimitConfig: RateLimitContext = {
      isAuthenticated: context.isAuthenticated,
      endpoint,
    };

    if (context.userTier) {
      rateLimitConfig.userTier = context.userTier;
    }

    const rateLimitRules = getRateLimitRules(rateLimitConfig);

    const rateLimitResponse = await rateLimitMiddleware(req, rateLimitRules);
    if (rateLimitResponse) {
      // Log rate limit violation as security event
      if (options.securityMonitoring !== false) {
        const baseEvent: SecurityEventBase = {
          event_type: 'rate_limit_violation',
          severity: 'medium',
          title: 'Rate Limit Exceeded',
          description: `Rate limit exceeded for ${endpoint}`,
          metadata: {
            user_tier: context.userTier,
            authenticated: context.isAuthenticated,
          },
        };

        if (context.user?.id) {
          baseEvent.user_id = context.user.id;
        }
        if (context.user?.enterprise_id) {
          baseEvent.enterprise_id = context.user.enterprise_id;
        }

        await logSecurityEvent(createSecurityEvent(baseEvent, req));
      }
      return { success: false, response: rateLimitResponse };
    }
  }

  // 4. Apply Zero-Trust policies
  if (options.zeroTrust && context.isAuthenticated) {
    const ztResult = await zeroTrustMiddleware(context, options.zeroTrust.resource, options.zeroTrust.action);
    if (ztResult.success === false) {
      return { success: false, response: ztResult.response };
    }
    context = ztResult.context;
  }

  // 5. Detect threats in request body
  if (options.detectThreats && req.body) {
    const body = await req.text();
    const threatResult = detectThreats(body);
    if (threatResult.isThreat) {
      // Convert RequestContext to ThreatDetectionContext
      const threatContext = {
        user: context.user ? {
          id: context.user.id,
          enterprise_id: context.user.enterprise_id || '',
          email: context.user.email,
          role: context.user.role,
        } : null,
        endpoint: new URL(req.url).pathname,
        method: req.method,
        metadata: {
          user_tier: context.userTier,
          authenticated: context.isAuthenticated,
        },
      };
      await logThreat(req, threatResult, threatContext);
      // In a real application, you might want to block the request here
      // For now, we'll just log it
    }
    // Re-create the request with a new body, as the original has been consumed
    context.req = new Request(req.url, {
      ...req,
      body: body,
    });
  }

  // 6. Check for compliance
  if (options.compliance && req.body) {
    const body = await req.text();
    const complianceResult = checkCompliance(JSON.parse(body), options.compliance.framework);
    if (!complianceResult.isCompliant) {
      await logComplianceIssue(req, complianceResult, context);
      // In a real application, you might want to block the request here
      // For now, we'll just log it
    }
    // Re-create the request with a new body, as the original has been consumed
    context.req = new Request(req.url, {
      ...req,
      body: body,
    });
  }

  return { success: true, context };
}

// Response functions moved to _shared/responses.ts to avoid duplication
// Import and use { createErrorResponse, createSuccessResponse } from './responses.ts'

/**
 * Wrapper for Edge Functions with standard middleware
 * Includes HTTP caching support with Cache-Control headers and Redis response caching
 */
export function withMiddleware(
  handler: (context: RequestContext) => Promise<Response>,
  options: MiddlewareOptions = {},
  handlerName?: string,
) {
  return async (req: Request): Promise<Response> => {
    const traceContext = createTraceContext(req);
    const startTime = Date.now();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;
    let responseStatus = 500;
    let cacheStatus = 'NONE';

    // Determine cache policy
    const cachePolicy: CachePolicy = options.cache?.policy
      ? CachePolicies[options.cache.policy] || getCachePolicy(method, pathname)
      : getCachePolicy(method, pathname);

    // Check if caching should be applied
    const shouldCache =
      !options.cache?.skipCache &&
      cachePolicy.scope !== 'no-store' &&
      method.toUpperCase() === 'GET';

    const shouldUseResponseCache =
      shouldCache &&
      (options.cache?.enableResponseCache ?? cachePolicy.enableResponseCache);

    try {
      const middlewareResult = await applyMiddleware(req, options, traceContext);

      if (middlewareResult.success === false) {
        responseStatus = middlewareResult.response.status;
        return middlewareResult.response;
      }

      const { context } = middlewareResult;

      // Check for cached response (Redis) before executing handler
      if (shouldUseResponseCache) {
        const cacheKey = buildResponseCacheKey(
          method,
          pathname,
          context.user?.enterprise_id,
          context.user?.id,
          url.searchParams
        );

        try {
          const cache = await getCache();
          const cachedResponse = await cache.get<CachedResponse>(cacheKey);

          if (cachedResponse) {
            // Check conditional request (If-None-Match)
            if (checkIfNoneMatch(req, cachedResponse.etag)) {
              cacheStatus = 'REVALIDATED';
              responseStatus = 304;
              recordCacheMetric(handlerName, cacheStatus);
              return createNotModifiedResponse(cachedResponse.etag, cachePolicy);
            }

            // Return cached response
            cacheStatus = 'HIT';
            responseStatus = cachedResponse.status;
            recordCacheMetric(handlerName, cacheStatus);
            return restoreCachedResponse(cachedResponse, cachePolicy);
          }
        } catch (cacheError) {
          console.warn('Cache read error:', cacheError);
          // Continue without cache on error
        }
      }

      // Execute handler
      const response = await handler(context);
      responseStatus = response.status;
      cacheStatus = 'MISS';

      // For successful GET responses, add cache headers and optionally cache the response
      if (shouldCache && response.ok) {
        // Clone response to read body
        const clonedResponse = response.clone();
        const body = await clonedResponse.text();
        const etag = await generateETag(cachePolicy, { content: body });

        // Check conditional request against fresh ETag
        if (checkIfNoneMatch(req, etag)) {
          cacheStatus = 'REVALIDATED';
          responseStatus = 304;
          recordCacheMetric(handlerName, cacheStatus);
          return createNotModifiedResponse(etag, cachePolicy);
        }

        // Cache response in Redis if enabled
        if (shouldUseResponseCache) {
          const cacheKey = buildResponseCacheKey(
            method,
            pathname,
            context.user?.enterprise_id,
            context.user?.id,
            url.searchParams
          );

          const ttl = options.cache?.customTTL || cachePolicy.responseTTL || 300;

          try {
            const cache = await getCache();
            await cache.set(
              cacheKey,
              createCachedResponse(
                body,
                etag,
                response.status,
                response.headers.get('Content-Type') || 'application/json'
              ),
              ttl
            );
          } catch (cacheError) {
            console.warn('Cache write error:', cacheError);
            // Continue without caching on error
          }
        }

        // Create new response with cache headers
        const newResponse = new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });

        recordCacheMetric(handlerName, cacheStatus);
        return addCacheHeaders(newResponse, cachePolicy, etag);
      }

      // For non-cacheable responses, just return as-is
      recordCacheMetric(handlerName, cacheStatus);
      return response;
    } catch (error) {
      console.error('Edge Function error:', error);

      // Log unhandled errors as security events
      if (options.securityMonitoring !== false) {
        try {
          await logSecurityEvent(createSecurityEvent({
            event_type: 'system_intrusion',
            severity: 'high',
            title: 'Unhandled Edge Function Error',
            description: `Unhandled error in Edge Function: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              error_message: error instanceof Error ? error.message : String(error),
              error_stack: error instanceof Error && error.stack ? error.stack : undefined,
              function_options: options,
            },
          }, req));
        } catch (logError) {
          console.error('Failed to log security event for unhandled error:', logError);
        }
      }

      return await createErrorResponse(
        'Internal server error',
        500,
        req,
        process.env.NODE_ENV === 'development' ? { error: error instanceof Error ? error.message : String(error) } : undefined,
        {
          logSecurityEvent: false, // Already logged above
        },
      );
    } finally {
      const duration = Date.now() - startTime;
      recordMetric({
        name: `${handlerName || 'edge-function'}.duration`,
        value: duration,
        unit: 'ms',
        tags: { status: responseStatus.toString(), cache: cacheStatus },
      });
      checkSla(`${handlerName || 'edge-function'}.duration`, duration);
    }
  };
}

/**
 * Record cache metrics for monitoring
 */
function recordCacheMetric(handlerName: string | undefined, cacheStatus: string): void {
  recordMetric({
    name: `${handlerName || 'edge-function'}.cache.${cacheStatus.toLowerCase()}`,
    value: 1,
    unit: 'count',
    tags: { status: cacheStatus },
  });
}