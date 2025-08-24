import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Supabase Auth
const mockSupabaseUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    firstName: 'Test',
    lastName: 'User',
    enterpriseId: 'enterprise-1',
  },
};

const mockSupabaseSession = {
  user: mockSupabaseUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
};

// Create a custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRouterEntry?: string;
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { ...renderOptions } = options || {};

  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllTheProviders>{children}</AllTheProviders>
      ),
      ...renderOptions,
    }),
    user: userEvent.setup(),
  };
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: mockSupabaseSession }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: mockSupabaseUser }, error: null })),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}))

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };

// Export mock data generators
export const mockContract = (overrides = {}) => ({
  _id: 'contract-1',
  _creationTime: Date.now(),
  name: 'Test Contract',
  number: 'CTR-001',
  type: 'service',
  status: 'active',
  value: 10000,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  vendorId: 'vendor-1',
  departmentId: 'dept-1',
  categoryId: 'cat-1',
  ownerId: 'user-1',
  description: 'Test contract description',
  paymentTerms: 'Net 30',
  autoRenew: false,
  ...overrides,
});

export const mockVendor = (overrides = {}) => ({
  _id: 'vendor-1',
  _creationTime: Date.now(),
  name: 'Test Vendor',
  email: 'vendor@test.com',
  phone: '123-456-7890',
  address: '123 Test St',
  website: 'https://testvendor.com',
  category: 'Technology',
  status: 'active',
  performanceScore: 85,
  totalSpend: 50000,
  activeContracts: 5,
  ...overrides,
});

export const mockUser = (overrides = {}) => ({
  _id: 'user-1',
  _creationTime: Date.now(),
  userId: 'test-user-id',
  email: 'user@test.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  departmentId: 'dept-1',
  enterpriseId: 'enterprise-1',
  ...overrides,
});