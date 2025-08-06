import { z } from 'zod';
import {
  uuidSchema,
  enterpriseIdSchema,
  prioritySchema,
  taskStatusSchema,
  dateSchema,
  paginationSchema,
  metadataSchema,
  enumFromArray,
  sanitizedStringSchema,
} from './common.ts';
import { agentTypeSchema, agentContextSchema } from './agent-operations.ts';

/**
 * API endpoint validation schemas
 */

// Headers validation
export const apiHeadersSchema = z.object({
  'authorization': z.string().startsWith('Bearer ').optional(),
  'x-agent-api-key': z.string().startsWith('pak_').optional(),
  'x-trace-id': z.string().uuid().optional(),
  'x-request-id': z.string().uuid().optional(),
  'content-type': z.string().optional(),
  'x-service-role': z.enum(['true', 'false']).optional(),
});

// Initialize agents request
export const initializeAgentsRequestSchema = z.object({
  enterpriseId: enterpriseIdSchema.optional(), // Optional if from auth context
  agentTypes: z.array(agentTypeSchema).optional(), // Optional to init all
  config: z.object({
    enableMetrics: z.boolean().default(true),
    enableTracing: z.boolean().default(true),
    enableCaching: z.boolean().default(true),
  }).optional(),
});

// Process task request
export const processRequestSchema = z.object({
  agentType: agentTypeSchema,
  data: z.any(), // Will be validated by specific agent schema
  context: agentContextSchema.optional(),
});

// Queue task request
export const queueTaskRequestSchema = z.object({
  taskType: z.string().max(100).transform(s => s.trim()).refine(s => s.length > 0, 'String cannot be empty after trimming'),
  agentType: agentTypeSchema,
  priority: prioritySchema,
  data: z.any(),
  context: z.any().optional(),
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  scheduledAt: dateSchema.optional(),
  metadata: metadataSchema.optional(),
});

// Process queue request
export const processQueueRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  agentType: agentTypeSchema.optional(),
  priorityThreshold: prioritySchema.optional(),
  maxAge: z.number().int().min(0).optional(), // Max age in seconds
});

// Get task status request
export const getTaskStatusRequestSchema = z.object({
  taskId: uuidSchema,
  includeResult: z.boolean().default(true),
  includeMetrics: z.boolean().default(false),
});

// Get agent metrics request
export const getMetricsRequestSchema = z.object({
  agentType: agentTypeSchema.optional(),
  timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
  groupBy: z.enum(['agent', 'operation', 'hour', 'day']).optional(),
  includeErrors: z.boolean().default(true),
});

// Health check request
export const healthCheckRequestSchema = z.object({
  detailed: z.boolean().default(false),
  checkDependencies: z.boolean().default(true),
  agentTypes: z.array(agentTypeSchema).optional(),
});

// Trace request schemas
export const getTraceRequestSchema = z.object({
  traceId: z.string().regex(/^[a-f0-9]{32}$/, 'Invalid trace ID format'),
  format: z.enum(['json', 'tree', 'timeline']).default('json'),
  includeStats: z.boolean().default(true),
  showTags: z.boolean().default(false),
  showLogs: z.boolean().default(false),
});

export const analyzeTraceRequestSchema = z.object({
  traceId: z.string().regex(/^[a-f0-9]{32}$/, 'Invalid trace ID format'),
  analysisType: z.enum(['performance', 'errors', 'dependencies', 'all']).default('all'),
});

// Inter-agent communication schemas
export const agentMessageSchema = z.object({
  id: z.string().uuid(),
  from: uuidSchema,
  to: uuidSchema,
  timestamp: dateSchema,
  payload: z.any(),
  signature: z.string().optional(),
});

export const agentProtocolMessageSchema = z.object({
  version: z.string(),
  operation: enumFromArray([
    'request_data',
    'share_insights',
    'delegate_task',
    'request_assistance',
    'report_completion',
    'workflow_handoff',
    'checkpoint_sync',
    'health_check',
    'status_query',
    'emergency_stop',
    'rollback_request',
  ] as const),
  data: z.any(),
  metadata: z.object({
    timestamp: dateSchema,
    messageId: z.string().uuid(),
    correlationId: z.string().uuid().optional(),
    priority: prioritySchema.optional(),
  }),
});

// Batch operations schema
export const batchTaskRequestSchema = z.object({
  tasks: z.array(queueTaskRequestSchema).min(1).max(100),
  processingMode: z.enum(['sequential', 'parallel']).default('parallel'),
  continueOnError: z.boolean().default(true),
  maxConcurrency: z.number().int().min(1).max(10).default(5),
});

// Task search/filter schema
export const searchTasksRequestSchema = z.object({
  filters: z.object({
    agentTypes: z.array(agentTypeSchema).optional(),
    statuses: z.array(taskStatusSchema).optional(),
    priorityRange: z.object({
      min: prioritySchema,
      max: prioritySchema,
    }).optional(),
    dateRange: z.object({
      start: dateSchema,
      end: dateSchema,
    }).optional(),
    contractId: uuidSchema.optional(),
    vendorId: uuidSchema.optional(),
    hasError: z.boolean().optional(),
  }).optional(),
  search: sanitizedStringSchema.optional(),
  pagination: paginationSchema.optional(),
});

// Agent configuration update schema
export const updateAgentConfigSchema = z.object({
  agentType: agentTypeSchema,
  config: z.object({
    timeout: z.number().int().min(1000).max(300000).optional(),
    retryPolicy: z.object({
      maxRetries: z.number().int().min(0).max(10),
      initialDelay: z.number().int().min(100),
      maxDelay: z.number().int().min(1000),
      backoffMultiplier: z.number().min(1).max(5),
    }).optional(),
    rateLimit: z.object({
      requests: z.number().int().min(1),
      window: z.number().int().min(1),
    }).optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  }),
});

// Webhook registration schema
export const webhookRegistrationSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'task.created',
    'task.completed',
    'task.failed',
    'agent.error',
    'insight.created',
    'workflow.completed',
  ])).min(1),
  secret: z.string().min(32).optional(),
  filters: z.object({
    agentTypes: z.array(agentTypeSchema).optional(),
    severities: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  }).optional(),
  active: z.boolean().default(true),
});

// Response schemas
export const taskResponseSchema = z.object({
  taskId: uuidSchema,
  status: taskStatusSchema,
  priority: prioritySchema,
  agentType: agentTypeSchema,
  createdAt: dateSchema,
  scheduledAt: dateSchema.optional(),
  startedAt: dateSchema.optional(),
  completedAt: dateSchema.optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  retryCount: z.number().int().optional(),
  metadata: metadataSchema.optional(),
});

export const processResultSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  insights: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string(),
    description: z.string(),
    recommendation: z.string().optional(),
    data: z.any().optional(),
    isActionable: z.boolean(),
  })),
  rulesApplied: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  processingTime: z.number().int().min(0),
  metadata: metadataSchema.optional(),
});

export const healthResponseSchema = z.object({
  healthy: z.boolean(),
  version: z.string(),
  uptime: z.number().int(),
  agents: z.record(agentTypeSchema, z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    lastActivity: dateSchema.optional(),
    activeTask: z.number().int().optional(),
    queueSize: z.number().int().optional(),
    errorRate: z.number().optional(),
  })),
  dependencies: z.object({
    database: z.boolean(),
    cache: z.boolean(),
    external: z.record(z.string(), z.boolean()),
  }).optional(),
  issues: z.array(z.string()).optional(),
});

// Error response schemas
export const validationErrorSchema = z.object({
  error: z.literal('validation_error'),
  message: z.string(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    code: z.string().optional(),
  })),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number().int(),
  details: z.any().optional(),
  traceId: z.string().optional(),
});

// Request validation middleware
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { data?: T; errors?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { errors: error };
    }
    throw error;
  }
}

// Response validation helper
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  return schema.parse(data);
}

// createErrorResponse moved to _shared/responses.ts to avoid duplication

// Create validation error response
export function createValidationErrorResponse(
  zodError: z.ZodError,
): z.infer<typeof validationErrorSchema> {
  return {
    error: 'validation_error',
    message: 'Request validation failed',
    errors: zodError.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}