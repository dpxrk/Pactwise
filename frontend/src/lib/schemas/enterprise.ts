import { z } from 'zod';

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
