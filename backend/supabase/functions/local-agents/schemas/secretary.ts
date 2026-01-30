import { z } from 'zod';
import {
  uuidSchema,
  sanitizedStringSchema,
  metadataSchema,
  percentageSchema,
} from './common.ts';

/**
 * Secretary Agent Validation Schemas
 *
 * Comprehensive input/output validation for the Secretary Agent
 * to ensure data integrity and prevent processing failures.
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum document content length (5MB of text) */
export const MAX_DOCUMENT_LENGTH = 5_000_000;

/** Minimum content length for meaningful analysis */
export const MIN_CONTENT_LENGTH = 10;

/** Maximum number of amounts to extract */
export const MAX_AMOUNTS = 100;

/** Maximum number of parties to extract */
export const MAX_PARTIES = 50;

/** Maximum party name length (characters) */
export const MAX_PARTY_NAME_LENGTH = 500;

/** Maximum number of clauses to analyze */
export const MAX_CLAUSES = 500;

/** Maximum number of dates to extract */
export const MAX_DATES = 100;

/** Supported contract types */
export const CONTRACT_TYPES = [
  'service_agreement',
  'purchase_order',
  'nda',
  'lease',
  'employment',
  'license',
  'partnership',
  'msa',
  'sow',
  'other',
] as const;

/** Supported document types */
export const DOCUMENT_TYPES = [
  'contract',
  'invoice',
  'proposal',
  'report',
  'memo',
  'letter',
  'policy',
  'certificate',
  'w9',
  'insurance_certificate',
  'purchase_order',
  'other',
] as const;

/** Vendor document types */
export const VENDOR_DOCUMENT_TYPES = [
  'w9',
  'insurance_certificate',
  'msa',
  'sow',
  'nda',
  'invoice',
  'purchase_order',
  'other',
] as const;

/** Workflow types */
export const WORKFLOW_TYPES = [
  'contract_onboarding',
  'vendor_verification',
  'document_processing',
  'compliance_check',
] as const;

/** Complexity levels */
export const COMPLEXITY_LEVELS = ['low', 'medium', 'high'] as const;

/** Party types */
export const PARTY_TYPES = [
  'vendor',
  'client',
  'contractor',
  'primary',
  'secondary',
  'party',
] as const;

/** Amount types */
export const AMOUNT_TYPES = [
  'total',
  'payment',
  'fee',
  'penalty',
  'deposit',
  'annual',
  'monthly',
  'amount',
] as const;

/** Supported currencies */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY'] as const;

/** Clause categories */
export const CLAUSE_CATEGORIES = [
  'payment',
  'termination',
  'liability',
  'confidentiality',
  'warranty',
  'general',
] as const;

// =============================================================================
// HELPER SCHEMAS
// =============================================================================

/** ISO date string (YYYY-MM-DD format) */
export const isoDateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
).refine(
  (date) => !isNaN(Date.parse(date)),
  'Invalid date value'
);

/** Nullable ISO date */
export const nullableIsoDateSchema = z.union([isoDateSchema, z.null()]);

/** Currency code schema */
export const currencySchema = z.string()
  .length(3, 'Currency code must be 3 characters')
  .toUpperCase()
  .default('USD');

/** Non-negative number schema */
export const nonNegativeNumberSchema = z.number()
  .finite('Amount must be finite')
  .refine((n) => !isNaN(n), 'Amount cannot be NaN')
  .refine((n) => n >= 0, 'Amount must be non-negative');

/** Positive number schema (for financial amounts) */
export const positiveNumberSchema = z.number()
  .finite('Amount must be finite')
  .refine((n) => !isNaN(n), 'Amount cannot be NaN')
  .refine((n) => n > 0, 'Amount must be positive');

/** Content text schema with length validation */
export const contentSchema = z.string()
  .min(MIN_CONTENT_LENGTH, `Content must be at least ${MIN_CONTENT_LENGTH} characters`)
  .max(MAX_DOCUMENT_LENGTH, `Content exceeds maximum length of ${MAX_DOCUMENT_LENGTH} characters`)
  .transform((s) => s.trim());

/** Optional content that can be empty */
export const optionalContentSchema = z.string()
  .max(MAX_DOCUMENT_LENGTH, `Content exceeds maximum length of ${MAX_DOCUMENT_LENGTH} characters`)
  .transform((s) => s?.trim() ?? '')
  .optional();

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

/**
 * Secretary Agent Context Schema
 * Validates the context object passed to the agent
 */
export const secretaryContextSchema = z.object({
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
}).refine(
  // At least one context identifier should be present for meaningful processing
  (ctx) => ctx.contractId || ctx.vendorId || ctx.userId || ctx.taskId,
  { message: 'At least one context identifier (contractId, vendorId, userId, or taskId) is recommended' }
).optional();

/**
 * Base Secretary Input Schema
 * Validates the core data input to the secretary agent
 */
export const secretaryInputSchema = z.object({
  // Content fields (at least one should have content for meaningful processing)
  content: optionalContentSchema,
  text: optionalContentSchema,
  extracted_text: optionalContentSchema,

  // Document reference
  documentId: uuidSchema.optional(),

  // Workflow options
  useWorkflow: z.boolean().default(false),
  workflowType: z.enum(WORKFLOW_TYPES).optional(),
}).refine(
  // Ensure we have some content to process OR a document reference
  (data) => {
    const hasContent = !!(data.content?.length || data.text?.length || data.extracted_text?.length);
    const hasDocumentRef = !!data.documentId;
    return hasContent || hasDocumentRef;
  },
  { message: 'Either content (content, text, or extracted_text) or documentId must be provided' }
);

/**
 * Contract Document Input Schema
 * Validates input specifically for contract document processing
 */
export const contractDocumentInputSchema = z.object({
  contractId: uuidSchema,
  content: optionalContentSchema,
  text: optionalContentSchema,
  extracted_text: optionalContentSchema,
}).refine(
  (data) => !!(data.content?.length || data.text?.length || data.extracted_text?.length),
  { message: 'At least one content field must have data for contract processing' }
);

/**
 * Vendor Document Input Schema
 * Validates input specifically for vendor document processing
 */
export const vendorDocumentInputSchema = z.object({
  vendorId: uuidSchema,
  content: optionalContentSchema,
  text: optionalContentSchema,
  extracted_text: optionalContentSchema,
});

/**
 * Stored Document Input Schema
 * Validates input for processing documents from storage
 */
export const storedDocumentInputSchema = z.object({
  documentId: uuidSchema,
});

/**
 * General Document Input Schema
 * Validates input for general document analysis
 */
export const generalDocumentInputSchema = z.object({
  content: optionalContentSchema,
  text: optionalContentSchema,
  extracted_text: optionalContentSchema,
  documentId: uuidSchema.optional(),
  useWorkflow: z.boolean().default(false),
  workflowType: z.enum(WORKFLOW_TYPES).optional(),
}).refine(
  (data) => {
    const hasContent = !!(data.content?.length || data.text?.length || data.extracted_text?.length);
    return hasContent;
  },
  { message: 'At least one content field (content, text, or extracted_text) must be provided' }
);

// =============================================================================
// EXTRACTION RESULT SCHEMAS
// =============================================================================

/**
 * Extracted Party Schema
 * Validates party extraction results
 */
export const extractedPartySchema = z.object({
  name: sanitizedStringSchema,
  role: z.string().optional(),
  type: z.enum(PARTY_TYPES).optional(),
  normalized: z.string().optional(),
});

/** Array of extracted parties with limits */
export const extractedPartiesSchema = z.array(extractedPartySchema)
  .max(MAX_PARTIES, `Cannot extract more than ${MAX_PARTIES} parties`);

/**
 * Extracted Amount Schema
 * Validates amount extraction results
 */
export const extractedAmountSchema = z.object({
  value: positiveNumberSchema,
  currency: currencySchema.optional(),
  formatted: z.string(),
  context: z.string().optional(),
  type: z.enum(AMOUNT_TYPES).optional(),
}).refine(
  (amount) => !isNaN(amount.value) && isFinite(amount.value),
  { message: 'Amount value must be a valid finite number' }
);

/** Array of extracted amounts with limits */
export const extractedAmountsSchema = z.array(extractedAmountSchema)
  .max(MAX_AMOUNTS, `Cannot extract more than ${MAX_AMOUNTS} amounts`);

/**
 * Extracted Dates Schema
 * Validates date extraction results
 */
export const extractedDatesSchema = z.object({
  effectiveDate: nullableIsoDateSchema,
  expirationDate: nullableIsoDateSchema,
  signedDate: nullableIsoDateSchema,
  otherDates: z.array(nullableIsoDateSchema)
    .max(MAX_DATES, `Cannot extract more than ${MAX_DATES} dates`),
});

/**
 * Clause Schema
 * Validates individual clause data
 */
export const clauseSchema = z.object({
  type: z.string(),
  text: z.string().max(10000, 'Clause text exceeds maximum length'),
  risk_reason: z.string().optional(),
  section: z.string().optional(),
});

/**
 * Clause Analysis Schema
 * Validates clause analysis results
 */
export const clauseAnalysisSchema = z.object({
  total: z.number().int().min(0),
  risky: z.array(clauseSchema).max(MAX_CLAUSES),
  riskyClausesCount: z.number().int().min(0),
  standard: z.array(clauseSchema).max(MAX_CLAUSES),
  custom: z.array(clauseSchema).max(MAX_CLAUSES).optional(),
  categories: z.record(z.enum(CLAUSE_CATEGORIES), z.number().int().min(0)).optional(),
}).refine(
  (analysis) => analysis.riskyClausesCount === analysis.risky.length,
  { message: 'riskyClausesCount must match risky array length' }
);

/**
 * Document Metadata Schema
 * Validates document metadata extraction
 */
export const documentMetadataSchema = z.object({
  wordCount: z.number().int().min(0),
  pageCount: z.number().int().min(1),
  hasSignatures: z.boolean(),
  language: z.string().length(2, 'Language code must be 2 characters'),
  complexity: z.enum(COMPLEXITY_LEVELS),
  completeness: percentageSchema.transform((p) => p / 100), // Convert to 0-1 range
});

/**
 * Contact Info Schema
 * Validates extracted contact information
 */
export const contactInfoSchema = z.object({
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  website: z.string().url().nullable().or(z.literal(null)),
});

/**
 * Vendor Identifiers Schema
 * Validates extracted vendor identifiers
 */
export const vendorIdentifiersSchema = z.object({
  taxId: z.string().regex(/^\d{2}-\d{7}$/, 'Invalid tax ID format').nullable(),
  duns: z.string().regex(/^\d{9}$/, 'DUNS must be 9 digits').nullable(),
  vendorId: z.string().nullable(),
  registrationNumber: z.string().nullable(),
});

/**
 * Compliance Status Schema
 * Validates vendor compliance status
 */
export const complianceStatusSchema = z.object({
  isCompliant: z.boolean(),
  missingDocuments: z.array(z.string()),
  expiredDocuments: z.array(z.string()),
  complianceScore: percentageSchema,
});

/**
 * Sentiment Analysis Schema
 * Validates sentiment analysis results
 */
export const sentimentAnalysisSchema = z.object({
  score: z.number().min(-1).max(1),
  label: z.enum(['positive', 'negative', 'neutral']),
  positive: z.number().int().min(0),
  negative: z.number().int().min(0),
});

/**
 * Extracted Entities Schema
 * Validates NER extraction results
 */
export const extractedEntitiesSchema = z.object({
  organizations: z.array(z.string()),
  people: z.array(z.string()),
  locations: z.array(z.string()),
  dates: z.array(z.string()),
  emails: z.array(z.string().email()),
  phones: z.array(z.string()),
  // Enhanced NER fields
  parties: z.array(z.object({
    text: z.string(),
    confidence: z.number().min(0).max(1),
  })).optional(),
  amounts: z.array(z.object({
    text: z.string(),
    confidence: z.number().min(0).max(1),
  })).optional(),
  legalTerms: z.array(z.object({
    text: z.string(),
    confidence: z.number().min(0).max(1),
  })).optional(),
  nerConfidence: z.number().min(0).max(1).optional(),
});

// =============================================================================
// OUTPUT SCHEMAS
// =============================================================================

/**
 * Document Analysis Schema
 * Validates the complete document analysis output
 */
export const documentAnalysisSchema = z.object({
  title: z.string(),
  parties: extractedPartiesSchema,
  dates: extractedDatesSchema,
  amounts: extractedAmountsSchema,
  keyTerms: z.array(z.string()),
  clauses: clauseAnalysisSchema,
  documentType: z.enum(CONTRACT_TYPES),
  metadata: documentMetadataSchema,
  vendor: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  entities: extractedEntitiesSchema.optional(),
  sentiment: sentimentAnalysisSchema.optional(),
});

/**
 * Vendor Analysis Schema
 * Validates vendor document analysis output
 */
export const vendorAnalysisSchema = z.object({
  vendorName: z.string(),
  category: z.string(),
  contactInfo: contactInfoSchema,
  identifiers: vendorIdentifiersSchema,
  certifications: z.array(z.string()),
  riskIndicators: z.array(z.string()),
  complianceStatus: complianceStatusSchema,
  documentType: z.enum(VENDOR_DOCUMENT_TYPES),
});

/**
 * Document Quality Assessment Schema
 */
export const documentQualitySchema = z.object({
  score: z.number().min(0).max(1),
  issues: z.array(z.string()),
  completeness: z.number().min(0).max(1),
});

/**
 * Workflow Analysis Schema
 */
export const workflowAnalysisSchema = z.object({
  workflowId: uuidSchema,
  workflowType: z.enum(WORKFLOW_TYPES),
  documentId: uuidSchema,
  stepsCompleted: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  completedAt: z.string().datetime().nullable(),
  details: z.object({
    extractedFields: z.number().int().min(0).optional(),
    validationPassed: z.boolean().optional(),
    complianceChecked: z.boolean().optional(),
    aiAnalysisComplete: z.boolean().optional(),
    hasExtractedText: z.boolean().optional(),
    metadataEnriched: z.boolean().optional(),
    insightsGenerated: z.number().int().min(0).optional(),
  }),
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate secretary input and return parsed result
 */
export function validateSecretaryInput(data: unknown): {
  success: boolean;
  data?: z.infer<typeof secretaryInputSchema>;
  error?: string;
} {
  const result = secretaryInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

/**
 * Validate extracted amounts and filter invalid ones
 * Enforces MAX_AMOUNTS limit
 */
export function validateAndFilterAmounts(amounts: unknown[]): z.infer<typeof extractedAmountSchema>[] {
  const validated = amounts
    .map(amt => extractedAmountSchema.safeParse(amt))
    .filter((result): result is z.SafeParseSuccess<z.infer<typeof extractedAmountSchema>> => result.success)
    .map(result => result.data);

  // Enforce MAX_AMOUNTS limit
  return validated.slice(0, MAX_AMOUNTS);
}

/**
 * Validate extracted dates and filter invalid ones
 */
export function validateAndFilterDates(dates: unknown): z.infer<typeof extractedDatesSchema> | null {
  const result = extractedDatesSchema.safeParse(dates);
  if (result.success) {
    return result.data;
  }
  // Return default structure if validation fails
  return {
    effectiveDate: null,
    expirationDate: null,
    signedDate: null,
    otherDates: [],
  };
}

/**
 * Validate extracted parties and filter invalid ones
 * Enforces MAX_PARTIES limit, truncates long names, and deduplicates by name
 */
export function validateAndFilterParties(parties: unknown[]): z.infer<typeof extractedPartySchema>[] {
  const validated = parties
    .map(party => extractedPartySchema.safeParse(party))
    .filter((result): result is z.SafeParseSuccess<z.infer<typeof extractedPartySchema>> => result.success)
    .map(result => ({
      ...result.data,
      // Truncate long names
      name: result.data.name.slice(0, MAX_PARTY_NAME_LENGTH),
    }));

  // Deduplicate by name (keep first occurrence)
  const seen = new Set<string>();
  const deduplicated = validated.filter(party => {
    const normalizedName = party.name.toLowerCase().trim();
    if (seen.has(normalizedName)) {
      return false;
    }
    seen.add(normalizedName);
    return true;
  });

  // Enforce MAX_PARTIES limit
  return deduplicated.slice(0, MAX_PARTIES);
}

/**
 * Check if content meets minimum requirements for analysis
 */
export function isContentAnalyzable(content: string | undefined | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return trimmed.length >= MIN_CONTENT_LENGTH;
}

/**
 * Sanitize and normalize content for processing
 */
export function sanitizeContent(content: string): string {
  return content
    .trim()
    // Normalize unicode characters
    .normalize('NFC')
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize whitespace
    .replace(/[\r\n]+/g, '\n')
    .replace(/[ \t]+/g, ' ');
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SecretaryContext = z.infer<typeof secretaryContextSchema>;
export type SecretaryInput = z.infer<typeof secretaryInputSchema>;
export type ContractDocumentInput = z.infer<typeof contractDocumentInputSchema>;
export type VendorDocumentInput = z.infer<typeof vendorDocumentInputSchema>;
export type StoredDocumentInput = z.infer<typeof storedDocumentInputSchema>;
export type GeneralDocumentInput = z.infer<typeof generalDocumentInputSchema>;
export type ExtractedParty = z.infer<typeof extractedPartySchema>;
export type ExtractedAmount = z.infer<typeof extractedAmountSchema>;
export type ExtractedDates = z.infer<typeof extractedDatesSchema>;
export type Clause = z.infer<typeof clauseSchema>;
export type ClauseAnalysis = z.infer<typeof clauseAnalysisSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type VendorIdentifiers = z.infer<typeof vendorIdentifiersSchema>;
export type ComplianceStatus = z.infer<typeof complianceStatusSchema>;
export type SentimentAnalysis = z.infer<typeof sentimentAnalysisSchema>;
export type ExtractedEntities = z.infer<typeof extractedEntitiesSchema>;
export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
export type VendorAnalysis = z.infer<typeof vendorAnalysisSchema>;
export type DocumentQuality = z.infer<typeof documentQualitySchema>;
export type WorkflowAnalysis = z.infer<typeof workflowAnalysisSchema>;
