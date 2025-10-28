import { z } from 'zod';
import { idSchema, timestampSchema } from './base';

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

export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type ContractType = z.infer<typeof contractTypeSchema>;
