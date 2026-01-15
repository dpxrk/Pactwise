import { z } from 'zod';

import { idSchema, timestampSchema, emailSchema, urlSchema } from './base';

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

export type VendorCategory = z.infer<typeof vendorCategorySchema>;
