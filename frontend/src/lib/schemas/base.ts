import { z } from 'zod';

// Base primitive schemas
export const idSchema = z.string().min(1);
export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().email();
export const urlSchema = z.string().url();

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional(),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('desc'),
});
