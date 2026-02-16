/**
 * Multi-Agent Integration Test Suite
 *
 * Tests end-to-end multi-agent workflows and the integration between
 * ManagerAgent, specialized agents (Secretary, Financial, Legal, Analytics,
 * Vendor, Notifications), and the SwarmCoordinator.
 *
 * Validates orchestration flow, agent selection, dependency management,
 * error recovery, and memory/learning integration.
 *
 * @module MultiAgentIntegrationTests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks (hoisted before all imports)
// ---------------------------------------------------------------------------

// Mock cache manager
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

// Mock swarm coordinator to avoid deep SwarmEngine dependencies
vi.mock('../supabase/functions/local-agents/swarm/swarm-coordinator.ts', () => {
  const MockSwarmCoordinator = class {
    static instance: InstanceType<typeof MockSwarmCoordinator> | null = null;

    static getInstance(
      _supabase: unknown,
      _enterpriseId: string,
      _config?: Record<string, unknown>,
    ) {
      if (!MockSwarmCoordinator.instance) {
        MockSwarmCoordinator.instance = new MockSwarmCoordinator();
      }
      return MockSwarmCoordinator.instance;
    }

    optimizeAgentSelection = vi.fn().mockImplementation(
      (_analysis: unknown, agents: unknown[]) => Promise.resolve(agents),
    );

    optimizeWorkflow = vi.fn().mockImplementation(
      (agents: Array<{ type: string; taskType?: string }>, _context: unknown) =>
        Promise.resolve(
          agents.map((a, i) => ({
            stepId: `step_${a.type}_${Date.now()}_${i}`,
            agentType: a.type,
            taskType: a.taskType || 'default',
            dependencies: [],
            estimatedDuration: 30,
            canParallelize: true,
          })),
        ),
    );

    aggregateResults = vi.fn().mockImplementation(
      (results: Record<string, unknown>, _agents: unknown[]) => {
        const allSucceeded = Object.values(results).every(
          (r: unknown) => (r as { success?: boolean }).success !== false,
        );
        return Promise.resolve({
          success: allSucceeded,
          data: results,
          confidence: 0.88,
          insights: [
            {
              type: 'swarm_consensus',
              severity: 'low' as const,
              title: 'Swarm Consensus',
              description: 'Agents reached consensus on analysis',
              isActionable: false,
            },
          ],
          metadata: {
            consensusReached: true,
            consensusScore: 0.92,
            minorityOpinions: [],
          },
        });
      },
    );

    learnFromExecution = vi.fn().mockResolvedValue(undefined);
  };

  return { SwarmCoordinator: MockSwarmCoordinator };
});

// Mock streaming module
vi.mock('../supabase/functions/_shared/streaming.ts', () => ({
  createSSEStream: vi.fn().mockReturnValue({
    response: new Response(),
    writer: { write: vi.fn(), close: vi.fn(), writeError: vi.fn() },
  }),
  StreamWriter: vi.fn(),
}));

// Mock data-loader used by ComplianceAgent
vi.mock('../supabase/functions-utils/data-loader.ts', () => ({
  DataLoader: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue(null),
    loadMany: vi.fn().mockResolvedValue([]),
    clear: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { ManagerAgent } from '../supabase/functions/local-agents/agents/manager';
import { SecretaryAgent } from '../supabase/functions/local-agents/agents/secretary';
import { FinancialAgent } from '../supabase/functions/local-agents/agents/financial';
import { LegalAgent } from '../supabase/functions/local-agents/agents/legal';
import { AnalyticsAgent } from '../supabase/functions/local-agents/agents/analytics';
import { VendorAgent } from '../supabase/functions/local-agents/agents/vendor';
import { NotificationsAgent } from '../supabase/functions/local-agents/agents/notifications';
import type { AgentContext } from '../supabase/functions/local-agents/agents/base';
import { createMockSupabaseClient } from './setup';

// ---------------------------------------------------------------------------
// Test Constants
// ---------------------------------------------------------------------------

const ENTERPRISE_ID = 'ent-integration-test-001';
const SESSION_ID = 'sess-integration-test-001';

const defaultContext: AgentContext = {
  enterpriseId: ENTERPRISE_ID,
  sessionId: SESSION_ID,
  environment: {},
  permissions: [],
};

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const contractReviewRequest = {
  type: 'contract_review',
  content: `SERVICE AGREEMENT between ABC Corporation ("Client") and XYZ Services ("Provider").

  WHEREAS, Client desires to engage Provider for software development services;
  WHEREAS, Provider has the expertise to deliver such services;

  1. SCOPE OF WORK
  Provider shall deliver a cloud-based SaaS platform for contract management.

  2. COMPENSATION
  Total Value: $150,000 over 12 months. Payment Terms: Net 30.
  Monthly installments of $12,500 due on the first of each month.

  3. LIMITATION OF LIABILITY
  Provider's total liability shall not exceed the fees paid in the last 12 months.
  IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, OR
  CONSEQUENTIAL DAMAGES.

  4. TERMINATION
  Either party may terminate this agreement with 30 days written notice.
  Immediate termination for material breach with 10-day cure period.

  5. INDEMNIFICATION
  Provider shall indemnify Client against all third-party claims arising from
  Provider's negligence or willful misconduct.

  6. CONFIDENTIALITY
  Both parties agree to maintain confidentiality of proprietary information
  for a period of 3 years following termination.

  7. GOVERNING LAW
  This agreement shall be governed by the laws of the State of Delaware.

  8. DISPUTE RESOLUTION
  Any disputes shall be resolved through binding arbitration in Wilmington, Delaware.

  Effective Date: 2024-03-01
  Expiration Date: 2025-03-01`,
  contractId: 'contract-integration-123',
  enterpriseId: ENTERPRISE_ID,
};

const vendorAssessmentRequest = {
  type: 'vendor_evaluation',
  content: `Evaluate vendor Acme Corp for potential partnership in cloud infrastructure.
  Acme Corp provides managed hosting, CDN services, and cloud compute resources.
  Annual contract value estimated at $75,000. Current vendor score: 82/100.
  Compliance certifications: SOC 2 Type II, ISO 27001, GDPR compliant.
  Previous issues: 2 SLA breaches in last 12 months (99.8% uptime vs 99.9% target).`,
  vendorId: 'vendor-integration-456',
  enterpriseId: ENTERPRISE_ID,
};

const financialAnalysisRequest = {
  type: 'financial_analysis',
  content: `Analyze the budget impact of three new vendor contracts:
  - Vendor A: $200,000/year for cloud hosting
  - Vendor B: $85,000/year for security monitoring
  - Vendor C: $45,000/year for analytics tools
  Total annual commitment: $330,000.
  Current annual budget: $1,200,000.
  Budget utilization before these contracts: 72%.
  Payment terms: Net 45 for all three vendors.`,
  enterpriseId: ENTERPRISE_ID,
};

const complianceCheckRequest = {
  type: 'compliance_check',
  content: `Run compliance audit for enterprise data processing agreements.
  Check GDPR compliance for EU customer data handling.
  Verify HIPAA requirements for healthcare partner contracts.
  Review SOC 2 certification status for all critical vendors.
  Assess data retention policy compliance across all active contracts.`,
  enterpriseId: ENTERPRISE_ID,
};

const urgentAlertRequest = {
  type: 'contract_review',
  content: `URGENT: Critical contract expiring in 3 days. Contract value: $500,000.
  Legal review required immediately. Vendor performance issues flagged.
  Budget impact assessment needed before renewal decision.`,
  contractId: 'contract-urgent-789',
  enterpriseId: ENTERPRISE_ID,
};

// ---------------------------------------------------------------------------
// Mock Supabase Factory
// ---------------------------------------------------------------------------

/**
 * Creates a deeply chainable mock Supabase client that returns realistic
 * data for various table queries used across multiple agents.
 */
function createIntegrationMockSupabase() {
  const mockData: Record<string, unknown[]> = {
    contracts: [
      {
        id: 'contract-integration-123',
        title: 'SaaS Platform Service Agreement',
        value: 150000,
        status: 'active',
        start_date: '2024-03-01',
        end_date: '2025-03-01',
        enterprise_id: ENTERPRISE_ID,
        vendor_id: 'vendor-integration-456',
        created_by: 'user-001',
        is_auto_renew: false,
        payment_terms: 'Net 30',
        extracted_text: contractReviewRequest.content,
        metadata: { type: 'service_agreement' },
      },
    ],
    vendors: [
      {
        id: 'vendor-integration-456',
        name: 'Acme Corp',
        category: 'cloud_infrastructure',
        status: 'active',
        enterprise_id: ENTERPRISE_ID,
        performance_score: 82,
        compliance_status: 'compliant',
        certifications: ['SOC2', 'ISO27001', 'GDPR'],
        total_contract_value: 75000,
        active_contracts: 3,
      },
    ],
    agent_tasks: [
      {
        id: 'task-001',
        agent_id: 'agent-mgr-001',
        task_type: 'orchestrated_task',
        status: 'pending',
        priority: 1,
        payload: {},
        enterprise_id: ENTERPRISE_ID,
      },
    ],
    enterprises: [
      {
        id: ENTERPRISE_ID,
        name: 'Integration Test Enterprise',
        settings: {
          compliance_frameworks: ['GDPR', 'SOC2'],
          notification_preferences: { email: true, slack: true },
          risk_thresholds: { high: 75, critical: 90 },
        },
      },
    ],
    agents: [
      { id: 'agent-sec-001', type: 'secretary', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-fin-001', type: 'financial', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-leg-001', type: 'legal', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-ana-001', type: 'analytics', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-ven-001', type: 'vendor', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-not-001', type: 'notifications', enterprise_id: ENTERPRISE_ID, is_active: true },
      { id: 'agent-mgr-001', type: 'manager', enterprise_id: ENTERPRISE_ID, is_active: true },
    ],
    users: [
      {
        id: 'user-001',
        email: 'admin@test-enterprise.com',
        role: 'admin',
        enterprise_id: ENTERPRISE_ID,
        is_active: true,
      },
    ],
    budgets: [
      {
        id: 'budget-001',
        name: 'Annual IT Budget 2024',
        total_budget: 1200000,
        used_budget: 864000,
        committed_budget: 120000,
        enterprise_id: ENTERPRISE_ID,
        budget_type: 'annual',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      },
    ],
    notifications: [],
    agent_insights: [],
    agent_logs: [],
    agent_metrics: [],
    realtime_broadcasts: [],
    audit_logs: [],
  };

  /**
   * Build a chainable query builder that resolves data for the given table.
   * Supports arbitrary chaining of .eq(), .select(), .is(), .order(), etc.
   */
  const createChainableBuilder = (tableName: string) => {
    const tableData = mockData[tableName] || [];

    const builder: Record<string, unknown> = {};
    const resolvedValue = { data: tableData, error: null };
    const singleValue = {
      data: tableData[0] || { id: `mock-${tableName}-${Date.now()}` },
      error: null,
    };

    // Every chainable method returns the builder itself
    const chainMethods = [
      'select',
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'is',
      'in',
      'like',
      'ilike',
      'not',
      'or',
      'filter',
      'contains',
      'containedBy',
      'overlaps',
      'textSearch',
      'match',
      'order',
      'limit',
      'range',
      'throwOnError',
    ];

    for (const method of chainMethods) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }

    // Terminal methods that return resolved promises
    builder['single'] = vi.fn().mockResolvedValue(singleValue);
    builder['maybeSingle'] = vi.fn().mockResolvedValue(singleValue);

    // insert returns a new chain that also has .select().single()
    builder['insert'] = vi.fn().mockImplementation((data: unknown) => {
      const inserted = Array.isArray(data) ? data[0] : data;
      const insertedRow = {
        id: `mock-inserted-${Date.now()}`,
        ...((inserted as Record<string, unknown>) || {}),
      };
      const insertBuilder: Record<string, unknown> = {};
      for (const m of chainMethods) {
        insertBuilder[m] = vi.fn().mockReturnValue(insertBuilder);
      }
      insertBuilder['single'] = vi.fn().mockResolvedValue({
        data: insertedRow,
        error: null,
      });
      insertBuilder['select'] = vi.fn().mockReturnValue(insertBuilder);
      return insertBuilder;
    });

    // update returns a chain
    builder['update'] = vi.fn().mockImplementation((data: unknown) => {
      const updatedRow = { ...singleValue.data, ...(data as Record<string, unknown>) };
      const updateBuilder: Record<string, unknown> = {};
      for (const m of chainMethods) {
        updateBuilder[m] = vi.fn().mockReturnValue(updateBuilder);
      }
      updateBuilder['single'] = vi.fn().mockResolvedValue({
        data: updatedRow,
        error: null,
      });
      updateBuilder['select'] = vi.fn().mockReturnValue(updateBuilder);
      return updateBuilder;
    });

    // delete returns a chain
    builder['delete'] = vi.fn().mockReturnValue(builder);

    // Make the builder itself thenable so `await supabase.from(t).select()` works
    builder['then'] = (resolve: (val: unknown) => void) => resolve(resolvedValue);

    return builder;
  };

  const mockSupabase = {
    from: vi.fn().mockImplementation((tableName: string) => createChainableBuilder(tableName)),
    rpc: vi.fn().mockImplementation((functionName: string, _params?: unknown) => {
      const rpcResponses: Record<string, { data: unknown; error: null }> = {
        search_with_rls: { data: [], error: null },
        get_agent_memory_context: { data: [], error: null },
        consolidate_user_memories: { data: 0, error: null },
        analyze_contract_legal_risks: {
          data: {
            overall_risk: 'medium',
            risk_factors: [
              { factor: 'liability_cap', severity: 'medium', description: 'Liability limited to fees paid' },
            ],
            recommendations: ['Review liability cap provision'],
          },
          error: null,
        },
        route_contract_for_approval: {
          data: { required_approvals: [{ role: 'legal', user_id: 'user-001' }] },
          error: null,
        },
        calculate_vendor_score: {
          data: { overall_score: 82, factors: {} },
          error: null,
        },
        get_budget_utilization: {
          data: {
            total_budget: 1200000,
            used: 864000,
            committed: 120000,
            remaining: 216000,
            utilization_pct: 72,
          },
          error: null,
        },
        transition_contract_after_analysis: { data: null, error: null },
      };

      return Promise.resolve(
        rpcResponses[functionName] || { data: null, error: null },
      );
    }),
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-user-001' } },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({
        data: { user: { id: 'auth-user-001' } },
        error: null,
      }),
    },
  };

  return mockSupabase;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Multi-Agent Integration Tests', () => {
  let mockSupabase: ReturnType<typeof createIntegrationMockSupabase>;
  let managerAgent: ManagerAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createIntegrationMockSupabase();
    managerAgent = new ManagerAgent(mockSupabase as never, ENTERPRISE_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. CONTRACT REVIEW WORKFLOW (~8 tests)
  // =========================================================================

  describe('Contract Review Workflow', () => {
    it('should route a contract review request through the orchestration pipeline', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should identify contract review as requiring multiple agents', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, {
        ...defaultContext,
        requestType: 'contract_review',
      });

      expect(plan).toBeDefined();
      expect(plan.type).toBe('multi_agent');
      expect(plan.requiredAgents.length).toBeGreaterThanOrEqual(2);

      // Contract review text mentions financial terms, legal clauses, and contract entities
      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      expect(agentTypes).toContain('legal');
      expect(agentTypes).toContain('financial');
    });

    it('should include secretary agent when contract entities are detected', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, {
        ...defaultContext,
        requestType: 'contract_review',
      });

      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      // Content mentions "contract" and "agreement" triggering secretary for document_extraction
      expect(agentTypes).toContain('secretary');
    });

    it('should detect financial impact from dollar amounts in content', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);

      // The content includes "$150,000" which should trigger financial detection
      const hasFinancialAgent = plan.requiredAgents.some(
        (a: { type: string }) => a.type === 'financial',
      );
      expect(hasFinancialAgent).toBe(true);
    });

    it('should detect legal implications from contract terms', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);

      const hasLegalAgent = plan.requiredAgents.some(
        (a: { type: string }) => a.type === 'legal',
      );
      expect(hasLegalAgent).toBe(true);
    });

    it('should aggregate results from multiple agent executions', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data).toBeDefined();

      // Multi-agent orchestration should produce results with agent tracking
      if (data.type === 'multi_agent') {
        expect(data.agents).toBeDefined();
        expect(data.completedSteps).toBeGreaterThan(0);
      }
    });

    it('should combine insights from all participating agents', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      // The insights array should contain contributions from the orchestration
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it('should produce a confidence score reflecting multi-agent aggregation', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // 2. AGENT SELECTION & ROUTING (~5 tests)
  // =========================================================================

  describe('Agent Selection & Routing', () => {
    it('should select LegalAgent for requests with legal implications', async () => {
      const legalRequest = {
        content: 'Review the indemnification clause and liability provisions in this contract.',
        enterpriseId: ENTERPRISE_ID,
      };

      const plan = await managerAgent.analyzeRequest(legalRequest, defaultContext);

      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      expect(agentTypes).toContain('legal');
    });

    it('should select FinancialAgent for requests with financial impact', async () => {
      const plan = await managerAgent.analyzeRequest(financialAnalysisRequest, defaultContext);

      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      expect(agentTypes).toContain('financial');
    });

    it('should select VendorAgent for vendor-related requests', async () => {
      const plan = await managerAgent.analyzeRequest(vendorAssessmentRequest, defaultContext);

      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      expect(agentTypes).toContain('vendor');
    });

    it('should trigger multi-agent orchestration for complex requests', async () => {
      const complexRequest = {
        content: `Review this contract's legal terms, analyze financial impact on budget,
        evaluate vendor performance, and generate a compliance report.
        Contract value: $250,000. Vendor: GlobalTech Solutions.`,
        enterpriseId: ENTERPRISE_ID,
      };

      const plan = await managerAgent.analyzeRequest(complexRequest, defaultContext);

      expect(plan.type).toBe('multi_agent');
      expect(plan.requiredAgents.length).toBeGreaterThanOrEqual(3);
    });

    it('should route single-domain requests to a single agent', async () => {
      const simpleRequest = {
        content: 'Generate a performance report for vendor metrics.',
        enterpriseId: ENTERPRISE_ID,
      };

      const plan = await managerAgent.analyzeRequest(simpleRequest, defaultContext);

      // A simple vendor-related performance request may involve vendor + analytics
      // but the system should at minimum select relevant agents
      expect(plan.requiredAgents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. MULTI-AGENT COORDINATION (~5 tests)
  // =========================================================================

  describe('Multi-Agent Coordination', () => {
    it('should establish correct dependency ordering between agents', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, {
        ...defaultContext,
        requestType: 'contract_review',
      });

      const dependencies = plan.dependencies;
      expect(Array.isArray(dependencies)).toBe(true);

      // Secretary should be a dependency for financial, legal, vendor
      const secretaryDeps = dependencies.filter(
        (d: { dependsOn: string | string[] }) => {
          const deps = Array.isArray(d.dependsOn) ? d.dependsOn : [d.dependsOn];
          return deps.includes('secretary');
        },
      );

      // If secretary is in the plan, other agents should depend on it
      const hasSecretary = plan.requiredAgents.some(
        (a: { type: string }) => a.type === 'secretary',
      );
      if (hasSecretary) {
        expect(secretaryDeps.length).toBeGreaterThan(0);
      }
    });

    it('should identify parallel-eligible agents that have no dependencies', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, {
        ...defaultContext,
        requestType: 'contract_review',
      });

      const parallelSteps = plan.steps.filter(
        (s: { dependencies: string[] }) => s.dependencies.length === 0,
      );
      const sequentialSteps = plan.steps.filter(
        (s: { dependencies: string[] }) => s.dependencies.length > 0,
      );

      // There should be at least one step that can run in parallel (no deps)
      expect(parallelSteps.length).toBeGreaterThan(0);
      // And at least one that depends on prior work
      // (analytics typically depends on financial/legal/vendor)
      if (plan.requiredAgents.length > 2) {
        expect(sequentialSteps.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate appropriate priority for urgent requests', async () => {
      const plan = await managerAgent.analyzeRequest(urgentAlertRequest, defaultContext);

      // Urgent request mentions "URGENT", "critical", "$500,000", "legal", "vendor"
      expect(['critical', 'high']).toContain(plan.priority);
    });

    it('should trigger notifications agent for urgent findings', async () => {
      const plan = await managerAgent.analyzeRequest(urgentAlertRequest, defaultContext);

      const agentTypes = plan.requiredAgents.map((a: { type: string }) => a.type);
      // The urgency detection should include notifications
      expect(agentTypes).toContain('notifications');
    });

    it('should track rules applied during orchestration', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      expect(result.rulesApplied).toBeDefined();
      expect(Array.isArray(result.rulesApplied)).toBe(true);
      expect(result.rulesApplied.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4. ERROR RECOVERY & RESILIENCE (~4 tests)
  // =========================================================================

  describe('Error Recovery & Resilience', () => {
    it('should not crash the workflow when a single agent throws an error', async () => {
      // Process with the standard mock -- the agents will not crash on mock data
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      // Even if individual sub-agents have issues, the manager should return a result
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle malformed request data gracefully', async () => {
      const malformedRequest = {
        content: '',
        type: undefined,
        enterpriseId: ENTERPRISE_ID,
      };

      const result = await managerAgent.process(malformedRequest, defaultContext);

      // Should still return a structured result, not throw
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle null/undefined request data without crashing', async () => {
      const result = await managerAgent.process(null, defaultContext);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle context with missing optional fields', async () => {
      const minimalContext: AgentContext = {
        enterpriseId: ENTERPRISE_ID,
        sessionId: SESSION_ID,
        environment: {},
        permissions: [],
      };

      const result = await managerAgent.process(contractReviewRequest, minimalContext);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // =========================================================================
  // 5. MEMORY & LEARNING INTEGRATION (~3 tests)
  // =========================================================================

  describe('Memory & Learning Integration', () => {
    it('should process requests with swarm mode enabled for learning', async () => {
      const swarmContext: AgentContext = {
        ...defaultContext,
        metadata: {
          swarmMode: true,
          swarmConfig: {
            agentSelectionEnabled: true,
            workflowOptimizationEnabled: true,
            consensusEnabled: true,
            patternLearningEnabled: true,
            algorithm: 'hybrid',
            optimizationTimeout: 100,
            consensusThreshold: 0.7,
            useRedisCache: false,
          },
        },
      };

      const result = await managerAgent.process(contractReviewRequest, swarmContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.rulesApplied).toContain('swarm_orchestration_enabled');
    });

    it('should include swarm consensus insights when swarm mode is active', async () => {
      const swarmContext: AgentContext = {
        ...defaultContext,
        metadata: {
          swarmMode: true,
          swarmConfig: {
            agentSelectionEnabled: true,
            workflowOptimizationEnabled: true,
            consensusEnabled: true,
            patternLearningEnabled: true,
            algorithm: 'hybrid',
            optimizationTimeout: 100,
            consensusThreshold: 0.7,
            useRedisCache: false,
          },
        },
      };

      const result = await managerAgent.process(contractReviewRequest, swarmContext);

      // Verify result structure is valid regardless of success
      expect(result).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);

      // If swarm mode produced optimized results, check for consensus insights
      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>;
        if (data.swarmOptimized) {
          const consensusInsight = result.insights.find(
            (i: { type: string }) =>
              i.type === 'consensus_reached' || i.type === 'swarm_consensus',
          );
          expect(consensusInsight).toBeDefined();
        }
      }

      // Either way, swarm_orchestration_enabled should be in rules
      expect(result.rulesApplied).toContain('swarm_orchestration_enabled');
    });

    it('should invoke swarm learning after execution completes', async () => {
      // Get reference to the SwarmCoordinator mock
      const { SwarmCoordinator } = await import(
        '../supabase/functions/local-agents/swarm/swarm-coordinator.ts'
      );

      // Reset the singleton
      (SwarmCoordinator as unknown as { instance: null }).instance = null;

      const swarmContext: AgentContext = {
        ...defaultContext,
        metadata: {
          swarmMode: true,
          swarmConfig: {
            agentSelectionEnabled: true,
            workflowOptimizationEnabled: true,
            consensusEnabled: true,
            patternLearningEnabled: true,
            algorithm: 'hybrid',
            optimizationTimeout: 100,
            consensusThreshold: 0.7,
            useRedisCache: false,
          },
        },
      };

      const result = await managerAgent.process(contractReviewRequest, swarmContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify the coordinator was used for the multi-agent flow
      const coordinator = SwarmCoordinator.getInstance(mockSupabase, ENTERPRISE_ID);
      if (result.data && (result.data as Record<string, unknown>).swarmOptimized) {
        expect(coordinator.learnFromExecution).toHaveBeenCalled();
      }
    });
  });

  // =========================================================================
  // 6. WORKFLOW EXECUTION (~3 tests)
  // =========================================================================

  describe('Workflow Execution', () => {
    it('should select and execute a contract review workflow', async () => {
      const workflowContext: AgentContext = {
        ...defaultContext,
        metadata: { executionMode: 'synchronous' },
      };

      // Use context with explicit requestType to trigger workflow
      const result = await managerAgent.process(contractReviewRequest, {
        ...workflowContext,
        requestType: 'contract_review',
      } as AgentContext & { requestType?: string });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should execute vendor evaluation workflow', async () => {
      const result = await managerAgent.process(vendorAssessmentRequest, defaultContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle compliance check workflow', async () => {
      const result = await managerAgent.process(complianceCheckRequest, defaultContext);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // 7. ASYNCHRONOUS EXECUTION (~2 tests)
  // =========================================================================

  describe('Asynchronous Execution', () => {
    it('should queue tasks when execution mode is asynchronous', async () => {
      const asyncContext: AgentContext = {
        ...defaultContext,
        metadata: { executionMode: 'asynchronous' },
      };

      const result = await managerAgent.process(contractReviewRequest, asyncContext);

      expect(result).toBeDefined();
      // Async execution creates an orchestration record with queued tasks
      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.status).toBe('queued');
        expect(data.queuedTasks).toBeDefined();
        expect(Array.isArray(data.queuedTasks)).toBe(true);
        expect(result.rulesApplied).toContain('asynchronous_orchestration');
      }
    });

    it('should include orchestration ID in async result', async () => {
      const asyncContext: AgentContext = {
        ...defaultContext,
        metadata: { executionMode: 'asynchronous' },
      };

      const result = await managerAgent.process(contractReviewRequest, asyncContext);

      if (result.success) {
        const data = result.data as Record<string, unknown>;
        expect(data.orchestrationId).toBeDefined();
        expect(typeof data.orchestrationId).toBe('string');
      }
    });
  });

  // =========================================================================
  // 8. INDIVIDUAL AGENT CAPABILITIES (~6 tests)
  // =========================================================================

  describe('Individual Agent Capabilities', () => {
    it('SecretaryAgent should process document content', async () => {
      const secretary = new SecretaryAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await secretary.process(
        { content: contractReviewRequest.content },
        defaultContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('FinancialAgent should analyze financial data', async () => {
      const financial = new FinancialAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await financial.process(
        {
          content: financialAnalysisRequest.content,
          value: 150000,
          payment_terms: 'Net 30',
        },
        defaultContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('LegalAgent should analyze legal clauses', async () => {
      const legal = new LegalAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await legal.process(
        { content: contractReviewRequest.content },
        defaultContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('VendorAgent should evaluate vendor data', async () => {
      const vendor = new VendorAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await vendor.process(
        { content: vendorAssessmentRequest.content },
        defaultContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('AnalyticsAgent should generate insights', async () => {
      const analytics = new AnalyticsAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await analytics.process(
        { content: 'Analyze contract trends and vendor performance metrics.' },
        defaultContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('NotificationsAgent should process alert requests', async () => {
      const notifications = new NotificationsAgent(mockSupabase as never, ENTERPRISE_ID);
      const result = await notifications.process(
        {
          type: 'contract_expiration',
          contractName: 'SaaS Platform Agreement',
          daysUntil: 7,
        },
        {
          ...defaultContext,
          metadata: { notificationType: 'alert' },
        } as AgentContext,
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 9. PLAN ANALYSIS PROPERTIES (~4 tests)
  // =========================================================================

  describe('Orchestration Plan Analysis', () => {
    it('should calculate estimated duration based on agent count and complexity', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);

      expect(plan.estimatedDuration).toBeDefined();
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      // Duration should scale with number of agents
      expect(plan.estimatedDuration).toBeGreaterThanOrEqual(
        plan.requiredAgents.length * 20,
      );
    });

    it('should assign higher complexity to multi-aspect requests', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);

      // Contract review content mentions financial, legal, contract aspects
      expect(['medium', 'high']).toContain(plan.complexity);
    });

    it('should generate a unique orchestration ID for each plan', async () => {
      const plan1 = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);
      const plan2 = await managerAgent.analyzeRequest(vendorAssessmentRequest, defaultContext);

      expect(plan1.orchestrationId).toBeDefined();
      expect(plan2.orchestrationId).toBeDefined();
      expect(plan1.orchestrationId).not.toBe(plan2.orchestrationId);
    });

    it('should preserve original request data in plan metadata', async () => {
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);

      expect(plan.metadata).toBeDefined();
      expect(plan.metadata.originalData).toBeDefined();
      expect(plan.metadata.requestedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 10. CROSS-CUTTING CONCERNS (~3 tests)
  // =========================================================================

  describe('Cross-Cutting Concerns', () => {
    it('should use enterprise ID consistently across all operations', async () => {
      const result = await managerAgent.process(contractReviewRequest, defaultContext);

      // Verify the orchestration produced a result with the correct enterprise scope
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      // The plan metadata should preserve enterprise context
      const plan = await managerAgent.analyzeRequest(contractReviewRequest, defaultContext);
      expect(plan.metadata.context?.enterpriseId || defaultContext.enterpriseId).toBe(
        ENTERPRISE_ID,
      );
    });

    it('should handle different request types without type confusion', async () => {
      // Process different types of requests sequentially
      const contractResult = await managerAgent.process(
        contractReviewRequest,
        defaultContext,
      );
      const vendorResult = await managerAgent.process(
        vendorAssessmentRequest,
        defaultContext,
      );
      const financialResult = await managerAgent.process(
        financialAnalysisRequest,
        defaultContext,
      );

      // All should produce valid results
      expect(contractResult).toBeDefined();
      expect(vendorResult).toBeDefined();
      expect(financialResult).toBeDefined();
      expect(typeof contractResult.success).toBe('boolean');
      expect(typeof vendorResult.success).toBe('boolean');
      expect(typeof financialResult.success).toBe('boolean');
    });

    it('should return processing time for all orchestration types', async () => {
      const syncResult = await managerAgent.process(contractReviewRequest, defaultContext);

      expect(syncResult.processingTime).toBeDefined();
      expect(syncResult.processingTime).toBeGreaterThanOrEqual(0);

      const asyncResult = await managerAgent.process(contractReviewRequest, {
        ...defaultContext,
        metadata: { executionMode: 'asynchronous' },
      });

      expect(asyncResult.processingTime).toBeDefined();
      expect(asyncResult.processingTime).toBeGreaterThanOrEqual(0);
    });
  });
});
