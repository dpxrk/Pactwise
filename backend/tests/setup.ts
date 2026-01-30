import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// ============================================================================
// Mock local-agents dependencies FIRST (these get hoisted)
// ============================================================================

// Mock the config module for local-agents
vi.mock('../supabase/functions/local-agents/config/index.ts', () => ({
  config: {
    FEATURE_FLAGS: {
      ENABLE_CACHING: true,
      ENABLE_RATE_LIMITING: true,
      ENABLE_METRICS: true,
      ENABLE_AUDIT_LOGS: true,
      ENABLE_REAL_TIME: true,
      ENABLE_AI_ANALYSIS: true,
      ENABLE_ENHANCED_EXTRACTION: false,
      ENABLE_DEBUG_LOGGING: false,
      ENABLE_PERFORMANCE_MONITORING: false,
      ENABLE_ASYNC_PROCESSING: true,
      ENABLE_WORKFLOW_AUTOMATION: true,
      ENABLE_SMART_ROUTING: true,
      ENABLE_DONNA_AI: true,
      ENABLE_MEMORY_SYSTEM: true,
    },
    TIMEOUTS: {
      DEFAULT: 30000,
      LONG_RUNNING: 60000,
      DATABASE_FUNCTION: 45000,
      EXTERNAL_API: 20000,
      AI_PROCESSING: 90000,
      BATCH_OPERATION: 120000,
    },
    RATE_LIMITS: {
      DEFAULT: { requests: 100, window: 60 },
      AI_ANALYSIS: { requests: 10, window: 60 },
      DATABASE_FUNCTION: { requests: 50, window: 60 },
      EXTERNAL_API: { requests: 30, window: 60 },
    },
    CACHE_TTL: {
      DEFAULT: 300,
      CONTRACT_DATA: 600,
      VENDOR_DATA: 900,
      BUDGET_DATA: 1800,
      ANALYTICS: 3600,
      USER_PERMISSIONS: 300,
      AGENT_RESULTS: 1800,
    },
    RETRY_CONFIG: {
      MAX_RETRIES: 3,
      INITIAL_DELAY: 1000,
      MAX_DELAY: 10000,
      BACKOFF_MULTIPLIER: 2,
      JITTER: true,
    },
    AGENT_SPECIFIC: {
      SECRETARY: { MAX_DOCUMENT_SIZE: 10485760, EXTRACTION_CONFIDENCE_THRESHOLD: 0.7, ENABLE_OCR: true },
      FINANCIAL: { RISK_CALCULATION_DEPTH: 3, BUDGET_WARNING_THRESHOLD: 0.8, COST_ANOMALY_ZSCORE: 2.5 },
      LEGAL: { CLAUSE_DETECTION_THRESHOLD: 0.75, COMPLIANCE_CHECK_DEPTH: 'comprehensive', RISK_ASSESSMENT_MODEL: 'advanced' },
      ANALYTICS: { DEFAULT_LOOKBACK_MONTHS: 12, TREND_CALCULATION_MIN_POINTS: 3, ANOMALY_DETECTION_SENSITIVITY: 'medium' },
      VENDOR: {
        PERFORMANCE_CALCULATION_PERIOD: 90,
        RELATIONSHIP_SCORE_WEIGHTS: { performance: 0.25, compliance: 0.20, loyalty: 0.20, responsiveness: 0.15, financial: 0.20 },
      },
      NOTIFICATIONS: { MAX_RECIPIENTS_PER_NOTIFICATION: 100, DIGEST_GENERATION_HOUR: 8, ESCALATION_DELAYS: [3600, 14400, 86400], SMART_ROUTING_ENABLED: true },
      MANAGER: { MAX_PARALLEL_AGENTS: 5, ORCHESTRATION_TIMEOUT: 300000, DEPENDENCY_RESOLUTION_MAX_DEPTH: 5, ENABLE_AGENT_RESULT_AGGREGATION: true },
    },
    MONITORING: { METRICS_ENABLED: true, METRICS_FLUSH_INTERVAL: 60000, LOG_LEVEL: 'info', PERFORMANCE_TRACKING: true, ERROR_REPORTING: true },
    SECURITY: { ENABLE_REQUEST_VALIDATION: true, ENABLE_RESPONSE_SANITIZATION: true, MAX_REQUEST_SIZE: 5242880, ALLOWED_ORIGINS: ['*'], JWT_VALIDATION: true },
  },
  getFeatureFlag: vi.fn().mockReturnValue(true),
  getRateLimit: vi.fn().mockReturnValue({ requests: 100, window: 60 }),
  getCacheTTL: vi.fn().mockReturnValue(300),
  getTimeout: vi.fn().mockReturnValue(30000),
  getAgentConfig: vi.fn().mockReturnValue({}),
}));

// Mock the cache factory
vi.mock('../supabase/functions-utils/cache-factory.ts', () => ({
  getCache: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
    isRedisEnabled: vi.fn().mockReturnValue(false),
  }),
  getCacheSync: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
    isRedisEnabled: vi.fn().mockReturnValue(false),
  }),
  initializeCache: vi.fn().mockResolvedValue(undefined),
  UnifiedCache: vi.fn(),
}));

// Mock the tracing module
vi.mock('../supabase/functions/local-agents/utils/tracing.ts', () => ({
  TracingManager: vi.fn().mockImplementation(() => ({
    startSpan: vi.fn().mockReturnValue({
      end: vi.fn(),
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    }),
    endSpan: vi.fn(),
  })),
  TraceContext: vi.fn(),
  SpanKind: { INTERNAL: 0, SERVER: 1, CLIENT: 2 },
  SpanStatus: { OK: 0, ERROR: 1 },
}));

// Mock the memory module
vi.mock('../supabase/functions/local-agents/utils/memory.ts', () => ({
  MemoryManager: vi.fn().mockImplementation(() => ({
    store: vi.fn().mockResolvedValue('mock-id'),
    search: vi.fn().mockResolvedValue([]),
    getRecent: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  })),
  Memory: vi.fn(),
  MemorySearchResult: vi.fn(),
}));

// Mock the AI modules
vi.mock('../supabase/functions/_shared/ai/claude-client.ts', () => ({
  ClaudeClient: vi.fn(),
  getClaudeClient: vi.fn().mockReturnValue({
    chat: vi.fn().mockResolvedValue({ content: 'mock response' }),
    stream: vi.fn(),
  }),
  ClaudeTool: vi.fn(),
  ClaudeMessage: vi.fn(),
  StreamEvent: vi.fn(),
}));

vi.mock('../supabase/functions/_shared/ai/tool-executor.ts', () => ({
  ToolExecutor: vi.fn(),
  createToolExecutor: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ result: 'mock' }),
  }),
}));

vi.mock('../supabase/functions/_shared/ai/cost-tracker.ts', () => ({
  getCostTracker: vi.fn().mockReturnValue({
    track: vi.fn(),
    getStats: vi.fn().mockReturnValue({ total: 0 }),
  }),
  CostTracker: vi.fn(),
}));

// Mock enhanced rate limiter
vi.mock('../supabase/functions/_shared/rate-limiting.ts', () => ({
  EnhancedRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 100,
      resetAt: new Date(),
      rule: { id: 'test', name: 'test' },
      fingerprint: 'test',
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}));

// ============================================================================
// End local-agents mocks
// ============================================================================

// Mock Deno global for test environment
(globalThis as { Deno?: typeof Deno }).Deno = {
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
let mockSupabaseClient: SupabaseClient | null = null;

// Create mock Supabase client for unit tests
export function createMockSupabaseClient() {
  let idCounter = 1;

  const createMockQueryBuilder = (tableName: string) => {
    let insertData: Record<string, unknown> = {};

    // Create a proper mock that avoids circular references
    const mockBuilder = {
      insert: vi.fn().mockImplementation((data: unknown) => {
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
      update: vi.fn().mockImplementation((data: unknown) => {
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
      signUp: vi.fn().mockImplementation((data: unknown) => Promise.resolve({
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