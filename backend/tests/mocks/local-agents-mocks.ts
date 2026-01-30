/**
 * Shared mocks for local-agents tests
 * This file should be imported at the top of any test file that imports from local-agents
 */

import { vi } from 'vitest';

// Mock the config module
vi.mock('../../supabase/functions/local-agents/config/index.ts', () => ({
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
vi.mock('../../supabase/functions-utils/cache-factory.ts', () => ({
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
vi.mock('../../supabase/functions/local-agents/utils/tracing.ts', () => ({
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
vi.mock('../../supabase/functions/local-agents/utils/memory.ts', () => ({
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
vi.mock('../../supabase/functions/_shared/ai/claude-client.ts', () => ({
  ClaudeClient: vi.fn(),
  getClaudeClient: vi.fn().mockReturnValue({
    chat: vi.fn().mockResolvedValue({ content: 'mock response' }),
    stream: vi.fn(),
  }),
  ClaudeTool: vi.fn(),
  ClaudeMessage: vi.fn(),
  StreamEvent: vi.fn(),
}));

vi.mock('../../supabase/functions/_shared/ai/tool-executor.ts', () => ({
  ToolExecutor: vi.fn(),
  createToolExecutor: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue({ result: 'mock' }),
  }),
}));

vi.mock('../../supabase/functions/_shared/ai/cost-tracker.ts', () => ({
  getCostTracker: vi.fn().mockReturnValue({
    track: vi.fn(),
    getStats: vi.fn().mockReturnValue({ total: 0 }),
  }),
  CostTracker: vi.fn(),
}));

// Mock enhanced rate limiter
vi.mock('../../supabase/functions/_shared/rate-limiting.ts', () => ({
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

// Export a flag to verify mocks are loaded
export const LOCAL_AGENTS_MOCKS_LOADED = true;
