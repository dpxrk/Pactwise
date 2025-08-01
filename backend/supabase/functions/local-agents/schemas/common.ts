import { z } from 'zod';

/**
 * Common validation schemas used across agents
 */

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Enterprise ID validation with additional checks
export const enterpriseIdSchema = z.string().uuid('Invalid enterprise ID');

// Date/time validation
export const dateSchema = z.string().datetime('Invalid date format');
export const futureDateSchema = z.string().datetime().refine(
  (date) => new Date(date) > new Date(),
  'Date must be in the future',
);
export const pastDateSchema = z.string().datetime().refine(
  (date) => new Date(date) < new Date(),
  'Date must be in the past',
);

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Priority validation (1-10)
export const prioritySchema = z.number().int().min(1).max(10).default(5);

// Status enums
export const taskStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
]);

export const contractStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'active',
  'expired',
  'terminated',
  'renewed',
]);

export const vendorStatusSchema = z.enum([
  'pending',
  'active',
  'inactive',
  'suspended',
  'terminated',
]);

// Money/currency validation
export const moneySchema = z.object({
  amount: z.number().positive('Amount must be positive').finite(),
  currency: z.string().length(3, 'Currency code must be 3 characters').default('USD'),
});

// Email validation with additional checks
export const emailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots',
  );

// Phone validation (international format)
export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

// URL validation
export const urlSchema = z.string().url('Invalid URL format');

// File validation
export const fileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(100 * 1024 * 1024), // 100MB max
  type: z.string().regex(/^[\w\-]+\/[\w\-]+$/, 'Invalid MIME type'),
  url: urlSchema.optional(),
  content: z.string().optional(),
});

// Address schema
export const addressSchema = z.object({
  street1: z.string().min(1).max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().length(2, 'Country must be 2-letter ISO code'),
});

// Metadata validation (flexible but with limits)
export const metadataSchema = z.record(
  z.string(),
  z.unknown(),
).refine(
  (obj) => JSON.stringify(obj).length < 65536,
  'Metadata too large (max 64KB)',
);

// Search/filter schemas
export const searchQuerySchema = z.string()
  .min(1, 'Search query cannot be empty')
  .max(1000, 'Search query too long')
  .transform(s => s.trim());

export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  'Start date must be before or equal to end date',
);

// Role validation
export const roleSchema = z.enum(['viewer', 'user', 'manager', 'admin', 'owner']);

// Common error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Success response wrapper
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    metadata: z.object({
      timestamp: dateSchema,
      processingTime: z.number().optional(),
    }).optional(),
  });

// Batch operation schemas
export const batchOperationSchema = z.object({
  operations: z.array(z.any()).min(1).max(100),
  continueOnError: z.boolean().default(false),
  parallel: z.boolean().default(false),
});

// Audit fields schema
export const auditFieldsSchema = z.object({
  createdAt: dateSchema,
  createdBy: uuidSchema.optional(),
  updatedAt: dateSchema.optional(),
  updatedBy: uuidSchema.optional(),
});

// Permission schemas
export const permissionActionSchema = z.enum(['read', 'write', 'delete', 'execute']);

export const resourceTypeSchema = z.enum([
  'contracts',
  'vendors',
  'budgets',
  'users',
  'agents',
  'insights',
  'workflows',
  'reports',
]);

// Validation helpers
export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    strict?: boolean;
    sanitize?: boolean;
  },
): { success: boolean; data?: T; errors?: z.ZodError } => {
  try {
    const parsed = options?.strict
      ? schema.strict().parse(data)
      : schema.parse(data);

    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

// Create nullable version of any schema
export const nullable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.null()]);

// Create optional version with default
export const optionalWithDefault = <T extends z.ZodTypeAny, D>(
  schema: T,
  defaultValue: D,
) => schema.optional().default(defaultValue);

// Array validation with length constraints
export const arrayWithLimits = <T extends z.ZodTypeAny>(
  schema: T,
  min: number = 0,
  max: number = 100,
) => z.array(schema).min(min).max(max);

// String validation with sanitization
export const sanitizedStringSchema = z.string()
  .transform(s => s.trim())
  .refine(s => s.length > 0, 'String cannot be empty after trimming');

// Enum from array helper
export const enumFromArray = <T extends string>(arr: readonly T[]) =>
  z.enum(arr as [T, ...T[]]);

// Percentage validation (0-100)
export const percentageSchema = z.number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage cannot exceed 100');

// Score validation (0-10)
export const scoreSchema = z.number()
  .min(0, 'Score must be at least 0')
  .max(10, 'Score cannot exceed 10');

// JSON validation
export const jsonSchema = z.string().refine(
  (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
  'Invalid JSON string',
).transform(s => JSON.parse(s));

// Cron expression validation
export const cronSchema = z.string().regex(
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
  'Invalid cron expression',
);