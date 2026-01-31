import { z } from 'zod';

/**
 * Analytics Agent Input Validation Schemas
 *
 * Provides Zod schemas for validating all Analytics Agent inputs.
 * Ensures type safety and input sanitization at runtime.
 */

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
export const UuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID schema that accepts null/undefined
 */
export const OptionalUuidSchema = z.string().uuid('Invalid UUID format').optional().nullable();

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty');

/**
 * Content string schema with reasonable limits
 */
export const ContentSchema = z.string()
  .min(1, 'Content cannot be empty')
  .max(10 * 1024 * 1024, 'Content exceeds 10MB limit');

/**
 * Analysis type schema
 */
export const AnalysisTypeSchema = z.enum([
  'contracts',
  'vendors',
  'budgets',
  'spending',
  'comprehensive',
], {
  errorMap: () => ({ message: 'Invalid analysis type' }),
});

/**
 * Time period schema for analytics
 */
export const TimePeriodSchema = z.enum([
  'day',
  'week',
  'month',
  'quarter',
  'year',
], {
  errorMap: () => ({ message: 'Invalid time period' }),
});

/**
 * Optimization target schema
 */
export const OptimizationTargetSchema = z.enum([
  'efficiency',
  'cost',
  'performance',
  'risk',
], {
  errorMap: () => ({ message: 'Invalid optimization target' }),
});

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Schema for analytics agent process data
 */
export const AnalyticsAgentProcessDataSchema = z.object({
  /** Type of analysis to perform */
  analysisType: AnalysisTypeSchema.optional(),

  /** Time period for analysis */
  period: TimePeriodSchema.optional(),

  /** Number of periods to look back */
  lookback: z.number().int().min(1).max(60).optional(),

  /** Specific vendor ID for vendor analysis */
  vendorId: OptionalUuidSchema,

  /** Specific budget ID for budget analysis */
  budgetId: OptionalUuidSchema,

  /** Start date for date range analysis */
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),

  /** End date for date range analysis */
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),

  /** Number of months ahead for forecasting */
  monthsAhead: z.number().int().min(1).max(24).optional(),

  /** Optimization target for budget analysis */
  optimizationTarget: OptimizationTargetSchema.optional(),

  /** Raw content for analysis (if applicable) */
  content: ContentSchema.optional(),

  /** Alternative text field */
  text: ContentSchema.optional(),
}).refine(
  data => {
    // If date range provided, ensure end is after start
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  'End date must be after or equal to start date',
);

/**
 * Schema for agent context
 */
export const AgentContextSchema = z.object({
  /** Contract ID being analyzed */
  contractId: OptionalUuidSchema,

  /** Vendor ID being analyzed */
  vendorId: OptionalUuidSchema,

  /** User ID performing the request */
  userId: OptionalUuidSchema,

  /** Budget ID being analyzed */
  budgetId: OptionalUuidSchema,

  /** Task ID if part of a larger task */
  taskId: OptionalUuidSchema,

  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate analytics agent process data
 */
export function validateAnalyticsAgentInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof AnalyticsAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = AnalyticsAgentProcessDataSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate agent context
 */
export function validateAgentContext(context: unknown): {
  success: boolean;
  data?: z.infer<typeof AgentContextSchema>;
  errors?: string[];
} {
  try {
    const validated = AgentContextSchema.parse(context);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate UUID format
 */
export function validateUuid(value: unknown): {
  success: boolean;
  value?: string;
  error?: string;
} {
  try {
    const validated = UuidSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return { success: false, error: 'Invalid UUID format' };
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return { valid: false, error: 'Invalid start date' };
    }
    if (isNaN(end.getTime())) {
      return { valid: false, error: 'Invalid end date' };
    }
    if (end < start) {
      return { valid: false, error: 'End date must be after start date' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Date validation failed' };
  }
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize content string - removes potential injection attempts
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters (except newlines/tabs)
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace (more than 3 consecutive newlines)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Detect encoding issues (mojibake) in content
 */
export function detectEncodingIssues(content: string): {
  hasMojibake: boolean;
  examples: string[];
} {
  if (!content) {
    return { hasMojibake: false, examples: [] };
  }

  // Common mojibake patterns
  const mojibakePatterns = [
    /[\u00C3][\u00A0-\u00BF]/g, // UTF-8 decoded as Latin-1
    /\uFFFD{2,}/g, // Multiple replacement characters
    /[\u00E2][\u00C2]/g, // Double-encoded UTF-8
  ];

  const examples: string[] = [];
  let hasMojibake = false;

  for (const pattern of mojibakePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      hasMojibake = true;
      examples.push(...matches.slice(0, 3));
    }
  }

  return {
    hasMojibake,
    examples: [...new Set(examples)].slice(0, 10),
  };
}

/**
 * Detect conflicting inputs and return warnings
 */
export function detectInputConflicts(
  data: z.infer<typeof AnalyticsAgentProcessDataSchema>,
  context?: z.infer<typeof AgentContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for both content and text provided
  if (data.content && data.text) {
    if (data.content !== data.text) {
      warnings.push('Both content and text provided with different values - using content');
    }
  }

  // Check for conflicting IDs
  if (data.vendorId && context?.contractId) {
    warnings.push('Both vendorId and contractId provided - context may be ambiguous');
  }

  // Check for date range without lookback
  if ((data.startDate || data.endDate) && data.lookback) {
    warnings.push('Both date range and lookback provided - date range takes precedence');
  }

  // Check for vendorId in both data and context
  if (data.vendorId && context?.vendorId && data.vendorId !== context.vendorId) {
    warnings.push('VendorId differs between data and context - using data.vendorId');
  }

  // Check for budgetId in both data and context
  if (data.budgetId && context?.budgetId && data.budgetId !== context.budgetId) {
    warnings.push('BudgetId differs between data and context - using data.budgetId');
  }

  return warnings;
}

/**
 * Normalize lookback period to days
 */
export function normalizeLookbackToDays(
  lookback: number,
  period: z.infer<typeof TimePeriodSchema> = 'month',
): number {
  const periodToDays: Record<string, number> = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };

  return lookback * (periodToDays[period] || 30);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ValidatedAnalyticsAgentInput = z.infer<typeof AnalyticsAgentProcessDataSchema>;
export type ValidatedAgentContext = z.infer<typeof AgentContextSchema>;
export type AnalysisType = z.infer<typeof AnalysisTypeSchema>;
export type TimePeriod = z.infer<typeof TimePeriodSchema>;
export type OptimizationTarget = z.infer<typeof OptimizationTargetSchema>;
