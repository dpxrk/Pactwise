import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  contractSchema,
  vendorSchema,
  budgetSchema,
  paginationSchema,
  validateRequest,
} from '../../supabase/functions/_shared/validation';

describe('Validation Schemas', () => {
  describe('contractSchema', () => {
    it('should validate valid contract data', () => {
      const validContract = {
        title: 'Test Contract',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
        vendorId: '550e8400-e29b-41d4-a716-446655440000',
        notes: 'Important contract notes',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        value: 50000,
        isAutoRenew: true,
        autoAnalyze: false,
      };

      expect(() => contractSchema.parse(validContract)).not.toThrow();
    });

    it('should validate minimal contract data', () => {
      const minimalContract = {
        title: 'Minimal Contract',
        fileName: 'minimal.pdf',
        fileType: 'pdf',
        storageId: 'storage-456',
      };

      expect(() => contractSchema.parse(minimalContract)).not.toThrow();
    });

    it('should reject empty title', () => {
      const invalidContract = {
        title: '',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
      };

      expect(() => contractSchema.parse(invalidContract)).toThrow();
    });

    it('should reject title exceeding max length', () => {
      const invalidContract = {
        title: 'A'.repeat(256),
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
      };

      expect(() => contractSchema.parse(invalidContract)).toThrow();
    });

    it('should reject invalid vendor ID format', () => {
      const invalidContract = {
        title: 'Test Contract',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
        vendorId: 'not-a-uuid',
      };

      expect(() => contractSchema.parse(invalidContract)).toThrow();
    });

    it('should reject negative value', () => {
      const invalidContract = {
        title: 'Test Contract',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
        value: -1000,
      };

      expect(() => contractSchema.parse(invalidContract)).toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidContract = {
        title: 'Test Contract',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
        startDate: '2024-01-01', // Not datetime format
      };

      expect(() => contractSchema.parse(invalidContract)).toThrow();
    });

    it('should accept null for optional fields', () => {
      const contractWithNulls = {
        title: 'Test Contract',
        fileName: 'contract.pdf',
        fileType: 'pdf',
        storageId: 'storage-123',
        vendorId: null,
        notes: null,
        startDate: null,
        endDate: null,
        value: null,
      };

      expect(() => contractSchema.parse(contractWithNulls)).not.toThrow();
    });
  });

  describe('vendorSchema', () => {
    it('should validate valid vendor data', () => {
      const validVendor = {
        name: 'ABC Corporation',
        category: 'technology',
        status: 'active',
        website: 'https://example.com',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        contactPhone: '+1-234-567-8900',
        address: '123 Main St, City, State 12345',
        metadata: { customField: 'value' },
      };

      expect(() => vendorSchema.parse(validVendor)).not.toThrow();
    });

    it('should validate minimal vendor data', () => {
      const minimalVendor = {
        name: 'Minimal Vendor',
        category: 'other',
      };

      expect(() => vendorSchema.parse(minimalVendor)).not.toThrow();
    });

    it('should reject invalid category', () => {
      const invalidVendor = {
        name: 'Test Vendor',
        category: 'invalid-category',
      };

      expect(() => vendorSchema.parse(invalidVendor)).toThrow();
    });

    it('should validate all category enum values', () => {
      const categories = [
        'technology', 'marketing', 'legal', 'finance', 'hr',
        'facilities', 'logistics', 'manufacturing', 'consulting', 'other',
      ];

      categories.forEach(category => {
        const vendor = { name: 'Test', category };
        expect(() => vendorSchema.parse(vendor)).not.toThrow();
      });
    });

    it('should reject invalid status', () => {
      const invalidVendor = {
        name: 'Test Vendor',
        category: 'technology',
        status: 'deleted',
      };

      expect(() => vendorSchema.parse(invalidVendor)).toThrow();
    });

    it('should validate all status enum values', () => {
      const statuses = ['active', 'inactive', 'pending', 'suspended'];

      statuses.forEach(status => {
        const vendor = { name: 'Test', category: 'other', status };
        expect(() => vendorSchema.parse(vendor)).not.toThrow();
      });
    });

    it('should reject invalid email format', () => {
      const invalidVendor = {
        name: 'Test Vendor',
        category: 'technology',
        contactEmail: 'not-an-email',
      };

      expect(() => vendorSchema.parse(invalidVendor)).toThrow();
    });

    it('should reject invalid URL format', () => {
      const invalidVendor = {
        name: 'Test Vendor',
        category: 'technology',
        website: 'not-a-url',
      };

      expect(() => vendorSchema.parse(invalidVendor)).toThrow();
    });

    it('should accept null for optional fields', () => {
      const vendorWithNulls = {
        name: 'Test Vendor',
        category: 'technology',
        website: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        address: null,
      };

      expect(() => vendorSchema.parse(vendorWithNulls)).not.toThrow();
    });
  });

  describe('budgetSchema', () => {
    it('should validate valid budget data', () => {
      const validBudget = {
        name: 'Q1 2024 Budget',
        budgetType: 'quarterly',
        totalBudget: 100000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        department: 'Engineering',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        parentBudgetId: '550e8400-e29b-41d4-a716-446655440001',
        metadata: { costCenter: 'CC-001' },
      };

      expect(() => budgetSchema.parse(validBudget)).not.toThrow();
    });

    it('should validate minimal budget data', () => {
      const minimalBudget = {
        name: 'Minimal Budget',
        budgetType: 'annual',
        totalBudget: 50000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      expect(() => budgetSchema.parse(minimalBudget)).not.toThrow();
    });

    it('should reject invalid budget type', () => {
      const invalidBudget = {
        name: 'Test Budget',
        budgetType: 'weekly',
        totalBudget: 10000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-07T23:59:59Z',
      };

      expect(() => budgetSchema.parse(invalidBudget)).toThrow();
    });

    it('should validate all budget type enum values', () => {
      const budgetTypes = ['annual', 'quarterly', 'monthly', 'project', 'department'];

      budgetTypes.forEach(budgetType => {
        const budget = {
          name: 'Test Budget',
          budgetType,
          totalBudget: 10000,
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        };
        expect(() => budgetSchema.parse(budget)).not.toThrow();
      });
    });

    it('should reject negative total budget', () => {
      const invalidBudget = {
        name: 'Test Budget',
        budgetType: 'annual',
        totalBudget: -1000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      expect(() => budgetSchema.parse(invalidBudget)).toThrow();
    });

    it('should reject zero total budget', () => {
      const invalidBudget = {
        name: 'Test Budget',
        budgetType: 'annual',
        totalBudget: 0,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      expect(() => budgetSchema.parse(invalidBudget)).toThrow();
    });

    it('should reject invalid UUID format for owner ID', () => {
      const invalidBudget = {
        name: 'Test Budget',
        budgetType: 'annual',
        totalBudget: 10000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        ownerId: 'not-a-uuid',
      };

      expect(() => budgetSchema.parse(invalidBudget)).toThrow();
    });

    it('should accept null for optional fields', () => {
      const budgetWithNulls = {
        name: 'Test Budget',
        budgetType: 'annual',
        totalBudget: 10000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        department: null,
        ownerId: null,
        parentBudgetId: null,
      };

      expect(() => budgetSchema.parse(budgetWithNulls)).not.toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const validPagination = {
        page: 2,
        limit: 20,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      const result = paginationSchema.parse(validPagination);
      expect(result).toEqual(validPagination);
    });

    it('should use default values when not provided', () => {
      const emptyPagination = {};

      const result = paginationSchema.parse(emptyPagination);
      expect(result).toEqual({
        page: 1,
        limit: 50,
        sortOrder: 'desc',
      });
    });

    it('should reject negative page number', () => {
      const invalidPagination = { page: -1 };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should reject zero page number', () => {
      const invalidPagination = { page: 0 };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should reject non-integer page number', () => {
      const invalidPagination = { page: 1.5 };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should reject negative limit', () => {
      const invalidPagination = { limit: -10 };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should reject limit exceeding maximum', () => {
      const invalidPagination = { limit: 101 };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should accept limit at maximum', () => {
      const validPagination = { limit: 100 };
      const result = paginationSchema.parse(validPagination);
      expect(result.limit).toBe(100);
    });

    it('should reject invalid sort order', () => {
      const invalidPagination = { sortOrder: 'random' };
      expect(() => paginationSchema.parse(invalidPagination)).toThrow();
    });

    it('should accept both asc and desc sort orders', () => {
      expect(() => paginationSchema.parse({ sortOrder: 'asc' })).not.toThrow();
      expect(() => paginationSchema.parse({ sortOrder: 'desc' })).not.toThrow();
    });
  });

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
      email: z.string().email().optional(),
    });

    it('should validate and return parsed data', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = validateRequest(testSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw error with validation message', () => {
      const invalidData = {
        name: '',
        age: -5,
      };

      expect(() => validateRequest(testSchema, invalidData)).toThrow('Validation error');
    });

    it('should include all validation errors in message', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'not-an-email',
      };

      try {
        validateRequest(testSchema, invalidData);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain('Validation error');
        // Should mention multiple fields
        expect(errorMessage.split(',').length).toBeGreaterThan(1);
      }
    });

    it('should handle non-Zod errors', () => {
      const schema = z.object({
        test: z.string().transform(() => {
          throw new Error('Custom error');
        }),
      });

      expect(() => validateRequest(schema, { test: 'value' })).toThrow('Custom error');
    });

    it('should coerce types when possible', () => {
      const coerceSchema = z.object({
        count: z.coerce.number(),
        active: z.coerce.boolean(),
      });

      const result = validateRequest(coerceSchema, {
        count: '42',
        active: 'true',
      });

      expect(result).toEqual({
        count: 42,
        active: true,
      });
    });
  });

  describe('Schema edge cases', () => {
    it('should handle very long but valid strings', () => {
      const longContract = {
        title: 'A'.repeat(255),
        fileName: 'B'.repeat(255),
        fileType: 'C'.repeat(100),
        storageId: 'storage-123',
        notes: 'D'.repeat(2000),
      };

      expect(() => contractSchema.parse(longContract)).not.toThrow();
    });

    it('should handle special characters in vendor names', () => {
      const vendorWithSpecialChars = {
        name: 'ABC & Co., Ltd. (Test)',
        category: 'technology',
      };

      expect(() => vendorSchema.parse(vendorWithSpecialChars)).not.toThrow();
    });

    it('should handle international characters', () => {
      const internationalVendor = {
        name: 'Société Générale',
        category: 'finance',
        contactName: 'José García',
        address: 'Straße 123, München',
      };

      expect(() => vendorSchema.parse(internationalVendor)).not.toThrow();
    });

    it('should handle flat metadata key-value pairs', () => {
      const flatMetadata = {
        name: 'Test Budget',
        budgetType: 'project',
        totalBudget: 50000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        metadata: {
          priority: 'high',
          department: 'engineering',
          approved: true,
          revision: 3,
        },
      };

      expect(() => budgetSchema.parse(flatMetadata)).not.toThrow();
    });

    it('should reject nested objects in metadata', () => {
      const nestedMetadata = {
        name: 'Test Budget',
        budgetType: 'project',
        totalBudget: 50000,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-06-30T23:59:59Z',
        metadata: {
          nested: { value: 'test' },
        },
      };

      expect(() => budgetSchema.parse(nestedMetadata)).toThrow();
    });
  });
});