import { z } from 'zod';
import {
  uuidSchema,
  prioritySchema,
  dateSchema,
  metadataSchema,
  sanitizedStringSchema,
  moneySchema,
  scoreSchema,
  percentageSchema,
  enumFromArray,
} from './common.ts';

/**
 * Agent operation validation schemas
 */

// Base agent context schema
export const agentContextSchema = z.object({
  taskId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  priority: prioritySchema.optional(),
  metadata: metadataSchema.optional(),
  traceContext: z.any().optional(), // Complex type, validated separately
});

// Agent types enum
export const agentTypeSchema = enumFromArray([
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
  'data-quality',
] as const);

// Task creation schema
export const createTaskSchema = z.object({
  agentType: agentTypeSchema,
  taskType: z.string().min(1).max(100),
  priority: prioritySchema,
  data: z.any(), // Will be validated by specific agent
  context: agentContextSchema.optional(),
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  scheduledAt: dateSchema.optional(),
  metadata: metadataSchema.optional(),
});

// Secretary agent schemas
export const secretaryOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('extract_metadata'),
    contractId: uuidSchema,
    content: z.string().min(1).max(1000000), // 1MB limit
    format: z.enum(['text', 'markdown', 'html', 'pdf']).optional(),
  }),
  z.object({
    action: z.literal('summarize_document'),
    content: z.string().min(1).max(1000000),
    maxLength: z.number().int().min(50).max(5000).default(500),
    style: z.enum(['executive', 'technical', 'legal']).default('executive'),
  }),
  z.object({
    action: z.literal('extract_entities'),
    content: z.string().min(1),
    entityTypes: z.array(z.enum(['person', 'organization', 'location', 'date', 'money'])),
  }),
  z.object({
    action: z.literal('format_document'),
    content: z.string().min(1),
    template: z.string().min(1).max(10000),
    variables: z.record(z.string(), z.any()).optional(),
  }),
]);

// Financial agent schemas
export const financialOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('analyze_costs'),
    contractId: uuidSchema,
    includeProjections: z.boolean().default(false),
    projectionMonths: z.number().int().min(1).max(60).optional(),
  }),
  z.object({
    action: z.literal('calculate_roi'),
    investment: moneySchema,
    returns: z.array(moneySchema),
    period: z.enum(['monthly', 'quarterly', 'yearly']),
  }),
  z.object({
    action: z.literal('budget_impact'),
    amount: moneySchema,
    budgetId: uuidSchema,
    startDate: dateSchema,
    endDate: dateSchema,
  }),
  z.object({
    action: z.literal('payment_schedule'),
    totalAmount: moneySchema,
    frequency: z.enum(['once', 'monthly', 'quarterly', 'annually']),
    startDate: dateSchema,
    numberOfPayments: z.number().int().min(1).max(360),
  }),
]);

// Legal agent schemas
export const legalOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('review_terms'),
    contractId: uuidSchema,
    focusAreas: z.array(z.enum([
      'liability',
      'indemnification',
      'termination',
      'intellectual_property',
      'confidentiality',
      'compliance',
    ])).optional(),
  }),
  z.object({
    action: z.literal('identify_risks'),
    content: z.string().min(1),
    riskCategories: z.array(z.string()).optional(),
    threshold: scoreSchema.default(5),
  }),
  z.object({
    action: z.literal('compliance_check'),
    contractId: uuidSchema,
    regulations: z.array(z.enum(['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI'])),
    jurisdiction: z.string().min(2).max(2), // ISO country code
  }),
]);

// Compliance agent schemas
export const complianceOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('regulatory_check'),
    entityType: z.enum(['contract', 'vendor', 'process']),
    entityId: uuidSchema,
    regulations: z.array(z.string()).min(1),
    deepScan: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('audit_preparation'),
    scope: z.enum(['contracts', 'vendors', 'financial', 'all']),
    startDate: dateSchema,
    endDate: dateSchema,
    auditType: z.string(),
  }),
  z.object({
    action: z.literal('policy_validation'),
    policyId: uuidSchema,
    targetEntities: z.array(uuidSchema),
    strictMode: z.boolean().default(true),
  }),
]);

// Risk assessment agent schemas
export const riskOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('comprehensive_risk'),
    targetType: z.enum(['contract', 'vendor', 'project']),
    targetId: uuidSchema,
    riskDimensions: z.array(z.enum([
      'financial',
      'operational',
      'legal',
      'reputational',
      'strategic',
      'compliance',
    ])).optional(),
  }),
  z.object({
    action: z.literal('risk_scoring'),
    risks: z.array(z.object({
      category: z.string(),
      description: z.string(),
      likelihood: scoreSchema,
      impact: scoreSchema,
    })),
    weights: z.record(z.string(), z.number()).optional(),
  }),
  z.object({
    action: z.literal('mitigation_plan'),
    riskId: uuidSchema,
    targetScore: scoreSchema,
    timeframe: z.enum(['immediate', 'short_term', 'long_term']),
  }),
]);

// Integration agent schemas
export const integrationOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('webhook_receive'),
    source: z.string(),
    event: z.string(),
    payload: z.any(),
    signature: z.string().optional(),
  }),
  z.object({
    action: z.literal('api_call'),
    endpoint: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.any().optional(),
    timeout: z.number().int().min(1000).max(300000).default(30000),
  }),
  z.object({
    action: z.literal('data_sync'),
    source: z.string(),
    destination: z.string(),
    mappings: z.array(z.object({
      sourceField: z.string(),
      destinationField: z.string(),
      transform: z.string().optional(),
    })),
    mode: z.enum(['full', 'incremental', 'delta']),
  }),
]);

// Data quality agent schemas
export const dataQualityOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('validate'),
    data: z.any(),
    schema: z.string(), // Schema name to use
    strict: z.boolean().default(true),
  }),
  z.object({
    action: z.literal('clean'),
    data: z.any(),
    rules: z.array(z.object({
      field: z.string(),
      operation: z.enum(['trim', 'lowercase', 'uppercase', 'remove_special', 'normalize']),
      options: z.any().optional(),
    })),
  }),
  z.object({
    action: z.literal('profile'),
    dataset: z.array(z.any()),
    fields: z.array(z.string()).optional(),
    includeStats: z.boolean().default(true),
  }),
  z.object({
    action: z.literal('deduplicate'),
    dataset: z.array(z.any()),
    keyFields: z.array(z.string()),
    strategy: z.enum(['keep_first', 'keep_last', 'merge']),
  }),
]);

// Manager agent schemas
export const managerOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('orchestrate'),
    workflow: z.object({
      name: z.string(),
      steps: z.array(z.object({
        agentType: agentTypeSchema,
        operation: z.string(),
        data: z.any(),
        dependsOn: z.array(z.string()).optional(),
      })),
    }),
    parallel: z.boolean().default(false),
    continueOnError: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('make_decision'),
    context: z.object({
      insights: z.array(z.any()),
      scores: z.record(z.string(), z.number()),
      recommendations: z.array(z.string()),
    }),
    criteria: z.object({
      threshold: scoreSchema,
      requiredConditions: z.array(z.string()).optional(),
      vetoConditions: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    action: z.literal('prioritize_tasks'),
    tasks: z.array(z.object({
      id: uuidSchema,
      type: z.string(),
      urgency: scoreSchema,
      importance: scoreSchema,
      dependencies: z.array(uuidSchema).optional(),
    })),
    strategy: z.enum(['urgent_important', 'fifo', 'deadline', 'value']),
  }),
]);

// Workflow agent schemas
export const workflowStepSchema = z.object({
  id: z.string().min(1).max(100),
  name: sanitizedStringSchema,
  agent: agentTypeSchema,
  action: z.string(),
  config: z.any().optional(),
  dependsOn: z.array(z.string()).optional(),
  parallel: z.boolean().optional(),
  timeout: z.number().int().min(1000).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    backoffMs: z.number().int().min(100).default(1000),
    backoffMultiplier: z.number().min(1).max(5).default(2),
  }).optional(),
  compensationAction: z.string().optional(),
  criticalStep: z.boolean().optional(),
  errorHandler: z.object({
    type: z.enum(['retry', 'skip', 'fail', 'compensate']),
    maxRetries: z.number().int().optional(),
    retryDelay: z.number().int().optional(),
    fallbackStep: z.string().optional(),
  }).optional(),
});

export const workflowOperationSchema = z.object({
  workflowId: z.string().min(1).max(100),
  name: sanitizedStringSchema,
  description: z.string().optional(),
  steps: z.array(workflowStepSchema).min(1).max(100),
  timeout: z.number().int().min(1000).optional(),
  enableRollback: z.boolean().default(false),
  checkpointInterval: z.number().int().min(1).optional(),
  resumeFromCheckpoint: z.string().optional(),
  checkpointData: z.any().optional(),
  metadata: metadataSchema.optional(),
});

// Analytics agent schemas
export const analyticsOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate_report'),
    reportType: z.enum(['contract_summary', 'vendor_performance', 'spend_analysis', 'risk_overview']),
    filters: z.object({
      dateRange: z.object({
        start: dateSchema,
        end: dateSchema,
      }),
      entityIds: z.array(uuidSchema).optional(),
      categories: z.array(z.string()).optional(),
    }),
    format: z.enum(['json', 'csv', 'pdf']).default('json'),
  }),
  z.object({
    action: z.literal('trend_analysis'),
    metric: z.string(),
    granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    periods: z.number().int().min(1).max(100),
    compareWith: z.enum(['previous_period', 'same_period_last_year']).optional(),
  }),
  z.object({
    action: z.literal('anomaly_detection'),
    dataset: z.array(z.object({
      timestamp: dateSchema,
      value: z.number(),
      dimensions: z.record(z.string(), z.any()).optional(),
    })),
    sensitivity: percentageSchema.default(95),
    method: z.enum(['statistical', 'ml_based']).default('statistical'),
  }),
]);

// Vendor agent schemas
export const vendorOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('evaluate_performance'),
    vendorId: uuidSchema,
    period: z.object({
      start: dateSchema,
      end: dateSchema,
    }),
    metrics: z.array(z.enum([
      'delivery_timeliness',
      'quality_score',
      'compliance_rate',
      'cost_efficiency',
      'communication_score',
    ])).optional(),
  }),
  z.object({
    action: z.literal('risk_assessment'),
    vendorId: uuidSchema,
    assessmentType: z.enum(['financial', 'operational', 'compliance', 'comprehensive']),
    includeRecommendations: z.boolean().default(true),
  }),
  z.object({
    action: z.literal('onboarding_check'),
    vendorData: z.object({
      name: sanitizedStringSchema,
      taxId: z.string(),
      address: z.any(), // Use addressSchema from common
      contacts: z.array(z.object({
        name: sanitizedStringSchema,
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.string(),
      })),
    }),
    requiredDocuments: z.array(z.string()),
  }),
]);

// Notification agent schemas
export const notificationOperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('send_notification'),
    recipientId: uuidSchema,
    type: z.enum(['email', 'in_app', 'sms', 'webhook']),
    template: z.string(),
    data: z.record(z.string(), z.any()),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    scheduledAt: dateSchema.optional(),
  }),
  z.object({
    action: z.literal('batch_notifications'),
    notifications: z.array(z.object({
      recipientId: uuidSchema,
      template: z.string(),
      data: z.record(z.string(), z.any()),
    })).min(1).max(1000),
    type: z.enum(['email', 'in_app']),
    groupBy: z.enum(['recipient', 'template']).optional(),
  }),
  z.object({
    action: z.literal('create_reminder'),
    targetId: uuidSchema,
    targetType: z.enum(['contract', 'task', 'deadline']),
    reminderDate: futureDateSchema,
    message: sanitizedStringSchema,
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
  }),
]);

// Validation function with detailed error formatting
export function validateAgentOperation(
  agentType: string,
  operation: unknown,
): { success: boolean; data?: any; errors?: string[] } {
  let schema: z.ZodSchema;

  switch (agentType) {
    case 'secretary':
      schema = secretaryOperationSchema;
      break;
    case 'financial':
      schema = financialOperationSchema;
      break;
    case 'legal':
      schema = legalOperationSchema;
      break;
    case 'compliance':
      schema = complianceOperationSchema;
      break;
    case 'risk-assessment':
      schema = riskOperationSchema;
      break;
    case 'integration':
      schema = integrationOperationSchema;
      break;
    case 'data-quality':
      schema = dataQualityOperationSchema;
      break;
    case 'manager':
      schema = managerOperationSchema;
      break;
    case 'workflow':
      schema = workflowOperationSchema;
      break;
    case 'analytics':
      schema = analyticsOperationSchema;
      break;
    case 'vendor':
      schema = vendorOperationSchema;
      break;
    case 'notifications':
      schema = notificationOperationSchema;
      break;
    default:
      return {
        success: false,
        errors: [`Unknown agent type: ${agentType}`],
      };
  }

  try {
    const data = schema.parse(operation);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = (error as z.ZodError).errors.map(e =>
        `${e.path.join('.')}: ${e.message}`,
      );
      return { success: false, errors };
    }
    throw error;
  }
}

// Helper to create future date
function futureDateSchema() {
  return dateSchema.refine(
    (date) => new Date(date) > new Date(),
    'Date must be in the future',
  );
}