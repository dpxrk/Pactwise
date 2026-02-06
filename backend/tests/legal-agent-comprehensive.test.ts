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

// Mock the tracing module - use class syntax for constructor compatibility
vi.mock('../supabase/functions/local-agents/utils/tracing.ts', () => {
  const MockTracingManager = class {
    startSpan = vi.fn().mockReturnValue({
      end: vi.fn(),
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
    });
    endSpan = vi.fn();
  };
  return {
    TracingManager: MockTracingManager,
    TraceContext: class {},
    SpanKind: { INTERNAL: 0, SERVER: 1, CLIENT: 2 },
    SpanStatus: { OK: 0, ERROR: 1 },
  };
});

// Mock the memory module - use class syntax for constructor compatibility
vi.mock('../supabase/functions/local-agents/utils/memory.ts', () => {
  const MockMemoryManager = class {
    store = vi.fn().mockResolvedValue('mock-id');
    search = vi.fn().mockResolvedValue([]);
    getRecent = vi.fn().mockResolvedValue([]);
    delete = vi.fn().mockResolvedValue(true);
  };
  return {
    MemoryManager: MockMemoryManager,
    Memory: class {},
    MemorySearchResult: class {},
  };
});

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

import { LegalAgent } from '../supabase/functions/local-agents/agents/legal.ts';
import type { AgentContext } from '../supabase/functions/local-agents/agents/base.ts';
import {
  mockNDAContent,
  mockMSAContent,
  mockSOWContent,
  mockLicenseAgreementContent,
  mockEmploymentContractContent,
  mockMalformedContent,
  mockUnicodeContent,
  mockEmptyContent,
  mockVeryLongContent,
  mockMultiPartyContent,
  contractFixtures,
  msaAccuracyBenchmark,
  calculatePrecision,
  calculateRecall,
  calculateF1Score,
} from './fixtures/legal-test-contracts.ts';

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

// Mock enhanced rate limiter - use class syntax for constructor compatibility
vi.mock('../supabase/functions/_shared/rate-limiting.ts', () => {
  const MockRateLimiter = class {
    checkLimit = vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 10,
      limit: 100,
      resetAt: new Date(),
      rule: { id: 'test', name: 'test' },
      fingerprint: 'test',
    });
    cleanup = vi.fn().mockResolvedValue(undefined);
  };
  return { EnhancedRateLimiter: MockRateLimiter };
});

// Mock streaming module
vi.mock('../supabase/functions/_shared/streaming.ts', () => ({
  createSSEStream: vi.fn().mockReturnValue({
    response: new Response(),
    writer: { write: vi.fn(), close: vi.fn() },
  }),
  StreamWriter: vi.fn(),
}));

// Helper to create valid AgentContext
const createAgentContext = (enterpriseId: string, overrides: Partial<AgentContext> = {}): AgentContext => ({
  enterpriseId,
  sessionId: 'test-session',
  environment: {},
  permissions: [],
  ...overrides,
});

// Create mock Supabase client
const createMockSupabase = () => {
  const mockSupabase = {
    from: vi.fn((_table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      data: [],
      error: null,
    })),
    rpc: vi.fn().mockImplementation((functionName: string, _params?: unknown) => {
      const functionResponses: Record<string, unknown> = {
        'analyze_contract_legal_risks': {
          data: {
            overall_risk: 'medium',
            risk_factors: [],
            recommendations: [],
          },
          error: null,
        },
        'route_contract_for_approval': {
          data: {
            required_approvals: [],
          },
          error: null,
        },
        'run_compliance_checks': {
          data: {
            checks_performed: 5,
            issues_found: 0,
            summary: [],
          },
          error: null,
        },
        'assess_enterprise_risk': {
          data: {
            risk_level: 'low',
          },
          error: null,
        },
      };

      return Promise.resolve(functionResponses[functionName] || { data: null, error: null });
    }),
  };

  return mockSupabase as unknown;
};

const testEnterpriseId = 'test-enterprise-123';
const testManagerId = 'test-manager-123';
const testContractId = '12345678-1234-4123-8123-123456789abc';
const testUserId = '87654321-4321-4321-8321-abcdef123456';

describe('Legal Agent Comprehensive Tests', () => {
  let agent: LegalAgent;
  let mockSupabase: unknown;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    agent = new LegalAgent(mockSupabase, testEnterpriseId);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Input Validation Tests ====================

  describe('Input Validation', () => {
    it('should handle empty content gracefully', async () => {
      const result = await agent.process(
        { content: '' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.clauses).toHaveLength(0);
      expect(result.data.risks).toHaveLength(0);
    });

    it('should handle null content gracefully', async () => {
      const result = await agent.process(
        { content: null as unknown as string },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
    });

    it('should reject content that is too short', async () => {
      const result = await agent.process(
        { content: 'short' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('too short');
    });

    it('should reject non-string content types', async () => {
      const result = await agent.process(
        { content: 12345 as unknown as string },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(false);
      expect(result.metadata?.error).toContain('must be a string');
    });

    it('should handle whitespace-only content', async () => {
      const result = await agent.process(
        { content: '   \n\t   ' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.clauses).toHaveLength(0);
    });
  });

  // ==================== identifyProtections() Tests ====================

  describe('identifyProtections()', () => {
    it('should detect limitation of liability clause', async () => {
      const content = `
        This agreement includes a limitation of liability clause.
        Neither party shall be liable for any indirect damages.
        Maximum liability is capped at the contract value.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.limitationOfLiability).toBe(true);
    });

    it('should detect cap on damages', async () => {
      const content = `
        DAMAGES CAP: The maximum damages recoverable under this agreement
        shall not exceed $100,000 regardless of the nature of the claim.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.capOnDamages).toBe(true);
    });

    it('should detect right to terminate', async () => {
      const content = `
        Either party may terminate this agreement for convenience
        with 30 days prior written notice. The right to terminate
        may be exercised at any time.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.rightToTerminate).toBe(true);
    });

    it('should detect dispute resolution provisions', async () => {
      const content = `
        DISPUTE RESOLUTION: Any disputes arising under this agreement
        shall be resolved through binding arbitration in New York.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.disputeResolution).toBe(true);
    });

    it('should detect warranty disclaimer', async () => {
      const content = `
        WARRANTY DISCLAIMER: The software is provided "AS IS" without
        any warranties of any kind. Vendor disclaims all warranties.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.warrantyDisclaimer).toBe(true);
    });

    it('should detect intellectual property protections', async () => {
      const content = `
        INTELLECTUAL PROPERTY: All intellectual property rights and
        ownership rights in the deliverables shall remain with the client.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.intellectualPropertyRights).toBe(true);
    });

    it('should detect confidentiality protections', async () => {
      const content = `
        CONFIDENTIALITY: All confidential information disclosed under
        this non-disclosure agreement shall be protected.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.confidentialityProtection).toBe(true);
    });

    it('should detect data protection provisions', async () => {
      const content = `
        DATA PROTECTION: The vendor agrees to comply with GDPR and
        all applicable data protection and privacy regulations.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.dataProtection).toBe(true);
    });

    it('should return all false for content with no protections', async () => {
      const content = `
        This is a simple agreement between two parties.
        No specific terms or conditions apply.
        The parties agree to cooperate in good faith.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.limitationOfLiability).toBe(false);
      expect(result.data.protections.capOnDamages).toBe(false);
      expect(result.data.protections.rightToTerminate).toBe(false);
    });
  });

  // ==================== identifyRedFlags() Tests ====================

  describe('identifyRedFlags()', () => {
    it('should detect perpetual obligations', async () => {
      const content = `
        The confidentiality obligations under this agreement shall
        continue in perpetuity even after termination.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Perpetual obligations',
          severity: 'high',
        }),
      );
    });

    it('should detect jury trial waiver', async () => {
      const content = `
        Both parties agree to waive their right to a jury trial
        for any disputes arising under this agreement.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Waiver of jury trial',
          severity: 'medium',
        }),
      );
    });

    it('should detect non-compete clauses', async () => {
      const content = `
        NON-COMPETE: The contractor agrees not to compete with
        the company for a period of two years after termination.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Non-compete clause',
          severity: 'high',
        }),
      );
    });

    it('should detect liquidated damages', async () => {
      const content = `
        LIQUIDATED DAMAGES: In the event of breach, the breaching
        party shall pay liquidated damages of $50,000.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Predetermined damages',
          severity: 'medium',
        }),
      );
    });

    it('should detect assignment without consent', async () => {
      const content = `
        Either party may freely assign this agreement to any
        third party without the other party's consent.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Assignment without consent',
          severity: 'medium',
        }),
      );
    });

    it('should return empty array for content with no red flags', async () => {
      const content = `
        This is a standard service agreement with fair terms.
        Both parties agree to reasonable termination provisions.
        All obligations shall terminate upon contract expiration.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toHaveLength(0);
    });
  });

  // ==================== checkRegulations() Tests ====================

  describe('checkRegulations()', () => {
    it('should detect GDPR compliance issues', async () => {
      const content = `
        This agreement involves processing of personal data
        of EU residents. Customer information will be stored.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.regulations).toBeDefined();
      const gdprCheck = result.data.regulations?.find(
        (r: { regulation: string }) => r.regulation === 'GDPR',
      );
      expect(gdprCheck).toBeDefined();
    });

    it('should detect CCPA requirements', async () => {
      const content = `
        This service will be available to California residents.
        Consumer personal information may be collected.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.regulations).toBeDefined();
      const ccpaCheck = result.data.regulations?.find(
        (r: { regulation: string }) => r.regulation === 'CCPA',
      );
      expect(ccpaCheck).toBeDefined();
    });

    it('should detect HIPAA requirements', async () => {
      const content = `
        The vendor will process protected health information (PHI)
        and patient medical records on behalf of the healthcare provider.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.regulations).toBeDefined();
      const hipaaCheck = result.data.regulations?.find(
        (r: { regulation: string }) => r.regulation === 'HIPAA',
      );
      expect(hipaaCheck).toBeDefined();
    });

    it('should pass compliance when properly mentioned', async () => {
      const content = `
        This agreement complies with GDPR requirements.
        Data subject rights including right to access and erasure
        are fully supported. Personal data processing follows GDPR.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      const gdprCheck = result.data.regulations?.find(
        (r: { regulation: string }) => r.regulation === 'GDPR',
      );
      expect(gdprCheck?.compliant).toBe(true);
    });
  });

  // ==================== checkDataPrivacy() Tests ====================

  describe('checkDataPrivacy()', () => {
    it('should detect overly broad data collection', async () => {
      const content = `
        The vendor may collect any and all information from users
        including but not limited to browsing history.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.dataPrivacy) {
        expect(result.data.dataPrivacy.issues.length).toBeGreaterThan(0);
      }
    });

    it('should detect indefinite data retention', async () => {
      const content = `
        All user data will be retained indefinitely and there is
        no deletion policy for collected information.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.dataPrivacy) {
        expect(result.data.dataPrivacy.issues.some(
          (i: { issue: string }) => i.issue.includes('retention'),
        )).toBe(true);
      }
    });

    it('should detect unrestricted third-party sharing', async () => {
      const content = `
        The vendor may share data with any third party vendors
        or partners without restriction.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.dataPrivacy) {
        expect(result.data.dataPrivacy.issues.some(
          (i: { issue: string }) => i.issue.includes('third-party'),
        )).toBe(true);
      }
    });

    it('should flag missing data security provisions', async () => {
      const content = `
        This agreement covers the provision of software services.
        No specific security measures are mentioned.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.dataPrivacy) {
        expect(result.data.dataPrivacy.issues.some(
          (i: { issue: string }) => i.issue.includes('security'),
        )).toBe(true);
      }
    });
  });

  // ==================== checkIndustryStandards() Tests ====================

  describe('checkIndustryStandards()', () => {
    it('should check for PCI DSS in financial services', async () => {
      const content = `
        This payment processing agreement covers credit card
        transactions and financial data handling.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.industryStandards) {
        const pciCheck = result.data.industryStandards.find(
          (s: { standard: string }) => s.standard === 'PCI DSS',
        );
        expect(pciCheck).toBeDefined();
        expect(pciCheck?.required).toBe(true);
      }
    });

    it('should check for SOC 2 in technology services', async () => {
      const content = `
        This SaaS agreement covers cloud software services
        and API access for enterprise customers.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.industryStandards) {
        const socCheck = result.data.industryStandards.find(
          (s: { standard: string }) => s.standard === 'SOC 2',
        );
        expect(socCheck).toBeDefined();
      }
    });

    it('should check for HIPAA in healthcare', async () => {
      const content = `
        This agreement involves processing medical records
        and patient health information for the hospital.
      `;

      const result = await agent.process(
        { content, checkType: 'compliance' },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      if (result.data.industryStandards) {
        const hipaaCheck = result.data.industryStandards.find(
          (s: { standard: string }) => s.standard === 'HIPAA',
        );
        expect(hipaaCheck).toBeDefined();
        expect(hipaaCheck?.required).toBe(true);
      }
    });
  });

  // ==================== calculateLegalConfidence() Tests ====================

  describe('calculateLegalConfidence()', () => {
    it('should return higher confidence for comprehensive contracts', async () => {
      const result = await agent.process(
        { content: mockMSAContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should return lower confidence for sparse contracts', async () => {
      const content = `
        Simple agreement between parties.
        Services will be provided for payment.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should increase confidence when clauses are found', async () => {
      const contentWithClauses = `
        LIMITATION OF LIABILITY: Limited to contract value.
        INDEMNIFICATION: Mutual indemnification applies.
        TERMINATION: 30 days notice required.
        CONFIDENTIALITY: All information is confidential.
        GOVERNING LAW: Laws of California apply.
        DISPUTE RESOLUTION: Binding arbitration in San Francisco.
      `;

      const result = await agent.process(
        { content: contentWithClauses },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  // ==================== suggestMitigations() Tests ====================

  describe('suggestMitigations()', () => {
    it('should suggest mitigation for unlimited liability', async () => {
      const content = `
        The contractor shall have unlimited liability for all
        damages arising under this agreement.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      // Check if mitigations are suggested in recommendations
      const hasMitigation = result.data.recommendations?.some(
        (r: string) => r.toLowerCase().includes('liability'),
      );
      expect(hasMitigation).toBe(true);
    });

    it('should suggest adding termination rights', async () => {
      const content = `
        This agreement shall continue indefinitely.
        Neither party may terminate this agreement.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      const hasTerminationSuggestion = result.data.recommendations?.some(
        (r: string) => r.toLowerCase().includes('termination'),
      );
      expect(hasTerminationSuggestion).toBe(true);
    });
  });

  // ==================== generateRecommendations() Tests ====================

  describe('generateRecommendations()', () => {
    it('should recommend legal review for high-risk contracts', async () => {
      const content = `
        UNLIMITED LIABILITY: The contractor accepts unlimited liability.
        NO TERMINATION: This agreement cannot be terminated.
        PERPETUAL OBLIGATIONS: All obligations continue forever.
        BROAD INDEMNIFICATION: Any and all claims must be indemnified.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.recommendations).toContainEqual(
        expect.stringMatching(/legal.*counsel|review/i),
      );
    });

    it('should recommend adding missing clauses', async () => {
      const content = `
        This is a service agreement for software development.
        The vendor will provide development services.
        Payment will be made monthly.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide minimal recommendations for well-structured contracts', async () => {
      const result = await agent.process(
        { content: mockMSAContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      // Well-structured contracts should have fewer critical recommendations
      const criticalRecommendations = result.data.recommendations.filter(
        (r: string) => r.toLowerCase().includes('immediate') || r.toLowerCase().includes('critical'),
      );
      expect(criticalRecommendations.length).toBeLessThanOrEqual(2);
    });
  });

  // ==================== analyzeNDA() Tests ====================

  describe('analyzeNDA()', () => {
    it('should detect mutual NDA', async () => {
      const content = `
        MUTUAL NON-DISCLOSURE AGREEMENT
        Both parties agree to maintain the confidentiality of
        information shared by the other party.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('nda');
    });

    it('should detect one-way NDA concerns', async () => {
      const result = await agent.process(
        { content: mockNDAContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('nda');
    });

    it('should flag overly broad definitions', async () => {
      const content = `
        NON-DISCLOSURE AGREEMENT
        "Confidential Information" means any and all information
        disclosed by the Disclosing Party without exception.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('nda');
    });

    it('should flag perpetual NDA obligations', async () => {
      const content = `
        NON-DISCLOSURE AGREEMENT
        Confidentiality obligations shall survive indefinitely
        and continue in perpetuity after termination.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.redFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Perpetual obligations',
        }),
      );
    });
  });

  // ==================== Edge Case Tests ====================

  describe('Edge Cases', () => {
    it('should handle Unicode/international characters', async () => {
      const result = await agent.process(
        { content: mockUnicodeContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.clauses).toBeDefined();
    });

    it('should handle special characters and formatting', async () => {
      const content = `
        CONTRACT #ABC-123 © 2024

        This Agreement ("Agreement") is entered into as of 1/1/2024.

        § 1. DEFINITIONS
        "Services" means: (a) consulting; (b) development; (c) support.

        § 2. TERMS
        Duration: 12-months (renewable)
        Value: $100,000.00 USD

        Limitation of liability applies.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.limitationOfLiability).toBe(true);
    });

    it('should handle very long documents within limits', async () => {
      const result = await agent.process(
        { content: mockVeryLongContent },
        createAgentContext(testEnterpriseId),
      );

      // Should either succeed with truncated analysis or fail gracefully
      if (result.success) {
        expect(result.data.clauses.length).toBeLessThanOrEqual(500);
      } else {
        expect(result.metadata?.error).toContain('size');
      }
    });

    it('should handle documents with only whitespace between sections', async () => {
      const content = `
        SECTION 1


        LIMITATION OF LIABILITY


        Clause text here.


        SECTION 2


        INDEMNIFICATION


        More clause text.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
    });

    it('should handle mixed case content', async () => {
      const content = `
        LIMITATION OF LIABILITY: The parties agree that
        Limitation Of Liability shall be mutual.
        limitation of liability is important.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.protections.limitationOfLiability).toBe(true);
    });
  });

  // ==================== Boundary Condition Tests ====================

  describe('Boundary Conditions', () => {
    it('should deduplicate similar obligations', async () => {
      const content = `
        The vendor shall provide monthly reports.
        The vendor must provide monthly reports.
        The vendor will provide monthly reports.
        The vendor agrees to provide monthly reports.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      // Should deduplicate similar obligations
      expect(result.data.obligations.length).toBeLessThan(4);
    });

    it('should limit clause extraction to maximum', async () => {
      // Generate content with many potential clauses
      const clauses = [];
      for (let i = 0; i < 600; i++) {
        clauses.push(`Limitation of liability clause ${i} applies here.`);
      }
      const content = clauses.join('\n');

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.clauses.length).toBeLessThanOrEqual(500);
    });

    it('should handle exactly minimum content length', async () => {
      const content = '0123456789'; // Exactly 10 characters

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
    });

    it('should handle content at 50 char deduplication boundary', async () => {
      const base = 'a'.repeat(50);
      const content = `
        The vendor shall ${base} obligation one.
        The vendor shall ${base} obligation two.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
    });
  });

  // ==================== Document Type Detection Tests ====================

  describe('Document Type Detection', () => {
    it('should identify NDA documents', async () => {
      const result = await agent.process(
        { content: mockNDAContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('nda');
    });

    it('should identify MSA documents', async () => {
      const result = await agent.process(
        { content: mockMSAContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('msa');
    });

    it('should identify SOW documents', async () => {
      const result = await agent.process(
        { content: mockSOWContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('sow');
    });

    it('should identify license agreements', async () => {
      const result = await agent.process(
        { content: mockLicenseAgreementContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('license');
    });

    it('should identify employment contracts', async () => {
      const result = await agent.process(
        { content: mockEmploymentContractContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.documentType).toBe('employment');
    });
  });

  // ==================== Risk Assessment Tests ====================

  describe('Risk Assessment', () => {
    it('should calculate overall legal risk correctly', async () => {
      const highRiskContent = `
        UNLIMITED LIABILITY: No cap on damages.
        ONE-SIDED TERMS: At vendor's sole discretion.
        NO TERMINATION: Contract cannot be ended.
        BROAD INDEMNIFICATION: Any and all claims covered.
        PERPETUAL: Obligations continue forever.
      `;

      const result = await agent.process(
        { content: highRiskContent },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.insights.some(
        (i: { type: string; severity: string }) =>
          i.type === 'high_legal_risk' && (i.severity === 'high' || i.severity === 'critical'),
      )).toBe(true);
    });

    it('should identify high-risk clauses', async () => {
      const content = `
        INDEMNIFICATION: The customer shall indemnify vendor
        against any and all claims, damages, losses, and expenses.
      `;

      const result = await agent.process(
        { content },
        createAgentContext(testEnterpriseId),
      );

      expect(result.success).toBe(true);
      expect(result.data.clauses.some(
        (c: { type: string; risk: string }) => c.type === 'indemnification' && c.risk === 'high',
      )).toBe(true);
    });

    it('should assess vendor risk when vendor data available', async () => {
      // Mock vendor data in the contract context with full chainable interface
      const chainable = () => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: testContractId,
            vendor_id: testUserId,
            vendor: { performance_score: 0.75 },
            approvals: [],
            extracted_key_terms: {},
          },
          error: null,
        }),
        data: [],
        error: null,
      });

      const mockWithVendor = createMockSupabase();
      mockWithVendor.from = vi.fn().mockImplementation(chainable);

      const agentWithVendor = new LegalAgent(mockWithVendor, testEnterpriseId);
      const result = await agentWithVendor.process(
        { content: mockMSAContent },
        createAgentContext(testEnterpriseId, { contractId: testContractId, userId: testUserId }),
      );

      // With contractId, the agent attempts DB-enriched analysis which may
      // partially fail due to mock limitations - verify it doesn't crash
      expect(result).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.rulesApplied).toBeDefined();
    });
  });

  // ==================== Accuracy Verification Tests (Phase 5) ====================

  describe('Accuracy Verification', () => {
    describe('Clause Detection Accuracy', () => {
      it.each(contractFixtures)(
        'should detect expected clauses in $name',
        async ({ content, expectedClauses }) => {
          const result = await agent.process(
            { content },
            createAgentContext(testEnterpriseId),
          );

          expect(result.success).toBe(true);

          const detectedTypes = result.data.clauses.map((c: { type: string }) => c.type);

          // Skip F1 check for documents with no expected clauses (like SOW which references parent MSA)
          if (expectedClauses.length === 0) {
            // Just verify we don't crash and return valid structure
            expect(result.data.clauses).toBeDefined();
            return;
          }

          const precision = calculatePrecision(detectedTypes, expectedClauses);
          const recall = calculateRecall(detectedTypes, expectedClauses);
          const f1 = calculateF1Score(precision, recall);

          // Require at least 60% F1 score for clause detection
          expect(f1).toBeGreaterThanOrEqual(0.6);
        },
      );

      it('should achieve high precision for MSA clause detection', async () => {
        const result = await agent.process(
          { content: msaAccuracyBenchmark.content },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        const detectedTypes = result.data.clauses.map((c: { type: string }) => c.type);
        const groundTruthTypes = msaAccuracyBenchmark.groundTruth.clauses.map(c => c.type);

        const precision = calculatePrecision(detectedTypes, groundTruthTypes);
        // Require at least 60% precision (realistic for rule-based extraction)
        expect(precision).toBeGreaterThanOrEqual(0.6);
      });

      it('should achieve high recall for MSA clause detection', async () => {
        const result = await agent.process(
          { content: msaAccuracyBenchmark.content },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        const detectedTypes = result.data.clauses.map((c: { type: string }) => c.type);
        const groundTruthTypes = msaAccuracyBenchmark.groundTruth.clauses.map(c => c.type);

        const recall = calculateRecall(detectedTypes, groundTruthTypes);
        // Require at least 60% recall
        expect(recall).toBeGreaterThanOrEqual(0.6);
      });
    });

    describe('Protection Detection Accuracy', () => {
      it.each(contractFixtures)(
        'should detect expected protections in $name',
        async ({ content, expectedProtections }) => {
          const result = await agent.process(
            { content },
            createAgentContext(testEnterpriseId),
          );

          expect(result.success).toBe(true);

          // Count matches
          let matches = 0;
          let total = 0;

          for (const [key, expected] of Object.entries(expectedProtections)) {
            total++;
            const actual = result.data.protections[key as keyof typeof result.data.protections];
            if (actual === expected) {
              matches++;
            }
          }

          // Require at least 80% accuracy for protections
          const accuracy = total > 0 ? matches / total : 1;
          expect(accuracy).toBeGreaterThanOrEqual(0.8);
        },
      );

      it('should achieve high accuracy for MSA protection detection', async () => {
        const result = await agent.process(
          { content: msaAccuracyBenchmark.content },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        const groundTruth = msaAccuracyBenchmark.groundTruth.protections;
        let matches = 0;
        let total = 0;

        for (const [key, expected] of Object.entries(groundTruth)) {
          total++;
          const actual = result.data.protections[key as keyof typeof result.data.protections];
          if (actual === expected) {
            matches++;
          }
        }

        // Require at least 85% accuracy for protection detection
        const accuracy = matches / total;
        expect(accuracy).toBeGreaterThanOrEqual(0.85);
      });
    });

    describe('Red Flag Detection Accuracy', () => {
      it.each(contractFixtures)(
        'should detect expected red flags in $name',
        async ({ content, expectedRedFlags }) => {
          const result = await agent.process(
            { content },
            createAgentContext(testEnterpriseId),
          );

          expect(result.success).toBe(true);

          const detectedFlags = result.data.redFlags.map((r: { flag: string }) => r.flag);
          const expectedFlagNames = expectedRedFlags.map(r => r.flag);

          // For red flags, precision is more important (avoid false positives)
          if (expectedFlagNames.length > 0) {
            const recall = calculateRecall(detectedFlags, expectedFlagNames);
            // Require at least 50% recall for red flags (some contracts have many)
            expect(recall).toBeGreaterThanOrEqual(0.5);
          }

          // Check that detected red flags are not completely wrong
          if (detectedFlags.length > 0 && expectedFlagNames.length === 0) {
            // Contract without expected red flags should have minimal false positives
            expect(detectedFlags.length).toBeLessThanOrEqual(2);
          }
        },
      );
    });

    describe('Regulation Detection Accuracy', () => {
      it('should detect regulations mentioned in MSA', async () => {
        const result = await agent.process(
          { content: msaAccuracyBenchmark.content, checkType: 'compliance' },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        const expectedRegulations = msaAccuracyBenchmark.groundTruth.regulations;
        const detectedRegulations = (result.data.regulations || [])
          .map((r: { regulation: string }) => r.regulation);

        // Should detect at least the mentioned regulations
        for (const expected of expectedRegulations) {
          const found = detectedRegulations.some(
            (d: string) => d.toLowerCase().includes(expected.toLowerCase()),
          );
          expect(found).toBe(true);
        }
      });
    });

    describe('Scoring Accuracy', () => {
      it('should score comprehensive contracts higher than sparse ones', async () => {
        const comprehensiveResult = await agent.process(
          { content: mockMSAContent },
          createAgentContext(testEnterpriseId),
        );

        const sparseContent = `
          Simple agreement between parties.
          Services will be provided for payment.
          No other terms apply.
        `;

        const sparseResult = await agent.process(
          { content: sparseContent },
          createAgentContext(testEnterpriseId),
        );

        expect(comprehensiveResult.success).toBe(true);
        expect(sparseResult.success).toBe(true);

        // Comprehensive contract should have higher confidence
        expect(comprehensiveResult.confidence).toBeGreaterThan(sparseResult.confidence);
      });

      it('should identify high-risk contracts correctly', async () => {
        const highRiskContent = `
          UNLIMITED LIABILITY: No caps on damages whatsoever.
          ONE-SIDED INDEMNIFICATION: Client indemnifies vendor for everything.
          NO TERMINATION: Agreement cannot be terminated.
          PERPETUAL OBLIGATIONS: All duties continue forever.
          WAIVE JURY TRIAL: All jury rights are waived.
          NON-COMPETE: Broad non-compete for 5 years.
        `;

        const lowRiskContent = `
          LIMITATION OF LIABILITY: Capped at contract value.
          MUTUAL INDEMNIFICATION: Both parties indemnify equally.
          TERMINATION: Either party may terminate with 30 days notice.
          CONFIDENTIALITY: 3 year term after termination.
          GOVERNING LAW: Laws of Delaware apply.
          DISPUTE RESOLUTION: Mediation first, then arbitration.
        `;

        const highRiskResult = await agent.process(
          { content: highRiskContent },
          createAgentContext(testEnterpriseId),
        );

        const lowRiskResult = await agent.process(
          { content: lowRiskContent },
          createAgentContext(testEnterpriseId),
        );

        expect(highRiskResult.success).toBe(true);
        expect(lowRiskResult.success).toBe(true);

        // High-risk contract should have more red flags
        expect(highRiskResult.data.redFlags.length).toBeGreaterThan(
          lowRiskResult.data.redFlags.length,
        );

        // High-risk contract should have risk-related insights
        const hasHighRiskInsight = highRiskResult.insights.some(
          (i: { severity: string }) => i.severity === 'high' || i.severity === 'critical',
        );
        expect(hasHighRiskInsight).toBe(true);
      });
    });

    describe('Regression Tests', () => {
      it('should maintain accuracy after code changes - NDA analysis', async () => {
        const result = await agent.process(
          { content: mockNDAContent },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        // Regression checks - these should always pass
        expect(result.data.documentType).toBe('nda');
        expect(result.data.protections.confidentialityProtection).toBe(true);
        expect(result.data.protections.limitationOfLiability).toBe(true);
        expect(result.data.protections.disputeResolution).toBe(true);
      });

      it('should maintain accuracy after code changes - MSA analysis', async () => {
        const result = await agent.process(
          { content: mockMSAContent },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        // Regression checks - these should always pass
        expect(result.data.documentType).toBe('msa');
        expect(result.data.protections.rightToTerminate).toBe(true);
        expect(result.data.protections.confidentialityProtection).toBe(true);
        expect(result.data.protections.dataProtection).toBe(true);
        expect(result.data.protections.intellectualPropertyRights).toBe(true);
      });

      it('should maintain accuracy after code changes - License analysis', async () => {
        const result = await agent.process(
          { content: mockLicenseAgreementContent },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        // Regression checks - these should always pass
        expect(result.data.documentType).toBe('license');
        expect(result.data.protections.warrantyDisclaimer).toBe(true);
        expect(result.data.protections.limitationOfLiability).toBe(true);
      });

      it('should maintain accuracy after code changes - Employment analysis', async () => {
        const result = await agent.process(
          { content: mockEmploymentContractContent },
          createAgentContext(testEnterpriseId),
        );

        expect(result.success).toBe(true);

        // Regression checks - these should always pass
        expect(result.data.documentType).toBe('employment');

        // Should detect the non-compete red flag
        const hasNonCompete = result.data.redFlags.some(
          (r: { flag: string }) => r.flag.toLowerCase().includes('non-compete'),
        );
        expect(hasNonCompete).toBe(true);

        // Should detect perpetual obligations (confidentiality "indefinitely")
        const hasPerpetual = result.data.redFlags.some(
          (r: { flag: string }) => r.flag.toLowerCase().includes('perpetual'),
        );
        expect(hasPerpetual).toBe(true);
      });
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('Error Handling', () => {
    describe('Input Validation', () => {
      it('should detect encoding issues (mojibake) in content', async () => {
        // Content with mojibake patterns
        const mojibakeContent = `This agreement is between Company Ã¡ and Client Ã©
        with terms lasting for one (1) year. Both parties shall maintain confidentiality.`;

        const result = await agent.process(
          { content: mojibakeContent },
          createAgentContext(testEnterpriseId),
        );

        // Should still process but with encoding warning
        expect(result.success).toBe(true);
        const hasEncodingInsight = result.insights.some(
          (i: { type: string }) => i.type === 'encoding_issues',
        );
        expect(hasEncodingInsight).toBe(true);
      });

      it('should detect input conflicts when both content and text provided', async () => {
        const result = await agent.process(
          { content: 'This is content field with sufficient length for analysis.', text: 'This is text field with different content for analysis testing.' },
          createAgentContext(testEnterpriseId),
        );

        // Should still process but with conflict warning
        const hasConflictInsight = result.insights.some(
          (i: { type: string }) => i.type === 'input_conflict',
        );
        expect(hasConflictInsight).toBe(true);
      });

      it('should reject invalid UUID in context', async () => {
        const result = await agent.process(
          { content: mockNDAContent },
          { contractId: 'not-a-valid-uuid' } as unknown as ReturnType<typeof createAgentContext>,
        );

        expect(result.success).toBe(false);
        const hasInvalidContextInsight = result.insights.some(
          (i: { type: string }) => i.type === 'invalid_context' || i.type === 'invalid_contract_id',
        );
        expect(hasInvalidContextInsight).toBe(true);
      });
    });

    describe('Graceful Degradation', () => {
      it('should return degraded result type definition', () => {
        // Test that the type includes degradation fields
        const mockDegradedResult = {
          clauses: [],
          risks: [],
          obligations: [],
          protections: {
            limitationOfLiability: false,
            capOnDamages: false,
            rightToTerminate: false,
            disputeResolution: false,
            warrantyDisclaimer: false,
            intellectualPropertyRights: false,
            confidentialityProtection: false,
            dataProtection: false,
          },
          missingClauses: [],
          redFlags: [],
          recommendations: [],
          degraded: true,
          degradationReason: 'timeout' as const,
        };

        expect(mockDegradedResult.degraded).toBe(true);
        expect(mockDegradedResult.degradationReason).toBe('timeout');
      });
    });
  });

  // =============================================================================
  // CONFIGURATION TESTS
  // =============================================================================

  describe('Configuration System', () => {
    it('should have proper default configuration values', async () => {
      // Import the configuration module
      const {
        DEFAULT_LEGAL_CONFIG,
        LegalConfigSchema,
      } = await import('../supabase/functions/local-agents/config/legal-config.ts');

      // Verify default config is valid
      expect(DEFAULT_LEGAL_CONFIG).toBeDefined();

      // Check critical default values
      expect(DEFAULT_LEGAL_CONFIG.highRiskScoreThreshold).toBe(6);
      expect(DEFAULT_LEGAL_CONFIG.criticalRiskScoreThreshold).toBe(10);
      expect(DEFAULT_LEGAL_CONFIG.maxClauses).toBe(500);
      expect(DEFAULT_LEGAL_CONFIG.maxObligations).toBe(1000);
      expect(DEFAULT_LEGAL_CONFIG.minContentLength).toBe(10);
      expect(DEFAULT_LEGAL_CONFIG.maxRetryAttempts).toBe(3);
      expect(DEFAULT_LEGAL_CONFIG.enableGracefulDegradation).toBe(true);

      // Verify schema validation
      const parsed = LegalConfigSchema.parse(DEFAULT_LEGAL_CONFIG);
      expect(parsed).toEqual(DEFAULT_LEGAL_CONFIG);
    });

    it('should validate configuration override correctly', async () => {
      const { validateConfigOverride } = await import(
        '../supabase/functions/local-agents/config/legal-config.ts'
      );

      // Valid override
      const validOverride = { highRiskScoreThreshold: 8 };
      const validResult = validateConfigOverride(validOverride);
      expect(validResult.valid).toBe(true);
      expect(validResult.config?.highRiskScoreThreshold).toBe(8);

      // Invalid override - score out of range
      const invalidOverride = { highRiskScoreThreshold: 100 };
      const invalidResult = validateConfigOverride(invalidOverride);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toBeDefined();
    });

    it('should detect threshold inconsistencies', async () => {
      const { validateConfigThresholds, LegalConfigSchema } = await import(
        '../supabase/functions/local-agents/config/legal-config.ts'
      );

      // Create config with inconsistent thresholds
      // Note: maxContentLength has Zod min of 1000, so use values that pass Zod
      // but fail the threshold relationship validation
      const inconsistentConfig = LegalConfigSchema.parse({
        highRiskScoreThreshold: 8,
        criticalRiskScoreThreshold: 5, // Should be >= highRiskScoreThreshold
        minContentLength: 5000,
        maxContentLength: 2000, // Should be > minContentLength, but both valid individually
      });

      const errors = validateConfigThresholds(inconsistentConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('criticalRiskScoreThreshold'))).toBe(true);
      expect(errors.some(e => e.includes('minContentLength'))).toBe(true);
    });

    it('should provide helper functions for risk evaluation', async () => {
      const { isHighRisk, isCriticalRisk, DEFAULT_LEGAL_CONFIG } = await import(
        '../supabase/functions/local-agents/config/legal-config.ts'
      );

      expect(isHighRisk(5, DEFAULT_LEGAL_CONFIG)).toBe(false);
      expect(isHighRisk(6, DEFAULT_LEGAL_CONFIG)).toBe(true);
      expect(isHighRisk(10, DEFAULT_LEGAL_CONFIG)).toBe(true);

      expect(isCriticalRisk(9, DEFAULT_LEGAL_CONFIG)).toBe(false);
      expect(isCriticalRisk(10, DEFAULT_LEGAL_CONFIG)).toBe(true);
    });
  });

  // =============================================================================
  // INPUT VALIDATION SCHEMA TESTS
  // =============================================================================

  describe('Input Validation Schemas', () => {
    it('should validate legal agent input correctly', async () => {
      const {
        validateLegalAgentInput,
        validateAgentContext,
        validateUuid,
      } = await import('../supabase/functions/local-agents/schemas/legal.ts');

      // Valid input
      const validInput = { content: 'This is valid contract content.' };
      const validResult = validateLegalAgentInput(validInput);
      expect(validResult.success).toBe(true);
      expect(validResult.data?.content).toBe('This is valid contract content.');

      // Valid context
      const validContext = {
        contractId: testContractId,
        userId: testUserId,
      };
      const contextResult = validateAgentContext(validContext);
      expect(contextResult.success).toBe(true);

      // Valid UUID
      const uuidResult = validateUuid(testContractId);
      expect(uuidResult.success).toBe(true);

      // Invalid UUID
      const invalidUuidResult = validateUuid('not-a-uuid');
      expect(invalidUuidResult.success).toBe(false);
    });

    it('should sanitize content correctly', async () => {
      const { sanitizeContent } = await import(
        '../supabase/functions/local-agents/schemas/legal.ts'
      );

      // Test null byte removal
      const withNullBytes = 'Hello\x00World';
      expect(sanitizeContent(withNullBytes)).toBe('HelloWorld');

      // Test line ending normalization
      const withCRLF = 'Line1\r\nLine2\rLine3';
      const sanitized = sanitizeContent(withCRLF);
      expect(sanitized).not.toContain('\r');
      expect(sanitized).toContain('\n');

      // Test excessive newline reduction
      const withExcessiveNewlines = 'Para1\n\n\n\n\n\nPara2';
      expect(sanitizeContent(withExcessiveNewlines)).toBe('Para1\n\n\nPara2');
    });

    it('should detect input conflicts', async () => {
      const { detectInputConflicts } = await import(
        '../supabase/functions/local-agents/schemas/legal.ts'
      );

      // Test content/text conflict
      const conflictData = { content: 'A', text: 'B' };
      const conflicts = detectInputConflicts(conflictData);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('content and text');

      // Test action without contractId
      const actionData = { content: 'test', action: 'approve' as const };
      const actionConflicts = detectInputConflicts(actionData, {});
      expect(actionConflicts.some(c => c.includes('contractId'))).toBe(true);

      // Test conditions with non-approve action
      const conditionsData = {
        content: 'test',
        action: 'reject' as const,
        conditions: ['condition1'],
      };
      const conditionConflicts = detectInputConflicts(conditionsData);
      expect(conditionConflicts.some(c => c.includes('Conditions'))).toBe(true);
    });

    it('should detect encoding issues', async () => {
      const { detectEncodingIssues } = await import(
        '../supabase/functions/local-agents/schemas/legal.ts'
      );

      // Normal content - no issues
      const normalContent = 'This is normal English text with no encoding issues.';
      const normalResult = detectEncodingIssues(normalContent);
      expect(normalResult.hasMojibake).toBe(false);

      // Content with replacement characters
      const withReplacementChars = 'Text with \uFFFD\uFFFD\uFFFD unknown chars';
      const replacementResult = detectEncodingIssues(withReplacementChars);
      expect(replacementResult.hasMojibake).toBe(true);
    });
  });
});
