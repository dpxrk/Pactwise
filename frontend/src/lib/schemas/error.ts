import { z } from 'zod';

import { timestampSchema } from './base';

// Error schemas
export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR', 'AUTHORIZATION_ERROR', 'NOT_FOUND',
  'CONFLICT', 'RATE_LIMIT_EXCEEDED', 'INTERNAL_ERROR',
  'EXTERNAL_SERVICE_ERROR', 'TIMEOUT_ERROR'
]);

export const errorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
  timestamp: timestampSchema,
});

// API response schemas
export const paginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    nextCursor: z.string().optional(),
    prevCursor: z.string().optional(),
  }),
  meta: z.record(z.unknown()).optional(),
});

export const apiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: errorSchema.optional(),
  metadata: z.object({
    requestId: z.string(),
    timestamp: timestampSchema,
    executionTime: z.number(),
  }).optional(),
});
