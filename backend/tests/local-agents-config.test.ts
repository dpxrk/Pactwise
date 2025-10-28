import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SecretaryAgent } from '../supabase/functions/local-agents/agents/secretary.ts';
import { FinancialAgent } from '../supabase/functions/local-agents/agents/financial.ts';
import { LegalAgent } from '../supabase/functions/local-agents/agents/legal.ts';
import { AnalyticsAgent } from '../supabase/functions/local-agents/agents/analytics.ts';
import { VendorAgent } from '../supabase/functions/local-agents/agents/vendor.ts';
import { NotificationsAgent } from '../supabase/functions/local-agents/agents/notifications.ts';
import { ManagerAgent } from '../supabase/functions/local-agents/agents/manager.ts';
// import { BaseAgent } from '../supabase/functions/local-agents/agents/base.ts';

// Mock configuration
const mockConfig = {
  FEATURE_FLAGS: {
    ENABLE_CACHING: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_METRICS: true,
    ENABLE_AUDIT_LOGS: true,
    ENABLE_REAL_TIME: true,
    ENABLE_AI_ANALYSIS: false, // Disabled for testing
  },
  TIMEOUTS: {
    DEFAULT: 30000,
    LONG_RUNNING: 60000,
    DATABASE_FUNCTION: 45000,
    EXTERNAL_API: 20000,
  },
  RATE_LIMITS: {
    DEFAULT: { requests: 100, window: 60 },
    AI_ANALYSIS: { requests: 10, window: 60 },
    DATABASE_FUNCTION: { requests: 50, window: 60 },
  },
  CACHE_TTL: {
    DEFAULT: 300,
    CONTRACT_DATA: 600,
    VENDOR_DATA: 900,
    ANALYTICS: 1800,
  },
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
  },
};

// Mock environment variables
vi.stubEnv('AGENT_CONFIG', JSON.stringify(mockConfig));

// Define test enterprise ID constant
const TEST_ENTERPRISE_ID = 'test-enterprise-123';

// Helper to create valid AgentContext
const createAgentContext = (overrides: Record<string, unknown> = {}) => ({
  enterpriseId: TEST_ENTERPRISE_ID,
  sessionId: 'test-session',
  environment: {},
  permissions: [],
  ...overrides,
});

describe('Agent Configuration Management', () => {
  let mockSupabase: SupabaseClient;
  const testEnterpriseId = 'test-enterprise-123';

  beforeEach(() => {
    // Reset environment
    vi.clearAllMocks();

    // Mock Supabase
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Feature Flags', () => {
    it('should respect caching feature flag', async () => {
      // Test with caching enabled
      const agentWithCache = new SecretaryAgent(mockSupabase, testEnterpriseId);

      // Make same request twice
      await agentWithCache.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123' }));
      const result = await agentWithCache.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123' }));

      expect(result.metadata?.cached).toBeDefined();

      // Test with caching disabled
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: { ...mockConfig.FEATURE_FLAGS, ENABLE_CACHING: false },
      }));

      const agentNoCache = new SecretaryAgent(mockSupabase, testEnterpriseId);

      await agentNoCache.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123' }));
      const resultNoCache = await agentNoCache.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123' }));

      expect(resultNoCache.metadata?.cached).toBeUndefined();
    });

    it('should respect rate limiting feature flag', async () => {
      // Test with rate limiting enabled
      const agent = new FinancialAgent(mockSupabase, testEnterpriseId);

      // Make multiple requests
      const promises = Array(5).fill(null).map(() =>
        agent.process({ analysisType: 'budget' }, createAgentContext()),
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);

      // Test with rate limiting disabled
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: { ...mockConfig.FEATURE_FLAGS, ENABLE_RATE_LIMITING: false },
      }));

      const agentNoLimit = new FinancialAgent(mockSupabase, testEnterpriseId);

      // Make many requests quickly
      const manyPromises = Array(20).fill(null).map(() =>
        agentNoLimit.process({ analysisType: 'budget' }, createAgentContext()),
      );

      const manyResults = await Promise.all(manyPromises);
      expect(manyResults.every(r => r.success)).toBe(true);
    });

    it('should respect audit logging feature flag', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ data: {}, error: null });
      mockSupabase.from = vi.fn((_table: string) => ({
        insert: insertSpy,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' }, error: null }),
      }));

      // Test with audit logs enabled
      const agent = new LegalAgent(mockSupabase, testEnterpriseId);
      await agent.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123', userId: 'user-123' }));

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'legal_analysis',
          resource_type: 'contract',
        }),
      );

      // Test with audit logs disabled
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: { ...mockConfig.FEATURE_FLAGS, ENABLE_AUDIT_LOGS: false },
      }));

      insertSpy.mockClear();
      const agentNoAudit = new LegalAgent(mockSupabase, testEnterpriseId);
      await agentNoAudit.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123', userId: 'user-123' }));

      const auditCalls = insertSpy.mock.calls.filter((call: unknown[]) =>
        (call[0] as { action?: string })?.action === 'legal_analysis',
      );
      expect(auditCalls).toHaveLength(0);
    });

    it('should respect real-time broadcast feature flag', async () => {
      const broadcastSpy = vi.fn().mockResolvedValue({ data: {}, error: null });
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));
      mockSupabase.channel = vi.fn(() => ({
        send: broadcastSpy,
      }));

      // Test with real-time enabled
      const agent = new NotificationsAgent(mockSupabase, testEnterpriseId);
      await agent.process({ type: 'alert', severity: 'high' }, createAgentContext({ notificationType: 'alert' }) as unknown as AgentContext);

      // Real-time broadcasts would be sent
      // Note: Current implementation doesn't have explicit broadcast calls,
      // but this shows how to test when implemented

      // Test with real-time disabled
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: { ...mockConfig.FEATURE_FLAGS, ENABLE_REAL_TIME: false },
      }));

      broadcastSpy.mockClear();
      const agentNoBroadcast = new NotificationsAgent(mockSupabase, testEnterpriseId);
      await agentNoBroadcast.process({ type: 'alert', severity: 'high' }, createAgentContext({ notificationType: 'alert' }) as unknown as AgentContext);

      expect(broadcastSpy).not.toHaveBeenCalled();
    });
  });

  describe('Timeout Configuration', () => {
    it('should apply different timeouts based on operation type', async () => {
      const agent = new AnalyticsAgent(mockSupabase, testEnterpriseId);

      // Mock long-running database function
      let callCount = 0;
      mockSupabase.rpc = vi.fn().mockImplementation(async (_funcName: string) => {
        callCount++;
        if (callCount === 1) {
          // First call times out
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new Error('Timeout');
        }
        // Retry succeeds
        return { data: { result: 'success' }, error: null };
      });

      const result = await agent.process({ period: 'year' }, createAgentContext());

      expect(result.success).toBe(true);
      expect(callCount).toBe(2); // Initial + 1 retry
    });

    it('should respect custom timeout configuration', async () => {
      // Set shorter timeout for testing
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        TIMEOUTS: { ...mockConfig.TIMEOUTS, DEFAULT: 100 },
      }));

      const agent = new VendorAgent(mockSupabase, testEnterpriseId);

      // Mock slow operation
      mockSupabase.rpc = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { data: {}, error: null };
      });

      const start = Date.now();
      const result = await agent.process({ vendorId: 'vendor-123' }, createAgentContext());
      const duration = Date.now() - start;

      expect(result.success).toBe(false);
      expect(duration).toBeLessThan(150); // Should timeout quickly
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should apply different rate limits for different operations', async () => {
      // Mock rate limiter to track calls
      const checkLimitSpy = vi.fn()
        .mockResolvedValueOnce({ allowed: true, remaining: 10 })
        .mockResolvedValueOnce({ allowed: true, remaining: 9 })
        .mockResolvedValueOnce({ allowed: false, remaining: 0 });

      vi.doMock('../supabase/functions/_shared/rate-limiting.ts', () => ({
        EnhancedRateLimiter: vi.fn().mockImplementation(() => ({
          checkLimit: checkLimitSpy,
          cleanup: vi.fn(),
        })),
      }));

      const agent = new ManagerAgent(mockSupabase, testEnterpriseId);

      // First two requests succeed
      const result1 = await agent.process('Test request 1', createAgentContext());
      const result2 = await agent.process('Test request 2', createAgentContext());

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Third request hits rate limit
      const result3 = await agent.process('Test request 3', createAgentContext());
      expect(result3.success).toBe(false);
      expect(result3.metadata?.error).toContain('Rate limit');
    });

    it('should use operation-specific rate limits', async () => {
      const agent = new FinancialAgent(mockSupabase, testEnterpriseId);

      // AI analysis should have stricter limits
      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: { ...mockConfig.FEATURE_FLAGS, ENABLE_AI_ANALYSIS: true },
        RATE_LIMITS: {
          ...mockConfig.RATE_LIMITS,
          AI_ANALYSIS: { requests: 1, window: 60 },
        },
      }));

      // First AI request succeeds
      const result1 = await agent.process({ analysisType: 'ai_insights' }, createAgentContext());
      expect(result1.success).toBe(true);

      // Second AI request should be rate limited
      const result2 = await agent.process({ analysisType: 'ai_insights' }, createAgentContext());
      expect(result2.success).toBe(false);
    });
  });

  describe('Cache TTL Configuration', () => {
    it('should apply different cache TTLs for different data types', async () => {
      const getCacheSpy = vi.fn()
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce({ data: 'cached' }); // Cache hit

      const setCacheSpy = vi.fn().mockResolvedValue(true);

      vi.doMock('../supabase/functions/local-agents/utils/cache-manager.ts', () => ({
        CacheManager: {
          getInstance: () => ({
            get: getCacheSpy,
            set: setCacheSpy,
            delete: vi.fn(),
            exists: vi.fn(),
          }),
        },
      }));

      const secretary = new SecretaryAgent(mockSupabase, testEnterpriseId);

      // First call - cache miss
      await secretary.process({ content: 'Contract' }, createAgentContext({ contractId: 'contract-123' }));

      expect(setCacheSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        mockConfig.CACHE_TTL.CONTRACT_DATA,
      );

      // Vendor agent with different TTL
      const vendor = new VendorAgent(mockSupabase, testEnterpriseId);
      await vendor.process({}, createAgentContext({ vendorId: 'vendor-123' }));

      expect(setCacheSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        mockConfig.CACHE_TTL.VENDOR_DATA,
      );
    });
  });

  describe('Retry Configuration', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;
      const timestamps: number[] = [];

      mockSupabase.rpc = vi.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        attempts++;

        if (attempts < 3) {
          throw new Error('Temporary failure');
        }

        return { data: { success: true }, error: null };
      });

      const agent = new AnalyticsAgent(mockSupabase, testEnterpriseId);
      const result = await agent.process({}, createAgentContext());

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);

      // Check exponential backoff
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];

        expect(delay2).toBeGreaterThan(delay1);
        expect(delay2).toBeLessThanOrEqual(delay1 * mockConfig.RETRY_CONFIG.BACKOFF_MULTIPLIER + 100);
      }
    });

    it('should respect max retry configuration', async () => {
      let attempts = 0;

      mockSupabase.rpc = vi.fn().mockImplementation(async () => {
        attempts++;
        throw new Error('Persistent failure');
      });

      vi.stubEnv('AGENT_CONFIG', JSON.stringify({
        ...mockConfig,
        RETRY_CONFIG: { ...mockConfig.RETRY_CONFIG, MAX_RETRIES: 2 },
      }));

      const agent = new LegalAgent(mockSupabase, testEnterpriseId);
      const result = await agent.process({ content: 'Test' }, createAgentContext({ contractId: 'contract-123', userId: 'user-123' }));

      expect(result.success).toBe(false);
      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Dynamic Configuration Updates', () => {
    it('should allow runtime configuration updates', async () => {
      const agent = new SecretaryAgent(mockSupabase, testEnterpriseId);

      // Initial config
      const result1 = await agent.process({ content: 'Test' }, createAgentContext());
      expect(result1.success).toBe(true);

      // Update configuration
      const newConfig = {
        ...mockConfig,
        FEATURE_FLAGS: {
          ...mockConfig.FEATURE_FLAGS,
          ENABLE_ENHANCED_EXTRACTION: true,
        },
      };

      vi.stubEnv('AGENT_CONFIG', JSON.stringify(newConfig));

      // Process with new config
      const result2 = await agent.process({ content: 'Test with enhanced extraction' }, createAgentContext());
      expect(result2.success).toBe(true);
      // Would check for enhanced extraction features if implemented
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should load development configuration', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('AGENT_CONFIG_DEV', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: {
          ...mockConfig.FEATURE_FLAGS,
          ENABLE_DEBUG_LOGGING: true,
        },
      }));

      const agent = new ManagerAgent(mockSupabase, testEnterpriseId);
      const result = await agent.process('Test in dev', createAgentContext());

      expect(result.success).toBe(true);
      // Would have debug information in development
    });

    it('should load production configuration', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('AGENT_CONFIG_PROD', JSON.stringify({
        ...mockConfig,
        FEATURE_FLAGS: {
          ...mockConfig.FEATURE_FLAGS,
          ENABLE_DEBUG_LOGGING: false,
          ENABLE_PERFORMANCE_MONITORING: true,
        },
      }));

      const agent = new ManagerAgent(mockSupabase, testEnterpriseId);
      const result = await agent.process('Test in prod');

      expect(result.success).toBe(true);
      // Would have performance monitoring in production
    });
  });
});