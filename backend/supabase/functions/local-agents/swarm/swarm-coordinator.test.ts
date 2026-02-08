/**
 * SwarmCoordinator Unit Tests
 *
 * Tests for the main swarm coordination adapter module.
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { SwarmCoordinator, DEFAULT_SWARM_CONFIG } from './swarm-coordinator.ts';

// Mock Supabase client
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({
            then: (fn: (result: { data: unknown[]; error: null }) => void) =>
              fn({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }),
} as never;

Deno.test('SwarmCoordinator - Constructor initializes correctly', () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  assertExists(coordinator);
});

Deno.test('SwarmCoordinator - Uses default config when not provided', () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  // Should not throw and should work with defaults
  assertExists(coordinator);
  assertEquals(DEFAULT_SWARM_CONFIG.agentSelectionEnabled, true);
  assertEquals(DEFAULT_SWARM_CONFIG.optimizationTimeout, 100);
});

Deno.test('SwarmCoordinator - Accepts custom config', () => {
  const customConfig = {
    agentSelectionEnabled: false,
    optimizationTimeout: 200,
  };

  const coordinator = new SwarmCoordinator(
    mockSupabase,
    'ent-test-123',
    customConfig,
  );

  assertExists(coordinator);
});

Deno.test('SwarmCoordinator - optimizeAgentSelection returns candidates (Phase 1)', async () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  const candidates = [
    { type: 'secretary', priority: 1, capabilities: ['document_processing'] },
    { type: 'legal', priority: 1, capabilities: ['legal_review'] },
  ];

  const analysis = {
    type: 'contract_review',
    complexity: 'medium',
    entities: { contracts: [], vendors: [], amounts: [], dates: [], emails: [] },
    hasUrgency: false,
    hasFinancialImpact: false,
    hasLegalImplications: true,
    hasComplianceRequirements: false,
    requiresAnalysis: false,
  };

  const context = {
    enterpriseId: 'ent-test-123',
    sessionId: 'sess-test-123',
    environment: {},
    permissions: [],
  };

  const result = await coordinator.optimizeAgentSelection(
    analysis,
    candidates,
    context,
  );

  // Phase 1: Should return candidates unchanged
  assertEquals(result, candidates);
});

Deno.test('SwarmCoordinator - optimizeWorkflow returns simple steps (Phase 1)', async () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  const agents = [
    { type: 'secretary', priority: 1, capabilities: [] },
    { type: 'legal', priority: 2, capabilities: [] },
  ];

  const context = {
    enterpriseId: 'ent-test-123',
    sessionId: 'sess-test-123',
    environment: {},
    permissions: [],
  };

  const result = await coordinator.optimizeWorkflow(agents, context);

  // Phase 1: Should return simple sequential steps
  assertEquals(result.length, 2);
  assertEquals(result[0].agentType, 'secretary');
  assertEquals(result[1].agentType, 'legal');
  assertExists(result[0].stepId);
  assertExists(result[1].stepId);
});

Deno.test('SwarmCoordinator - aggregateResults combines results (Phase 1)', async () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  const results = {
    step_1: {
      success: true,
      data: { extracted: 'data' },
      confidence: 0.9,
      insights: [],
    },
    step_2: {
      success: true,
      data: { analysis: 'complete' },
      confidence: 0.85,
      insights: [],
    },
  };

  const agents = [
    { type: 'secretary', priority: 1, capabilities: [] },
    { type: 'legal', priority: 2, capabilities: [] },
  ];

  const aggregated = await coordinator.aggregateResults(results, agents);

  // Phase 1: Simple aggregation
  assertEquals(aggregated.success, true);
  assertExists(aggregated.data);
  assertEquals(aggregated.metadata.agentsUsed.length, 2);
  assertEquals(aggregated.metadata.consensusReached, false);
});

Deno.test('SwarmCoordinator - learnFromExecution completes without error (Phase 1)', async () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123');

  const plan = { orchestrationId: 'orch-123', type: 'multi_agent' };
  const results = {
    step_1: { success: true, data: {}, confidence: 0.9 },
  };

  // Phase 1: Should be no-op but not throw
  await coordinator.learnFromExecution(plan, results, true);

  // If we get here without throwing, test passes
  assertEquals(true, true);
});

Deno.test('SwarmCoordinator - Graceful fallback when agent selection disabled', async () => {
  const coordinator = new SwarmCoordinator(mockSupabase, 'ent-test-123', {
    agentSelectionEnabled: false,
  });

  const candidates = [{ type: 'secretary', priority: 1, capabilities: [] }];
  const analysis = {
    type: 'test',
    complexity: 'low',
    entities: { contracts: [], vendors: [], amounts: [], dates: [], emails: [] },
    hasUrgency: false,
    hasFinancialImpact: false,
    hasLegalImplications: false,
    hasComplianceRequirements: false,
    requiresAnalysis: false,
  };
  const context = {
    enterpriseId: 'ent-test-123',
    sessionId: 'sess-test-123',
    environment: {},
    permissions: [],
  };

  const result = await coordinator.optimizeAgentSelection(
    analysis,
    candidates,
    context,
  );

  // Should return candidates unchanged when disabled
  assertEquals(result, candidates);
});
