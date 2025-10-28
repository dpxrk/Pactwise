import { z } from 'zod';
import { idSchema, timestampSchema } from './base';

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

export type NotificationType = z.infer<typeof notificationTypeSchema>;
