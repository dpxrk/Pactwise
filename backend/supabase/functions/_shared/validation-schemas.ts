/**
 * Shared Zod Validation Schemas
 *
 * Centralized validation schemas for API requests across all edge functions.
 * Ensures consistent validation and type safety.
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ==================== Common/Reusable Schemas ====================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z.string().email('Invalid email format');

export const DateTimeSchema = z.string().datetime('Invalid datetime format');

export const PositiveNumberSchema = z.number().positive('Must be a positive number');

export const NonNegativeNumberSchema = z.number().nonnegative('Must be non-negative');

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export const DateRangeSchema = z.object({
  start: DateTimeSchema,
  end: DateTimeSchema,
}).refine(
  (data) => new Date(data.start) < new Date(data.end),
  'Start date must be before end date'
);

// ==================== Contract Schemas ====================

export const ContractStatusSchema = z.enum(['draft', 'pending', 'active', 'expired', 'terminated']);

export const ContractTypeSchema = z.enum([
  'service_agreement',
  'purchase_order',
  'master_service_agreement',
  'nda',
  'software_license',
  'employment',
  'vendor_agreement',
  'lease',
  'other'
]);

export const CreateContractSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  contract_type: ContractTypeSchema,
  vendor_id: UUIDSchema,
  value: PositiveNumberSchema.optional(),
  currency: z.string().length(3).default('USD'), // ISO 4217
  start_date: DateTimeSchema.optional(),
  end_date: DateTimeSchema.optional(),
  auto_renewal: z.boolean().default(false),
  renewal_notice_days: z.number().int().positive().optional(),
  payment_terms: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateContractSchema = CreateContractSchema.partial().extend({
  id: UUIDSchema,
  status: ContractStatusSchema.optional(),
});

export const SearchContractsSchema = z.object({
  search_term: z.string().max(200).optional(),
  status: ContractStatusSchema.optional(),
  contract_type: ContractTypeSchema.optional(),
  vendor_id: UUIDSchema.optional(),
  min_value: NonNegativeNumberSchema.optional(),
  max_value: PositiveNumberSchema.optional(),
  start_date_from: DateTimeSchema.optional(),
  start_date_to: DateTimeSchema.optional(),
  end_date_from: DateTimeSchema.optional(),
  end_date_to: DateTimeSchema.optional(),
  ...PaginationSchema.shape,
});

export const ContractAnalysisRequestSchema = z.object({
  contract_id: UUIDSchema,
  analysis_type: z.enum(['full', 'clauses', 'risk', 'compliance', 'financial']).default('full'),
  options: z.object({
    extract_clauses: z.boolean().default(true),
    assess_risk: z.boolean().default(true),
    check_compliance: z.boolean().default(true),
  }).optional(),
});

// ==================== Vendor Schemas ====================

export const VendorStatusSchema = z.enum(['active', 'inactive', 'pending', 'suspended']);

export const VendorCategorySchema = z.enum([
  'it_services',
  'software',
  'consulting',
  'manufacturing',
  'logistics',
  'marketing',
  'legal',
  'accounting',
  'facilities',
  'hr_services',
  'other'
]);

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  vendor_number: z.string().max(50).optional(),
  category: VendorCategorySchema.optional(),
  categories: z.array(z.string()).optional(),
  contact_person: z.string().max(100).optional(),
  contact_email: EmailSchema.optional(),
  contact_phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  tax_id: z.string().max(50).optional(),
  payment_terms: z.string().max(200).optional(),
  certifications: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  id: UUIDSchema,
  status: VendorStatusSchema.optional(),
  performance_score: z.number().min(0).max(1).optional(),
  compliance_score: z.number().min(0).max(1).optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const SearchVendorsSchema = z.object({
  search_term: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  status: VendorStatusSchema.optional(),
  min_performance_score: z.number().min(0).max(1).optional(),
  has_certification: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  ...PaginationSchema.shape,
});

export const VendorAnalyticsRequestSchema = z.object({
  vendorId: UUIDSchema,
  includeHistory: z.boolean().default(true),
  dateRange: DateRangeSchema.optional(),
  metrics: z.array(z.enum([
    'performance',
    'spend',
    'compliance',
    'issues',
    'contracts'
  ])).optional(),
});

// ==================== Agent Task Schemas ====================

export const AgentTypeSchema = z.enum([
  'secretary',
  'financial',
  'legal',
  'analytics',
  'vendor',
  'notifications',
  'manager',
  'workflow',
  'compliance',
  'risk-assessment',
  'integration',
  'data-quality'
]);

export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

export const TaskPrioritySchema = z.number().int().min(1).max(10);

export const CreateAgentTaskSchema = z.object({
  task_type: z.string().min(1).max(100),
  agent_type: AgentTypeSchema,
  priority: TaskPrioritySchema.default(5),
  payload: z.record(z.unknown()),
  contract_id: UUIDSchema.optional(),
  vendor_id: UUIDSchema.optional(),
  scheduled_at: DateTimeSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateAgentTaskSchema = z.object({
  id: UUIDSchema,
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  result: z.record(z.unknown()).optional(),
  error_message: z.string().max(1000).optional(),
});

export const ProcessAgentTaskSchema = z.object({
  agentType: AgentTypeSchema,
  data: z.unknown(),
  context: z.object({
    priority: TaskPrioritySchema.optional(),
    userId: UUIDSchema.optional(),
    contractId: UUIDSchema.optional(),
    vendorId: UUIDSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
});

// ==================== RFQ/Sourcing Schemas ====================

export const RFQStatusSchema = z.enum(['draft', 'published', 'in_review', 'evaluated', 'awarded', 'cancelled']);

export const CreateRFQSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  specifications: z.string().min(1),
  quantity: z.number().positive().optional(),
  delivery_date: DateTimeSchema.optional(),
  payment_terms: z.string().max(500).optional(),
  additional_requirements: z.string().max(2000).optional(),
  target_vendors: z.array(UUIDSchema).optional(),
});

export const UpdateRFQSchema = CreateRFQSchema.partial().extend({
  id: UUIDSchema,
  status: RFQStatusSchema.optional(),
});

export const SourcingRequestSchema = z.object({
  category: z.string().min(1).max(100),
  specifications: z.string().min(1),
  quantity: z.number().positive().optional(),
  budget: NonNegativeNumberSchema.optional(),
  location: z.string().max(200).optional(),
  certifications: z.array(z.string()).optional(),
  timeline: z.string().max(200).optional(),
});

export const SupplierEvaluationSchema = z.object({
  vendorId: UUIDSchema,
  evaluationCriteria: z.object({
    financial_stability: z.number().min(0).max(100).optional(),
    quality: z.number().min(0).max(100).optional(),
    delivery_performance: z.number().min(0).max(100).optional(),
    pricing: z.number().min(0).max(100).optional(),
    responsiveness: z.number().min(0).max(100).optional(),
  }).optional(),
});

export const QuoteAnalysisSchema = z.object({
  rfqId: UUIDSchema,
  quotes: z.array(
    z.object({
      vendor_id: UUIDSchema,
      vendor_name: z.string(),
      unit_price: PositiveNumberSchema,
      total_price: PositiveNumberSchema,
      delivery_time: z.string(),
      payment_terms: z.string().optional(),
      warranty: z.string().optional(),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one quote is required'),
});

export const MarketResearchRequestSchema = z.object({
  category: z.string().min(1).max(100),
  region: z.string().max(100).optional(),
  timeframe: z.string().max(100).optional(),
});

// ==================== Notification Schemas ====================

export const NotificationTypeSchema = z.enum([
  'contract_expiring',
  'contract_expired',
  'vendor_alert',
  'approval_needed',
  'task_completed',
  'compliance_issue',
  'system_notification'
]);

export const NotificationSeveritySchema = z.enum(['info', 'warning', 'critical']);

export const CreateNotificationSchema = z.object({
  user_id: UUIDSchema,
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  severity: NotificationSeveritySchema.default('info'),
  contract_id: UUIDSchema.optional(),
  vendor_id: UUIDSchema.optional(),
  action_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const MarkNotificationReadSchema = z.object({
  notification_id: UUIDSchema,
  is_read: z.boolean(),
});

// ==================== Batch Upload Schemas ====================

export const BatchUploadTypeSchema = z.enum(['contracts', 'vendors']);

export const BatchUploadRequestSchema = z.object({
  upload_type: BatchUploadTypeSchema,
  file_url: z.string().url(),
  options: z.object({
    skip_duplicates: z.boolean().default(false),
    validate_only: z.boolean().default(false),
    match_vendors: z.boolean().default(true),
  }).optional(),
});

// ==================== AI Analysis Schemas ====================

export const AIAnalysisTypeSchema = z.enum([
  'contract_review',
  'risk_assessment',
  'compliance_check',
  'vendor_evaluation',
  'clause_extraction',
  'document_classification'
]);

export const AIAnalysisRequestSchema = z.object({
  analysis_type: AIAnalysisTypeSchema,
  document_id: UUIDSchema.optional(),
  document_text: z.string().max(100000).optional(),
  contract_id: UUIDSchema.optional(),
  vendor_id: UUIDSchema.optional(),
  options: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.document_id || data.document_text || data.contract_id,
  'Must provide either document_id, document_text, or contract_id'
);

// ==================== Search Schemas ====================

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  entity_types: z.array(z.enum(['contracts', 'vendors', 'documents'])).optional(),
  ...PaginationSchema.shape,
});

// ==================== Helper Functions ====================

/**
 * Validate request body against a schema and throw detailed error on failure
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    throw new Error(
      JSON.stringify({
        message: 'Validation failed',
        errors,
      })
    );
  }

  return result.data;
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  url: URL
): T {
  const params: Record<string, unknown> = {};

  for (const [key, value] of url.searchParams.entries()) {
    // Try to parse as JSON for complex types, otherwise use string
    try {
      params[key] = JSON.parse(value);
    } catch {
      params[key] = value;
    }
  }

  return validateRequestBody(schema, params);
}

/**
 * Create a standardized validation error response
 */
export function createValidationErrorResponse(error: Error): Response {
  let message = error.message;
  let errors: unknown[] = [];

  try {
    const parsed = JSON.parse(error.message);
    message = parsed.message || message;
    errors = parsed.errors || [];
  } catch {
    // Not a JSON error, use as-is
  }

  return new Response(
    JSON.stringify({
      error: message,
      validation_errors: errors,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
