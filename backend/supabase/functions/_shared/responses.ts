/// <reference path="../../types/global.d.ts" />

import { getCorsHeaders } from './cors.ts';
import { logSecurityEvent } from './security-monitoring.ts';

/**
 * Shared response helper functions for consistent API responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Create a successful response with data
 */
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200,
  req?: Request,
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    response.message = message;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(req ? getCorsHeaders(req) : {}),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers,
  });
}

// Helper to create security event with proper optional fields
function createSecurityEvent(baseEvent: any, req: Request): any {
  const userAgent = req.headers.get('user-agent');
  const result = {
    ...baseEvent,
    source_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    endpoint: `${req.method} ${new URL(req.url).pathname}`,
  };
  
  if (userAgent) {
    result.user_agent = userAgent;
  }
  
  return result;
}

/**
 * Create an error response with optional security monitoring
 */
export async function createErrorResponse(
  error: string,
  status: number = 400,
  req?: Request,
  details?: any,
  options: { 
    logSecurityEvent?: boolean; 
    securityEventType?: string; 
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    enterpriseId?: string;
  } = {},
): Promise<Response> {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(req ? getCorsHeaders(req) : {}),
  };

  // Log high-severity errors as security events
  if (req && options.logSecurityEvent !== false && status >= 400) {
    let eventType = options.securityEventType;
    let severity = options.severity || 'medium';

    if (!eventType) {
      // Map HTTP status codes to security event types
      if (status === 401 || status === 403) {
        eventType = 'unauthorized_access';
      } else if (status === 429) {
        eventType = 'rate_limit_violation';
      } else if (status >= 500) {
        eventType = 'system_intrusion';
        severity = 'high';
      } else if (status === 400) {
        eventType = 'malicious_payload';
      } else {
        eventType = 'suspicious_activity';
      }
    }

    try {
      const securityEvent = createSecurityEvent({
        event_type: eventType,
        severity,
        title: `HTTP ${status} Error`,
        description: error,
        metadata: {
          status_code: status,
          error_details: details,
          url: req.url,
        },
      }, req);

      if (options.userId) {
        securityEvent.user_id = options.userId;
      }
      if (options.enterpriseId) {
        securityEvent.enterprise_id = options.enterpriseId;
      }

      await logSecurityEvent(securityEvent);
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
  }

  return new Response(JSON.stringify(response), {
    status,
    headers,
  });
}

/**
 * Synchronous version of createErrorResponse for cases where security logging is not needed
 */
export function createErrorResponseSync(
  error: string,
  status: number = 400,
  req?: Request,
  details?: any,
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(req ? getCorsHeaders(req) : {}),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers,
  });
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T = any>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  req?: Request,
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      ...pagination,
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(req ? getCorsHeaders(req) : {}),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  });
}

/**
 * Create a validation error response
 */
export async function createValidationErrorResponse(
  errors: string[],
  req?: Request,
): Promise<Response> {
  return await createErrorResponse(
    `Validation failed: ${errors.join(', ')}`,
    400,
    req,
  );
}

/**
 * Create an unauthorized response
 */
export async function createUnauthorizedResponse(req?: Request): Promise<Response> {
  return await createErrorResponse(
    'Authentication required',
    401,
    req,
  );
}

/**
 * Create a forbidden response
 */
export async function createForbiddenResponse(req?: Request): Promise<Response> {
  return await createErrorResponse(
    'Access denied',
    403,
    req,
  );
}

/**
 * Create a not found response
 */
export async function createNotFoundResponse(resource?: string, req?: Request): Promise<Response> {
  const message = resource ? `${resource} not found` : 'Resource not found';
  return await createErrorResponse(message, 404, req);
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
  error?: string,
  req?: Request,
): Response {
  return createErrorResponseSync(
    error || 'Internal server error',
    500,
    req,
  );
}