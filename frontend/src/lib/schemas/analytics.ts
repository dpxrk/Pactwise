import { z } from 'zod';

import { idSchema } from './base';
import { contractTypeSchema } from './contract';

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

export type MetricType = z.infer<typeof metricTypeSchema>;
export type TimeRange = z.infer<typeof timeRangeSchema>;
