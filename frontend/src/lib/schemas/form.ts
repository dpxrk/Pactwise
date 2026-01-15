import { z } from 'zod';

import { idSchema, emailSchema, urlSchema } from './base';
import { contractTypeSchema } from './contract';
import { vendorCategorySchema } from './vendor';

// Form validation schemas
export const createContractFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  vendorId: idSchema,
  contractType: contractTypeSchema,
  file: z.object({
    name: z.string().min(1),
    size: z.number().min(1).max(10 * 1024 * 1024), // 10MB limit
    type: z.enum([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]),
  }),
  notes: z.string().max(2000).optional(),
  value: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const createVendorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  contactEmail: emailSchema.optional(),
  contactPhone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  website: urlSchema.optional(),
  address: z.string().max(500).optional(),
  category: vendorCategorySchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
});
