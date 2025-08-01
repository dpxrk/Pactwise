import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock Deno global for test environment
(globalThis as any).Deno = {
  env: {
    get: (key: string) => {
      const mockEnv: Record<string, string> = {
        'ALLOWED_ORIGINS': 'http://localhost:3000,http://localhost:3001',
        'SUPABASE_URL': 'http://localhost:54321',
        'SUPABASE_ANON_KEY': 'test-anon-key',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
        'OPENAI_API_KEY': 'test-openai-key',
        'STRIPE_SECRET_KEY': 'test-stripe-key',
        'SLACK_WEBHOOK_URL': 'https://hooks.slack.com/test',
        'SECURITY_WEBHOOK_URL': 'https://webhook.example.com/security',
        'WEBHOOK_SECRET': 'test-webhook-secret',
        'FRONTEND_URL': 'http://localhost:3000',
      };
      return mockEnv[key];
    },
  },
};

// Test environment variables
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.STRIPE_SECRET_KEY = 'test-stripe-key';

// Check if Supabase is available for integration tests
let isSupabaseAvailable = false;
let mockSupabaseClient: any = null;

// Create mock Supabase client for unit tests
function createMockSupabaseClient() {
  let idCounter = 1;

  const createMockQueryBuilder = (tableName: string) => {
    let insertData: any = {};

    // Create a proper mock that avoids circular references
    const mockBuilder = {
      insert: vi.fn().mockImplementation((data: any) => {
        insertData = data;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: `mock-id-${idCounter++}`,
                ...insertData,
                // Override specific fields based on table
                ...(tableName === 'enterprises' && { name: insertData.name || `Mock ${tableName}` }),
                ...(tableName === 'contracts' && { title: insertData.title || 'Mock Contract' }),
                ...(tableName === 'users' && {
                  email: insertData.email || 'test@example.com',
                  first_name: insertData.first_name || 'Test',
                  last_name: insertData.last_name || 'User',
                }),
                ...(tableName === 'vendors' && {
                  name: insertData.name || 'Mock Vendor',
                  category: insertData.category || 'software',
                  status: insertData.status || 'active',
                }),
              },
              error: null,
            }),
          }),
        };
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: `mock-id-${idCounter}`, name: `Mock ${tableName}` },
            error: null,
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: `mock-id-${idCounter}`, name: `Mock ${tableName}` }],
              error: null,
            }),
          }),
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: `mock-id-${idCounter}`, name: `Mock ${tableName}` },
          error: null,
        }),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: `mock-id-${idCounter}`, name: `Mock ${tableName}` }],
          error: null,
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: `mock-id-${idCounter}`, name: `Mock ${tableName}` }],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockImplementation((data: any) => {
        return {
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: `mock-id-${idCounter}`, name: `Mock ${tableName}`, ...data },
                error: null,
              }),
            }),
          }),
        };
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    return mockBuilder;
  };

  return {
    from: vi.fn().mockImplementation((tableName: string) => createMockQueryBuilder(tableName)),
    auth: {
      signUp: vi.fn().mockImplementation((data: any) => Promise.resolve({
        data: {
          user: {
            id: `auth-user-${idCounter++}`,
            email: data.email || 'test@example.com',
          },
        },
        error: null,
      })),
      signIn: vi.fn().mockResolvedValue({
        data: { user: { id: `auth-user-${idCounter}`, email: 'test@example.com' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

// Track created test data for cleanup
const testData = {
  enterprises: new Set<string>(),
  users: new Set<string>(),
  contracts: new Set<string>(),
  vendors: new Set<string>(),
  budgets: new Set<string>(),
};

// Helper function to get test client (real or mock)
export function getTestClient() {
  // For unit tests, always use mock client
  if (mockSupabaseClient) {
    return mockSupabaseClient;
  }

  // If no mock client exists yet, create one
  mockSupabaseClient = createMockSupabaseClient();
  return mockSupabaseClient;
}

// Helper functions
export async function createTestEnterprise(overrides: Record<string, unknown> = {}): Promise<{ id: string; name: string }> {
  const supabase = getTestClient();

  const { data, error } = await supabase
    .from('enterprises')
    .insert({
      name: `Test Enterprise ${Date.now()}`,
      domain: `test${Date.now()}.com`,
      ...overrides,
    })
    .select()
    .single();

  if (error) {throw error;}
  testData.enterprises.add(data.id);
  return { id: data.id, name: data.name };
}

export async function createTestUser(
  enterpriseId: string,
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer' = 'user',
): Promise<{ id: string; email: string; authToken: string }> {
  const supabase = getTestClient();

  const email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Test123!@#',
  });

  if (authError) {throw authError;}

  // Create user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      auth_id: authData.user!.id,
      email,
      first_name: 'Test',
      last_name: role.charAt(0).toUpperCase() + role.slice(1),
      role,
      enterprise_id: enterpriseId,
      is_active: true,
    })
    .select()
    .single();

  if (userError) {throw userError;}

  testData.users.add(user.id);

  // Generate a mock auth token for testing
  const authToken = `test-token-${user.id}`;

  return {
    id: user.id,
    email: user.email,
    authToken,
  };
}

export async function createTestContract(
  enterpriseId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; title: string }> {
  const supabase = getTestClient();

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      title: `Test Contract ${Date.now()}`,
      file_name: 'test-contract.pdf',
      file_type: 'pdf',
      storage_id: `storage-${Date.now()}`,
      status: 'draft',
      enterprise_id: enterpriseId,
      created_by: overrides.created_by || 'test-user-id',
      owner_id: overrides.created_by || 'test-user-id',
      ...overrides,
    })
    .select()
    .single();

  if (error) {throw error;}
  testData.contracts.add(data.id);
  return { id: data.id, title: data.title };
}

export async function createTestVendor(
  enterpriseId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const supabase = getTestClient();

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name: `Test Vendor ${Date.now()}`,
      category: 'software',
      status: 'active',
      enterprise_id: enterpriseId,
      created_by: overrides.created_by || 'test-user-id',
      ...overrides,
    })
    .select()
    .single();

  if (error) {throw error;}
  testData.vendors.add(data.id);
  return { id: data.id, name: data.name };
}

export async function createTestBudget(
  enterpriseId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const supabase = getTestClient();

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      name: `Test Budget ${Date.now()}`,
      budget_type: 'annual',
      total_budget: 100000,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      enterprise_id: enterpriseId,
      created_by: overrides.created_by || 'test-user-id',
      owner_id: overrides.owner_id || overrides.created_by || 'test-user-id',
      ...overrides,
    })
    .select()
    .single();

  if (error) {throw error;}
  testData.budgets.add(data.id);
  return { id: data.id, name: data.name };
}

export async function cleanupTestData() {
  const supabase = getTestClient();

  // Skip cleanup for mock client
  if (mockSupabaseClient) {
    Object.keys(testData).forEach(key => {
      testData[key as keyof typeof testData].clear();
    });
    return;
  }

  // Clean up in reverse order of dependencies
  const tables = [
    { name: 'agent_tasks', key: 'contracts', field: 'contract_id' },
    { name: 'budget_allocations', key: 'budgets', field: 'budget_id' },
    { name: 'budget_allocations', key: 'contracts', field: 'contract_id' },
    { name: 'contract_assignments', key: 'contracts', field: 'contract_id' },
    { name: 'contract_vendors', key: 'contracts', field: 'contract_id' },
    { name: 'contract_vendors', key: 'vendors', field: 'vendor_id' },
    { name: 'contracts', key: 'contracts', field: 'id' },
    { name: 'vendors', key: 'vendors', field: 'id' },
    { name: 'budgets', key: 'budgets', field: 'id' },
    { name: 'notifications', key: 'users', field: 'user_id' },
    { name: 'users', key: 'users', field: 'id' },
    { name: 'enterprises', key: 'enterprises', field: 'id' },
  ];

  for (const { name, key, field } of tables) {
    const ids = Array.from(testData[key as keyof typeof testData]);
    if (ids.length > 0) {
      await supabase.from(name).delete().in(field, ids);
    }
  }

  // Clear test data tracking
  Object.keys(testData).forEach(key => {
    testData[key as keyof typeof testData].clear();
  });
}

// Legacy test helpers for backward compatibility
export const testHelpers = {
  createTestUser: async (_supabase: unknown, overrides: Record<string, unknown> = {}) => {
    const enterpriseId = (overrides.enterprise_id as string) || await createTestEnterprise().then(e => e.id);
    const user = await createTestUser(enterpriseId, (overrides.role as 'owner' | 'admin' | 'manager' | 'user' | 'viewer') || 'user');
    return { auth: { user: { id: user.id } }, user };
  },
  createTestEnterprise: async (_supabase: unknown, overrides: Record<string, unknown> = {}) => {
    const enterprise = await createTestEnterprise(overrides);
    return enterprise.id;
  },
  createTestContract: async (_supabase: unknown, enterpriseId: string, overrides: Record<string, unknown> = {}) => {
    return createTestContract(enterpriseId, overrides);
  },
  cleanupTestData: async (_supabase: unknown, _enterpriseId: string) => {
    // This is handled by the global cleanup now
  },
};

// Global setup
beforeAll(async () => {
  console.log('Starting test suite...');

  // For unit tests, always use mock client by default
  // Integration tests can override this in their specific config
  mockSupabaseClient = createMockSupabaseClient();
  isSupabaseAvailable = false;
  console.log('Using mock Supabase client for unit tests');
});

afterAll(async () => {
  console.log('Test suite completed.');
  if (isSupabaseAvailable) {
    await cleanupTestData();
  }
});

// Test cleanup after each test
afterEach(async () => {
  if (isSupabaseAvailable) {
    await cleanupTestData();
  }
});