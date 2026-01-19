/// <reference path="../../../types/global.d.ts" />

/**
 * Common API Schemas for OpenAPI Documentation
 *
 * Defines shared Zod schemas used across API endpoints
 * These are automatically converted to JSON Schema for OpenAPI spec
 */

import { z } from 'zod';

// ==================== Base Response Schemas ====================

/**
 * Standard success response wrapper
 */
export const SuccessResponseSchema = <T extends z.ZodSchema>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

/**
 * Standard error response
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().describe('Machine-readable error code'),
    message: z.string().describe('Human-readable error message'),
    details: z.array(z.unknown()).optional().describe('Additional error details'),
    requestId: z.string().uuid().describe('Request ID for debugging'),
  }),
  _meta: z.object({
    timestamp: z.string().datetime(),
    version: z.string(),
  }),
});

/**
 * Paginated response wrapper
 */
export const PaginatedResponseSchema = <T extends z.ZodSchema>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    timestamp: z.string().datetime(),
  });

// ==================== Common Parameter Schemas ====================

/**
 * UUID parameter
 */
export const UUIDParamSchema = z.string().uuid().describe('Unique identifier (UUID v4)');

/**
 * Pagination query parameters
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).describe('Page number'),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Items per page'),
  sortBy: z.string().optional().describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
});

/**
 * Search query parameters
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500).describe('Search query string'),
  fields: z.string().optional().describe('Comma-separated list of fields to search'),
  fuzzy: z.coerce.boolean().default(false).describe('Enable fuzzy matching'),
});

/**
 * Date range filter
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().datetime().optional().describe('End date (ISO 8601)'),
});

// ==================== Entity Schemas ====================

/**
 * Contract schema (simplified for API documentation)
 */
export const ContractSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  status: z.enum(['draft', 'pending_review', 'active', 'expired', 'terminated']),
  contractType: z.string().optional(),
  vendorId: z.string().uuid().nullable(),
  value: z.number().positive().nullable(),
  currency: z.string().default('USD'),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  isAutoRenew: z.boolean().default(false),
  overallScore: z.number().min(0).max(100).nullable(),
  grade: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContractCreateSchema = ContractSchema.pick({
  title: true,
  vendorId: true,
  value: true,
  startDate: true,
  endDate: true,
  isAutoRenew: true,
}).extend({
  title: z.string().min(1).max(255),
  fileId: z.string().uuid().describe('ID of uploaded contract file'),
  notes: z.string().max(2000).optional(),
  autoAnalyze: z.boolean().default(true).describe('Trigger AI analysis after upload'),
});

export const ContractUpdateSchema = ContractCreateSchema.partial().extend({
  status: z.enum(['draft', 'pending_review', 'active', 'expired', 'terminated']).optional(),
});

/**
 * Vendor schema
 */
export const VendorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  category: z.enum(['technology', 'marketing', 'legal', 'finance', 'hr', 'facilities', 'logistics', 'manufacturing', 'consulting', 'other']),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
  website: z.string().url().nullable(),
  contactName: z.string().max(255).nullable(),
  contactEmail: z.string().email().nullable(),
  contactPhone: z.string().max(50).nullable(),
  performanceScore: z.number().min(0).max(1).nullable(),
  contractCount: z.number().int().nonnegative(),
  totalContractValue: z.number().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VendorCreateSchema = VendorSchema.pick({
  name: true,
  category: true,
  website: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
}).extend({
  name: z.string().min(1).max(255),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).default('active'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const VendorUpdateSchema = VendorCreateSchema.partial();

/**
 * Agent task schema
 */
export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  agentType: z.string(),
  taskType: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  priority: z.number().int().min(1).max(10),
  payload: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  retryCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export const AgentTaskCreateSchema = z.object({
  agentType: z.enum(['secretary', 'manager', 'financial', 'legal', 'analytics', 'vendor', 'notifications']),
  taskType: z.string().min(1).max(100),
  priority: z.number().int().min(1).max(10).default(5),
  payload: z.record(z.string(), z.unknown()),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
});

/**
 * Agent insight schema
 */
export const AgentInsightSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  insightType: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string(),
  description: z.string(),
  recommendation: z.string().nullable(),
  isActionable: z.boolean(),
  isAcknowledged: z.boolean(),
  acknowledgedAt: z.string().datetime().nullable(),
  contractId: z.string().uuid().nullable(),
  vendorId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  role: z.enum(['viewer', 'user', 'manager', 'admin', 'owner']),
  avatarUrl: z.string().url().nullable(),
  enterpriseId: z.string().uuid(),
  department: z.string().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

/**
 * Enterprise schema
 */
export const EnterpriseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  subscriptionTier: z.enum(['starter', 'professional', 'business', 'enterprise']),
  contractLimit: z.number().int().positive(),
  userLimit: z.number().int().positive(),
  settings: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
});

// ==================== AI/Agent Specific Schemas ====================

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Agent chat request
 */
export const AgentChatRequestSchema = z.object({
  message: z.string().min(1).max(10000).describe('User message to the agent'),
  agentType: z.enum(['secretary', 'manager', 'financial', 'legal', 'analytics', 'vendor']).optional(),
  conversationId: z.string().uuid().optional().describe('Existing conversation ID to continue'),
  context: z.object({
    contractId: z.string().uuid().optional(),
    vendorId: z.string().uuid().optional(),
    documentId: z.string().uuid().optional(),
  }).optional(),
  stream: z.boolean().default(false).describe('Enable streaming response'),
});

/**
 * Agent chat response
 */
export const AgentChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string(),
  agentType: z.string(),
  toolsUsed: z.array(z.string()).optional(),
  insights: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  })).optional(),
  suggestedActions: z.array(z.object({
    action: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })).optional(),
  usage: z.object({
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
    cost: z.number(),
  }).optional(),
});

// ==================== Error Code Enum ====================

/**
 * Standard error codes
 */
export const ErrorCodeSchema = z.enum([
  // Authentication errors
  'AUTH_REQUIRED',
  'AUTH_INVALID',
  'AUTH_EXPIRED',
  'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation errors
  'VALIDATION_ERROR',
  'INVALID_INPUT',
  'MISSING_REQUIRED_FIELD',

  // Resource errors
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'CONFLICT',
  'GONE',

  // Rate limiting
  'RATE_LIMIT_EXCEEDED',
  'QUOTA_EXCEEDED',

  // Server errors
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT',
  'DEPENDENCY_FAILURE',

  // Business logic errors
  'BUDGET_EXCEEDED',
  'CONTRACT_LIMIT_REACHED',
  'USER_LIMIT_REACHED',
  'OPERATION_NOT_ALLOWED',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// ==================== Export Type Inferences ====================

export type Contract = z.infer<typeof ContractSchema>;
export type ContractCreate = z.infer<typeof ContractCreateSchema>;
export type ContractUpdate = z.infer<typeof ContractUpdateSchema>;
export type Vendor = z.infer<typeof VendorSchema>;
export type VendorCreate = z.infer<typeof VendorCreateSchema>;
export type VendorUpdate = z.infer<typeof VendorUpdateSchema>;
export type AgentTask = z.infer<typeof AgentTaskSchema>;
export type AgentInsight = z.infer<typeof AgentInsightSchema>;
export type User = z.infer<typeof UserSchema>;
export type Enterprise = z.infer<typeof EnterpriseSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AgentChatRequest = z.infer<typeof AgentChatRequestSchema>;
export type AgentChatResponse = z.infer<typeof AgentChatResponseSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
