import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  sanitizers,
  sanitizationTransformers,
  formatValidationErrors,
  validateBatch,
} from '../functions/local-agents/middleware/validation';
import {
  validateAgentOperation,
  financialOperationSchema,
  workflowStepSchema,
} from '../functions/local-agents/schemas/agent-operations';
import {
  contractCreateSchema,
  vendorCreateSchema,
  validateContractDates,
  validateVendorCompliance,
} from '../functions/local-agents/schemas/entities';
import {
  moneySchema,
  emailSchema,
  dateRangeSchema,
  metadataSchema,
} from '../functions/local-agents/schemas/common';

describe('Input Validation System', () => {
  describe('Common Schemas', () => {
    it('should validate money schema correctly', () => {
      const validMoney = { amount: 100.50, currency: 'USD' };
      const result = moneySchema.safeParse(validMoney);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validMoney);

      const invalidMoney = { amount: -100, currency: 'US' };
      const invalidResult = moneySchema.safeParse(invalidMoney);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.errors).toHaveLength(2);
    });

    it('should validate email with additional checks', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@company.co.uk',
        'admin@localhost.local',
      ];

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
        expect(result.data).toBe(email.toLowerCase());
      });

      const invalidEmails = [
        'invalid..email@test.com', // consecutive dots
        '@example.com',
        'user@',
        'plaintext',
      ];

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });

    it('should validate date ranges', () => {
      const validRange = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      const result = dateRangeSchema.safeParse(validRange);
      expect(result.success).toBe(true);

      const invalidRange = {
        startDate: '2024-12-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z',
      };

      const invalidResult = dateRangeSchema.safeParse(invalidRange);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.errors[0].message).toContain('Start date must be before');
    });

    it('should validate metadata with size limits', () => {
      const validMetadata = {
        key1: 'value1',
        key2: { nested: 'value' },
        key3: [1, 2, 3],
      };

      const result = metadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);

      // Create large metadata exceeding 64KB
      const largeMetadata: Record<string, string> = {};
      for (let i = 0; i < 10000; i++) {
        largeMetadata[`key${i}`] = 'a'.repeat(20);
      }

      const largeResult = metadataSchema.safeParse(largeMetadata);
      expect(largeResult.success).toBe(false);
      expect(largeResult.error?.errors[0].message).toContain('too large');
    });
  });

  describe('Agent Operation Validation', () => {
    it('should validate secretary operations', () => {
      const validExtract = {
        action: 'extract_metadata',
        contractId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'This is a test contract',
        format: 'text',
      };

      const result = validateAgentOperation('secretary', validExtract);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validExtract);

      const invalidExtract = {
        action: 'extract_metadata',
        contractId: 'invalid-uuid',
        content: '', // empty content
      };

      const invalidResult = validateAgentOperation('secretary', invalidExtract);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors).toContain('contractId: Invalid UUID format');
    });

    it('should validate financial operations', () => {
      const validROI = {
        action: 'calculate_roi',
        investment: { amount: 10000, currency: 'USD' },
        returns: [
          { amount: 1000, currency: 'USD' },
          { amount: 1200, currency: 'USD' },
          { amount: 1500, currency: 'USD' },
        ],
        period: 'monthly',
      };

      const result = financialOperationSchema.safeParse(validROI);
      expect(result.success).toBe(true);

      const invalidROI = {
        action: 'calculate_roi',
        investment: { amount: -1000, currency: 'USD' },
        returns: [],
        period: 'weekly', // invalid period
      };

      const invalidResult = financialOperationSchema.safeParse(invalidROI);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate workflow steps with dependencies', () => {
      const validStep = {
        id: 'step1',
        name: 'Extract Contract Data',
        agent: 'secretary',
        action: 'extract_metadata',
        dependsOn: ['step0'],
        parallel: false,
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          backoffMultiplier: 2,
        },
      };

      const result = workflowStepSchema.safeParse(validStep);
      expect(result.success).toBe(true);

      const invalidStep = {
        id: '', // empty id
        name: '   ', // only whitespace
        agent: 'unknown-agent',
        action: 'test',
        timeout: 500, // too small
      };

      const invalidResult = workflowStepSchema.safeParse(invalidStep);
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error?.errors.length).toBeGreaterThan(2);
    });
  });

  describe('Entity Validation', () => {
    it('should validate contract creation', () => {
      const validContract = {
        name: 'Annual Service Agreement',
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'service',
        value: { amount: 50000, currency: 'USD' },
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        autoRenew: true,
        renewalNoticeDays: 30,
      };

      const result = contractCreateSchema.safeParse(validContract);
      expect(result.success).toBe(true);

      const invalidContract = {
        name: 'AB', // too short
        vendorId: 'invalid',
        type: 'unknown',
        value: { amount: -1000 },
        startDate: '2024-12-31T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z', // before start
      };

      const invalidResult = contractCreateSchema.safeParse(invalidContract);
      expect(invalidResult.success).toBe(false);
      const errors = formatValidationErrors(invalidResult.error!);
      expect(errors).toContain('name: String must contain at least 3 character(s)');
    });

    it('should validate vendor creation with nested objects', () => {
      const validVendor = {
        name: 'Acme Corporation',
        status: 'active',
        primaryContact: {
          name: 'John Doe',
          email: 'john@acme.com',
          phone: '+1234567890',
        },
        address: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        certifications: [
          {
            name: 'ISO 9001',
            issuedBy: 'ISO',
            expiryDate: '2025-12-31T00:00:00Z',
          },
        ],
      };

      const result = vendorCreateSchema.safeParse(validVendor);
      expect(result.success).toBe(true);

      // Test compliance validation
      const complianceIssues = validateVendorCompliance({
        ...validVendor,
        insuranceExpiry: '2023-01-01T00:00:00Z', // expired
      });
      expect(complianceIssues).toContain('Insurance expired');
    });

    it('should validate contract dates business rules', () => {
      const activeContractWithFutureStart = {
        status: 'active',
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T00:00:00Z',
      };

      expect(validateContractDates(activeContractWithFutureStart)).toBe(false);

      const validActiveContract = {
        status: 'active',
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2025-12-31T00:00:00Z',
      };

      expect(validateContractDates(validActiveContract)).toBe(true);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize strings correctly', () => {
      expect(sanitizers.stripHtml('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(sanitizers.normalizeWhitespace('  Hello   World  ')).toBe('Hello World');
      expect(sanitizers.removeSpecialChars('Hello@#$World!')).toBe('HelloWorld!');
      expect(sanitizers.truncate('This is a very long string', 10)).toBe('This is...');
    });

    it('should use sanitization transformers', () => {
      const emailTransformer = sanitizationTransformers.normalizedEmail;
      const result = emailTransformer.safeParse('  TEST@EXAMPLE.COM  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');

      const phoneTransformer = sanitizationTransformers.normalizedPhone;
      const phoneResult = phoneTransformer.safeParse('+1 (234) 567-8900');
      expect(phoneResult.success).toBe(true);
      expect(phoneResult.data).toBe('12345678900');
    });

    it('should clean objects', () => {
      const dirty = {
        name: 'Test',
        value: null,
        empty: '',
        zero: 0,
        false: false,
        undefined,
      };

      const clean = sanitizers.cleanObject(dirty);
      expect(clean).toEqual({
        name: 'Test',
        zero: 0,
        false: false,
      });
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch operations', async () => {
      const items = [
        { amount: 100, currency: 'USD' },
        { amount: 200, currency: 'EUR' },
        { amount: -50, currency: 'USD' }, // invalid
        { amount: 300, currency: 'INVALID' }, // invalid
        { amount: 400, currency: 'GBP' },
      ];

      const result = await validateBatch(items, moneySchema, {
        continueOnError: true,
      });

      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(2);
      expect(result.invalid[0].index).toBe(2);
      expect(result.invalid[0].errors[0]).toContain('Amount must be positive');
    });

    it('should stop on first error when requested', async () => {
      const items = [
        { amount: 100, currency: 'USD' },
        { amount: -50, currency: 'USD' }, // invalid
        { amount: 200, currency: 'EUR' },
      ];

      const result = await validateBatch(items, moneySchema, {
        continueOnError: false,
      });

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate discriminated unions', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('email'),
          to: emailSchema,
          subject: z.string(),
        }),
        z.object({
          type: z.literal('sms'),
          to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
          message: z.string().max(160),
        }),
      ]);

      const validEmail = {
        type: 'email',
        to: 'test@example.com',
        subject: 'Test',
      };

      expect(schema.safeParse(validEmail).success).toBe(true);

      const invalidMixed = {
        type: 'email',
        to: '+1234567890', // phone number for email type
        message: 'Test', // wrong field
      };

      expect(schema.safeParse(invalidMixed).success).toBe(false);
    });

    it('should validate with custom refinements', () => {
      const passwordSchema = z.string()
        .min(8, 'Password must be at least 8 characters')
        .refine(
          (val) => /[A-Z]/.test(val),
          'Password must contain at least one uppercase letter',
        )
        .refine(
          (val) => /[0-9]/.test(val),
          'Password must contain at least one number',
        )
        .refine(
          (val) => /[!@#$%^&*]/.test(val),
          'Password must contain at least one special character',
        );

      const weakPassword = 'password';
      const result = passwordSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
      expect(result.error?.errors).toHaveLength(3);

      const strongPassword = 'P@ssw0rd123';
      expect(passwordSchema.safeParse(strongPassword).success).toBe(true);
    });

    it('should handle circular references in validation', () => {
      const nodeSchema: z.ZodSchema<unknown> = z.lazy(() =>
        z.object({
          id: z.string(),
          children: z.array(nodeSchema).optional(),
        }),
      );

      const validTree = {
        id: 'root',
        children: [
          { id: 'child1' },
          {
            id: 'child2',
            children: [
              { id: 'grandchild1' },
            ],
          },
        ],
      };

      const result = nodeSchema.safeParse(validTree);
      expect(result.success).toBe(true);
    });
  });
});