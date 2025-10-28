import { z } from 'zod';
import { idSchema, timestampSchema, emailSchema } from './base';

// User schemas
export const userRoleSchema = z.enum(['owner', 'admin', 'manager', 'user', 'viewer']);

export const userSchema = z.object({
  clerkId: z.string(),
  email: emailSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  enterpriseId: idSchema,
  role: userRoleSchema,
  isActive: z.boolean().default(true),
  lastLoginAt: timestampSchema.optional(),
  phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

export type UserRole = z.infer<typeof userRoleSchema>;
