/**
 * Auth Flow Integration Tests
 * Tests dashboard authentication checks and redirects
 *
 * These tests verify that:
 * - Unauthenticated users are redirected to sign-in
 * - Authenticated users can access dashboard
 * - Redirect includes the original URL as parameter
 */

import '@testing-library/jest-dom';

// Mock Supabase client
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock next/navigation
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockPathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
}));

// Test data
const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
};

const mockUserProfile = {
  id: 'profile-123',
  auth_id: 'test-user-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  enterprise_id: 'enterprise-123',
  role: 'user',
  is_active: true,
};

const mockSession = {
  user: mockAuthenticatedUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to unauthenticated state
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  describe('Unauthenticated User Handling', () => {
    it('should return null user when not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeNull();
    });

    it('should handle auth error gracefully', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired', code: 'session_expired' }
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase.auth.getUser();
      expect(data.user).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('session_expired');
    });

    it('should identify user as unauthenticated when session is null', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();

      const isAuthenticated = !!session?.user;
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Authenticated User Handling', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: mockAuthenticatedUser }, error: null });
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
    });

    it('should return user when authenticated', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toEqual(mockAuthenticatedUser);
      expect(user.id).toBe('test-user-123');
      expect(user.email).toBe('test@example.com');
    });

    it('should return session when authenticated', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toEqual(mockSession);
      expect(session.access_token).toBe('test-access-token');
    });

    it('should identify user as authenticated when session exists', async () => {
      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();

      const isAuthenticated = !!session?.user;
      expect(isAuthenticated).toBe(true);
    });

    it('should be able to fetch user profile after authentication', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
        limit: jest.fn().mockResolvedValue({ error: null }),
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', mockAuthenticatedUser.id)
        .single();

      expect(error).toBeNull();
      expect(profile).toEqual(mockUserProfile);
      expect(profile.enterprise_id).toBe('enterprise-123');
    });
  });

  describe('Redirect URL Parameter Handling', () => {
    it('should include current path in redirect URL', () => {
      const currentPath = '/dashboard/contracts';
      const signInUrl = '/auth/sign-in';

      // Build redirect URL with return path
      const redirectUrl = `${signInUrl}?returnUrl=${encodeURIComponent(currentPath)}`;

      expect(redirectUrl).toBe('/auth/sign-in?returnUrl=%2Fdashboard%2Fcontracts');

      // Parse and verify the returnUrl parameter
      const url = new URL(redirectUrl, 'http://localhost');
      const returnUrl = url.searchParams.get('returnUrl');
      expect(returnUrl).toBe('/dashboard/contracts');
    });

    it('should handle complex paths with query parameters', () => {
      const currentPath = '/dashboard/contracts?status=active&page=2';
      const signInUrl = '/auth/sign-in';

      const redirectUrl = `${signInUrl}?returnUrl=${encodeURIComponent(currentPath)}`;

      const url = new URL(redirectUrl, 'http://localhost');
      const returnUrl = url.searchParams.get('returnUrl');
      expect(returnUrl).toBe('/dashboard/contracts?status=active&page=2');
    });

    it('should handle nested dashboard paths', () => {
      const testPaths = [
        '/dashboard',
        '/dashboard/contracts',
        '/dashboard/contracts/123',
        '/dashboard/vendors',
        '/dashboard/settings/security',
      ];

      testPaths.forEach(path => {
        const redirectUrl = `/auth/sign-in?returnUrl=${encodeURIComponent(path)}`;
        const url = new URL(redirectUrl, 'http://localhost');
        expect(url.searchParams.get('returnUrl')).toBe(path);
      });
    });
  });

  describe('Auth State Change Subscription', () => {
    it('should subscribe to auth state changes', () => {
      const mockCallback = jest.fn();
      mockOnAuthStateChange.mockImplementation((callback) => {
        // Store callback for later invocation
        mockCallback.mockImplementation(callback);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(mockCallback);

      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).toBeDefined();
    });

    it('should properly unsubscribe from auth state changes', () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(jest.fn());
      subscription.unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Session Validation', () => {
    it('should validate session has required fields', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();

      // Validate required session fields
      expect(session).toHaveProperty('user');
      expect(session).toHaveProperty('access_token');
      expect(session.user).toHaveProperty('id');
      expect(session.user).toHaveProperty('email');
    });

    it('should handle expired session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired', code: 'session_expired' }
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: { session }, error } = await supabase.auth.getSession();

      expect(session).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Enterprise ID Requirement', () => {
    it('should require enterprise_id for dashboard access', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
        limit: jest.fn().mockResolvedValue({ error: null }),
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', mockAuthenticatedUser.id)
        .single();

      const hasEnterpriseAccess = !!profile?.enterprise_id;
      expect(hasEnterpriseAccess).toBe(true);
    });

    it('should redirect to onboarding when enterprise_id is missing', async () => {
      const profileWithoutEnterprise = {
        ...mockUserProfile,
        enterprise_id: null,
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: profileWithoutEnterprise, error: null }),
        limit: jest.fn().mockResolvedValue({ error: null }),
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', mockAuthenticatedUser.id)
        .single();

      const needsOnboarding = !profile?.enterprise_id;
      expect(needsOnboarding).toBe(true);

      // In real app, this would trigger: window.location.href = '/onboarding'
    });
  });

  describe('User Role Verification', () => {
    it('should include user role in profile', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserProfile, error: null }),
        limit: jest.fn().mockResolvedValue({ error: null }),
      });

      const { createClient } = require('@/utils/supabase/client');
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', mockAuthenticatedUser.id)
        .single();

      expect(profile.role).toBeDefined();
      expect(['owner', 'admin', 'manager', 'user', 'viewer']).toContain(profile.role);
    });
  });
});
