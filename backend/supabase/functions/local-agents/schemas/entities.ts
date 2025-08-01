import { z } from 'zod';
import {
  uuidSchema,
  dateSchema,
  moneySchema,
  emailSchema,
  phoneSchema,
  addressSchema,
  metadataSchema,
  sanitizedStringSchema,
  contractStatusSchema,
  vendorStatusSchema,
  scoreSchema,
  percentageSchema,
} from './common.ts';

// Helper function to create sanitized string schema with length constraints
const sanitizedString = (minLength?: number, maxLength?: number) => {
  let schema = z.string();
  if (minLength !== undefined) schema = schema.min(minLength);
  if (maxLength !== undefined) schema = schema.max(maxLength);
  return schema.transform(s => s.trim()).refine(s => s.length > 0, 'String cannot be empty after trimming');
};

/**
 * Entity validation schemas
 */

// Contract schemas
export const contractTypeSchema = z.enum([
  'service',
  'purchase',
  'lease',
  'license',
  'maintenance',
  'consulting',
  'nda',
  'partnership',
  'other',
]);

const contractBaseSchema = z.object({
  name: sanitizedString(3, 255),
  vendorId: uuidSchema,
  type: contractTypeSchema,
  status: contractStatusSchema.default('draft'),
  description: sanitizedString(undefined, 2000).optional(),

  // Financial
  value: moneySchema,
  paymentTerms: z.enum(['NET30', 'NET60', 'NET90', 'DUE_ON_RECEIPT', 'CUSTOM']).optional(),
  customPaymentTerms: z.string().max(500).optional(),

  // Dates
  startDate: dateSchema,
  endDate: dateSchema,
  signedDate: dateSchema.optional(),

  // Renewal
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.number().int().min(0).max(365).optional(),
  renewalTermMonths: z.number().int().min(1).max(60).optional(),

  // Metadata
  metadata: metadataSchema.optional(),
  tags: z.array(sanitizedStringSchema).max(20).optional(),

  // References
  parentContractId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  ownerId: uuidSchema.optional(),
});

export const contractCreateSchema = contractBaseSchema.refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  { message: 'Start date must be before or equal to end date' },
).refine(
  (data) => !data.signedDate || new Date(data.signedDate) <= new Date(),
  { message: 'Signed date cannot be in the future' },
);

export const contractUpdateSchema = contractBaseSchema.partial().extend({
  id: uuidSchema,
});

export const contractSearchSchema = z.object({
  search: sanitizedStringSchema.optional(),
  vendorIds: z.array(uuidSchema).optional(),
  types: z.array(contractTypeSchema).optional(),
  statuses: z.array(contractStatusSchema).optional(),
  valueRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  dateRange: z.object({
    start: dateSchema.optional(),
    end: dateSchema.optional(),
    dateField: z.enum(['created', 'start', 'end', 'signed']).default('created'),
  }).optional(),
  tags: z.array(sanitizedStringSchema).optional(),
  hasAutoRenew: z.boolean().optional(),
  expiringInDays: z.number().int().min(0).max(365).optional(),
});

// Vendor schemas
export const vendorTierSchema = z.enum(['strategic', 'preferred', 'standard', 'probation']);

export const vendorCreateSchema = z.object({
  // Basic info
  name: sanitizedString(2, 255),
  legalName: sanitizedString(undefined, 255).optional(),
  taxId: z.string().regex(/^[A-Z0-9-]+$/, 'Invalid tax ID format').optional(),
  website: z.string().url().optional(),

  // Status
  status: vendorStatusSchema.default('pending'),
  tier: vendorTierSchema.default('standard'),

  // Contact
  primaryContact: z.object({
    name: sanitizedStringSchema,
    email: emailSchema,
    phone: phoneSchema.optional(),
    title: sanitizedStringSchema.optional(),
  }),

  // Address
  address: addressSchema,
  billingAddress: addressSchema.optional(),

  // Financial
  paymentTerms: z.enum(['NET30', 'NET60', 'NET90', 'DUE_ON_RECEIPT', 'CUSTOM']).default('NET30'),
  currency: z.string().length(3).default('USD'),
  creditLimit: z.number().min(0).optional(),

  // Compliance
  insuranceCoverage: moneySchema.optional(),
  insuranceExpiry: dateSchema.optional(),
  certifications: z.array(z.object({
    name: sanitizedStringSchema,
    issuedBy: sanitizedStringSchema,
    expiryDate: dateSchema.optional(),
    documentUrl: z.string().url().optional(),
  })).max(20).optional(),

  // Risk
  riskScore: scoreSchema.optional(),
  complianceStatus: z.enum(['compliant', 'pending', 'non_compliant']).default('pending'),

  // Metadata
  metadata: metadataSchema.optional(),
  tags: z.array(sanitizedStringSchema).max(20).optional(),
  categories: z.array(sanitizedStringSchema).max(10).optional(),
});

export const vendorUpdateSchema = vendorCreateSchema.partial().extend({
  id: uuidSchema,
});

export const vendorPerformanceSchema = z.object({
  vendorId: uuidSchema,
  period: z.object({
    start: dateSchema,
    end: dateSchema,
  }),
  metrics: z.object({
    deliveryScore: scoreSchema,
    qualityScore: scoreSchema,
    communicationScore: scoreSchema,
    complianceScore: scoreSchema,
    overallScore: scoreSchema,
  }),
  details: z.object({
    totalOrders: z.number().int().min(0),
    onTimeDeliveries: z.number().int().min(0),
    qualityIssues: z.number().int().min(0),
    responseTime: z.number().min(0), // hours
    contractCompliance: percentageSchema,
  }),
  incidents: z.array(z.object({
    date: dateSchema,
    type: z.enum(['delivery', 'quality', 'compliance', 'communication', 'other']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: sanitizedStringSchema,
    resolved: z.boolean(),
  })).optional(),
});

// Budget schemas
export const budgetTypeSchema = z.enum(['annual', 'project', 'department', 'category']);

export const budgetCreateSchema = z.object({
  name: sanitizedString(3, 255),
  type: budgetTypeSchema,
  amount: moneySchema,
  period: z.object({
    start: dateSchema,
    end: dateSchema,
  }),
  departmentId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  ownerId: uuidSchema,

  // Allocations
  allocations: z.array(z.object({
    category: sanitizedStringSchema,
    amount: moneySchema,
    percentage: percentageSchema.optional(),
  })).optional(),

  // Thresholds
  warningThreshold: percentageSchema.default(80),
  criticalThreshold: percentageSchema.default(90),

  // Settings
  rolloverUnused: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  approvalThreshold: moneySchema.optional(),

  metadata: metadataSchema.optional(),
});

// User schemas (for validation in agent context)
export const userRoleSchema = z.enum(['viewer', 'user', 'manager', 'admin', 'owner']);

export const userPermissionsSchema = z.object({
  contracts: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
    approve: z.boolean(),
  }),
  vendors: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
    approve: z.boolean(),
  }),
  budgets: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
    approve: z.boolean(),
  }),
  agents: z.object({
    configure: z.boolean(),
    execute: z.boolean(),
    viewInsights: z.boolean(),
  }),
});

// Insight schemas
export const insightSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const insightCreateSchema = z.object({
  agentId: uuidSchema,
  insightType: sanitizedString(undefined, 100),
  title: sanitizedString(undefined, 255),
  description: sanitizedString(undefined, 2000),
  severity: insightSeveritySchema,
  confidenceScore: scoreSchema.transform(s => s / 10), // 0-1 range

  // Related entities
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  budgetId: uuidSchema.optional(),

  // Action
  isActionable: z.boolean().default(false),
  recommendedAction: sanitizedString(undefined, 1000).optional(),

  // Data
  data: z.any().optional(),
  metadata: metadataSchema.optional(),

  // Expiry
  expiresAt: dateSchema.optional(),
});

// Notification schemas
export const notificationTypeSchema = z.enum(['email', 'in_app', 'sms', 'webhook']);
export const notificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const notificationCreateSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema,
  priority: notificationPrioritySchema.default('normal'),

  title: sanitizedString(undefined, 255),
  message: sanitizedString(undefined, 2000),

  // Delivery
  channels: z.array(notificationTypeSchema).min(1),
  scheduledAt: dateSchema.optional(),

  // Context
  relatedEntity: z.object({
    type: z.enum(['contract', 'vendor', 'budget', 'task', 'insight']),
    id: uuidSchema,
  }).optional(),

  // Actions
  actions: z.array(z.object({
    label: sanitizedString(undefined, 50),
    url: z.string().url().optional(),
    primary: z.boolean().default(false),
  })).max(3).optional(),

  metadata: metadataSchema.optional(),
});

// Workflow schemas
export const workflowStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);

export const workflowTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('manual'),
  }),
  z.object({
    type: z.literal('schedule'),
    cron: z.string(), // Validated by cronSchema from common
  }),
  z.object({
    type: z.literal('event'),
    eventType: z.string(),
    filters: z.record(z.string(), z.any()).optional(),
  }),
  z.object({
    type: z.literal('condition'),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in']),
      value: z.any(),
    })),
  }),
]);

// Document schemas
export const documentTypeSchema = z.enum([
  'contract',
  'invoice',
  'po',
  'sow',
  'nda',
  'report',
  'certificate',
  'other',
]);

export const documentMetadataSchema = z.object({
  fileName: sanitizedString(undefined, 255),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // 100MB
  mimeType: z.string().regex(/^[\w\-]+\/[\w\-]+$/),
  uploadedBy: uuidSchema,
  uploadedAt: dateSchema,

  // Optional fields
  documentType: documentTypeSchema.optional(),
  description: sanitizedString(undefined, 1000).optional(),
  tags: z.array(sanitizedStringSchema).max(10).optional(),

  // Related entities
  contractId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),

  // Processing status
  processed: z.boolean().default(false),
  extractedText: z.string().optional(),
  aiAnalysis: z.any().optional(),
});

// Helper functions for entity validation
export function validateContractDates(contract: any): boolean {
  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  const now = new Date();

  // Basic validation
  if (start > end) {return false;}

  // Additional business rules
  if (contract.status === 'active' && start > now) {return false;}
  if (contract.status === 'expired' && end > now) {return false;}

  return true;
}

export function validateVendorCompliance(vendor: any): string[] {
  const issues: string[] = [];

  if (!vendor.taxId) {
    issues.push('Missing tax ID');
  }

  if (vendor.insuranceExpiry && new Date(vendor.insuranceExpiry) < new Date()) {
    issues.push('Insurance expired');
  }

  if (vendor.certifications) {
    vendor.certifications.forEach((cert: any) => {
      if (cert.expiryDate && new Date(cert.expiryDate) < new Date()) {
        issues.push(`${cert.name} certification expired`);
      }
    });
  }

  return issues;
}