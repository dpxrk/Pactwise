/// <reference path="../../types/global.d.ts" />

import { getCorsHeaders } from './cors.ts';
import { logSecurityEvent } from './security-monitoring.ts';

/**
 * Shared response helper functions for consistent API responses
 *
 * STATE-OF-THE-ART 2025/2026 API Response Standards:
 * - Unified error format with machine-readable error codes
 * - Request ID tracking for debugging
 * - API versioning headers
 * - Deprecation headers for sunset planning
 */

// ==================== Error Codes ====================

/**
 * Standard machine-readable error codes
 */
export type ErrorCode =
  // Authentication errors
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_EXPIRED'
  | 'AUTH_INSUFFICIENT_PERMISSIONS'
  // Validation errors
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  // Resource errors
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'
  | 'GONE'
  // Rate limiting
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'BUDGET_EXCEEDED'
  // Server errors
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'DEPENDENCY_FAILURE'
  // Business logic errors
  | 'CONTRACT_LIMIT_REACHED'
  | 'USER_LIMIT_REACHED'
  | 'OPERATION_NOT_ALLOWED'
  | 'FEATURE_DISABLED';

/**
 * Map HTTP status codes to default error codes
 */
const STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'AUTH_REQUIRED',
  403: 'AUTH_INSUFFICIENT_PERMISSIONS',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  422: 'INVALID_INPUT',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
  502: 'DEPENDENCY_FAILURE',
  503: 'SERVICE_UNAVAILABLE',
  504: 'TIMEOUT',
};

// ==================== Types ====================

/**
 * Security event type union
 */
export type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_violation'
  | 'suspicious_activity'
  | 'data_breach_attempt'
  | 'privilege_escalation'
  | 'unauthorized_access'
  | 'malicious_payload'
  | 'brute_force_attack'
  | 'anomalous_behavior'
  | 'system_intrusion'
  | 'compliance_violation'
  | 'sla_breach'
  | 'threat_detected';

/**
 * Security event severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Structure for security event metadata used in responses
 */
export interface SecurityEventMetadata {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  source_ip: string;
  endpoint: string;
  user_agent?: string;
  user_id?: string;
  enterprise_id?: string;
}

/**
 * Generic API response structure (legacy format)
 * @template T - The type of data being returned
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

/**
 * Unified Error Response Format (2025 Standard)
 */
export interface UnifiedErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown[];
    requestId: string;
  };
  _meta: {
    timestamp: string;
    version: string;
    deprecated?: boolean;
    sunset?: string;
  };
}

/**
 * Unified Success Response Format (2025 Standard)
 */
export interface UnifiedSuccessResponse<T = unknown> {
  data: T;
  message?: string;
  _meta: {
    timestamp: string;
    version: string;
    deprecated?: boolean;
    sunset?: string;
  };
}

/**
 * Paginated response with pagination metadata
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
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
 * @template T - The type of data being returned
 * @param data - The data to include in the response
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @param req - Optional request object for CORS headers
 * @returns Response object with JSON payload
 */
export function createSuccessResponse<T = unknown>(
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

/**
 * Type guard to validate SecurityEventType
 * @param value - Value to check
 * @returns True if value is a valid SecurityEventType
 */
function isValidSecurityEventType(value: string): value is SecurityEventType {
  const validTypes: SecurityEventType[] = [
    'auth_failure',
    'rate_limit_violation',
    'suspicious_activity',
    'data_breach_attempt',
    'privilege_escalation',
    'unauthorized_access',
    'malicious_payload',
    'brute_force_attack',
    'anomalous_behavior',
    'system_intrusion',
    'compliance_violation',
    'sla_breach',
    'threat_detected',
  ];
  return validTypes.includes(value as SecurityEventType);
}

/**
 * Helper to create security event with proper optional fields
 * @param baseEvent - Base security event data
 * @param req - Request object to extract metadata from
 * @returns Complete security event object
 */
function createSecurityEvent(
  baseEvent: Omit<SecurityEventMetadata, 'source_ip' | 'endpoint' | 'user_agent'>,
  req: Request,
): SecurityEventMetadata {
  const userAgent = req.headers.get('user-agent');
  const result: SecurityEventMetadata = {
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
 * Options for error response security logging
 */
export interface ErrorResponseOptions {
  logSecurityEvent?: boolean;
  securityEventType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  enterpriseId?: string;
}

/**
 * Create an error response with optional security monitoring
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 * @param req - Optional request object for CORS headers and security logging
 * @param details - Optional additional error details
 * @param options - Security logging options
 * @returns Response object with error payload
 */
export async function createErrorResponse(
  error: string,
  status: number = 400,
  req?: Request,
  details?: Record<string, unknown>,
  options: ErrorResponseOptions = {},
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
    let eventType: SecurityEventType;
    let severity: SecuritySeverity = options.severity || 'medium';

    // Use custom event type if provided and valid, otherwise map HTTP status codes
    if (options.securityEventType && isValidSecurityEventType(options.securityEventType)) {
      eventType = options.securityEventType;
    } else if (status === 401 || status === 403) {
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
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 * @param req - Optional request object for CORS headers
 * @param details - Optional additional error details
 * @returns Response object with error payload
 */
export function createErrorResponseSync(
  error: string,
  status: number = 400,
  req?: Request,
  details?: Record<string, unknown>,
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
 * Pagination metadata for paginated responses
 */
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

/**
 * Create a paginated response
 * @template T - The type of items in the data array
 * @param data - Array of items to return
 * @param pagination - Pagination metadata
 * @param req - Optional request object for CORS headers
 * @returns Response object with paginated data
 */
export function createPaginatedResponse<T = unknown>(
  data: T[],
  pagination: PaginationParams,
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

// ==================== Unified Response Functions (2025 Standard) ====================

const API_VERSION = '1.0.0';

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get request ID from headers or generate new one
 */
function getRequestId(req?: Request): string {
  return req?.headers.get('x-request-id') || generateRequestId();
}

/**
 * Build standard headers for unified responses
 */
function buildUnifiedHeaders(
  req?: Request,
  options?: {
    deprecated?: boolean;
    sunset?: string;
    version?: string;
  },
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Version': options?.version || API_VERSION,
    'X-Request-Id': getRequestId(req),
    ...(req ? getCorsHeaders(req) : {}),
  };

  if (options?.deprecated) {
    headers['Deprecation'] = 'true';
  }

  if (options?.sunset) {
    headers['Sunset'] = options.sunset;
  }

  return headers;
}

/**
 * Create unified success response (2025 Standard)
 */
export function createUnifiedSuccessResponse<T = unknown>(
  data: T,
  options?: {
    message?: string;
    status?: number;
    req?: Request;
    deprecated?: boolean;
    sunset?: string;
    version?: string;
  },
): Response {
  const response: UnifiedSuccessResponse<T> = {
    data,
    _meta: {
      timestamp: new Date().toISOString(),
      version: options?.version || API_VERSION,
    },
  };

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.deprecated) {
    response._meta.deprecated = true;
    if (options.sunset) {
      response._meta.sunset = options.sunset;
    }
  }

  return new Response(JSON.stringify(response), {
    status: options?.status || 200,
    headers: buildUnifiedHeaders(options?.req, options),
  });
}

/**
 * Create unified error response (2025 Standard)
 */
export function createUnifiedErrorResponse(
  code: ErrorCode,
  message: string,
  options?: {
    status?: number;
    details?: unknown[];
    req?: Request;
    deprecated?: boolean;
    sunset?: string;
    version?: string;
  },
): Response {
  const requestId = getRequestId(options?.req);

  const response: UnifiedErrorResponse = {
    error: {
      code,
      message,
      requestId,
    },
    _meta: {
      timestamp: new Date().toISOString(),
      version: options?.version || API_VERSION,
    },
  };

  if (options?.details && options.details.length > 0) {
    response.error.details = options.details;
  }

  if (options?.deprecated) {
    response._meta.deprecated = true;
    if (options.sunset) {
      response._meta.sunset = options.sunset;
    }
  }

  // Determine status code from error code if not provided
  const status = options?.status || Object.entries(STATUS_TO_ERROR_CODE)
    .find(([_, c]) => c === code)?.[0]
    ? parseInt(Object.entries(STATUS_TO_ERROR_CODE).find(([_, c]) => c === code)![0])
    : 400;

  return new Response(JSON.stringify(response), {
    status,
    headers: buildUnifiedHeaders(options?.req, options),
  });
}

/**
 * Create unified paginated response (2025 Standard)
 */
export function createUnifiedPaginatedResponse<T = unknown>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  options?: {
    message?: string;
    req?: Request;
    deprecated?: boolean;
    sunset?: string;
    version?: string;
  },
): Response {
  const response = {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page * pagination.limit < pagination.total,
      hasPrev: pagination.page > 1,
    },
    _meta: {
      timestamp: new Date().toISOString(),
      version: options?.version || API_VERSION,
    },
  };

  if (options?.deprecated) {
    (response._meta as Record<string, unknown>).deprecated = true;
    if (options.sunset) {
      (response._meta as Record<string, unknown>).sunset = options.sunset;
    }
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: buildUnifiedHeaders(options?.req, options),
  });
}

/**
 * Helper to convert status code to error code
 */
export function statusToErrorCode(status: number): ErrorCode {
  return STATUS_TO_ERROR_CODE[status] || 'INTERNAL_ERROR';
}

/**
 * Create error from status code (for backwards compatibility)
 */
export function createUnifiedErrorFromStatus(
  status: number,
  message: string,
  req?: Request,
  details?: unknown[],
): Response {
  return createUnifiedErrorResponse(statusToErrorCode(status), message, {
    status,
    details,
    req,
  });
}