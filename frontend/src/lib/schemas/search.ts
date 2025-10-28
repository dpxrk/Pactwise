import { z } from 'zod';
import { idSchema, timestampSchema, paginationSchema, sortSchema } from './base';
import { contractTypeSchema, contractStatusSchema } from './contract';

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    contractTypes: z.array(contractTypeSchema).optional(),
    statuses: z.array(contractStatusSchema).optional(),
    dateRange: z.object({
      start: timestampSchema.optional(),
      end: timestampSchema.optional(),
    }).optional(),
    vendorIds: z.array(idSchema).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  sort: sortSchema.optional(),
  pagination: paginationSchema.optional(),
  options: z.object({
    includeContent: z.boolean().default(false),
    highlightMatches: z.boolean().default(true),
    fuzzyMatch: z.boolean().default(false),
    boost: z.record(z.number()).optional(),
    debug: z.boolean().default(false),
  }).optional(),
});
