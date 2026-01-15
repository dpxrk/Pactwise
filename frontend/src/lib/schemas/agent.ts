import { z } from 'zod';

import { idSchema, timestampSchema } from './base';

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

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
