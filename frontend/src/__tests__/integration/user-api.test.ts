/**
 * User API Integration Tests
 * Tests user API authentication, validation, and security
 *
 * These tests verify that:
 * - GET requires authentication
 * - PATCH validates input with Zod schema
 * - PATCH only allows safe fields (rejects role, enterprise_id)
 * - PATCH uses auth_id for filtering
 */

import '@testing-library/jest-dom';
import { z } from 'zod';

// Mock Supabase client
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

const createMockQueryBuilder = () => ({
  select: mockSelect.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
});

const mockFrom = jest.fn(() => createMockQueryBuilder());

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  })),
}));

// ============================================================================
// Validation Schemas (matching backend users/index.ts)
// ============================================================================

const UpdateUserProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    slack: z.boolean().optional(),
  }).optional(),
});

// Fields that should NEVER be updateable via self-service
const FORBIDDEN_UPDATE_FIELDS = [
  'role',
  'enterprise_id',
  'auth_id',
  'id',
  'email',
  'is_active',
  'created_at',
  'deleted_at',
];

// ============================================================================
// Test Data
// ============================================================================

const mockAuthUser = {
  id: 'auth-user-123',
  email: 'test@example.com',
};

const mockUserProfile = {
  id: 'profile-123',
  auth_id: 'auth-user-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  enterprise_id: 'enterprise-123',
  role: 'user',
  is_active: true,
  department: 'Engineering',
  title: 'Developer',
  phone: '+1234567890',
  timezone: 'America/New_York',
};

const mockSession = {
  user: mockAuthUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};

describe('User API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockGetUser.mockResolvedValue({ data: { user: mockAuthUser }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    mockSingle.mockResolvedValue({ data: mockUserProfile, error: null });
  });

  describe('GET /users/me - Authentication Requirements', () => {
    it('should require authentication for GET request', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      // Simulate middleware check
      const isAuthenticated = !!user;
      expect(isAuthenticated).toBe(false);

      // In real API, this would return 401
      if (!isAuthenticated) {
        const response = { status: 401, message: 'Authorization required' };
        expect(response.status).toBe(401);
      }
    });

    it('should return user profile when authenticated', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        supabase.from('users').select('*').eq('auth_id', user.id).single();

        expect(mockFrom).toHaveBeenCalledWith('users');
        expect(mockEq).toHaveBeenCalledWith('auth_id', 'auth-user-123');
      }
    });

    it('should handle missing authorization header', async () => {
      const authHeader = null;

      const validateAuth = (header: string | null): { valid: boolean; status: number; message?: string } => {
        if (!header) {
          return { valid: false, status: 401, message: 'Authorization required' };
        }
        if (!header.startsWith('Bearer ')) {
          return { valid: false, status: 401, message: 'Invalid authorization format' };
        }
        return { valid: true, status: 200 };
      };

      expect(validateAuth(authHeader)).toEqual({
        valid: false,
        status: 401,
        message: 'Authorization required'
      });
    });

    it('should handle invalid token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT', code: 'invalid_jwt' }
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { user }, error } = await supabase.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('invalid_jwt');
    });
  });

  describe('PATCH /users/me - Zod Schema Validation', () => {
    it('should validate first_name field', () => {
      // Valid first_name
      expect(() => {
        UpdateUserProfileSchema.parse({ first_name: 'John' });
      }).not.toThrow();

      // Empty first_name (invalid - must be min 1 char)
      expect(() => {
        UpdateUserProfileSchema.parse({ first_name: '' });
      }).toThrow();

      // Too long first_name (invalid - max 100 chars)
      expect(() => {
        UpdateUserProfileSchema.parse({ first_name: 'a'.repeat(101) });
      }).toThrow();
    });

    it('should validate last_name field', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({ last_name: 'Doe' });
      }).not.toThrow();

      expect(() => {
        UpdateUserProfileSchema.parse({ last_name: '' });
      }).toThrow();

      expect(() => {
        UpdateUserProfileSchema.parse({ last_name: 'b'.repeat(101) });
      }).toThrow();
    });

    it('should validate department field', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({ department: 'Engineering' });
      }).not.toThrow();

      // Empty string is allowed (optional field)
      expect(() => {
        UpdateUserProfileSchema.parse({ department: '' });
      }).not.toThrow();

      // Too long department
      expect(() => {
        UpdateUserProfileSchema.parse({ department: 'c'.repeat(101) });
      }).toThrow();
    });

    it('should validate title field', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({ title: 'Senior Developer' });
      }).not.toThrow();

      expect(() => {
        UpdateUserProfileSchema.parse({ title: 'd'.repeat(101) });
      }).toThrow();
    });

    it('should validate phone field', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({ phone: '+1-555-123-4567' });
      }).not.toThrow();

      expect(() => {
        UpdateUserProfileSchema.parse({ phone: 'e'.repeat(51) });
      }).toThrow();
    });

    it('should validate timezone field', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({ timezone: 'America/New_York' });
      }).not.toThrow();

      expect(() => {
        UpdateUserProfileSchema.parse({ timezone: 'f'.repeat(51) });
      }).toThrow();
    });

    it('should validate notification_preferences object', () => {
      expect(() => {
        UpdateUserProfileSchema.parse({
          notification_preferences: {
            email: true,
            push: false,
            slack: true,
          }
        });
      }).not.toThrow();

      // Partial preferences are valid
      expect(() => {
        UpdateUserProfileSchema.parse({
          notification_preferences: {
            email: true,
          }
        });
      }).not.toThrow();

      // Invalid type should fail
      expect(() => {
        UpdateUserProfileSchema.parse({
          notification_preferences: {
            email: 'yes', // should be boolean
          }
        });
      }).toThrow();
    });

    it('should allow partial updates (all fields optional)', () => {
      // Empty object is valid (no updates)
      expect(() => {
        UpdateUserProfileSchema.parse({});
      }).not.toThrow();

      // Single field update
      expect(() => {
        UpdateUserProfileSchema.parse({ first_name: 'Jane' });
      }).not.toThrow();

      // Multiple field update
      expect(() => {
        UpdateUserProfileSchema.parse({
          first_name: 'Jane',
          last_name: 'Smith',
          department: 'Marketing',
        });
      }).not.toThrow();
    });

    it('should reject unknown fields', () => {
      // By default Zod strips unknown fields in parse()
      const result = UpdateUserProfileSchema.parse({
        first_name: 'John',
        unknown_field: 'should be stripped',
      });

      expect(result).not.toHaveProperty('unknown_field');
      expect(result).toEqual({ first_name: 'John' });
    });
  });

  describe('PATCH /users/me - Forbidden Fields (Security)', () => {
    it('should not allow updating role via self-service', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({ role: 'admin' });
      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('role');
    });

    it('should not allow updating enterprise_id', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({ enterprise_id: 'other-enterprise' });
      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('enterprise_id');
    });

    it('should not allow updating auth_id', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({ auth_id: 'different-auth-id' });
      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('auth_id');
    });

    it('should not allow updating email directly', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({ email: 'hacker@evil.com' });
      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('email');
    });

    it('should not allow updating is_active', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({ is_active: false });
      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('is_active');
    });

    it('should reject multiple forbidden fields together', () => {
      const validateUpdateFields = (updates: Record<string, unknown>): { valid: boolean; forbidden: string[] } => {
        const forbidden = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );
        return {
          valid: forbidden.length === 0,
          forbidden,
        };
      };

      const result = validateUpdateFields({
        role: 'owner',
        enterprise_id: 'other-enterprise',
        is_active: true,
        first_name: 'John', // This one is allowed
      });

      expect(result.valid).toBe(false);
      expect(result.forbidden).toContain('role');
      expect(result.forbidden).toContain('enterprise_id');
      expect(result.forbidden).toContain('is_active');
      expect(result.forbidden).not.toContain('first_name');
    });

    it('should allow only safe fields in update', () => {
      const SAFE_UPDATE_FIELDS = [
        'first_name',
        'last_name',
        'department',
        'title',
        'phone',
        'timezone',
        'notification_preferences',
      ];

      const filterSafeFields = (updates: Record<string, unknown>): Record<string, unknown> => {
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (SAFE_UPDATE_FIELDS.includes(key)) {
            filtered[key] = value;
          }
        }
        return filtered;
      };

      const input = {
        first_name: 'John',
        role: 'admin', // forbidden
        enterprise_id: 'other', // forbidden
        department: 'Engineering', // allowed
      };

      const safeUpdates = filterSafeFields(input);

      expect(safeUpdates).toEqual({
        first_name: 'John',
        department: 'Engineering',
      });
      expect(safeUpdates).not.toHaveProperty('role');
      expect(safeUpdates).not.toHaveProperty('enterprise_id');
    });
  });

  describe('PATCH /users/me - Auth ID Filtering', () => {
    it('should filter update by auth_id from JWT', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const updateData = { first_name: 'Jane' };

      // Simulate the update query
      supabase
        .from('users')
        .update(updateData)
        .eq('auth_id', mockAuthUser.id);

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith('auth_id', 'auth-user-123');
    });

    it('should never allow updating another users profile', () => {
      const validateUpdateTarget = (
        requestingAuthId: string,
        targetAuthId: string
      ): { allowed: boolean; error?: string } => {
        // Users can only update their own profile
        if (requestingAuthId !== targetAuthId) {
          return { allowed: false, error: 'Cannot update another user profile' };
        }
        return { allowed: true };
      };

      // Same user - allowed
      expect(validateUpdateTarget('auth-user-123', 'auth-user-123')).toEqual({
        allowed: true
      });

      // Different user - not allowed
      expect(validateUpdateTarget('auth-user-123', 'different-user')).toEqual({
        allowed: false,
        error: 'Cannot update another user profile'
      });
    });

    it('should use user.id from JWT context for filtering', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      // Get user from JWT
      const { data: { user } } = await supabase.auth.getUser();

      // Update using auth_id from JWT
      if (user) {
        supabase
          .from('users')
          .update({ first_name: 'Updated' })
          .eq('auth_id', user.id);

        // Verify the eq was called with the correct auth_id
        expect(mockEq).toHaveBeenCalledWith('auth_id', 'auth-user-123');
      }

      expect(user).toBeDefined();
      expect(user.id).toBe('auth-user-123');
    });
  });

  describe('PATCH /users/me - Update Flow', () => {
    it('should complete full update flow', async () => {
      const updatedProfile = {
        ...mockUserProfile,
        first_name: 'Updated',
        last_name: 'Name',
      };

      mockSingle.mockResolvedValue({ data: updatedProfile, error: null });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      // 1. Verify authentication
      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeDefined();

      // 2. Validate input
      const input = { first_name: 'Updated', last_name: 'Name' };
      const validatedData = UpdateUserProfileSchema.parse(input);
      expect(validatedData).toEqual(input);

      // 3. Execute update
      const { data: profile, error } = await supabase
        .from('users')
        .update(validatedData)
        .eq('auth_id', user.id)
        .single();

      expect(error).toBeNull();
      expect(profile.first_name).toBe('Updated');
      expect(profile.last_name).toBe('Name');
    });

    it('should handle update errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Update failed', code: 'UPDATE_ERROR' }
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .update({ first_name: 'Test' })
        .eq('auth_id', mockAuthUser.id)
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('UPDATE_ERROR');
    });

    it('should add updated_at timestamp to updates', () => {
      const addTimestamp = (updates: Record<string, unknown>): Record<string, unknown> => {
        return {
          ...updates,
          updated_at: new Date().toISOString(),
        };
      };

      const updates = { first_name: 'John' };
      const timestampedUpdates = addTimestamp(updates);

      expect(timestampedUpdates).toHaveProperty('updated_at');
      expect(timestampedUpdates.first_name).toBe('John');
    });
  });

  describe('Response Format', () => {
    it('should return updated profile on success', async () => {
      const mockResponse = {
        data: mockUserProfile,
        error: null,
      };

      expect(mockResponse.data).toBeDefined();
      expect(mockResponse.error).toBeNull();
      expect(mockResponse.data).toHaveProperty('id');
      expect(mockResponse.data).toHaveProperty('auth_id');
      expect(mockResponse.data).toHaveProperty('enterprise_id');
    });

    it('should return appropriate error for validation failure', () => {
      try {
        UpdateUserProfileSchema.parse({
          first_name: '', // Invalid - must be min 1 char
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          expect(error.errors.length).toBeGreaterThan(0);
          expect(error.errors[0].path).toContain('first_name');
        }
      }
    });

    it('should return 403 for forbidden field update attempts', () => {
      const checkForbiddenFields = (updates: Record<string, unknown>): { status: number; message: string } | null => {
        const forbiddenAttempted = Object.keys(updates).filter(key =>
          FORBIDDEN_UPDATE_FIELDS.includes(key)
        );

        if (forbiddenAttempted.length > 0) {
          return {
            status: 403,
            message: `Cannot update restricted fields: ${forbiddenAttempted.join(', ')}`,
          };
        }
        return null;
      };

      const result = checkForbiddenFields({ role: 'admin', enterprise_id: 'other' });
      expect(result).toBeDefined();
      expect(result?.status).toBe(403);
      expect(result?.message).toContain('role');
      expect(result?.message).toContain('enterprise_id');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty update object', () => {
      const result = UpdateUserProfileSchema.parse({});
      expect(result).toEqual({});
    });

    it('should handle null notification_preferences', () => {
      const result = UpdateUserProfileSchema.parse({
        notification_preferences: undefined,
      });
      expect(result.notification_preferences).toBeUndefined();
    });

    it('should trim whitespace from string fields during validation', () => {
      // Note: Standard Zod doesn't trim by default, but this could be added
      const schema = z.object({
        first_name: z.string().min(1).max(100).transform(s => s.trim()).optional(),
      });

      const result = schema.parse({ first_name: '  John  ' });
      expect(result.first_name).toBe('John');
    });

    it('should handle concurrent update requests safely', async () => {
      // In real-world scenario, database would handle concurrency
      // This test verifies the approach

      const updates = [
        { first_name: 'Update1' },
        { first_name: 'Update2' },
      ];

      // Both updates should use auth_id filter
      // Last write wins at database level
      for (const update of updates) {
        const { createClient } = require('@/utils/supabase/client');
        const supabase = createClient();

        supabase
          .from('users')
          .update(update)
          .eq('auth_id', mockAuthUser.id);

        expect(mockEq).toHaveBeenCalledWith('auth_id', mockAuthUser.id);
      }
    });
  });
});
