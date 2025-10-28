/// <reference path="../../types/global.d.ts" />

import { z } from 'zod';

export const contractSchema = z.object({
  title: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  storageId: z.string().min(1),
  vendorId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  value: z.number().positive().optional().nullable(),
  isAutoRenew: z.boolean().optional(),
  autoAnalyze: z.boolean().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other']),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  website: z.string().url().optional().nullable(),
  contactName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const budgetSchema = z.object({
  name: z.string().min(1).max(255),
  budgetType: z.enum(['annual', 'quarterly', 'monthly', 'project', 'department']),
  totalBudget: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  department: z.string().max(100).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  parentBudgetId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Type exports using Zod inference for type-safe usage
export type ContractInput = z.infer<typeof contractSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${(error as z.ZodError).errors.map((e: z.ZodIssue) => e.message).join(', ')}`);
    }
    throw error;
  }
};

// Alternative validation that returns result object (compatible with local-agents style)
export function validateRequestSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { data?: T; errors?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error };
    }
    throw error;
  }
}

// SECURITY: Input sanitization functions to prevent injection attacks
export const sanitizeInput = {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  string: (input: string, maxLength: number = 1000): string => {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    return input
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection chars
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, maxLength);
  },

  /**
   * Sanitize search query to prevent SQL injection
   */
  searchQuery: (query: string): string => {
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }

    return query
      .replace(/[;'"\\]/g, '') // Remove SQL injection chars
      .replace(/[-]{2,}/g, '') // Remove SQL comment sequences
      .replace(/\/\*.*?\*\//g, '') // Remove block comments
      .replace(/\s+(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi, ' ') // Remove SQL keywords
      .trim()
      .substring(0, 500);
  },

  /**
   * Sanitize URL parameters
   */
  urlParam: (param: string | null): string | null => {
    if (!param) {return null;}

    return decodeURIComponent(param)
      .replace(/[<>'"&]/g, '')
      .replace(/[^\w\s\-._@]/g, '') // Allow only safe characters
      .trim()
      .substring(0, 255);
  },

  /**
   * Validate and sanitize UUID
   */
  uuid: (id: string): string => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }
    return id.toLowerCase();
  },

  /**
   * Sanitize JSON object recursively
   */
  jsonObject: (obj: unknown, maxDepth: number = 10): unknown => {
    if (maxDepth <= 0) {
      throw new Error('Maximum recursion depth exceeded');
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 100).map(item => sanitizeInput.jsonObject(item, maxDepth - 1));
    }

    const sanitized: Record<string, unknown> = {};
    let keyCount = 0;

    for (const [key, value] of Object.entries(obj)) {
      if (keyCount >= 50) {break;} // Limit object size

      const sanitizedKey = sanitizeInput.string(key, 100);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeInput.jsonObject(value, maxDepth - 1);
        keyCount++;
      }
    }

    return sanitized;
  },
};

// Enhanced schemas with sanitization
export const secureStringSchema = z.string()
  .transform((val: string) => sanitizeInput.string(val))
  .refine((val: string) => val.length > 0, 'String cannot be empty after sanitization');

export const secureSearchSchema = z.string()
  .transform((val: string) => sanitizeInput.searchQuery(val))
  .refine((val: string) => val.length > 0, 'Search query cannot be empty after sanitization');

export const secureUuidSchema = z.string()
  .transform((val: string) => sanitizeInput.uuid(val));

export const secureUrlParamSchema = z.string().nullable()
  .transform((val: string | null) => sanitizeInput.urlParam(val));

// SECURITY: Secure error handling to prevent information leakage
export const secureErrorHandler = {
  /**
   * Create a secure error response that doesn't leak internal details
   */
  createErrorResponse: (
    error: Error | unknown,
    request: Request,
    statusCode: number = 500,
    userMessage?: string,
  ): Response => {
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';

    // Log the full error for internal debugging
    console.error('Internal error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // Determine safe error message for client
    let safeMessage: string;

    if (statusCode >= 400 && statusCode < 500) {
      // Client errors - can show specific validation errors
      if (error instanceof Error && error.message.includes('Validation error:')) {
        safeMessage = error.message;
      } else if (userMessage) {
        safeMessage = userMessage;
      } else {
        safeMessage = 'Invalid request';
      }
    } else {
      // Server errors - use generic message in production
      safeMessage = userMessage || 'An internal server error occurred';
    }

    const errorResponse = {
      error: safeMessage,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && error instanceof Error ? {
        debug: {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5), // Limit stack trace
        },
      } : {}),
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          // Security headers to prevent information leakage
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Cache-Control': 'no-store',
        },
      },
    );
  },

  /**
   * Safe error messages for common scenarios
   */
  messages: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Invalid input data',
    RATE_LIMIT: 'Too many requests',
    DATABASE_ERROR: 'Database operation failed',
    INTERNAL_ERROR: 'An unexpected error occurred',
  } as const,

  /**
   * Check if an error should be treated as a client error
   */
  isClientError: (error: Error | unknown): boolean => {
    if (!(error instanceof Error)) {return false;}

    const clientErrorPatterns = [
      /validation error/i,
      /invalid.*format/i,
      /not found/i,
      /access denied/i,
      /unauthorized/i,
      /forbidden/i,
      /bad request/i,
    ];

    return clientErrorPatterns.some(pattern =>
      pattern.test(error.message),
    );
  },

  /**
   * Sanitize database error messages
   */
  sanitizeDatabaseError: (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes('unique constraint')) {
      return 'A record with these details already exists';
    }
    if (message.includes('foreign key constraint')) {
      return 'Referenced record not found or cannot be deleted';
    }
    if (message.includes('not null constraint')) {
      return 'Required field is missing';
    }
    if (message.includes('check constraint')) {
      return 'Invalid value provided';
    }
    if (message.includes('connection')) {
      return 'Service temporarily unavailable';
    }

    return 'Database operation failed';
  },
};