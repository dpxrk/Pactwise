/// <reference path="../../types/global.d.ts" />

import { rateLimitMiddleware } from './rate-limiting.ts';
import { getRateLimitRules, shouldBypassRateLimit } from './rate-limit-config.ts';
import { getCorsHeaders, handleCors } from './cors.ts';
import { getUserFromAuth } from './supabase.ts';
import { logSecurityEvent } from './security-monitoring.ts';
import { createErrorResponse } from './responses.ts';
import type { SecurityEvent, AuthUser, UserProfile, RateLimitInfo } from '../../types/api-types.ts';

/**
 * Standard middleware stack for Edge Functions
 * Includes CORS, rate limiting, and authentication helpers
 */

interface SecurityEventBase {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  details: Record<string, unknown>;
}

// Helper to create security event with proper optional fields
function createSecurityEvent(baseEvent: SecurityEventBase, req: Request): SecurityEvent {
  const userAgent = req.headers.get('user-agent');
  const result: SecurityEvent = {
    eventType: baseEvent.eventType as SecurityEvent['eventType'],
    severity: baseEvent.severity,
    userId: baseEvent.userId,
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    userAgent: userAgent || undefined,
    details: {
      ...baseEvent.details,
      endpoint: `${req.method} ${new URL(req.url).pathname}`,
    },
    timestamp: new Date(),
  };
  
  return result;
}

import { zeroTrustMiddleware } from './zero-trust-middleware.ts';

import { detectThreats, logThreat } from './threat-detection.ts';

import { checkCompliance, logComplianceIssue } from './compliance.ts';
import { recordMetric } from './performance-monitoring.ts';
import { createTraceContext, TraceContext } from './tracing.ts';
import { checkSla } from './sla-monitoring.ts';

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
}

export interface RequestContext {
  req: Request;
  user?: AuthUser;
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  rateLimitResult?: RateLimitInfo;
  accessResponse?: Record<string, unknown>; // To store the zero-trust access response
  traceContext: TraceContext;
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
      if (user.profile?.enterprise_id) {
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

    const rateLimitConfig: any = {
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
        const securityEvent = createSecurityEvent({
          event_type: 'rate_limit_violation',
          severity: 'medium',
          title: 'Rate Limit Exceeded',
          description: `Rate limit exceeded for ${endpoint}`,
          metadata: {
            user_tier: context.userTier,
            authenticated: context.isAuthenticated,
          },
        }, req);
        
        if (context.user?.id) {
          securityEvent.user_id = context.user.id;
        }
        if (context.user?.profile?.enterprise_id) {
          securityEvent.enterprise_id = context.user.profile.enterprise_id;
        }
        
        await logSecurityEvent(securityEvent);
      }
      return { success: false, response: rateLimitResponse };
    }
  }

  // 4. Apply Zero-Trust policies
  if (options.zeroTrust && context.isAuthenticated) {
    const ztResult = await zeroTrustMiddleware(context, options.zeroTrust.resource, options.zeroTrust.action);
    if (!ztResult.success) {
      return { success: false, response: ztResult.response };
    }
    context = ztResult.context;
  }

  // 5. Detect threats in request body
  if (options.detectThreats && req.body) {
    const body = await req.text();
    const threatResult = detectThreats(body);
    if (threatResult.isThreat) {
      await logThreat(req, threatResult, context);
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
 */
export function withMiddleware(
  handler: (context: RequestContext) => Promise<Response>,
  options: MiddlewareOptions = {},
  handlerName?: string,
) {
  return async (req: Request): Promise<Response> => {
    const traceContext = createTraceContext(req);
    const startTime = Date.now();
    let responseStatus = 500;
    try {
      const middlewareResult = await applyMiddleware(req, options, traceContext);

      if (!middlewareResult.success) {
        responseStatus = middlewareResult.response.status;
        return middlewareResult.response;
      }

      const response = await handler(middlewareResult.context);
      responseStatus = response.status;
      return response;
    } catch (error) {
      console.error('Edge Function error:', error);

      // Log unhandled errors as security events
      if (options.securityMonitoring !== false) {
        try {
          const errorEvent = createSecurityEvent({
            event_type: 'system_intrusion',
            severity: 'high',
            title: 'Unhandled Edge Function Error',
            description: `Unhandled error in Edge Function: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              error_message: error instanceof Error ? error.message : String(error),
              function_options: options,
            },
          }, req);
          
          if (error instanceof Error && error.stack) {
            errorEvent.metadata.error_stack = error.stack;
          }
          
          await logSecurityEvent(errorEvent);
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
        tags: { status: responseStatus.toString() },
      });
      checkSla(`${handlerName || 'edge-function'}.duration`, duration);
    }
  };
}