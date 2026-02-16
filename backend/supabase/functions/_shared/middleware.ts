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
import {
  captureException,
  createContextFromRequest,
  addBreadcrumb,
  clearBreadcrumbs,
} from './sentry.ts';

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

// ==================== API Versioning ====================

/**
 * API Version configuration for endpoint versioning
 */
export interface VersioningOptions {
  /** Current API version for this endpoint (e.g., "1.0.0", "2.0.0") */
  version?: string;
  /** Whether this endpoint is deprecated */
  deprecated?: boolean;
  /** ISO 8601 date when the endpoint will be removed (e.g., "2025-12-31") */
  sunset?: string;
  /** Optional message to include in deprecation warning */
  deprecationMessage?: string;
  /** Minimum supported version (requests below this will be rejected) */
  minVersion?: string;
}

/**
 * Default API version
 */
const DEFAULT_API_VERSION = '1.0.0';

/**
 * Extract API version from request headers or URL
 */
function extractRequestedVersion(req: Request): string | null {
  // Check Accept-Version header first
  const acceptVersion = req.headers.get('Accept-Version');
  if (acceptVersion) return acceptVersion;

  // Check X-API-Version header
  const xApiVersion = req.headers.get('X-API-Version');
  if (xApiVersion) return xApiVersion;

  // Check URL path for version (e.g., /v1/contracts, /v2/contracts)
  const url = new URL(req.url);
  const versionMatch = url.pathname.match(/\/v(\d+(?:\.\d+(?:\.\d+)?)?)\//);
  if (versionMatch) return versionMatch[1];

  return null;
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a = b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const parts = v.replace(/^v/, '').split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Add versioning headers to response
 */
function addVersioningHeaders(
  response: Response,
  options: VersioningOptions,
  requestedVersion?: string | null,
): Response {
  const headers = new Headers(response.headers);
  const version = options.version || DEFAULT_API_VERSION;

  // Always add current API version
  headers.set('X-API-Version', version);

  // Add requested version if different
  if (requestedVersion && requestedVersion !== version) {
    headers.set('X-API-Requested-Version', requestedVersion);
  }

  // Add deprecation headers
  if (options.deprecated) {
    // RFC 8594 Deprecation header
    headers.set('Deprecation', 'true');

    // Add Link header pointing to documentation if available
    if (options.deprecationMessage) {
      headers.set('X-Deprecation-Notice', options.deprecationMessage);
    }
  }

  // Add Sunset header (RFC 8594)
  if (options.sunset) {
    // Sunset header expects HTTP-date format
    try {
      const sunsetDate = new Date(options.sunset);
      headers.set('Sunset', sunsetDate.toUTCString());
    } catch {
      // If invalid date, use as-is (might already be in correct format)
      headers.set('Sunset', options.sunset);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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
  /** API versioning options (2025 Standard) */
  versioning?: VersioningOptions;
}

export interface RequestContext {
  req: Request;
  user?: AuthenticatedUser;
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  rateLimitResult?: RateLimitInfo;
  accessResponse?: Record<string, unknown>; // To store the zero-trust access response
  traceContext: TraceContext;
  /** API version info */
  apiVersion?: {
    current: string;
    requested: string | null;
    deprecated: boolean;
    sunset?: string;
  };
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

  // 5 & 6. Threat detection and compliance checking (combined to read body once)
  if ((options.detectThreats || options.compliance) && req.body) {
    // Read body once for both checks
    const bodyText = await req.text();

    // Run threat detection if enabled
    if (options.detectThreats) {
      const threatResult = detectThreats(bodyText);
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
    }

    // Run compliance check if enabled
    if (options.compliance) {
      try {
        const bodyJson = JSON.parse(bodyText);
        const complianceResult = checkCompliance(bodyJson, options.compliance.framework);
        if (!complianceResult.isCompliant) {
          await logComplianceIssue(req, complianceResult, context);
          // In a real application, you might want to block the request here
          // For now, we'll just log it
        }
      } catch (error) {
        // If body is not JSON, skip compliance check
        console.warn('[Middleware] Compliance check skipped: body is not valid JSON');
      }
    }

    // Re-create the request with the body for handler consumption
    context.req = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
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

    // Clear breadcrumbs from previous request and add initial breadcrumb
    clearBreadcrumbs();
    addBreadcrumb({
      type: 'http',
      category: 'request',
      message: `${method} ${pathname}`,
      level: 'info',
      data: {
        handler: handlerName,
        query: Object.fromEntries(url.searchParams),
      },
    });

    // Extract and validate API version
    const requestedVersion = extractRequestedVersion(req);
    const currentVersion = options.versioning?.version || DEFAULT_API_VERSION;

    // Check minimum version requirement
    if (options.versioning?.minVersion && requestedVersion) {
      if (compareVersions(requestedVersion, options.versioning.minVersion) < 0) {
        const errorResponse = new Response(
          JSON.stringify({
            error: {
              code: 'VERSION_NOT_SUPPORTED',
              message: `API version ${requestedVersion} is no longer supported. Minimum supported version is ${options.versioning.minVersion}.`,
              requestId: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`,
            },
            _meta: {
              timestamp: new Date().toISOString(),
              version: currentVersion,
            },
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': currentVersion,
              'X-API-Min-Version': options.versioning.minVersion,
              ...getCorsHeaders(req),
            },
          },
        );
        responseStatus = 400;
        return errorResponse;
      }
    }

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

      // Add API version info to context
      if (options.versioning) {
        context.apiVersion = {
          current: currentVersion,
          requested: requestedVersion,
          deprecated: options.versioning.deprecated || false,
          sunset: options.versioning.sunset,
        };
      }

      // Helper to apply versioning headers to response
      const applyVersioning = (response: Response): Response => {
        if (options.versioning) {
          return addVersioningHeaders(response, options.versioning, requestedVersion);
        }
        return response;
      };

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
              return applyVersioning(createNotModifiedResponse(cachedResponse.etag, cachePolicy));
            }

            // Return cached response
            cacheStatus = 'HIT';
            responseStatus = cachedResponse.status;
            recordCacheMetric(handlerName, cacheStatus);
            return applyVersioning(restoreCachedResponse(cachedResponse, cachePolicy));
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
          return applyVersioning(createNotModifiedResponse(etag, cachePolicy));
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
        return applyVersioning(addCacheHeaders(newResponse, cachePolicy, etag));
      }

      // For non-cacheable responses, apply versioning and return
      recordCacheMetric(handlerName, cacheStatus);
      return applyVersioning(response);
    } catch (error) {
      console.error('Edge Function error:', error);

      // Capture error in Sentry
      try {
        const sentryContext = createContextFromRequest(req);
        sentryContext.tags = {
          ...sentryContext.tags,
          handler: handlerName || 'unknown',
          endpoint: pathname,
        };
        sentryContext.extra = {
          ...sentryContext.extra,
          middleware_options: options,
          trace_id: traceContext.traceId,
        };
        await captureException(error, sentryContext);
      } catch (sentryError) {
        console.error('Failed to send error to Sentry:', sentryError);
      }

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

      // Create error response with versioning headers
      const errorResponse = await createErrorResponse(
        'Internal server error',
        500,
        req,
        Deno.env.get('ENVIRONMENT') === 'development' ? { error: error instanceof Error ? error.message : String(error) } : undefined,
        {
          logSecurityEvent: false, // Already logged above
        },
      );

      // Apply versioning headers to error response
      if (options.versioning) {
        return addVersioningHeaders(errorResponse, options.versioning, requestedVersion);
      }
      return errorResponse;
    } finally {
      const duration = Date.now() - startTime;

      // Add response breadcrumb for Sentry tracking
      addBreadcrumb({
        type: 'http',
        category: 'response',
        message: `Response: ${responseStatus}`,
        level: responseStatus >= 400 ? 'error' : 'info',
        data: {
          status: responseStatus,
          duration_ms: duration,
          cache: cacheStatus,
        },
      });

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