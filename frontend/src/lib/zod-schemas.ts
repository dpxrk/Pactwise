import { z } from 'zod';

// Base schemas
export const idSchema = z.string().min(1);
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();
export const urlSchema = z.string().url();

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

// User schemas
export const userRoleSchema = z.enum(['owner', 'admin', 'manager', 'user', 'viewer']);

export const userSchema = z.object({
  clerkId: z.string(),
  email: emailSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  enterpriseId: idSchema,
  role: userRoleSchema,
  isActive: z.boolean().default(true),
  lastLoginAt: timestampSchema.optional(),
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

// Enterprise schemas
export const enterpriseSizeSchema = z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']);
export const contractVolumeSchema = z.enum(['low', 'medium', 'high', 'enterprise']);

export const enterpriseSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  size: enterpriseSizeSchema.optional(),
  contractVolume: contractVolumeSchema.optional(),
  primaryUseCase: z.array(z.string()).optional(),
});

// Vendor schemas
export const vendorCategorySchema = z.enum([
  'technology', 'marketing', 'legal', 'finance', 'hr', 
  'facilities', 'logistics', 'manufacturing', 'consulting', 'other'
]);

export const vendorStatusSchema = z.enum(['active', 'inactive']);

export const vendorSchema = z.object({
  enterpriseId: idSchema,
  name: z.string().min(1).max(100),
  contactEmail: emailSchema.optional(),
  contactPhone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  website: urlSchema.optional(),
  category: vendorCategorySchema.optional(),
  status: vendorStatusSchema.default('active'),
  createdAt: timestampSchema,
});

// Contract schemas
export const contractStatusSchema = z.enum([
  'draft', 'pending_analysis', 'active', 'expired', 'terminated', 'archived'
]);

export const analysisStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const contractTypeSchema = z.enum([
  'nda', 'msa', 'sow', 'saas', 'lease', 'employment', 'partnership', 'other'
]);

export const contractSchema = z.object({
  enterpriseId: idSchema,
  vendorId: idSchema,
  title: z.string().min(1).max(200),
  status: contractStatusSchema,
  contractType: contractTypeSchema.optional(),
  storageId: idSchema,
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^[a-zA-Z0-9\/\-]+$/),
  value: z.number().min(0).optional(),
  startDate: timestampSchema.optional(),
  endDate: timestampSchema.optional(),
  extractedParties: z.array(z.string()).optional(),
  extractedStartDate: timestampSchema.optional(),
  extractedEndDate: timestampSchema.optional(),
  extractedPaymentSchedule: z.string().optional(),
  extractedPricing: z.string().optional(),
  extractedScope: z.string().optional(),
  analysisStatus: analysisStatusSchema.optional(),
  analysisError: z.string().optional(),
  notes: z.string().max(2000).optional(),
  createdAt: timestampSchema,
});

// Agent task schemas
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const taskStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export const taskTypeSchema = z.enum([
  'contract_analysis', 'vendor_analysis', 'compliance_check', 
  'risk_assessment', 'financial_analysis', 'notification'
]);

export const agentTaskSchema = z.object({
  id: z.string(),
  type: taskTypeSchema,
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  data: z.object({
    contractId: idSchema.optional(),
    vendorId: idSchema.optional(),
    enterpriseId: idSchema,
    userId: idSchema.optional(),
    parameters: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  result: z.object({
    success: z.boolean(),
    data: z.record(z.unknown()).optional(),
    insights: z.array(z.object({
      id: z.string(),
      type: z.enum(['risk', 'opportunity', 'compliance', 'financial', 'operational']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string(),
      description: z.string(),
      data: z.record(z.unknown()),
      source: z.string(),
      confidence: z.number().min(0).max(1),
      createdAt: timestampSchema,
    })).optional(),
    recommendations: z.array(z.object({
      id: z.string(),
      type: z.enum(['action', 'review', 'optimize', 'alert']),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      title: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      effort: z.enum(['low', 'medium', 'high']),
      source: z.string(),
      createdAt: timestampSchema,
    })).optional(),
    metadata: z.record(z.unknown()).optional(),
    executionTime: z.number().optional(),
  }).optional(),
  error: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
  retryCount: z.number().min(0).default(0),
  maxRetries: z.number().min(0).default(3),
});

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    contractTypes: z.array(contractTypeSchema).optional(),
    statuses: z.array(contractStatusSchema).optional(),
    dateRange: z.object({
      start: timestampSchema.optional(),
      end: timestampSchema.optional(),
    }).optional(),
    vendorIds: z.array(idSchema).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  sort: sortSchema.optional(),
  pagination: paginationSchema.optional(),
  options: z.object({
    includeContent: z.boolean().default(false),
    highlightMatches: z.boolean().default(true),
    fuzzyMatch: z.boolean().default(false),
    boost: z.record(z.number()).optional(),
    debug: z.boolean().default(false),
  }).optional(),
});

// Analytics schemas
export const metricTypeSchema = z.enum([
  'contract_count', 'contract_value', 'vendor_count', 'compliance_score',
  'risk_score', 'renewal_rate', 'processing_time', 'user_activity'
]);

export const timeRangeSchema = z.enum(['1h', '1d', '7d', '30d', '90d', '1y', 'all']);

export const analyticsQuerySchema = z.object({
  metrics: z.array(metricTypeSchema),
  timeRange: timeRangeSchema,
  filters: z.object({
    enterpriseId: idSchema.optional(),
    vendorIds: z.array(idSchema).optional(),
    contractTypes: z.array(contractTypeSchema).optional(),
    departments: z.array(z.string()).optional(),
  }).optional(),
  groupBy: z.array(z.string()).optional(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count']).default('sum'),
});

// Notification schemas
export const notificationTypeSchema = z.enum([
  'contract_expiring', 'contract_analysis_complete', 'vendor_risk_alert',
  'compliance_issue', 'task_assignment', 'system_alert'
]);

export const notificationPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const notificationSchema = z.object({
  enterpriseId: idSchema,
  userId: idSchema,
  type: notificationTypeSchema,
  priority: notificationPrioritySchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean().default(false),
  actionUrl: z.string().optional(),
  expiresAt: timestampSchema.optional(),
  createdAt: timestampSchema,
});

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

// Form validation schemas
export const createContractFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  vendorId: idSchema,
  contractType: contractTypeSchema,
  file: z.object({
    name: z.string().min(1),
    size: z.number().min(1).max(10 * 1024 * 1024), // 10MB limit
    type: z.enum([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]),
  }),
  notes: z.string().max(2000).optional(),
  value: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const createVendorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  contactEmail: emailSchema.optional(),
  contactPhone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  website: urlSchema.optional(),
  address: z.string().max(500).optional(),
  category: vendorCategorySchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
});

// Query parameter schemas
export const getContractsQuerySchema = z.object({
  enterpriseId: idSchema,
  contractType: contractTypeSchema.optional(),
  status: contractStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const getVendorsQuerySchema = z.object({
  enterpriseId: idSchema,
  category: vendorCategorySchema.optional(),
  status: vendorStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// Export utility types
export type UserRole = z.infer<typeof userRoleSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type ContractType = z.infer<typeof contractTypeSchema>;
export type VendorCategory = z.infer<typeof vendorCategorySchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type MetricType = z.infer<typeof metricTypeSchema>;
export type TimeRange = z.infer<typeof timeRangeSchema>;

export default {
  // Base schemas
  id: idSchema,
  timestamp: timestampSchema,
  email: emailSchema,
  url: urlSchema,
  pagination: paginationSchema,
  sort: sortSchema,
  
  // Entity schemas
  user: userSchema,
  enterprise: enterpriseSchema,
  vendor: vendorSchema,
  contract: contractSchema,
  agentTask: agentTaskSchema,
  notification: notificationSchema,
  
  // Query schemas
  searchQuery: searchQuerySchema,
  analyticsQuery: analyticsQuerySchema,
  getContractsQuery: getContractsQuerySchema,
  getVendorsQuery: getVendorsQuerySchema,
  
  // Form schemas
  createContractForm: createContractFormSchema,
  createVendorForm: createVendorFormSchema,
  updateUserProfile: updateUserProfileSchema,
  
  // Response schemas
  error: errorSchema,
  paginatedResponse: paginatedResponseSchema,
  apiResponse: apiResponseSchema,
};