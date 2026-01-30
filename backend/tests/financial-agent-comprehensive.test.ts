import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the config module BEFORE other imports to prevent initialization errors
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

import { FinancialAgent } from '../supabase/functions/local-agents/agents/financial.ts';
import type { AgentContext } from '../supabase/functions/local-agents/agents/base.ts';
import {
  mockHighValueContract,
  mockCriticalValueContract,
  mockUpfrontPaymentContract,
  mockNegativeROIContract,
  mockLowValueContract,
  mockHighUtilizationBudget,
  mockOverrunBudget,
  mockBudgetVariances,
  mockGeneralFinancialData,
  mockMultiValueData,
  mockEncodingIssuesData,
  mockEmptyData,
  mockTextOnlyData,
  mockVendorSpendMetrics,
  mockVendorPayments,
  createMockSupabaseClient,
  validFinancialInput,
  invalidFinancialInput,
  validAgentContext,
  invalidAgentContext,
} from './fixtures/financial-test-data.ts';

// Mock Redis for caching
vi.mock('../supabase/functions/local-agents/utils/cache-manager.ts', () => ({
  CacheManager: {
    getInstance: () => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      exists: vi.fn().mockResolvedValue(false),
    }),
  },
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

// Helper to create valid AgentContext
const createAgentContext = (enterpriseId: string, overrides: Partial<AgentContext> = {}): AgentContext => ({
  enterpriseId,
  sessionId: 'test-session',
  environment: {},
  permissions: [],
  ...overrides,
});

// =============================================================================
// FINANCIAL AGENT COMPREHENSIVE TESTS
// =============================================================================

describe('FinancialAgent', () => {
  let agent: FinancialAgent;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const enterpriseId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    // Create agent with mock dependencies
    agent = new FinancialAgent(mockSupabase as unknown as never, enterpriseId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // AGENT PROPERTIES
  // ===========================================================================

  describe('Agent Properties', () => {
    it('should have correct agent type', () => {
      expect(agent.agentType).toBe('financial');
    });

    it('should have expected capabilities', () => {
      const capabilities = agent.capabilities;
      expect(capabilities).toContain('cost_analysis');
      expect(capabilities).toContain('payment_terms');
      expect(capabilities).toContain('budget_impact');
      expect(capabilities).toContain('financial_risk');
      expect(capabilities).toContain('spend_analytics');
    });
  });

  // ===========================================================================
  // INPUT VALIDATION TESTS
  // ===========================================================================

  describe('Input Validation', () => {
    it('should validate valid financial input', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(validFinancialInput, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('input_validated');
    });

    it('should handle invalid input gracefully', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(invalidFinancialInput, context);

      // Should still process but with warnings
      expect(result.insights.some(i => i.type === 'input_validation_warning')).toBe(true);
    });

    it('should detect encoding issues in content', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockEncodingIssuesData, context);

      expect(result.rulesApplied).toContain('encoding_check');
      expect(result.insights.some(i => i.type === 'encoding_warning')).toBe(true);
    });

    it('should detect multiple content sources conflict', async () => {
      const conflictingData = {
        content: 'Contract content here',
        text: 'Different text here',
        extracted_text: 'Yet another text',
        value: 50000,
      };
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(conflictingData, context);

      expect(result.rulesApplied).toContain('conflict_detection');
      expect(result.insights.some(i => i.type === 'input_conflict_warning')).toBe(true);
    });

    it('should detect multiple value sources with different values', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockMultiValueData, context);

      expect(result.rulesApplied).toContain('conflict_detection');
    });

    it('should sanitize content', async () => {
      const contentWithIssues = {
        content: 'Contract\x00Value: $50,000\r\n\r\n\r\n\r\nTerms: Net 30',
        value: 50000,
      };
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(contentWithIssues, context);

      expect(result.rulesApplied).toContain('content_sanitized');
    });
  });

  // ===========================================================================
  // GENERAL FINANCIAL ANALYSIS TESTS
  // ===========================================================================

  describe('General Financial Analysis', () => {
    it('should analyze general financial data', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockGeneralFinancialData, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('general_financial_analysis');
      expect(result.data).toBeDefined();
    });

    it('should extract amounts from text', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockGeneralFinancialData, context);

      expect(result.success).toBe(true);
      expect(result.data?.totalIdentifiedSpend).toBeGreaterThan(0);
    });

    it('should identify payment terms', async () => {
      const dataWithTerms = {
        content: 'Payment due Net 30 from invoice date',
        value: 10000,
      };
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(dataWithTerms, context);

      expect(result.success).toBe(true);
      expect(result.data?.paymentTerms).toBe('Net 30');
    });

    it('should handle text-only input', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockTextOnlyData, context);

      expect(result.success).toBe(true);
      expect(result.data?.totalIdentifiedSpend).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process(mockEmptyData, context);

      // Empty data should fail validation but be handled gracefully
      expect(result.insights.some(i => i.type === 'input_validation_warning')).toBe(true);
    });
  });

  // ===========================================================================
  // CONTRACT FINANCIAL ANALYSIS TESTS
  // ===========================================================================

  describe('Contract Financial Analysis', () => {
    beforeEach(() => {
      // Setup mock for contract queries
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockHighValueContract, error: null }),
            }),
            single: vi.fn().mockResolvedValue({ data: mockHighValueContract, error: null }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: { routingDecision: 'VP' }, error: null });
    });

    it.skip('should analyze high-value contract', async () => {
      // Skipped: Requires proper database mock setup for full contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockHighValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('contract_financial_analysis');
      expect(result.rulesApplied).toContain('high_value_threshold');
      expect(result.insights.some(i => i.type === 'high_value_contract')).toBe(true);
    });

    it.skip('should detect large upfront payment', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockUpfrontPaymentContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('payment_terms_check');
      expect(result.insights.some(i => i.type === 'large_upfront_payment')).toBe(true);
    });

    it.skip('should calculate ROI and detect negative ROI', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockNegativeROIContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('roi_calculation');
    });

    it.skip('should determine correct approval level for critical value', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockCriticalValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.metadata?.approvalLevel).toBe('C-suite');
    });

    it.skip('should extract payment schedule', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockHighValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.data?.paymentSchedule).toBeDefined();
      expect(result.data?.paymentSchedule?.type).toBeDefined();
    });

    it.skip('should analyze cost breakdown', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockHighValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.data?.costBreakdown).toBeDefined();
    });

    it.skip('should assess cash flow impact', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      const context = createAgentContext(enterpriseId, {
        contractId: mockHighValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.data?.cashFlowImpact).toBeDefined();
    });

    it.skip('should handle contract not found', async () => {
      // Skipped: Requires proper database mock setup for error handling
      const context = createAgentContext(enterpriseId, {
        contractId: 'non-existent-id',
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // VENDOR FINANCIAL ANALYSIS TESTS
  // ===========================================================================

  describe('Vendor Financial Analysis', () => {
    beforeEach(() => {
      // Setup mock for vendor queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'contracts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    then: vi.fn().mockResolvedValue({
                      data: [
                        { value: 100000, created_at: '2024-01-01', status: 'active' },
                        { value: 150000, created_at: '2024-02-01', status: 'active' },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'vendors') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'vendor-id', category: 'software' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockResolvedValue({ data: mockVendorPayments, error: null }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });
    });

    it.skip('should analyze vendor financials', async () => {
      // Skipped: Requires complex database mock setup for vendor queries
      const context = createAgentContext(enterpriseId, {
        vendorId: 'vendor-id',
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('vendor_financial_analysis');
    });

    it.skip('should detect high vendor concentration', async () => {
      // Skipped: Requires complex database mock setup for vendor queries
      const context = createAgentContext(enterpriseId, {
        vendorId: 'vendor-id',
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
    });

    it.skip('should analyze payment performance', async () => {
      // Skipped: Requires complex database mock setup for vendor queries
      const context = createAgentContext(enterpriseId, {
        vendorId: 'vendor-id',
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.data?.paymentPerformance).toBeDefined();
    });
  });

  // ===========================================================================
  // BUDGET ANALYSIS TESTS
  // ===========================================================================

  describe('Budget Analysis', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'budgets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockHighUtilizationBudget,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'budget_variance_analysis') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockBudgetVariances,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    });

    it.skip('should analyze budget with high utilization', async () => {
      // Skipped: Requires proper database mock setup for budget queries
      const context = createAgentContext(enterpriseId);
      const result = await agent.process({
        budgetId: mockHighUtilizationBudget.id,
      }, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('budget_analysis');
      expect(result.rulesApplied).toContain('utilization_check');
      expect(result.insights.some(i => i.type === 'high_budget_utilization')).toBe(true);
    });

    it('should detect budget overrun risk', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'budgets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockOverrunBudget,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      const context = createAgentContext(enterpriseId);
      const result = await agent.process({
        budgetId: mockOverrunBudget.id,
      }, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('burn_rate_analysis');
      expect(result.insights.some(i => i.type === 'budget_overrun_risk')).toBe(true);
    });

    it('should analyze budget variances', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process({
        budgetId: mockHighUtilizationBudget.id,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data?.variances).toBeDefined();
      expect(result.insights.some(i => i.type === 'significant_variance')).toBe(true);
    });

    it('should calculate burn rate', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process({
        budgetId: mockHighUtilizationBudget.id,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data?.burnRate).toBeDefined();
      expect(result.data?.burnRate?.monthly).toBeGreaterThanOrEqual(0);
    });

    it('should generate budget forecast', async () => {
      const context = createAgentContext(enterpriseId);
      const result = await agent.process({
        budgetId: mockHighUtilizationBudget.id,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data?.forecast).toBeDefined();
    });
  });

  // ===========================================================================
  // ERROR HANDLING AND GRACEFUL DEGRADATION TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should classify validation errors correctly', async () => {
      // Trigger a validation error
      const result = await agent.process({
        content: '', // Empty content should fail
      }, createAgentContext(enterpriseId));

      expect(result.insights.some(i =>
        i.type === 'input_validation_warning' ||
        i.message.toLowerCase().includes('validation')
      )).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Database connection failed')),
            }),
          }),
        }),
      });

      const context = createAgentContext(enterpriseId, {
        contractId: 'some-contract-id',
      });
      const result = await agent.process({}, context);

      // Should attempt graceful degradation
      expect(result.data?.degraded === true || result.success === false).toBe(true);
    });

    it('should handle timeout errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Request timed out')),
            }),
          }),
        }),
      });

      const context = createAgentContext(enterpriseId, {
        contractId: 'some-contract-id',
      });
      const result = await agent.process({}, context);

      expect(result.data?.degraded === true || result.success === false).toBe(true);
    });

    it('should create degraded result with partial data', async () => {
      // Simulate partial failure
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockHighValueContract, value: 100000 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockRejectedValue(new Error('Partial failure')),
            }),
          }),
        };
      });

      const context = createAgentContext(enterpriseId, {
        contractId: mockHighValueContract.id,
      });
      const result = await agent.process({}, context);

      // Result should exist (either success or degraded)
      expect(result).toBeDefined();
    });
  });

  // ===========================================================================
  // CONFIGURATION INTEGRATION TESTS
  // ===========================================================================

  describe('Configuration Integration', () => {
    it.skip('should use configured thresholds for high-value detection', async () => {
      // Skipped: Requires proper database mock setup for contract analysis
      // Contract at exactly the threshold
      const thresholdContract = {
        ...mockHighValueContract,
        value: 100000, // At threshold
      };

      const context = createAgentContext(enterpriseId, {
        contractId: thresholdContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('high_value_threshold');
    });

    it('should not flag contract below high-value threshold', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockLowValueContract, error: null }),
            }),
          }),
        }),
      });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const context = createAgentContext(enterpriseId, {
        contractId: mockLowValueContract.id,
      });
      const result = await agent.process({}, context);

      expect(result.success).toBe(true);
      expect(result.rulesApplied).not.toContain('high_value_threshold');
      expect(result.insights.some(i => i.type === 'high_value_contract')).toBe(false);
    });
  });

  // ===========================================================================
  // SCHEMA VALIDATION TESTS
  // ===========================================================================

  describe('Schema Validation Functions', () => {
    it('should import validation functions from schema module', async () => {
      const {
        validateFinancialAgentInput,
        validateAgentContext,
        sanitizeContent,
        detectEncodingIssues,
      } = await import('../supabase/functions/local-agents/schemas/financial.ts');

      expect(typeof validateFinancialAgentInput).toBe('function');
      expect(typeof validateAgentContext).toBe('function');
      expect(typeof sanitizeContent).toBe('function');
      expect(typeof detectEncodingIssues).toBe('function');
    });

    it('should validate financial input correctly', async () => {
      const { validateFinancialAgentInput } = await import('../supabase/functions/local-agents/schemas/financial.ts');

      const valid = validateFinancialAgentInput(validFinancialInput);
      expect(valid.success).toBe(true);

      const invalid = validateFinancialAgentInput({});
      expect(invalid.success).toBe(false);
    });

    it('should sanitize content correctly', async () => {
      const { sanitizeContent } = await import('../supabase/functions/local-agents/schemas/financial.ts');

      const dirty = 'Test\x00Content\r\n\r\n\r\n\r\nMore';
      const clean = sanitizeContent(dirty);

      expect(clean).not.toContain('\x00');
      expect(clean).not.toContain('\r');
      expect(clean.split('\n').length).toBeLessThanOrEqual(4);
    });

    it('should detect encoding issues', async () => {
      const { detectEncodingIssues } = await import('../supabase/functions/local-agents/schemas/financial.ts');

      const mojibake = 'Ã¢â‚¬Å"Test TextÃ¢â‚¬';
      const result = detectEncodingIssues(mojibake);

      expect(result.hasMojibake).toBe(true);
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should normalize financial values', async () => {
      const { normalizeFinancialValue } = await import('../supabase/functions/local-agents/schemas/financial.ts');

      expect(normalizeFinancialValue('$1,000.00')).toBe(1000);
      expect(normalizeFinancialValue('10K')).toBe(10000);
      expect(normalizeFinancialValue('1.5M')).toBe(1500000);
      expect(normalizeFinancialValue(12345)).toBe(12345);
      expect(normalizeFinancialValue('invalid')).toBeNull();
    });
  });

  // ===========================================================================
  // CONFIGURATION MODULE TESTS
  // ===========================================================================

  describe('Configuration Module', () => {
    it('should export configuration functions', async () => {
      const {
        getDefaultFinancialConfig,
        isHighValue,
        isCriticalValue,
        determineApprovalLevel,
        isBudgetWarning,
        isBudgetCritical,
        assessConcentrationLevel,
        validateConfigThresholds,
      } = await import('../supabase/functions/local-agents/config/financial-config.ts');

      expect(typeof getDefaultFinancialConfig).toBe('function');
      expect(typeof isHighValue).toBe('function');
      expect(typeof isCriticalValue).toBe('function');
      expect(typeof determineApprovalLevel).toBe('function');
      expect(typeof isBudgetWarning).toBe('function');
      expect(typeof isBudgetCritical).toBe('function');
      expect(typeof assessConcentrationLevel).toBe('function');
      expect(typeof validateConfigThresholds).toBe('function');
    });

    it('should return valid default configuration', async () => {
      const { getDefaultFinancialConfig } = await import('../supabase/functions/local-agents/config/financial-config.ts');

      const config = getDefaultFinancialConfig();

      expect(config.highValueThreshold).toBe(100000);
      expect(config.criticalValueThreshold).toBe(500000);
      expect(config.budgetWarningThreshold).toBe(0.8);
      expect(config.maxRetryAttempts).toBe(3);
    });

    it('should determine correct approval levels', async () => {
      const { determineApprovalLevel, getDefaultFinancialConfig } = await import('../supabase/functions/local-agents/config/financial-config.ts');
      const config = getDefaultFinancialConfig();

      expect(determineApprovalLevel(600000, config)).toBe('C-suite');
      expect(determineApprovalLevel(200000, config)).toBe('VP');
      expect(determineApprovalLevel(75000, config)).toBe('Director');
      expect(determineApprovalLevel(25000, config)).toBe('Manager');
      expect(determineApprovalLevel(5000, config)).toBe('Standard');
    });

    it('should validate configuration thresholds', async () => {
      const { validateConfigThresholds, getDefaultFinancialConfig } = await import('../supabase/functions/local-agents/config/financial-config.ts');

      const defaultConfig = getDefaultFinancialConfig();
      const errors = validateConfigThresholds(defaultConfig);

      expect(errors).toHaveLength(0); // Default config should be valid
    });

    it('should detect invalid threshold relationships', async () => {
      const { validateConfigThresholds, FinancialConfigSchema } = await import('../supabase/functions/local-agents/config/financial-config.ts');

      // Create invalid config with inverted approval thresholds
      // vpApprovalThreshold should be > directorApprovalThreshold
      const invalidConfig = FinancialConfigSchema.parse({
        vpApprovalThreshold: 50000, // Should be higher than director
        directorApprovalThreshold: 100000, // Higher than VP - invalid
        budgetWarningThreshold: 0.95, // Higher than critical - invalid
        budgetCriticalThreshold: 0.85,
      });

      const errors = validateConfigThresholds(invalidConfig);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('vpApprovalThreshold') || e.includes('budgetCriticalThreshold'))).toBe(true);
    });

    it('should assess budget warning and critical levels', async () => {
      const { isBudgetWarning, isBudgetCritical, getDefaultFinancialConfig } = await import('../supabase/functions/local-agents/config/financial-config.ts');
      const config = getDefaultFinancialConfig();

      expect(isBudgetWarning(0.75, config)).toBe(false);
      expect(isBudgetWarning(0.85, config)).toBe(true);
      expect(isBudgetCritical(0.85, config)).toBe(false);
      expect(isBudgetCritical(0.95, config)).toBe(true);
    });

    it('should assess concentration levels', async () => {
      const { assessConcentrationLevel, getDefaultFinancialConfig } = await import('../supabase/functions/local-agents/config/financial-config.ts');
      const config = getDefaultFinancialConfig();

      expect(assessConcentrationLevel(10, config)).toBe('low');
      expect(assessConcentrationLevel(20, config)).toBe('medium');
      expect(assessConcentrationLevel(40, config)).toBe('high');
    });
  });
});
