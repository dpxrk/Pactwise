import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ClerkProvider } from '@clerk/nextjs';
import userEvent from '@testing-library/user-event';

// Mock Convex client
const mockConvexClient = {
  setAuth: jest.fn(),
  close: jest.fn(),
} as unknown as ConvexReactClient;

// Mock Clerk
const mockClerk = {
  user: {
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
    publicMetadata: {
      enterpriseId: 'enterprise-1',
    },
  },
  session: {
    id: 'test-session-id',
  },
};

// Create a custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRouterEntry?: string;
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ClerkProvider>
      <ConvexProvider client={mockConvexClient}>
        {children}
      </ConvexProvider>
    </ClerkProvider>
  );
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

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  ...jest.requireActual('@clerk/nextjs'),
  useUser: () => ({ user: mockClerk.user, isLoaded: true }),
  useAuth: () => ({ userId: mockClerk.user.id, isLoaded: true }),
  useSession: () => ({ session: mockClerk.session, isLoaded: true }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Convex hooks
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock our custom api-client
jest.mock('@/lib/api-client', () => ({
  useConvexQuery: jest.fn(),
  useConvexMutation: jest.fn(),
  useConvexAction: jest.fn(),
}));

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
  clerkId: 'clerk-user-1',
  email: 'user@test.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  departmentId: 'dept-1',
  enterpriseId: 'enterprise-1',
  ...overrides,
});