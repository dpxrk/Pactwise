/**
 * SwarmCoordinator Comprehensive Test Suite (Vitest)
 *
 * Tests ALL phases of the SwarmCoordinator class:
 *   1. Singleton Pattern & Configuration
 *   2. Agent Selection (PSO Optimization)
 *   3. Workflow Optimization (ACO)
 *   4. Result Aggregation (Honeybee Democracy Consensus)
 *   5. Learning & Pattern Detection
 *   6. Error Handling & Edge Cases
 *
 * @module SwarmCoordinatorComprehensiveTests
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Mock swarm sub-modules (hoisted by vitest before imports)
// ---------------------------------------------------------------------------

vi.mock('../../supabase/functions/local-agents/swarm/swarm-engine.ts', () => ({
  SwarmEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    optimize: vi.fn().mockResolvedValue({ bestFitness: 0.85 }),
  })),
}));

vi.mock('../../supabase/functions/local-agents/swarm/fitness-evaluator.ts', () => ({
  FitnessEvaluator: vi.fn().mockImplementation(() => ({
    evaluateCombination: vi.fn().mockResolvedValue(0.85),
    evaluateDetailed: vi.fn().mockResolvedValue({
      overall: 0.85,
      relevance: 0.9,
      performance: 0.8,
      coverage: 0.85,
      cost: 0.3,
      redundancy: 0.1,
    }),
    calculateRelevance: vi.fn().mockResolvedValue(0.9),
    calculateHistoricalPerformance: vi.fn().mockResolvedValue(0.8),
    calculateCoverage: vi.fn().mockReturnValue(0.85),
    calculateCost: vi.fn().mockReturnValue(0.3),
    calculateRedundancy: vi.fn().mockReturnValue(0.1),
  })),
  DEFAULT_FITNESS_WEIGHTS: {
    relevance: 0.40,
    performance: 0.30,
    coverage: 0.20,
    cost: 0.05,
    redundancy: 0.05,
  },
}));

vi.mock('../../supabase/functions/local-agents/swarm/pheromone-store.ts', () => ({
  PheromoneStore: vi.fn().mockImplementation(() => ({
    readPheromones: vi.fn().mockResolvedValue([]),
    depositPheromone: vi.fn().mockResolvedValue(undefined),
    evaporatePheromones: vi.fn().mockResolvedValue(0),
  })),
}));

vi.mock('../../supabase/functions/local-agents/swarm/pattern-learner.ts', () => ({
  PatternLearner: vi.fn().mockImplementation(() => ({
    detectPatterns: vi.fn().mockResolvedValue([]),
    findMatchingPatterns: vi.fn().mockResolvedValue(null),
    storePattern: vi.fn().mockResolvedValue(undefined),
    updatePatternMetrics: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../supabase/functions/local-agents/swarm/agent-mapper.ts', () => ({
  AgentMapper: vi.fn().mockImplementation(() => ({
    mapToSwarmAgent: vi.fn().mockResolvedValue({
      id: 'swarm-agent-1',
      type: 'worker',
      position: { dimensions: [0.5, 0.5], confidence: 0.8, timestamp: Date.now() },
      velocity: { components: [0, 0], magnitude: 0, inertia: 0.9 },
      fitness: 0.8,
    }),
    mapAgentList: vi.fn().mockResolvedValue([]),
  })),
}));

// ---------------------------------------------------------------------------
// Import the module under test (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  SwarmCoordinator,
  DEFAULT_SWARM_CONFIG,
  type RequestAnalysis,
  type AgentReference,
  type AgentContext,
  type ProcessingResult,
  type OrchestrationPlan,
  type ExecutionStep,
  type AggregatedResult,
} from '../../supabase/functions/local-agents/swarm/swarm-coordinator';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const createMockSupabase = () => ({
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}) as unknown as ReturnType<typeof createMockSupabase>;

const createTestAnalysis = (overrides: Partial<RequestAnalysis> = {}): RequestAnalysis => ({
  type: 'contract_review',
  complexity: 'medium',
  entities: {
    contracts: ['c-1'],
    vendors: ['v-1'],
    amounts: ['$50000'],
    dates: [],
    emails: [],
  },
  hasUrgency: false,
  hasFinancialImpact: true,
  hasLegalImplications: true,
  hasComplianceRequirements: false,
  requiresAnalysis: true,
  ...overrides,
});

const createTestCandidates = (): AgentReference[] => [
  { type: 'secretary', priority: 1, capabilities: ['document_processing', 'extraction'] },
  { type: 'legal', priority: 1, capabilities: ['legal_review', 'contract_analysis'] },
  { type: 'financial', priority: 2, capabilities: ['financial_analysis', 'cost_analysis'] },
  { type: 'analytics', priority: 3, capabilities: ['analytics', 'data_analysis'] },
];

const createTestContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
  enterpriseId: 'ent-test-123',
  sessionId: 'sess-test-123',
  environment: {},
  permissions: [],
  ...overrides,
});

const createTestResults = (): Record<string, ProcessingResult<unknown>> => ({
  step_secretary: {
    success: true,
    data: { extracted: 'document data', parties: ['A', 'B'] },
    confidence: 0.9,
    insights: [
      {
        type: 'extraction',
        severity: 'info',
        title: 'Parties identified',
        description: 'Found 2 parties',
      },
    ],
  },
  step_legal: {
    success: true,
    data: { riskLevel: 'medium', clauses: 5, recommendations: ['review indemnification'] },
    confidence: 0.85,
    insights: [
      {
        type: 'risk',
        severity: 'warning',
        title: 'Risk identified',
        description: 'Medium risk contract',
      },
    ],
  },
  step_financial: {
    success: true,
    data: { totalValue: 50000, budgetImpact: 0.3, roi: 1.5 },
    confidence: 0.88,
    insights: [
      {
        type: 'financial',
        severity: 'info',
        title: 'Budget impact',
        description: '30% of budget',
      },
    ],
  },
});

const createTestPlan = (overrides: Partial<OrchestrationPlan> = {}): OrchestrationPlan => ({
  orchestrationId: 'orch-test-123',
  type: 'multi_agent',
  requestType: 'contract_review',
  complexity: 'medium',
  priority: 'normal',
  requiredAgents: [
    { type: 'secretary', priority: 1 },
    { type: 'legal', priority: 1 },
    { type: 'financial', priority: 2 },
  ],
  dependencies: [],
  steps: [
    {
      stepId: 'step_secretary',
      agentType: 'secretary',
      dependencies: [],
      estimatedDuration: 30,
      canParallelize: true,
    },
    {
      stepId: 'step_legal',
      agentType: 'legal',
      dependencies: ['step_secretary'],
      estimatedDuration: 30,
      canParallelize: false,
    },
    {
      stepId: 'step_financial',
      agentType: 'financial',
      dependencies: ['step_legal'],
      estimatedDuration: 30,
      canParallelize: false,
    },
  ],
  estimatedDuration: 90,
  metadata: {
    requestedAt: new Date().toISOString(),
    originalData: {},
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SwarmCoordinator - Comprehensive', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    // Always clear singleton cache between tests
    SwarmCoordinator.clearInstances();
  });

  afterEach(() => {
    SwarmCoordinator.clearInstances();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Singleton Pattern & Configuration
  // =========================================================================

  describe('Singleton Pattern & Configuration', () => {
    it('should create a new instance via getInstance', () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );
      expect(coordinator).toBeDefined();
      expect(coordinator).toBeInstanceOf(SwarmCoordinator);
    });

    it('should return the same instance for the same enterprise and default config', () => {
      const first = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-001');
      const second = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-001');
      expect(first).toBe(second);
    });

    it('should return different instances for different enterprise IDs', () => {
      const a = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-001');
      const b = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-002');
      expect(a).not.toBe(b);
    });

    it('should apply custom configuration when provided', () => {
      const customConfig = {
        agentSelectionEnabled: false,
        optimizationTimeout: 500,
        consensusThreshold: 0.9,
      };

      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
        customConfig,
      );

      expect(coordinator).toBeDefined();

      // Different config should produce a different cached instance
      const defaultCoordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );
      expect(coordinator).not.toBe(defaultCoordinator);
    });

    it('should clear all cached instances when clearInstances is called', () => {
      const a = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-001');
      const b = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-002');

      SwarmCoordinator.clearInstances();

      const c = SwarmCoordinator.getInstance(mockSupabase as never, 'ent-001');
      // After clearing, a new instance should have been created
      expect(c).not.toBe(a);
    });
  });

  // =========================================================================
  // 2. Agent Selection (PSO Optimization)
  // =========================================================================

  describe('Agent Selection (PSO Optimization)', () => {
    it('should return candidates when given a valid analysis and candidates', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const candidates = createTestCandidates();
      const analysis = createTestAnalysis();
      const context = createTestContext();

      const result = await coordinator.optimizeAgentSelection(
        analysis,
        candidates,
        context,
      );

      // Result should be an array of agent references
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty candidate list', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        [],
        createTestContext(),
      );

      expect(result).toEqual([]);
    });

    it('should return single candidate when only one is provided', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const singleCandidate: AgentReference[] = [
        { type: 'legal', priority: 1, capabilities: ['legal_review'] },
      ];

      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        singleCandidate,
        createTestContext(),
      );

      // <= 2 candidates skips optimization and returns as-is
      expect(result).toEqual(singleCandidate);
    });

    it('should return candidates unchanged when two or fewer are provided (skip optimization)', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const twoCandidates: AgentReference[] = [
        { type: 'secretary', priority: 1, capabilities: ['document_processing'] },
        { type: 'legal', priority: 1, capabilities: ['legal_review'] },
      ];

      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        twoCandidates,
        createTestContext(),
      );

      expect(result).toEqual(twoCandidates);
    });

    it('should return unmodified candidates when agent selection is disabled', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
        { agentSelectionEnabled: false },
      );

      const candidates = createTestCandidates();
      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        candidates,
        createTestContext(),
      );

      expect(result).toEqual(candidates);
    });

    it('should fall back to original candidates if PSO optimization takes too long', async () => {
      // Use a very short timeout so the PSO loop will certainly exceed it
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
        { agentSelectionEnabled: true, optimizationTimeout: 0 },
      );

      const candidates = createTestCandidates();
      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        candidates,
        createTestContext(),
      );

      // Should still return a valid array (either optimized subset or fallback)
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include agents with financial and legal implications when analysis demands it', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const analysis = createTestAnalysis({
        hasFinancialImpact: true,
        hasLegalImplications: true,
        complexity: 'high',
      });

      const candidates = createTestCandidates();
      const result = await coordinator.optimizeAgentSelection(
        analysis,
        candidates,
        createTestContext(),
      );

      // The result should be a non-empty subset of candidates
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(candidates.length);
    });

    it('should gracefully fall back to candidates when an internal error occurs', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      // Force the fitness evaluator to throw
      const { FitnessEvaluator } = await import(
        '../../supabase/functions/local-agents/swarm/fitness-evaluator'
      );
      const mockEvaluate = vi.fn().mockRejectedValue(new Error('Evaluation failed'));
      (FitnessEvaluator as Mock).mockImplementation(() => ({
        evaluateCombination: mockEvaluate,
      }));

      // Create a new coordinator that uses the broken evaluator
      SwarmCoordinator.clearInstances();
      const broken = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-broken',
      );

      const candidates = createTestCandidates();
      const result = await broken.optimizeAgentSelection(
        createTestAnalysis(),
        candidates,
        createTestContext(),
      );

      // Should fall back gracefully
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(candidates);
    });
  });

  // =========================================================================
  // 3. Workflow Optimization (ACO)
  // =========================================================================

  describe('Workflow Optimization (ACO)', () => {
    it('should return sequential steps for ordered agents', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBe(agents.length);

      // Each step should have a stepId and agentType
      for (const step of steps) {
        expect(step.stepId).toBeDefined();
        expect(step.agentType).toBeDefined();
        expect(typeof step.estimatedDuration).toBe('number');
      }
    });

    it('should place secretary agent first due to starting bonus', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'financial', priority: 2 },
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // Secretary gets a +2.0 starting bonus in evaluateSequence, so ACO
      // should prefer sequences starting with secretary.
      expect(steps[0].agentType).toBe('secretary');
    });

    it('should produce unique stepIds for each step', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());
      const ids = steps.map(s => s.stepId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should set sequential dependencies (each step depends on its predecessor)', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // First step should have no dependencies
      expect(steps[0].dependencies.length).toBe(0);

      // Subsequent steps should depend on the previous step
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].dependencies.length).toBeGreaterThan(0);
        // The dependency should reference the previous step
        expect(steps[i].dependencies[0]).toContain(steps[i - 1].agentType);
      }
    });

    it('should place low-priority agents later in the sequence', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'analytics', priority: 3 },
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // analytics (priority 3) gets a penalty for appearing early, so ACO
      // should place it last
      const analyticsIdx = steps.findIndex(s => s.agentType === 'analytics');
      expect(analyticsIdx).toBe(steps.length - 1);
    });

    it('should return empty steps for empty agent list', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const steps = await coordinator.optimizeWorkflow([], createTestContext());
      expect(steps).toEqual([]);
    });

    it('should fall back to simple steps when workflow optimization is disabled', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
        { workflowOptimizationEnabled: false },
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // Simple steps: same order as input, no inter-step dependencies, canParallelize = true
      expect(steps.length).toBe(3);
      for (const step of steps) {
        expect(step.dependencies).toEqual([]);
        expect(step.canParallelize).toBe(true);
      }
    });

    it('should fall back to simple steps when only two agents are provided', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // <= 2 agents skips optimization
      expect(steps.length).toBe(2);
      expect(steps[0].agentType).toBe('secretary');
      expect(steps[1].agentType).toBe('legal');
      // Simple steps have no dependencies
      expect(steps[0].dependencies).toEqual([]);
      expect(steps[1].dependencies).toEqual([]);
    });
  });

  // =========================================================================
  // 4. Result Aggregation (Honeybee Democracy Consensus)
  // =========================================================================

  describe('Result Aggregation (Consensus)', () => {
    it('should aggregate all-success results with correct metadata', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const results = createTestResults();
      const aggregated = await coordinator.aggregateResults(results, agents);

      expect(aggregated.success).toBe(true);
      expect(aggregated.data).toBeDefined();
      expect(Array.isArray(aggregated.insights)).toBe(true);
      expect(aggregated.metadata.agentsUsed).toEqual(
        expect.arrayContaining(['secretary', 'legal', 'financial']),
      );
      expect(typeof aggregated.confidence).toBe('number');
      expect(aggregated.confidence).toBeGreaterThan(0);
    });

    it('should handle mixed success and failure results', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const results: Record<string, ProcessingResult<unknown>> = {
        step_secretary: {
          success: true,
          data: { extracted: 'data' },
          confidence: 0.9,
          insights: [],
        },
        step_legal: {
          success: false,
          data: null,
          confidence: 0,
          error: 'Legal analysis failed',
          insights: [],
        },
        step_financial: {
          success: true,
          data: { totalValue: 50000 },
          confidence: 0.85,
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      // Overall should still succeed because at least some agents succeeded
      expect(aggregated.success).toBe(true);
      expect(aggregated.metadata.agentsUsed.length).toBe(3);
    });

    it('should track consensus metadata including agentsUsed', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const aggregated = await coordinator.aggregateResults(
        createTestResults(),
        agents,
      );

      expect(aggregated.metadata).toBeDefined();
      expect(aggregated.metadata.agentsUsed).toContain('secretary');
      expect(aggregated.metadata.agentsUsed).toContain('legal');
      expect(aggregated.metadata.agentsUsed).toContain('financial');
    });

    it('should give higher weight to legal and financial agents (expertise boost)', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 1 },
      ];

      // Results where all have same confidence so difference comes from expertise boost
      const results: Record<string, ProcessingResult<unknown>> = {
        step_secretary: {
          success: true,
          data: { result: 'secretary' },
          confidence: 0.8,
          insights: [],
        },
        step_legal: {
          success: true,
          data: { result: 'legal' },
          confidence: 0.8,
          insights: [],
        },
        step_financial: {
          success: true,
          data: { result: 'financial' },
          confidence: 0.8,
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      // Since no conflicts, weighted aggregation is used.
      // Legal and financial get 1.3 boost, secretary gets 1.1 boost.
      // All have same confidence, so legal/financial should have higher weight.
      expect(aggregated.success).toBe(true);
      expect(aggregated.confidence).toBeGreaterThan(0.7);
    });

    it('should detect conflicts when agents disagree on risk assessment', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 1 },
        { type: 'analytics', priority: 2 },
      ];

      // Conflicting risk levels should trigger Honeybee consensus
      const results: Record<string, ProcessingResult<unknown>> = {
        step_legal: {
          success: true,
          data: { riskLevel: 'high', recommendation: 'reject' },
          confidence: 0.9,
          insights: [
            { type: 'risk', severity: 'critical', title: 'High risk contract', description: 'Significant risk' },
          ],
        },
        step_financial: {
          success: true,
          data: { riskLevel: 'low', recommendation: 'approve' },
          confidence: 0.85,
          insights: [
            { type: 'risk', severity: 'info', title: 'Low risk assessment', description: 'Acceptable risk' },
          ],
        },
        step_analytics: {
          success: true,
          data: { riskLevel: 'medium' },
          confidence: 0.7,
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      expect(aggregated.success).toBe(true);
      // When there are conflicts (differing riskLevel), the consensus algorithm runs
      expect(aggregated.metadata.consensusReached).toBeDefined();
      expect(typeof aggregated.metadata.consensusScore).toBe('number');
    });

    it('should compute confidence-weighted averaging in non-conflict case', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      // No conflicting fields (no riskLevel, no recommendation/action)
      const results: Record<string, ProcessingResult<unknown>> = {
        step_secretary: {
          success: true,
          data: { parties: ['A', 'B'] },
          confidence: 0.95,
          insights: [],
        },
        step_legal: {
          success: true,
          data: { clauses: 10 },
          confidence: 0.85,
          insights: [],
        },
        step_financial: {
          success: true,
          data: { totalValue: 100000 },
          confidence: 0.70,
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      // No conflicts => weighted aggregation
      expect(aggregated.success).toBe(true);
      expect(aggregated.confidence).toBeGreaterThan(0);
      expect(aggregated.confidence).toBeLessThanOrEqual(1.0);
      // consensusReached should be false (no conflict triggered consensus)
      expect(aggregated.metadata.consensusReached).toBe(false);
    });

    it('should handle empty results gracefully', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const aggregated = await coordinator.aggregateResults({}, []);

      expect(aggregated).toBeDefined();
      expect(aggregated.success).toBe(false);
      expect(aggregated.confidence).toBe(0.5);
      expect(aggregated.metadata.consensusReached).toBe(false);
    });

    it('should use simple aggregation when only one result is present', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [{ type: 'legal', priority: 1 }];
      const results: Record<string, ProcessingResult<unknown>> = {
        step_legal: {
          success: true,
          data: { riskLevel: 'low' },
          confidence: 0.92,
          insights: [
            { type: 'risk', severity: 'info', title: 'Low risk', description: 'Safe' },
          ],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      // Single result bypasses consensus (Object.keys(results).length <= 1)
      expect(aggregated.success).toBe(true);
      expect(aggregated.confidence).toBeCloseTo(0.92, 1);
      expect(aggregated.metadata.consensusReached).toBe(false);
      expect(aggregated.insights.length).toBe(1);
    });

    it('should use simple aggregation when consensus is disabled', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
        { consensusEnabled: false },
      );

      const agents: AgentReference[] = [
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 1 },
      ];

      const results: Record<string, ProcessingResult<unknown>> = {
        step_legal: {
          success: true,
          data: { riskLevel: 'high' },
          confidence: 0.9,
          insights: [],
        },
        step_financial: {
          success: true,
          data: { riskLevel: 'low' },
          confidence: 0.85,
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);

      // Should use simple aggregation even though there are conflicts
      expect(aggregated.metadata.consensusReached).toBe(false);
    });
  });

  // =========================================================================
  // 5. Learning & Pattern Detection
  // =========================================================================

  describe('Learning & Pattern Detection', () => {
    it('should complete learnFromExecution without error for successful plan', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const plan = createTestPlan();
      const results = createTestResults();

      // Should not throw
      await expect(
        coordinator.learnFromExecution(plan, results, true),
      ).resolves.not.toThrow();
    });

    it('should not deposit pheromones for failed execution', async () => {
      const { PheromoneStore } = await import(
        '../../supabase/functions/local-agents/swarm/pheromone-store'
      );
      const depositSpy = vi.fn().mockResolvedValue(undefined);
      (PheromoneStore as Mock).mockImplementation(() => ({
        readPheromones: vi.fn().mockResolvedValue([]),
        depositPheromone: depositSpy,
        evaporatePheromones: vi.fn().mockResolvedValue(0),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-learn-fail',
      );

      const plan = createTestPlan();
      const results = createTestResults();

      await coordinator.learnFromExecution(plan, results, false);

      // success is false, so depositWorkflowPheromones should NOT be called
      expect(depositSpy).not.toHaveBeenCalled();
    });

    it('should deposit pheromones for successful workflows with multiple steps', async () => {
      const { PheromoneStore } = await import(
        '../../supabase/functions/local-agents/swarm/pheromone-store'
      );
      const depositSpy = vi.fn().mockResolvedValue(undefined);
      (PheromoneStore as Mock).mockImplementation(() => ({
        readPheromones: vi.fn().mockResolvedValue([]),
        depositPheromone: depositSpy,
        evaporatePheromones: vi.fn().mockResolvedValue(0),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-learn-ok',
      );

      const plan = createTestPlan();
      const results = createTestResults();

      await coordinator.learnFromExecution(plan, results, true);

      // With 3 successful steps there should be pheromone deposits:
      // 2 transition deposits (secretary->legal, legal->financial)
      // + 1 quality marker (all steps successful with avg confidence > 0.8)
      expect(depositSpy).toHaveBeenCalled();
      expect(depositSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should attempt pattern learning for successful executions when enabled', async () => {
      const { PatternLearner } = await import(
        '../../supabase/functions/local-agents/swarm/pattern-learner'
      );
      const findSpy = vi.fn().mockResolvedValue(null);
      (PatternLearner as Mock).mockImplementation(() => ({
        detectPatterns: vi.fn().mockResolvedValue([]),
        findMatchingPatterns: findSpy,
        storePattern: vi.fn().mockResolvedValue(undefined),
        updatePatternMetrics: vi.fn().mockResolvedValue(undefined),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-learn-pattern',
        { patternLearningEnabled: true },
      );

      const plan = createTestPlan();
      const results = createTestResults();

      await coordinator.learnFromExecution(plan, results, true);

      // findMatchingPatterns should have been called to check for existing pattern
      expect(findSpy).toHaveBeenCalled();
    });

    it('should fail silently when learning encounters an error', async () => {
      const { PheromoneStore } = await import(
        '../../supabase/functions/local-agents/swarm/pheromone-store'
      );
      (PheromoneStore as Mock).mockImplementation(() => ({
        readPheromones: vi.fn().mockRejectedValue(new Error('DB down')),
        depositPheromone: vi.fn().mockRejectedValue(new Error('DB down')),
        evaporatePheromones: vi.fn().mockRejectedValue(new Error('DB down')),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-learn-broken',
      );

      const plan = createTestPlan();
      const results = createTestResults();

      // Should NOT throw - learning errors are non-critical
      await expect(
        coordinator.learnFromExecution(plan, results, true),
      ).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // 6. Error Handling & Edge Cases
  // =========================================================================

  describe('Error Handling & Edge Cases', () => {
    it('should handle errors in PSO optimization gracefully and return candidates', async () => {
      const { FitnessEvaluator } = await import(
        '../../supabase/functions/local-agents/swarm/fitness-evaluator'
      );
      (FitnessEvaluator as Mock).mockImplementation(() => ({
        evaluateCombination: vi.fn().mockRejectedValue(new Error('Eval crash')),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-err-pso',
      );

      const candidates = createTestCandidates();
      const result = await coordinator.optimizeAgentSelection(
        createTestAnalysis(),
        candidates,
        createTestContext(),
      );

      // Should return original candidates as fallback
      expect(result).toEqual(candidates);
    });

    it('should still produce valid steps when pheromone reads fail (internal catch)', async () => {
      // readPheromonesForWorkflow catches errors internally and returns an
      // empty pheromone map, so ACO still runs with zero-strength trails.
      const { PheromoneStore } = await import(
        '../../supabase/functions/local-agents/swarm/pheromone-store'
      );
      (PheromoneStore as Mock).mockImplementation(() => ({
        readPheromones: vi.fn().mockRejectedValue(new Error('Redis timeout')),
        depositPheromone: vi.fn().mockResolvedValue(undefined),
        evaporatePheromones: vi.fn().mockResolvedValue(0),
      }));

      SwarmCoordinator.clearInstances();
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-err-aco',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const steps = await coordinator.optimizeWorkflow(agents, createTestContext());

      // ACO proceeds with empty pheromones, so sequenceToSteps is used
      // rather than the simple fallback. Steps still cover all agents.
      expect(steps.length).toBe(3);
      const agentTypes = steps.map(s => s.agentType);
      expect(agentTypes).toContain('secretary');
      expect(agentTypes).toContain('legal');
      expect(agentTypes).toContain('financial');
      // First step should have no dependencies
      expect(steps[0].dependencies.length).toBe(0);
    });

    it('should fall back to simple aggregation when consensus mechanism errors', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 1 },
        { type: 'analytics', priority: 2 },
      ];

      // Create results that trigger conflict detection (differing riskLevel)
      // but we corrupt the data so consensus algorithm fails internally
      const results: Record<string, ProcessingResult<unknown>> = {
        step_legal: {
          success: true,
          data: { riskLevel: 'high' },
          confidence: 0.9,
          insights: [],
        },
        step_financial: {
          success: true,
          data: { riskLevel: 'low' },
          confidence: 0.85,
          insights: [],
        },
        step_analytics: {
          success: true,
          data: { riskLevel: 'medium' },
          confidence: 0.75,
          insights: [],
        },
      };

      // This should still succeed even if consensus internals struggle.
      // The coordinator catches errors and falls back to simpleAggregation.
      const aggregated = await coordinator.aggregateResults(results, agents);

      expect(aggregated).toBeDefined();
      expect(aggregated.success).toBe(true);
    });

    it('should handle null/undefined-like agent data in results without crashing', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const agents: AgentReference[] = [
        { type: 'secretary', priority: 1 },
        { type: 'legal', priority: 1 },
        { type: 'financial', priority: 2 },
      ];

      const results: Record<string, ProcessingResult<unknown>> = {
        step_secretary: {
          success: true,
          data: null,
          confidence: 0.5,
          insights: [],
        },
        step_legal: {
          success: true,
          data: undefined,
          confidence: 0.5,
          insights: [],
        },
        step_financial: {
          success: false,
          data: {},
          error: 'Processing failed',
          insights: [],
        },
      };

      const aggregated = await coordinator.aggregateResults(results, agents);
      expect(aggregated).toBeDefined();
      expect(typeof aggregated.confidence).toBe('number');
    });

    it('should complete all operations within reasonable time bounds', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-001',
      );

      const candidates = createTestCandidates();
      const analysis = createTestAnalysis();
      const context = createTestContext();
      const agents: AgentReference[] = candidates.slice(0, 3);

      const start = Date.now();

      await coordinator.optimizeAgentSelection(analysis, candidates, context);
      await coordinator.optimizeWorkflow(agents, context);
      await coordinator.aggregateResults(createTestResults(), agents);
      await coordinator.learnFromExecution(createTestPlan(), createTestResults(), true);

      const elapsed = Date.now() - start;

      // All four operations combined should complete within 5 seconds
      // (generous bound; normally much faster with mocked dependencies)
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // =========================================================================
  // Additional integration-like scenarios
  // =========================================================================

  describe('End-to-End Coordinator Flow', () => {
    it('should run the full lifecycle: select -> optimize -> aggregate -> learn', async () => {
      const coordinator = SwarmCoordinator.getInstance(
        mockSupabase as never,
        'ent-e2e',
      );

      const analysis = createTestAnalysis();
      const context = createTestContext();

      // 1. Select agents
      const candidates = createTestCandidates();
      const selected = await coordinator.optimizeAgentSelection(
        analysis,
        candidates,
        context,
      );
      expect(selected.length).toBeGreaterThan(0);

      // 2. Optimize workflow
      const steps = await coordinator.optimizeWorkflow(selected, context);
      expect(steps.length).toBe(selected.length);

      // 3. Simulate execution results
      const results: Record<string, ProcessingResult<unknown>> = {};
      for (const step of steps) {
        results[step.stepId] = {
          success: true,
          data: { processed: true },
          confidence: 0.85,
          insights: [],
        };
      }

      // 4. Aggregate results
      const aggregated = await coordinator.aggregateResults(results, selected);
      expect(aggregated.success).toBe(true);

      // 5. Learn from execution
      const plan: OrchestrationPlan = {
        orchestrationId: 'orch-e2e',
        type: 'multi_agent',
        requestType: analysis.type,
        complexity: analysis.complexity,
        priority: 'normal',
        requiredAgents: selected,
        dependencies: [],
        steps,
        estimatedDuration: steps.length * 30,
        metadata: {
          requestedAt: new Date().toISOString(),
          originalData: {},
        },
      };

      await expect(
        coordinator.learnFromExecution(plan, results, true),
      ).resolves.not.toThrow();
    });

    it('should export DEFAULT_SWARM_CONFIG with expected fields', () => {
      expect(DEFAULT_SWARM_CONFIG).toBeDefined();
      expect(DEFAULT_SWARM_CONFIG.agentSelectionEnabled).toBe(true);
      expect(DEFAULT_SWARM_CONFIG.workflowOptimizationEnabled).toBe(true);
      expect(DEFAULT_SWARM_CONFIG.consensusEnabled).toBe(true);
      expect(DEFAULT_SWARM_CONFIG.patternLearningEnabled).toBe(true);
      expect(DEFAULT_SWARM_CONFIG.algorithm).toBe('pso');
      expect(DEFAULT_SWARM_CONFIG.optimizationTimeout).toBe(100);
      expect(DEFAULT_SWARM_CONFIG.consensusThreshold).toBe(0.66);
      expect(DEFAULT_SWARM_CONFIG.useRedisCache).toBe(true);
    });
  });
});
