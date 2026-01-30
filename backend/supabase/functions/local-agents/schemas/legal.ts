import { z } from 'zod';

/**
 * Legal Agent Input Validation Schemas
 *
 * Provides Zod schemas for validating all Legal Agent inputs.
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
 * Approval action schema
 */
export const ApprovalActionSchema = z.enum(['approve', 'reject', 'escalate'], {
  errorMap: () => ({ message: 'Action must be: approve, reject, or escalate' }),
});

/**
 * Severity level schema
 */
export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Schema for contract approval data
 */
export const ContractApprovalDataSchema = z.object({
  action: ApprovalActionSchema,
  approvalType: z.string().min(1).max(100).optional(),
  comments: z.string().max(5000).optional(),
  conditions: z.array(z.string().max(500)).max(20).optional(),
});

/**
 * Schema for legal agent process data
 */
export const LegalAgentProcessDataSchema = z.object({
  /** Document content for analysis */
  content: ContentSchema.optional(),

  /** Alternative text field (same as content) */
  text: ContentSchema.optional(),

  /** Action to perform (for approval workflows) */
  action: ApprovalActionSchema.optional(),

  /** Type of approval */
  approvalType: z.string().min(1).max(100).optional(),

  /** Comments for approval/rejection */
  comments: z.string().max(5000).optional(),

  /** Conditions for conditional approval */
  conditions: z.array(z.string().max(500)).max(20).optional(),

  /** Type of compliance check to perform */
  checkType: z.string().min(1).max(50).optional(),

  /** Whether to perform compliance analysis */
  complianceCheck: z.boolean().optional(),
}).refine(
  data => data.content || data.text || data.action,
  'Either content/text or action must be provided',
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

  /** Document ID being processed */
  documentId: OptionalUuidSchema,

  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
}).strict();

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate legal agent process data
 */
export function validateLegalAgentInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof LegalAgentProcessDataSchema>;
  errors?: string[];
} {
  try {
    const validated = LegalAgentProcessDataSchema.parse(data);
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
 * Validate contract approval data
 */
export function validateApprovalData(data: unknown): {
  success: boolean;
  data?: z.infer<typeof ContractApprovalDataSchema>;
  errors?: string[];
} {
  try {
    const validated = ContractApprovalDataSchema.parse(data);
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

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize content string - removes potential injection attempts
 * while preserving legal text formatting
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
    /Ã[€-¿]/g, // Common UTF-8 as Latin-1 patterns
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
  data: z.infer<typeof LegalAgentProcessDataSchema>,
  context?: z.infer<typeof AgentContextSchema>,
): string[] {
  const warnings: string[] = [];

  // Check for both content and text provided
  if (data.content && data.text) {
    if (data.content !== data.text) {
      warnings.push('Both content and text provided with different values - using content');
    }
  }

  // Check for action without required context
  if (data.action && !context?.contractId) {
    warnings.push('Approval action specified but no contractId in context');
  }

  // Check for conflicting context IDs
  if (context?.contractId && context?.vendorId) {
    warnings.push('Both contractId and vendorId provided - context may be ambiguous');
  }

  // Check for conditions without approve action
  if (data.conditions && data.conditions.length > 0 && data.action !== 'approve') {
    warnings.push('Conditions provided but action is not approve - conditions will be ignored');
  }

  return warnings;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ValidatedLegalAgentInput = z.infer<typeof LegalAgentProcessDataSchema>;
export type ValidatedAgentContext = z.infer<typeof AgentContextSchema>;
export type ValidatedApprovalData = z.infer<typeof ContractApprovalDataSchema>;
