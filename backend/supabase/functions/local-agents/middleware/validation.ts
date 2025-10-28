import { z } from 'zod';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { createErrorResponseSync } from '../../_shared/responses.ts';
import {
  apiHeadersSchema,
} from '../schemas/api.ts';

const createValidationErrorResponse = (errors: unknown) => {
  return createErrorResponseSync(`Validation failed: ${JSON.stringify(errors)}`, 400);
};

/**
 * Validation middleware for agent system
 */

export interface ValidationOptions {
  strict?: boolean;
  allowUnknownFields?: boolean;
  sanitize?: boolean;
  logErrors?: boolean;
}

/**
 * Request validation middleware
 */
export async function validateRequestMiddleware<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {},
): Promise<{
  valid: boolean;
  data?: T;
  response?: Response;
  headers?: Record<string, string>;
}> {
  try {
    // Validate headers if needed
    const headers = Object.fromEntries(req.headers.entries());
    const headerValidation = apiHeadersSchema.safeParse(headers);

    if (!headerValidation.success && options.strict) {
      return {
        valid: false,
        response: new Response(
          JSON.stringify(createValidationErrorResponse(headerValidation.error)),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          },
        ),
      };
    }

    // Parse request body
    let body: unknown;
    const contentType = req.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        body = await req.json();
      } catch (error) {
        return {
          valid: false,
          response: new Response(
            JSON.stringify(createErrorResponseSync(
              'Invalid JSON in request body',
              400,
            )),
            {
              status: 400,
              headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
          ),
        };
      }
    } else if (contentType?.includes('multipart/form-data')) {
      // Handle form data
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else if (req.method !== 'GET' && req.method !== 'DELETE') {
      // For non-GET/DELETE requests, expect a body
      return {
        valid: false,
        response: new Response(
          JSON.stringify(createErrorResponseSync(
            'Content-Type header is required',
            400,
          )),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          },
        ),
      };
    }

    // Apply schema options
    let validationSchema = schema;
    if (!options.allowUnknownFields && 'strict' in schema) {
      validationSchema = (schema as { strict: () => ZodSchema }).strict();
    }

    // Validate body
    const validation = validationSchema.safeParse(body);

    if (!validation.success) {
      if (options.logErrors) {
        console.error('Validation error:', validation.error);
      }

      return {
        valid: false,
        response: new Response(
          JSON.stringify(createValidationErrorResponse(validation.error)),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          },
        ),
      };
    }

    return {
      valid: true,
      data: validation.data,
      headers: headerValidation.success ? headerValidation.data : undefined,
    };

  } catch (error) {
    console.error('Validation middleware error:', error);

    return {
      valid: false,
      response: new Response(
        JSON.stringify(createErrorResponseSync(
          'An error occurred during validation',
          500,
          req,
          error instanceof Error ? error.message : String(error),
        )),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        },
      ),
    };
  }
}

/**
 * Query parameter validation
 */
export function validateQueryParams<T>(
  url: URL,
  schema: z.ZodSchema<T>,
): { valid: boolean; data?: T; errors?: z.ZodError } {
  const params = Object.fromEntries(url.searchParams.entries());

  // Convert array params
  for (const [key] of url.searchParams.entries()) {
    if (url.searchParams.getAll(key).length > 1) {
      (params as Record<string, unknown>)[key] = url.searchParams.getAll(key);
    }
  }

  try {
    const data = schema.parse(params);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error };
    }
    throw error;
  }
}

/**
 * Response validation (for ensuring our responses match schema)
 */
export function validateResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: { logErrors?: boolean } = {},
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (options.logErrors) {
      console.error('Response validation error:', error);
    }
    throw error;
  }
}

/**
 * Create a validated handler wrapper
 */
export function createValidatedHandler<TBody, TQuery = any>(
  bodySchema: z.ZodSchema<TBody>,
  handler: (data: TBody, query?: TQuery, headers?: Record<string, string>) => Promise<Response>,
  options?: {
    querySchema?: z.ZodSchema<TQuery>;
    validateHeaders?: boolean;
    validationOptions?: ValidationOptions;
  },
) {
  return async (req: Request): Promise<Response> => {
    // Validate body
    const bodyValidation = await validateRequestMiddleware(
      req,
      bodySchema,
      options?.validationOptions,
    );

    if (!bodyValidation.valid) {
      return bodyValidation.response!;
    }

    // Validate query params if schema provided
    let queryData: TQuery | undefined;
    if (options?.querySchema) {
      const url = new URL(req.url);
      const queryValidation = validateQueryParams(url, options.querySchema);

      if (!queryValidation.valid) {
        return new Response(
          JSON.stringify(createValidationErrorResponse(queryValidation.errors!)),
          {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          },
        );
      }

      queryData = queryValidation.data;
    }

    // Call handler with validated data
    return handler(
      bodyValidation.data!,
      queryData,
      options?.validateHeaders ? bodyValidation.headers : undefined,
    );
  };
}

/**
 * Sanitization helpers
 */
export const sanitizers = {
  // Remove HTML tags
  stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  },

  // Remove special characters (keep alphanumeric, spaces, basic punctuation)
  removeSpecialChars(input: string): string {
    return input.replace(/[^a-zA-Z0-9\s.,!?-]/g, '');
  },

  // Normalize whitespace
  normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  },

  // Sanitize file path
  sanitizePath(input: string): string {
    return input.replace(/[^a-zA-Z0-9._\-\/]/g, '');
  },

  // Truncate string
  truncate(input: string, maxLength: number): string {
    if (input.length <= maxLength) {return input;}
    return `${input.substring(0, maxLength - 3)}...`;
  },

  // Sanitize object (remove null/undefined)
  cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const clean: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined && value !== '') {
        clean[key as keyof T] = value as T[keyof T];
      }
    }
    return clean;
  },
};

/**
 * Custom Zod transformers for common sanitization
 */
export const sanitizationTransformers = {
  // Trim and normalize whitespace
  trimmedString: z.string().transform(s => sanitizers.normalizeWhitespace(s)),

  // Remove HTML
  safeString: z.string().transform(s => sanitizers.stripHtml(s)),

  // Lowercase email
  normalizedEmail: z.string().email().transform(s => s.toLowerCase().trim()),

  // Normalized phone
  normalizedPhone: z.string().transform(s => s.replace(/\D/g, '')),

  // Safe filename
  safeFilename: z.string().transform(s =>
    s.replace(/[^a-zA-Z0-9._\-]/g, '_').toLowerCase(),
  ),

  // Convert empty strings to null
  nullableString: z.string().transform(s => s.trim() === '' ? null : s),

  // Parse JSON safely
  jsonString: z.string().transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON string',
      });
      return z.NEVER;
    }
  }),
};

/**
 * Validation error formatter
 */
export function formatValidationErrors(
  error: z.ZodError,
  options: {
    includeCode?: boolean;
    includeValue?: boolean;
    maxErrors?: number;
  } = {},
): string[] {
  const errors = error.errors.slice(0, options.maxErrors || 10);

  return errors.map(err => {
    let message = `${err.path.join('.')}: ${err.message}`;

    if (options.includeCode && err.code) {
      message += ` (${err.code})`;
    }

    if (options.includeValue && 'received' in err) {
      message += ` - received: ${JSON.stringify(err.received)}`;
    }

    return message;
  });
}

/**
 * Batch validation helper
 */
export async function validateBatch<T>(
  items: unknown[],
  schema: z.ZodSchema<T>,
  options: {
    continueOnError?: boolean;
    maxErrors?: number;
  } = {},
): Promise<{
  valid: T[];
  invalid: Array<{ index: number; item: unknown; error: z.ZodError }>;
}> {
  const valid: T[] = [];
  const invalid: Array<{ index: number; item: unknown; error: z.ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = schema.safeParse(items[i]);

    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        index: i,
        item: items[i],
        error: result.error,
      });

      if (!options.continueOnError) {
        break;
      }

      if (options.maxErrors && invalid.length >= options.maxErrors) {
        break;
      }
    }
  }

  return { valid, invalid };
}

/**
 * Simple request validation function that matches the expected signature
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  req: Request,
): Promise<{ data?: T; errors?: z.ZodIssue[] }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { data: result.data };
    } else {
      return { errors: result.error.issues };
    }
  } catch (error) {
    return { 
      errors: [{
        code: 'custom',
        path: [],
        message: error instanceof Error ? error.message : 'Invalid request body',
      }] 
    };
  }
}