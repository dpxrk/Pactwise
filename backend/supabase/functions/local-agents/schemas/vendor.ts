import { z } from 'zod';

/**
 * Vendor Agent Input Validation Schemas
 *
 * Provides comprehensive Zod schemas for validating all Vendor Agent inputs.
 * Ensures type safety, input sanitization, and data integrity at runtime.
 *
 * @module VendorAgentSchemas
 * @version 1.0.0
 *
 * ## Features
 * - UUID validation with custom error messages
 * - Vendor-specific enum types (categories, risk levels, trends)
 * - Comprehensive process data validation
 * - Context validation with enterprise isolation
 * - Input sanitization and conflict detection
 *
 * @example
 * ```typescript
 * import { validateVendorAgentInput, validateVendorContext } from './schemas/vendor.ts';
 *
 * const inputResult = validateVendorAgentInput(requestData);
 * if (!inputResult.success) {
 *   console.error('Validation errors:', inputResult.errors);
 * }
 *
 * const contextResult = validateVendorContext(requestContext);
 * if (contextResult.success) {
 *   // Proceed with validated data
 *   const { vendorId, analysisType } = contextResult.data;
 * }
 * ```
 */

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/**
 * UUID validation schema with custom error message
 */
export const UuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Optional UUID schema that accepts null/undefined
 */
export const OptionalUuidSchema = z.string().uuid('Invalid UUID format').optional().nullable();

/**
 * Non-empty string schema with trimming
 */
export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty').transform(s => s.trim());

/**
 * Content string schema with reasonable limits (10MB max)
 */
export const ContentSchema = z.string()
  .min(1, 'Content cannot be empty')
  .max(10 * 1024 * 1024, 'Content exceeds 10MB limit');

/**
 * Optional content schema for text/content fields
 */
export const OptionalContentSchema = ContentSchema.optional();

// =============================================================================
// VENDOR-SPECIFIC SCHEMAS
// =============================================================================

/**
 * Analysis type schema for vendor agent operations
 * - portfolio: Enterprise-wide vendor portfolio analysis
 * - onboarding: New vendor evaluation and due diligence
 * - specific: Targeted analysis of a specific vendor by ID
 * - general: Initial vendor assessment with red flag detection
 */
export const VendorAnalysisTypeSchema = z.enum([
  'portfolio',
  'onboarding',
  'specific',
  'general',
], {
  errorMap: () => ({ message: 'Invalid vendor analysis type. Must be: portfolio, onboarding, specific, or general' }),
});

/**
 * Vendor category schema for classification
 * Supports standard business categories with 'other' as fallback
 */
export const VendorCategorySchema = z.enum([
  'technology',
  'consulting',
  'marketing',
  'facilities',
  'logistics',
  'legal',
  'financial',
  'other',
], {
  errorMap: () => ({ message: 'Invalid vendor category' }),
});

/**
 * Risk level schema for vendor risk assessment
 */
export const RiskLevelSchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
], {
  errorMap: () => ({ message: 'Invalid risk level. Must be: low, medium, high, or critical' }),
});

/**
 * Performance trend schema for tracking vendor performance over time
 */
export const PerformanceTrendSchema = z.enum([
  'improving',
  'declining',
  'stable',
], {
  errorMap: () => ({ message: 'Invalid performance trend. Must be: improving, declining, or stable' }),
});

/**
 * Spend level schema for vendor spend classification
 */
export const SpendLevelSchema = z.enum([
  'strategic',
  'significant',
  'moderate',
  'small',
  'minimal',
], {
  errorMap: () => ({ message: 'Invalid spend level' }),
});

/**
 * Pricing competitiveness schema
 */
export const PricingCompetitivenessSchema = z.enum([
  'competitive',
  'above_market',
  'below_market',
], {
  errorMap: () => ({ message: 'Invalid pricing competitiveness value' }),
});

/**
 * Relationship strength schema
 */
export const RelationshipStrengthSchema = z.enum([
  'strong',
  'moderate',
  'weak',
], {
  errorMap: () => ({ message: 'Invalid relationship strength' }),
});

// =============================================================================
// COMPLEX TYPE SCHEMAS
// =============================================================================

/**
 * Financial data schema for vendor financial assessment
 */
export const FinancialDataSchema = z.object({
  /** Annual revenue in dollars */
  revenue: z.number().nonnegative('Revenue must be non-negative').optional(),
  /** Profit margin as decimal (e.g., 0.15 for 15%) */
  profitMargin: z.number().min(-1).max(1).optional(),
  /** Debt ratio as decimal (total debt / total assets) */
  debtRatio: z.number().min(0).max(2).optional(),
  /** Credit score (300-850 for US, or normalized) */
  creditScore: z.number().min(0).max(1000).optional(),
}).strict();

/**
 * Reference schema for vendor references
 */
export const ReferenceSchema = z.object({
  /** Company or contact name */
  name: z.string().max(255).optional(),
  /** Rating score (1-5) */
  rating: z.number().min(1).max(5),
  /** Any concerns noted */
  concern: z.string().max(1000).optional(),
  /** Contact email */
  email: z.string().email().optional(),
  /** Relationship type */
  relationshipType: z.string().max(100).optional(),
}).strict();

/**
 * Pricing data schema
 */
export const PricingSchema = z.object({
  /** Total price/cost */
  total: z.number().nonnegative().optional(),
  /** Price breakdown by component */
  breakdown: z.record(z.string(), z.number()).optional(),
  /** Whether pricing is negotiable */
  negotiable: z.boolean().optional(),
  /** Whether volume discounts are available */
  volumeDiscounts: z.boolean().optional(),
}).strict();

/**
 * Market benchmark schema for pricing comparison
 */
export const MarketBenchmarkSchema = z.object({
  /** Market average price */
  average: z.number().nonnegative().optional(),
  /** Minimum market price */
  minimum: z.number().nonnegative().optional(),
  /** Maximum market price */
  maximum: z.number().nonnegative().optional(),
  /** Sample size for benchmark */
  sampleSize: z.number().int().nonnegative().optional(),
}).strict();

/**
 * Documentation schema for vendor onboarding documents
 */
export const DocumentationSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.boolean(),
    z.object({
      provided: z.boolean(),
      verified: z.boolean().optional(),
      expirationDate: z.string().datetime().optional(),
    }),
  ]),
).refine(
  (obj) => JSON.stringify(obj).length < 1024 * 1024,
  'Documentation data too large (max 1MB)',
);

/**
 * Contact info schema
 */
export const ContactInfoSchema = z.object({
  email: z.string().email().optional().nullable(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format').optional().nullable(),
  address: z.string().max(500).optional().nullable(),
}).strict();

/**
 * Location schema for geographic data
 */
export const LocationSchema = z.object({
  country: z.string().length(2, 'Country must be ISO 2-letter code').optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
}).strict();

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Main input schema for VendorAgent.process() method
 * Validates all possible input combinations for vendor operations
 */
export const VendorAgentProcessDataSchema = z.object({
  // === Identification Fields ===
  /** Vendor ID for specific vendor analysis */
  vendorId: OptionalUuidSchema,
  /** Analysis type override (usually from context) */
  analysisType: VendorAnalysisTypeSchema.optional(),

  // === Basic Vendor Information ===
  /** Vendor name */
  name: z.string().min(1).max(255).optional(),
  /** Vendor category classification */
  category: VendorCategorySchema.optional(),
  /** Vendor description */
  description: z.string().max(5000).optional(),
  /** Services offered by vendor */
  services: z.array(z.string().max(255)).max(50).optional(),
  /** Vendor email */
  email: z.string().email().optional(),
  /** Vendor phone */
  phone: z.string().max(50).optional(),
  /** Vendor address */
  address: z.string().max(500).optional(),
  /** Year established */
  established: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  /** Number of employees */
  employees: z.number().int().nonnegative().optional(),
  /** Annual revenue */
  revenue: z.number().nonnegative().optional(),

  // === Onboarding Documentation ===
  /** Documentation records for onboarding evaluation */
  documentation: DocumentationSchema.optional(),

  // === Financial Assessment ===
  /** Financial data for stability assessment */
  financial: FinancialDataSchema.optional(),

  // === Reference Evaluation ===
  /** Array of vendor references */
  references: z.array(ReferenceSchema).max(20).optional(),

  // === Capability Assessment ===
  /** Required capabilities for matching */
  requiredCapabilities: z.array(z.string().max(255)).max(100).optional(),
  /** Vendor's declared capabilities */
  vendorCapabilities: z.array(z.string().max(255)).max(100).optional(),

  // === Pricing Assessment ===
  /** Vendor pricing data */
  pricing: PricingSchema.optional(),
  /** Market benchmark for comparison */
  marketBenchmark: MarketBenchmarkSchema.optional(),

  // === Risk Assessment Fields ===
  /** Vendor size classification */
  vendorSize: z.enum(['micro', 'small', 'medium', 'large']).optional(),
  /** Project size for capacity matching */
  projectSize: z.enum(['small', 'medium', 'large']).optional(),
  /** Vendor location data */
  vendorLocation: LocationSchema.optional(),
  /** Company location for geographic risk assessment */
  companyLocation: LocationSchema.optional(),

  // === Compliance & Risk Fields ===
  /** Insurance status */
  insurance: z.boolean().optional(),
  /** Number of complaints on record */
  complaints: z.number().int().nonnegative().optional(),
  /** Active litigation flag */
  litigation: z.boolean().optional(),

  // === Content Fields ===
  /** Raw content for analysis */
  content: OptionalContentSchema,
  /** Alternative text field */
  text: OptionalContentSchema,
}).refine(
  data => {
    // At least one identifier or content must be provided
    const hasIdentifier = data.vendorId || data.name;
    const hasContent = data.content || data.text;
    const hasDocumentation = data.documentation && Object.keys(data.documentation).length > 0;
    const hasAnalysisData = data.financial || data.references?.length || data.requiredCapabilities?.length;

    return hasIdentifier || hasContent || hasDocumentation || hasAnalysisData;
  },
  'At least one of: vendorId, name, content, text, documentation, or analysis data must be provided',
);

/**
 * Context validation schema for vendor agent operations
 * Validates the context passed alongside process data
 */
export const VendorContextSchema = z.object({
  /** Vendor ID for targeted analysis */
  vendorId: OptionalUuidSchema,
  /** Type of analysis to perform */
  analysisType: VendorAnalysisTypeSchema.optional(),
  /** User ID performing the request */
  userId: OptionalUuidSchema,
  /** Enterprise ID for data isolation (security critical) */
  enterpriseId: OptionalUuidSchema,
  /** Task ID if part of a larger workflow */
  taskId: OptionalUuidSchema,
  /** Contract ID for contract-related vendor analysis */
  contractId: OptionalUuidSchema,
  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
}).strict();

/**
 * Vendor risk data schema for new vendor risk assessment
 */
export const VendorRiskDataSchema = z.object({
  vendorSize: z.enum(['micro', 'small', 'medium', 'large']).optional(),
  projectSize: z.enum(['small', 'medium', 'large']).optional(),
  vendorLocation: LocationSchema.optional(),
  companyLocation: LocationSchema.optional(),
  analysisType: VendorAnalysisTypeSchema.optional(),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate vendor agent process data input
 *
 * @param data - Raw input data to validate
 * @returns Validation result with success flag, validated data or errors
 *
 * @example
 * ```typescript
 * const result = validateVendorAgentInput({
 *   vendorId: '123e4567-e89b-12d3-a456-426614174000',
 *   analysisType: 'specific',
 * });
 *
 * if (result.success) {
 *   // result.data is fully typed and validated
 *   console.log(result.data.vendorId);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validateVendorAgentInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof VendorAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = VendorAgentProcessDataSchema.parse(data);
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
 * Validate vendor agent context
 *
 * @param context - Raw context object to validate
 * @returns Validation result with success flag, validated context or errors
 *
 * @example
 * ```typescript
 * const result = validateVendorContext({
 *   vendorId: '123e4567-e89b-12d3-a456-426614174000',
 *   analysisType: 'portfolio',
 *   userId: '456e7890-e89b-12d3-a456-426614174001',
 * });
 * ```
 */
export function validateVendorContext(context: unknown): {
  success: boolean;
  data?: z.infer<typeof VendorContextSchema>;
  errors?: string[];
} {
  try {
    const validated = VendorContextSchema.parse(context);
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
 * Validate a single UUID value
 *
 * @param value - Value to validate as UUID
 * @returns Validation result with value or error message
 *
 * @example
 * ```typescript
 * const result = validateUuid('123e4567-e89b-12d3-a456-426614174000');
 * if (result.success) {
 *   console.log('Valid UUID:', result.value);
 * }
 * ```
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
 * Validate vendor category value
 *
 * @param value - Category string to validate
 * @returns Validation result
 */
export function validateVendorCategory(value: unknown): {
  success: boolean;
  value?: z.infer<typeof VendorCategorySchema>;
  error?: string;
} {
  try {
    const validated = VendorCategorySchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid vendor category. Must be: technology, consulting, marketing, facilities, logistics, legal, financial, or other',
    };
  }
}

/**
 * Validate analysis type value
 *
 * @param value - Analysis type string to validate
 * @returns Validation result
 */
export function validateAnalysisType(value: unknown): {
  success: boolean;
  value?: z.infer<typeof VendorAnalysisTypeSchema>;
  error?: string;
} {
  try {
    const validated = VendorAnalysisTypeSchema.parse(value);
    return { success: true, value: validated };
  } catch {
    return {
      success: false,
      error: 'Invalid analysis type. Must be: portfolio, onboarding, specific, or general',
    };
  }
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize content string - removes control characters and normalizes whitespace
 *
 * @param content - Raw content string to sanitize
 * @returns Sanitized content string
 *
 * @example
 * ```typescript
 * const clean = sanitizeContent('Hello\x00World\r\n\r\n\r\n\r\nTest');
 * // Result: 'HelloWorld\n\n\nTest'
 * ```
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters (except newlines/tabs)
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize line endings (CRLF -> LF, CR -> LF)
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove excessive whitespace (more than 3 consecutive newlines)
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Detect encoding issues (mojibake) in content
 * Mojibake occurs when text is decoded using the wrong character encoding
 *
 * @param content - Content to check for encoding issues
 * @returns Detection result with examples of problematic patterns
 *
 * @example
 * ```typescript
 * const result = detectEncodingIssues('CafÃ© au lait'); // UTF-8 as Latin-1
 * // result.hasMojibake === true
 * ```
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
    /\uFFFD{2,}/g,              // Multiple replacement characters
    /[\u00E2][\u00C2]/g,        // Double-encoded UTF-8
    /Ã[€-¿]/g,                  // Common UTF-8 to Latin-1 corruption
    /â€[™""\u009D]/g,           // Smart quotes corruption
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
 * Detect conflicting inputs between data and context
 * Returns warnings for any conflicts found that may affect processing
 *
 * @param data - Validated process data
 * @param context - Validated context (optional)
 * @returns Array of warning messages describing conflicts
 *
 * @example
 * ```typescript
 * const warnings = detectInputConflicts(
 *   { vendorId: 'uuid-1', content: 'text', text: 'different text' },
 *   { vendorId: 'uuid-2', analysisType: 'specific' }
 * );
 * // warnings: ['VendorId differs between data and context - using data.vendorId', ...]
 * ```
 */
export function detectInputConflicts(
  data: z.infer<typeof VendorAgentProcessDataSchema>,
  context?: z.infer<typeof VendorContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for both content and text provided with different values
  if (data.content && data.text) {
    if (data.content !== data.text) {
      warnings.push('Both content and text provided with different values - using content');
    }
  }

  // Check for vendorId in both data and context with different values
  if (data.vendorId && context?.vendorId && data.vendorId !== context.vendorId) {
    warnings.push('VendorId differs between data and context - using data.vendorId');
  }

  // Check for analysisType in both data and context with different values
  if (data.analysisType && context?.analysisType && data.analysisType !== context.analysisType) {
    warnings.push('AnalysisType differs between data and context - using context.analysisType');
  }

  // Check for vendorId without specific analysis type
  if (data.vendorId && context?.analysisType && context.analysisType !== 'specific') {
    warnings.push('VendorId provided but analysisType is not "specific" - may cause unexpected behavior');
  }

  // Check for onboarding without required data
  if (context?.analysisType === 'onboarding') {
    if (!data.documentation && !data.financial && !data.references?.length) {
      warnings.push('Onboarding analysis requested but no documentation, financial data, or references provided');
    }
  }

  // Check for portfolio analysis with vendorId (which limits to single vendor)
  if (context?.analysisType === 'portfolio' && (data.vendorId || context.vendorId)) {
    warnings.push('Portfolio analysis requested but vendorId provided - portfolio analysis is enterprise-wide');
  }

  // Check for capability mismatch assessment without required data
  if (data.requiredCapabilities?.length && !data.vendorCapabilities?.length) {
    warnings.push('Required capabilities provided but vendor capabilities missing - capability matching will be incomplete');
  }

  // Check for pricing comparison without benchmark
  if (data.pricing?.total && !data.marketBenchmark?.average) {
    warnings.push('Pricing data provided but market benchmark missing - competitiveness cannot be assessed');
  }

  return warnings;
}

/**
 * Sanitize vendor name - removes dangerous characters and normalizes
 *
 * @param name - Raw vendor name
 * @returns Sanitized vendor name
 */
export function sanitizeVendorName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = name.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove potentially dangerous characters for display
  sanitized = sanitized.replace(/[<>]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}

/**
 * Validate and sanitize a complete vendor input object
 * Combines validation with sanitization for production use
 *
 * @param data - Raw input data
 * @returns Validation result with sanitized data or errors
 */
export function validateAndSanitizeVendorInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof VendorAgentProcessDataSchema>;
  errors?: string[];
  warnings?: string[];
} {
  // First validate
  const validationResult = validateVendorAgentInput(data);

  if (!validationResult.success) {
    return validationResult;
  }

  const validatedData = validationResult.data!;
  const warnings: string[] = [];

  // Sanitize content fields
  if (validatedData.content) {
    const encodingCheck = detectEncodingIssues(validatedData.content);
    if (encodingCheck.hasMojibake) {
      warnings.push(`Potential encoding issues detected in content: ${encodingCheck.examples.join(', ')}`);
    }
    validatedData.content = sanitizeContent(validatedData.content);
  }

  if (validatedData.text) {
    const encodingCheck = detectEncodingIssues(validatedData.text);
    if (encodingCheck.hasMojibake) {
      warnings.push(`Potential encoding issues detected in text: ${encodingCheck.examples.join(', ')}`);
    }
    validatedData.text = sanitizeContent(validatedData.text);
  }

  // Sanitize name
  if (validatedData.name) {
    validatedData.name = sanitizeVendorName(validatedData.name);
  }

  return {
    success: true,
    data: validatedData,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Validated vendor agent input type */
export type ValidatedVendorAgentInput = z.infer<typeof VendorAgentProcessDataSchema>;

/** Validated vendor context type */
export type ValidatedVendorContext = z.infer<typeof VendorContextSchema>;

/** Vendor analysis type enum */
export type VendorAnalysisType = z.infer<typeof VendorAnalysisTypeSchema>;

/** Vendor category enum */
export type VendorCategory = z.infer<typeof VendorCategorySchema>;

/** Risk level enum */
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/** Performance trend enum */
export type PerformanceTrend = z.infer<typeof PerformanceTrendSchema>;

/** Spend level enum */
export type SpendLevel = z.infer<typeof SpendLevelSchema>;

/** Pricing competitiveness enum */
export type PricingCompetitiveness = z.infer<typeof PricingCompetitivenessSchema>;

/** Relationship strength enum */
export type RelationshipStrength = z.infer<typeof RelationshipStrengthSchema>;

/** Financial data type */
export type FinancialData = z.infer<typeof FinancialDataSchema>;

/** Reference type */
export type Reference = z.infer<typeof ReferenceSchema>;

/** Pricing type */
export type Pricing = z.infer<typeof PricingSchema>;

/** Market benchmark type */
export type MarketBenchmark = z.infer<typeof MarketBenchmarkSchema>;

/** Location type */
export type Location = z.infer<typeof LocationSchema>;

/** Contact info type */
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

/** Vendor risk data type */
export type VendorRiskData = z.infer<typeof VendorRiskDataSchema>;
