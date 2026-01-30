import { z } from 'zod';

/**
 * Financial Agent Input Validation Schemas
 *
 * Provides Zod schemas for validating all Financial Agent inputs.
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
 * Currency code schema (ISO 4217)
 */
export const CurrencyCodeSchema = z.string()
  .length(3, 'Currency code must be 3 characters')
  .regex(/^[A-Z]{3}$/, 'Invalid currency code format')
  .default('USD');

/**
 * Positive number schema
 */
export const PositiveNumberSchema = z.number()
  .min(0, 'Value must be non-negative');

/**
 * Percentage schema (0-100)
 */
export const PercentageSchema = z.number()
  .min(0, 'Percentage must be >= 0')
  .max(100, 'Percentage must be <= 100');

/**
 * Payment terms schema
 */
export const PaymentTermsSchema = z.enum([
  'net_30',
  'net_60',
  'net_90',
  'due_on_receipt',
  'upfront',
  'milestone',
  'installment',
  'custom',
], {
  errorMap: () => ({ message: 'Invalid payment terms' }),
}).optional();

// =============================================================================
// FINANCIAL DATA SCHEMAS
// =============================================================================

/**
 * Schema for monetary amount with currency
 */
export const MonetaryAmountSchema = z.object({
  value: PositiveNumberSchema,
  currency: CurrencyCodeSchema.optional(),
});

/**
 * Schema for cost breakdown category
 */
export const CostCategorySchema = z.object({
  name: z.string().min(1).max(100),
  amount: PositiveNumberSchema,
  type: z.enum(['one-time', 'recurring']).optional(),
  description: z.string().max(500).optional(),
});

/**
 * Schema for payment schedule installment
 */
export const PaymentInstallmentSchema = z.object({
  amount: PositiveNumberSchema,
  due_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().max(500).optional(),
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
});

/**
 * Schema for budget data
 */
export const BudgetDataSchema = z.object({
  id: UuidSchema.optional(),
  amount: PositiveNumberSchema,
  category: z.string().min(1).max(100).optional(),
  fiscal_year: z.number().int().min(2000).max(2100).optional(),
  utilization: z.array(z.object({
    total_spent: PositiveNumberSchema,
    total_committed: PositiveNumberSchema,
  })).optional(),
});

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Schema for financial agent process data
 */
export const FinancialAgentProcessDataSchema = z.object({
  /** Document content for analysis */
  content: ContentSchema.optional(),

  /** Alternative text field (same as content) */
  text: ContentSchema.optional(),

  /** Extracted text from document */
  extracted_text: ContentSchema.optional(),

  /** Contract value */
  value: PositiveNumberSchema.optional(),

  /** Alternative contract value field */
  contractValue: PositiveNumberSchema.optional(),

  /** Total value */
  totalValue: PositiveNumberSchema.optional(),

  /** Amount */
  amount: PositiveNumberSchema.optional(),

  /** Payment terms */
  payment_terms: z.string().max(100).optional(),

  /** Category for budget lookup */
  category: z.string().min(1).max(100).optional(),

  /** Currency code */
  currency: CurrencyCodeSchema.optional(),

  /** Budget data for analysis */
  budgetData: BudgetDataSchema.optional(),

  /** Budget ID reference */
  budgetId: UuidSchema.optional(),

  /** Pre-extracted cost breakdown */
  extracted_cost_breakdown: z.unknown().optional(),

  /** Pre-extracted financial terms */
  extracted_financial_terms: z.unknown().optional(),

  /** Pre-extracted ROI data */
  extracted_roi: z.unknown().optional(),

  /** Due date for payment */
  dueDate: z.string().optional(),
}).refine(
  data => data.content || data.text || data.extracted_text ||
          data.value || data.contractValue || data.totalValue || data.amount ||
          data.budgetData || data.budgetId,
  'Either content/text, value, or budget data must be provided',
);

/**
 * Schema for agent context
 */
export const AgentContextSchema = z.object({
  /** Contract ID being processed */
  contractId: OptionalUuidSchema,

  /** Vendor ID being processed */
  vendorId: OptionalUuidSchema,

  /** User ID performing the action */
  userId: OptionalUuidSchema,

  /** Budget ID being processed */
  budgetId: OptionalUuidSchema,

  /** Task ID for tracking */
  taskId: OptionalUuidSchema,

  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate financial agent process data
 */
export function validateFinancialAgentInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof FinancialAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = FinancialAgentProcessDataSchema.parse(data);
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
 * Validate monetary amount
 */
export function validateMonetaryAmount(amount: unknown): {
  success: boolean;
  value?: z.infer<typeof MonetaryAmountSchema>;
  error?: string;
} {
  try {
    const validated = MonetaryAmountSchema.parse(amount);
    return { success: true, value: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid monetary amount' };
    }
    return { success: false, error: 'Invalid monetary amount' };
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
 * Validate budget data
 */
export function validateBudgetData(data: unknown): {
  success: boolean;
  data?: z.infer<typeof BudgetDataSchema>;
  errors?: string[];
} {
  try {
    const validated = BudgetDataSchema.parse(data);
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

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize content string - removes potential injection attempts
 * while preserving financial text formatting
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
 * Sanitize numeric value - ensures valid number within reasonable bounds
 */
export function sanitizeNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  let numValue: number;

  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,£€¥]/g, '').trim();
    numValue = parseFloat(cleaned);
  } else if (typeof value === 'number') {
    numValue = value;
  } else {
    return null;
  }

  // Check for valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return null;
  }

  // Reasonable bounds for financial values (up to 1 trillion)
  if (numValue < 0 || numValue > 1_000_000_000_000) {
    return null;
  }

  return numValue;
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
    /Ã[\u0080-\u00BF]/g, // Common UTF-8 as Latin-1 patterns
  ];

  const examples: string[] = [];
  let hasMojibake = false;

  for (const pattern of mojibakePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      hasMojibake = true;
      examples.push(...matches.slice(0, 3)); // Limit to 3 examples per pattern
    }
  }

  return {
    hasMojibake,
    examples: [...new Set(examples)].slice(0, 10), // Dedupe and limit
  };
}

/**
 * Detect conflicting inputs and return warnings
 */
export function detectInputConflicts(
  data: z.infer<typeof FinancialAgentProcessDataSchema>,
  context?: z.infer<typeof AgentContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for multiple content sources
  const contentSources = [data.content, data.text, data.extracted_text].filter(Boolean);
  if (contentSources.length > 1) {
    warnings.push('Multiple content sources provided - using first available');
  }

  // Check for multiple value sources
  const valueSources = [data.value, data.contractValue, data.totalValue, data.amount].filter(v => v !== undefined);
  if (valueSources.length > 1) {
    const uniqueValues = [...new Set(valueSources)];
    if (uniqueValues.length > 1) {
      warnings.push(`Multiple different values provided: ${uniqueValues.join(', ')} - using largest`);
    }
  }

  // Check for conflicting context IDs
  if (context?.contractId && context?.vendorId) {
    warnings.push('Both contractId and vendorId provided - context may be ambiguous');
  }

  // Check for budget analysis without budget reference
  if (data.budgetData && !data.budgetData.amount && !data.budgetId) {
    warnings.push('Budget data provided but no amount specified');
  }

  // Check for vendor analysis without vendor context
  if (context?.vendorId && !context?.contractId && data.category) {
    // This is fine - vendor analysis with category filter
  } else if (context?.vendorId && context?.budgetId) {
    warnings.push('Both vendorId and budgetId provided - analysis may be split');
  }

  return warnings;
}

/**
 * Normalize financial values from different formats
 */
export function normalizeFinancialValue(input: unknown): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  // Already a number
  if (typeof input === 'number') {
    return isFinite(input) ? input : null;
  }

  // String format
  if (typeof input === 'string') {
    // Remove currency symbols, commas, and whitespace
    let cleaned = input.replace(/[$£€¥,\s]/g, '');

    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    // Handle K/M/B suffixes
    const suffixMatch = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])$/i);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      const suffix = suffixMatch[2].toUpperCase();
      const multipliers: Record<string, number> = { K: 1000, M: 1_000_000, B: 1_000_000_000 };
      return num * (multipliers[suffix] || 1);
    }

    const parsed = parseFloat(cleaned);
    return isFinite(parsed) ? parsed : null;
  }

  // Object with value property
  if (typeof input === 'object' && 'value' in (input as Record<string, unknown>)) {
    return normalizeFinancialValue((input as Record<string, unknown>).value);
  }

  return null;
}

/**
 * Extract the best value from multiple financial value sources
 */
export function extractBestValue(data: z.infer<typeof FinancialAgentProcessDataSchema>): number {
  const values = [
    data.value,
    data.contractValue,
    data.totalValue,
    data.amount,
  ].filter((v): v is number => v !== undefined && v > 0);

  if (values.length === 0) return 0;

  // Return the largest value (most likely to be total)
  return Math.max(...values);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ValidatedFinancialAgentInput = z.infer<typeof FinancialAgentProcessDataSchema>;
export type ValidatedAgentContext = z.infer<typeof AgentContextSchema>;
export type ValidatedBudgetData = z.infer<typeof BudgetDataSchema>;
export type ValidatedMonetaryAmount = z.infer<typeof MonetaryAmountSchema>;
export type ValidatedCostCategory = z.infer<typeof CostCategorySchema>;
export type ValidatedPaymentInstallment = z.infer<typeof PaymentInstallmentSchema>;
