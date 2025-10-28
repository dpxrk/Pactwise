import { z } from 'zod';
import { idSchema } from './base';
import { contractTypeSchema, contractStatusSchema } from './contract';
import { vendorCategorySchema, vendorStatusSchema } from './vendor';

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
