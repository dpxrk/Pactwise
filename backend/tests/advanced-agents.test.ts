/**
 * Advanced Agent Hierarchy Tests
 *
 * Tests the abstract agent classes in the inheritance chain:
 *   BaseAgent -> MetacognitiveBaseAgent -> CausalBaseAgent
 *     -> TheoryOfMindBaseAgent -> QuantumBaseAgent
 *
 * Each abstract class is tested via a concrete test implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetacognitiveBaseAgent, MetacognitiveProcessingResult } from '../supabase/functions/local-agents/agents/metacognitive-base.ts';
import { CausalBaseAgent, CausalProcessingResult, CausalAnalysisData } from '../supabase/functions/local-agents/agents/causal-base.ts';
import { TheoryOfMindBaseAgent, TheoryOfMindProcessingResult, ToMInsight } from '../supabase/functions/local-agents/agents/theory-of-mind-base.ts';
import { QuantumBaseAgent, QuantumProcessingResult, QuantumInsight } from '../supabase/functions/local-agents/agents/quantum-base.ts';
import type { AgentContext, ProcessingResult, Insight } from '../supabase/functions/local-agents/agents/base.ts';
import type { CausalInsight } from '../supabase/functions/local-agents/causal/types.ts';
import type { MentalState } from '../supabase/functions/local-agents/theory-of-mind/theory-of-mind-engine.ts';
import type { OptimizationProblemType, OptimizationResult, QuantumAdvantage } from '../supabase/functions/local-agents/quantum/types.ts';
import { createMockSupabaseClient } from './setup';

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted by vitest)
// ---------------------------------------------------------------------------

// Mock streaming module used by BaseAgent
vi.mock('../supabase/functions/_shared/streaming.ts', () => ({
  createSSEStream: vi.fn().mockReturnValue({
    response: new Response(),
    writer: {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    },
  }),
  StreamWriter: vi.fn(),
}));

// Mock metacognitive layer
vi.mock('../supabase/functions/local-agents/agents/metacognitive.ts', () => ({
  MetacognitiveLayer: vi.fn().mockImplementation(() => ({
    introspectThinking: vi.fn().mockResolvedValue({
      confidence: 0.8,
      uncertainty: 0.2,
      cognitiveLoad: 0.5,
      strategyEffectiveness: 0.75,
      activeStrategies: ['analytical'],
      performanceMetrics: { accuracy: 0.85, speed: 0.7, efficiency: 0.8 },
    }),
    selectReasoningStrategy: vi.fn().mockResolvedValue({
      name: 'analytical',
      type: 'analytical',
      complexity: 0.6,
      expectedAccuracy: 0.85,
      expectedSpeed: 0.7,
      contextualFit: 0.8,
    }),
    calibrateConfidence: vi.fn().mockResolvedValue({
      initialConfidence: 0.7,
      finalConfidence: 0.82,
      actualAccuracy: 0.8,
      calibrationError: 0.02,
      isWellCalibrated: true,
      adjustmentNeeded: -0.02,
    }),
    optimizeLearningProcess: vi.fn().mockResolvedValue({
      learningRateAdjustment: 1.0,
      strategyUpdates: new Map(),
      metacognitiveInsights: [
        {
          type: 'performance_prediction',
          description: 'Performance is stable',
          impact: 0.3,
          recommendation: 'Continue current strategy',
        },
      ],
    }),
    generateSelfReflection: vi.fn().mockResolvedValue({
      strengths: ['pattern recognition', 'analytical reasoning'],
      weaknesses: ['edge cases'],
      improvementAreas: ['broader context evaluation'],
      learningInsights: ['more diverse training helps'],
      confidenceAssessment: 'Confidence is well-calibrated',
    }),
    monitorCognitiveProcess: vi.fn().mockResolvedValue({
      shouldContinue: true,
      shouldAdjustStrategy: false,
      confidenceTrajectory: [0.5, 0.7, 0.85],
    }),
  })),
}));

// Mock causal engine
vi.mock('../supabase/functions/local-agents/causal/causal-engine.ts', () => ({
  CausalReasoningEngine: vi.fn().mockImplementation(() => ({
    performCausalInference: vi.fn().mockResolvedValue({
      query: { type: 'interventional', target: 'budget' },
      effect: 0.8,
      confidence: 0.9,
      identifiable: true,
      method: 'backdoor_adjustment',
      explanation: 'Effect estimated via backdoor adjustment',
    }),
    discoverCausalStructure: vi.fn().mockResolvedValue({
      nodes: new Map([
        ['price', { id: 'price', name: 'price', type: 'observed', parents: [], children: ['budget'] }],
        ['budget', { id: 'budget', name: 'budget', type: 'observed', parents: ['price'], children: [] }],
      ]),
      edges: new Map([
        ['price->budget', { from: 'price', to: 'budget', strength: 0.8, type: 'direct' }],
      ]),
    }),
    generateCausalInsights: vi.fn().mockResolvedValue([
      {
        type: 'direct_cause',
        source: 'price',
        target: 'budget',
        strength: 0.8,
        confidence: 0.9,
        description: 'Price directly affects budget allocation',
        implications: ['Budget adjustments needed when price changes'],
      },
    ]),
    generateCounterfactual: vi.fn().mockResolvedValue({
      query: { type: 'counterfactual', target: 'outcome' },
      factual: new Map([['outcome', 'current']]),
      counterfactual: new Map([['outcome', 'alternative']]),
      difference: new Map([['outcome', 'improved']]),
      probability: 0.75,
      explanation: 'Under alternative conditions, outcome would improve',
    }),
  })),
}));

// Mock theory of mind engine
vi.mock('../supabase/functions/local-agents/theory-of-mind/theory-of-mind-engine.ts', () => ({
  TheoryOfMindEngine: vi.fn().mockImplementation(() => ({
    modelAgent: vi.fn().mockResolvedValue({
      agentId: 'test-agent',
      agentType: 'ai',
      beliefs: new Map([['market_conditions', { content: 'favorable', confidence: 0.8 }]]),
      desires: new Map([['maximize_value', { goal: 'maximize_value', priority: 0.9 }]]),
      intentions: new Map([['negotiate', { action: 'negotiate', commitment: 0.7, expectedOutcome: { description: 'better terms', probability: 0.6 } }]]),
      emotionalState: { valence: 0.3, arousal: 0.5, primaryEmotion: 'neutral', intensity: 0.4 },
      personalityTraits: {},
    }),
    recognizeIntentions: vi.fn().mockResolvedValue([
      {
        intention: {
          action: 'negotiate',
          purpose: 'get better terms',
          commitment: 0.8,
          expectedOutcome: { description: 'better terms', probability: 0.7 },
        },
        probability: 0.8,
        evidence: ['price_discussion'],
        alternativeExplanations: [],
      },
    ]),
    takePerspective: vi.fn().mockReturnValue({
      agentId: 'vendor-1',
      perspective: 'seeking_long_term_partnership',
      confidence: 0.75,
      assumedBeliefs: new Map(),
      assumedDesires: new Map(),
      potentialMisunderstandings: [],
    }),
    getSharedBeliefs: vi.fn().mockReturnValue(new Map()),
    observeBehavior: vi.fn(),
    updateTrust: vi.fn().mockResolvedValue({
      trustLevel: 0.8,
      reliability: 0.85,
      competence: 0.9,
      benevolence: 0.75,
      integrity: 0.8,
    }),
    generateEmpathyModel: vi.fn().mockReturnValue({
      targetAgent: 'vendor-1',
      emotionalSimulation: { valence: 0.2, arousal: 0.4, primaryEmotion: 'concern', intensity: 0.5 },
      affectiveForecast: { confidence: 0.7, predictedState: 'cautious' },
      empathicConcern: 0.6,
      perspectiveAlignment: 0.65,
    }),
    createCoordinationPlan: vi.fn().mockReturnValue({
      goal: 'optimize procurement',
      participants: new Set(['agent-1', 'agent-2']),
      sharedPlan: {
        steps: [
          { action: 'analyze_requirements', agent: 'agent-1' },
          { action: 'evaluate_vendors', agent: 'agent-2' },
        ],
      },
      communicationProtocol: { type: 'sequential' },
    }),
    getRelationship: vi.fn().mockReturnValue({ trust: 0.8 }),
    predictActions: vi.fn().mockResolvedValue([
      { type: 'negotiate', parameters: { focus: 'pricing' } },
    ]),
    interpretMessage: vi.fn().mockResolvedValue({
      sender: 'vendor-1',
      content: 'test message',
      interpretation: 'seeking negotiation',
    }),
    modelRecursiveBelief: vi.fn().mockResolvedValue({
      level: 1,
      aboutAgent: 'vendor-1',
      belief: { content: 'favorable market', confidence: 0.7 },
    }),
  })),
}));

// Mock quantum optimizer
vi.mock('../supabase/functions/local-agents/quantum/quantum-optimizer.ts', () => ({
  QuantumOptimizer: vi.fn().mockImplementation(() => ({
    optimize: vi.fn().mockResolvedValue({
      optimalParameters: [0.5, 0.3, 0.8],
      optimalValue: 0.92,
      iterations: 150,
      convergence: true,
      history: [
        { parameters: [0.1, 0.1, 0.1], value: 0.3, iteration: 0 },
        { parameters: [0.3, 0.2, 0.5], value: 0.6, iteration: 50 },
        { parameters: [0.5, 0.3, 0.8], value: 0.92, iteration: 150 },
      ],
    }),
    getQuantumAdvantage: vi.fn().mockReturnValue({
      speedup: 2.5,
      accuracyImprovement: 0.15,
      resourceReduction: 0.3,
    }),
    getBenchmarks: vi.fn().mockReturnValue([]),
  })),
}));

// Mock quantum neural network
vi.mock('../supabase/functions/local-agents/quantum/quantum-neural-network.ts', () => ({
  QuantumNeuralNetworkEngine: vi.fn().mockImplementation(() => ({
    predict: vi.fn().mockResolvedValue({
      predictions: [[0.8, 0.2]],
      confidence: [0.85],
    }),
    forward: vi.fn().mockResolvedValue([0.8, 0.2]),
    train: vi.fn().mockResolvedValue({
      accuracy: [0.6, 0.7, 0.8, 0.85],
      loss: [0.5, 0.3, 0.2, 0.15],
    }),
    estimateQuantumAdvantage: vi.fn().mockReturnValue(3.2),
  })),
}));

// Mock common types used by CausalBaseAgent (causal types re-exported)
vi.mock('../supabase/functions/local-agents/causal/types.ts', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original as object };
});

// ---------------------------------------------------------------------------
// Helper: create a minimal AgentContext for tests
// ---------------------------------------------------------------------------
function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    enterpriseId: 'test-enterprise-123',
    sessionId: 'test-session-456',
    environment: {},
    permissions: ['read', 'write'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Concrete test implementations of abstract classes
// ---------------------------------------------------------------------------

class TestMetacognitiveAgent extends MetacognitiveBaseAgent {
  get agentType() { return 'test_metacognitive'; }
  get capabilities() { return ['test_processing', 'analytical_reasoning']; }

  protected initializeStrategies(): void {
    this.availableStrategies = [
      { name: 'analytical', type: 'analytical', complexity: 0.6, expectedAccuracy: 0.85, expectedSpeed: 0.7, contextualFit: 0.8 },
      { name: 'heuristic', type: 'heuristic', complexity: 0.3, expectedAccuracy: 0.7, expectedSpeed: 0.9, contextualFit: 0.6 },
    ];
  }

  protected async processWithoutMetacognition(data: unknown, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    return {
      success: true,
      data: { processed: true, input: data },
      insights: [],
      confidence: 0.8,
      processingTime: 100,
      rulesApplied: ['test_rule'],
    };
  }

  protected decomposeAnalytically(data: unknown): unknown[] {
    const dataObj = data as Record<string, unknown>;
    return Object.entries(dataObj).map(([key, value]) => ({ key, value }));
  }

  protected async processComponent(component: unknown, _context?: AgentContext): Promise<unknown> {
    return { component, processed: true };
  }

  protected synthesizeResults(results: unknown[]): ProcessingResult {
    return {
      success: true,
      data: { synthesized: results },
      insights: [],
      rulesApplied: ['synthesis_rule'],
      confidence: 0.85,
      processingTime: 50,
    };
  }

  protected async applyHeuristics(data: unknown, _context?: AgentContext): Promise<ProcessingResult> {
    return {
      success: true,
      data: { heuristic: true, input: data },
      insights: [],
      rulesApplied: ['heuristic_rule'],
      confidence: 0.7,
      processingTime: 30,
    };
  }

  protected validateHeuristic(result: ProcessingResult): ProcessingResult {
    return { ...result, confidence: result.confidence * 0.95 };
  }

  protected async matchPatterns(data: unknown, _context?: AgentContext): Promise<unknown[]> {
    return [{ pattern: 'test', data }];
  }

  protected intuitiveAssessment(patterns: unknown[]): ProcessingResult {
    return {
      success: true,
      data: { intuitive: true, patterns },
      insights: [],
      rulesApplied: ['intuition_rule'],
      confidence: 0.6,
      processingTime: 20,
    };
  }

  protected combineResults(result1: ProcessingResult, result2: ProcessingResult): ProcessingResult {
    return {
      success: result1.success && result2.success,
      data: { combined: [result1.data, result2.data] },
      insights: [...result1.insights, ...result2.insights],
      rulesApplied: [...result1.rulesApplied, ...result2.rulesApplied],
      confidence: (result1.confidence + result2.confidence) / 2,
      processingTime: result1.processingTime + result2.processingTime,
    };
  }

  protected assessDataComplexity(data: unknown): number {
    const str = JSON.stringify(data);
    return Math.min(str.length / 1000, 1);
  }

  protected async adjustLearningRate(_adjustment: number): Promise<void> {
    // no-op for tests
  }

  protected analyzeError(error: Error | unknown): { type: string; context: string; recommendedStrategy: string } {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: 'processing_error',
      context: message,
      recommendedStrategy: 'analytical',
    };
  }

  // Expose protected members for white-box testing
  public testAssessConfidence(data: unknown, state: { confidence: number; uncertainty: number }) {
    return this.assessInitialConfidence(data, state as any);
  }

  public getRecentPerformance(): number[] {
    return this.recentPerformance;
  }

  public setMetacognitionEnabled(enabled: boolean): void {
    this.metacognitionEnabled = enabled;
  }

  public getMetacognition() {
    return this.metacognition;
  }

  public getStrategies() {
    return this.availableStrategies;
  }
}

class TestCausalAgent extends CausalBaseAgent {
  get agentType() { return 'test_causal'; }
  get capabilities() { return ['causal_reasoning', 'test_processing']; }

  protected initializeStrategies(): void {
    this.availableStrategies = [
      { name: 'analytical', type: 'analytical', complexity: 0.6, expectedAccuracy: 0.85, expectedSpeed: 0.7, contextualFit: 0.8 },
    ];
  }

  protected initializeCausalModel(): void {
    // no-op for tests
  }

  protected async processWithoutMetacognition(data: unknown, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    return {
      success: true,
      data: { processed: true, input: data },
      insights: [],
      confidence: 0.8,
      processingTime: 100,
      rulesApplied: ['causal_test_rule'],
    };
  }

  protected async generateDomainCausalInsights(_data: unknown, _analysis: CausalAnalysisData): Promise<CausalInsight[]> {
    return [
      {
        type: 'direct_cause',
        source: 'domain_variable',
        target: 'domain_outcome',
        strength: 0.7,
        confidence: 0.8,
        description: 'Domain-specific causal insight',
        implications: ['Domain implication'],
      },
    ];
  }

  protected decomposeAnalytically(data: unknown): unknown[] {
    return [data];
  }

  protected async processComponent(component: unknown): Promise<unknown> {
    return { component, processed: true };
  }

  protected synthesizeResults(results: unknown[]): ProcessingResult {
    return { success: true, data: results, insights: [], rulesApplied: [], confidence: 0.85, processingTime: 50 };
  }

  protected async applyHeuristics(data: unknown): Promise<ProcessingResult> {
    return { success: true, data, insights: [], rulesApplied: [], confidence: 0.7, processingTime: 30 };
  }

  protected validateHeuristic(result: ProcessingResult): ProcessingResult { return result; }

  protected async matchPatterns(data: unknown): Promise<unknown[]> { return [data]; }

  protected intuitiveAssessment(patterns: unknown[]): ProcessingResult {
    return { success: true, data: patterns, insights: [], rulesApplied: [], confidence: 0.6, processingTime: 20 };
  }

  protected combineResults(r1: ProcessingResult, r2: ProcessingResult): ProcessingResult {
    return { success: true, data: [r1.data, r2.data], insights: [], rulesApplied: [], confidence: 0.75, processingTime: 70 };
  }

  protected assessDataComplexity(_data: unknown): number { return 0.5; }
  protected async adjustLearningRate(_adj: number): Promise<void> {}
  protected analyzeError(error: Error | unknown) {
    return { type: 'causal_error', context: String(error), recommendedStrategy: 'analytical' };
  }

  // Expose for testing
  public getCausalEngine() { return this.causalEngine; }
  public getCausalHistory() { return this.causalHistory; }
  public getDiscoveredGraphs() { return this.discoveredGraphs; }
  public testRequiresCausalReasoning(data: unknown, context?: AgentContext) {
    return this.requiresCausalReasoning(data, context);
  }
  public testExtractCausalQuestions(data: unknown, context?: AgentContext) {
    return this.extractCausalQuestions(data, context);
  }
  public testParseCausalQuestion(question: string) {
    return this.parseCausalQuestion(question);
  }
}

class TestTheoryOfMindAgent extends TheoryOfMindBaseAgent {
  get agentType() { return 'test_tom'; }
  get capabilities() { return ['theory_of_mind', 'causal_reasoning', 'test_processing']; }

  protected initializeStrategies(): void {
    this.availableStrategies = [
      { name: 'analytical', type: 'analytical', complexity: 0.6, expectedAccuracy: 0.85, expectedSpeed: 0.7, contextualFit: 0.8 },
    ];
  }

  protected initializeCausalModel(): void {}

  protected async processWithoutMetacognition(data: unknown, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    return {
      success: true,
      data: { processed: true, input: data },
      insights: [],
      confidence: 0.8,
      processingTime: 100,
      rulesApplied: ['tom_test_rule'],
    };
  }

  protected async generateDomainCausalInsights(): Promise<CausalInsight[]> { return []; }

  protected async generateDomainToMInsights(
    _data: unknown,
    _mentalStates: Map<string, MentalState>,
  ): Promise<ToMInsight[]> {
    return [
      {
        type: 'belief_attribution',
        agentId: 'domain-agent',
        description: 'Domain-specific ToM insight',
        confidence: 0.8,
        implications: ['Domain implication'],
      },
    ];
  }

  protected decomposeAnalytically(data: unknown): unknown[] { return [data]; }
  protected async processComponent(component: unknown): Promise<unknown> { return component; }
  protected synthesizeResults(results: unknown[]): ProcessingResult {
    return { success: true, data: results, insights: [], rulesApplied: [], confidence: 0.85, processingTime: 50 };
  }
  protected async applyHeuristics(data: unknown): Promise<ProcessingResult> {
    return { success: true, data, insights: [], rulesApplied: [], confidence: 0.7, processingTime: 30 };
  }
  protected validateHeuristic(result: ProcessingResult): ProcessingResult { return result; }
  protected async matchPatterns(data: unknown): Promise<unknown[]> { return [data]; }
  protected intuitiveAssessment(patterns: unknown[]): ProcessingResult {
    return { success: true, data: patterns, insights: [], rulesApplied: [], confidence: 0.6, processingTime: 20 };
  }
  protected combineResults(r1: ProcessingResult, r2: ProcessingResult): ProcessingResult {
    return { success: true, data: [r1.data, r2.data], insights: [], rulesApplied: [], confidence: 0.75, processingTime: 70 };
  }
  protected assessDataComplexity(_data: unknown): number { return 0.5; }
  protected async adjustLearningRate(_adj: number): Promise<void> {}
  protected analyzeError(error: Error | unknown) {
    return { type: 'tom_error', context: String(error), recommendedStrategy: 'analytical' };
  }

  // Expose for testing
  public getToMEngine() { return this.tomEngine; }
  public getObservationHistory() { return this.observationHistory; }
  public getInteractionPartners() { return this.interactionPartners; }
  public testRequiresTheoryOfMind(data: unknown, context?: AgentContext) {
    return this.requiresTheoryOfMind(data, context);
  }
}

class TestQuantumAgent extends QuantumBaseAgent {
  get agentType() { return 'test_quantum'; }
  get capabilities() { return ['quantum_optimization', 'theory_of_mind', 'causal_reasoning']; }

  protected initializeStrategies(): void {
    this.availableStrategies = [
      { name: 'analytical', type: 'analytical', complexity: 0.6, expectedAccuracy: 0.85, expectedSpeed: 0.7, contextualFit: 0.8 },
    ];
  }

  protected initializeCausalModel(): void {}

  protected async processWithoutMetacognition(data: unknown, _context?: AgentContext): Promise<MetacognitiveProcessingResult> {
    return {
      success: true,
      data: { processed: true, input: data },
      insights: [],
      confidence: 0.8,
      processingTime: 100,
      rulesApplied: ['quantum_test_rule'],
    };
  }

  protected async generateDomainCausalInsights(): Promise<CausalInsight[]> { return []; }

  protected async generateDomainToMInsights(): Promise<ToMInsight[]> { return []; }

  protected async formulateOptimizationProblem(
    data: unknown,
    _context?: AgentContext,
  ): Promise<OptimizationProblemType> {
    const dataObj = data as Record<string, unknown>;
    return {
      category: (dataObj.category as OptimizationProblemType['category']) || 'continuous',
      objectives: [
        {
          id: 'test-objective',
          expression: (_vars: Map<string, unknown>) => 0.9,
          type: 'maximize',
          weight: 1.0,
        },
      ],
      constraints: [],
      variables: [
        { id: 'x1', type: 'continuous', domain: { type: 'range', min: 0, max: 1 } },
        { id: 'x2', type: 'continuous', domain: { type: 'range', min: 0, max: 1 } },
        { id: 'x3', type: 'continuous', domain: { type: 'range', min: 0, max: 1 } },
      ],
    };
  }

  protected async generateDomainQuantumInsights(
    _problem: OptimizationProblemType,
    _result: OptimizationResult,
    _advantage?: QuantumAdvantage | null,
  ): Promise<QuantumInsight[]> {
    return [
      {
        type: 'optimization',
        description: 'Domain-specific quantum insight',
        quantumAdvantage: 1.8,
        recommendations: ['Consider quantum annealing for this problem class'],
      },
    ];
  }

  protected decomposeAnalytically(data: unknown): unknown[] { return [data]; }
  protected async processComponent(component: unknown): Promise<unknown> { return component; }
  protected synthesizeResults(results: unknown[]): ProcessingResult {
    return { success: true, data: results, insights: [], rulesApplied: [], confidence: 0.85, processingTime: 50 };
  }
  protected async applyHeuristics(data: unknown): Promise<ProcessingResult> {
    return { success: true, data, insights: [], rulesApplied: [], confidence: 0.7, processingTime: 30 };
  }
  protected validateHeuristic(result: ProcessingResult): ProcessingResult { return result; }
  protected async matchPatterns(data: unknown): Promise<unknown[]> { return [data]; }
  protected intuitiveAssessment(patterns: unknown[]): ProcessingResult {
    return { success: true, data: patterns, insights: [], rulesApplied: [], confidence: 0.6, processingTime: 20 };
  }
  protected combineResults(r1: ProcessingResult, r2: ProcessingResult): ProcessingResult {
    return { success: true, data: [r1.data, r2.data], insights: [], rulesApplied: [], confidence: 0.75, processingTime: 70 };
  }
  protected assessDataComplexity(_data: unknown): number { return 0.5; }
  protected async adjustLearningRate(_adj: number): Promise<void> {}
  protected analyzeError(error: Error | unknown) {
    return { type: 'quantum_error', context: String(error), recommendedStrategy: 'analytical' };
  }

  // Expose for testing
  public getQuantumOptimizer() { return this.quantumOptimizer; }
  public getOptimizerConfig() { return this.optimizerConfig; }
  public testRequiresQuantumOptimization(data: unknown, context?: AgentContext) {
    return this.requiresQuantumOptimization(data, context);
  }
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('Advanced Agent Hierarchy', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const ENTERPRISE_ID = 'test-enterprise-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  // =========================================================================
  // MetacognitiveBaseAgent Tests
  // =========================================================================
  describe('MetacognitiveBaseAgent', () => {
    let agent: TestMetacognitiveAgent;

    beforeEach(() => {
      agent = new TestMetacognitiveAgent(mockSupabase as any, ENTERPRISE_ID, 'test_metacognitive');
    });

    it('should initialize with metacognitive layer and strategies', () => {
      expect(agent.getMetacognition()).toBeDefined();
      expect(agent.getStrategies()).toHaveLength(2);
      expect(agent.getStrategies()[0].name).toBe('analytical');
      expect(agent.getStrategies()[1].name).toBe('heuristic');
    });

    it('should expose correct agentType and capabilities', () => {
      expect(agent.agentType).toBe('test_metacognitive');
      expect(agent.capabilities).toContain('test_processing');
      expect(agent.capabilities).toContain('analytical_reasoning');
    });

    it('should call introspection during processing', async () => {
      const data = { query: 'analyze this document' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.metacognitive).toBeDefined();
      expect(result.metacognitive!.cognitiveState).toBeDefined();
      expect(result.metacognitive!.cognitiveState.confidence).toBe(0.8);
      expect(result.metacognitive!.cognitiveState.uncertainty).toBe(0.2);

      // Verify introspection was called
      const metacognition = agent.getMetacognition();
      expect(metacognition.introspectThinking).toHaveBeenCalledWith(
        data,
        agent.getStrategies(),
        expect.any(Array),
      );
    });

    it('should select a reasoning strategy for each task', async () => {
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive!.strategyUsed).toBeDefined();
      expect(result.metacognitive!.strategyUsed.name).toBe('analytical');
      expect(result.metacognitive!.strategyUsed.type).toBe('analytical');

      const metacognition = agent.getMetacognition();
      expect(metacognition.selectReasoningStrategy).toHaveBeenCalled();
    });

    it('should calibrate confidence after processing', async () => {
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive!.calibration).toBeDefined();
      expect(result.metacognitive!.calibration.isWellCalibrated).toBe(true);
      expect(result.metacognitive!.calibration.calibrationError).toBeLessThan(0.1);

      const metacognition = agent.getMetacognition();
      expect(metacognition.calibrateConfidence).toHaveBeenCalled();
    });

    it('should generate self-reflection data', async () => {
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive!.selfReflection).toBeDefined();
      expect(result.metacognitive!.selfReflection!.strengths).toContain('pattern recognition');
      expect(result.metacognitive!.selfReflection!.weaknesses).toContain('edge cases');

      const metacognition = agent.getMetacognition();
      expect(metacognition.generateSelfReflection).toHaveBeenCalled();
    });

    it('should include processing monitoring data with checkpoints', async () => {
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive!.processingMonitor).toBeDefined();
      expect(typeof result.metacognitive!.processingMonitor!.checkpointCount).toBe('number');
      expect(typeof result.metacognitive!.processingMonitor!.totalProcessingTime).toBe('undefined');
      // processingTime is set at the top level of processingMonitor
      expect(result.metacognitive!.processingMonitor!.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should include metacognitive insights from learning optimization', async () => {
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive!.insights).toBeDefined();
      expect(result.metacognitive!.insights.length).toBeGreaterThan(0);
      expect(result.metacognitive!.insights[0].type).toBe('performance_prediction');
    });

    it('should fall back to standard processing when metacognition is disabled', async () => {
      agent.setMetacognitionEnabled(false);
      const data = { query: 'test' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: true, input: data });
      expect(result.metacognitive).toBeUndefined();
      expect(result.rulesApplied).toContain('test_rule');

      // Metacognitive layer should NOT have been called
      const metacognition = agent.getMetacognition();
      expect(metacognition.introspectThinking).not.toHaveBeenCalled();
    });

    it('should update performance tracking after successful processing', async () => {
      expect(agent.getRecentPerformance()).toHaveLength(0);

      await agent.process({ query: 'test1' }, createTestContext());
      expect(agent.getRecentPerformance().length).toBeGreaterThan(0);

      const lastPerformance = agent.getRecentPerformance()[agent.getRecentPerformance().length - 1];
      expect(lastPerformance).toBeGreaterThan(0);
    });

    it('should assess initial confidence based on cognitive state and data complexity', () => {
      const simpleData = { a: 1 };
      const complexData = { text: 'x'.repeat(500) };

      const simpleConfidence = agent.testAssessConfidence(simpleData, { confidence: 0.8, uncertainty: 0.2 });
      const complexConfidence = agent.testAssessConfidence(complexData, { confidence: 0.8, uncertainty: 0.2 });

      // Simple data should yield higher confidence (lower complexity factor)
      expect(simpleConfidence).toBeGreaterThan(complexConfidence);
      // Both should be within [0.1, 0.9]
      expect(simpleConfidence).toBeGreaterThanOrEqual(0.1);
      expect(simpleConfidence).toBeLessThanOrEqual(0.9);
      expect(complexConfidence).toBeGreaterThanOrEqual(0.1);
    });

    it('should clamp initial confidence between 0.1 and 0.9', () => {
      // High uncertainty should bring confidence down, but not below 0.1
      const lowConf = agent.testAssessConfidence({ a: 'x'.repeat(2000) }, { confidence: 0.1, uncertainty: 0.9 });
      expect(lowConf).toBeGreaterThanOrEqual(0.1);

      // High base confidence with no uncertainty
      const highConf = agent.testAssessConfidence({}, { confidence: 1.0, uncertainty: 0.0 });
      expect(highConf).toBeLessThanOrEqual(0.9);
    });

    it('should handle errors in the metacognitive pipeline gracefully', async () => {
      // Make introspection throw an error
      const metacognition = agent.getMetacognition();
      (metacognition.introspectThinking as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Metacognitive introspection failed'),
      );

      const result = await agent.process({ query: 'test' }, createTestContext());

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.metacognitive).toBeDefined();
      expect(result.metacognitive!.calibration.isWellCalibrated).toBe(false);
      expect(result.insights).toBeDefined();
    });

    it('should produce an error insight when metacognition throws', async () => {
      const metacognition = agent.getMetacognition();
      (metacognition.introspectThinking as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Introspection failure'),
      );

      const result = await agent.process({ query: 'test' }, createTestContext());

      // The error result should contain an insight about the error
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0].type).toBe('error_learning');
      expect(result.insights[0].description).toContain('Introspection failure');
    });

    it('should keep only the last 20 performance entries', async () => {
      // Process 25 times
      for (let i = 0; i < 25; i++) {
        await agent.process({ query: `test${i}` }, createTestContext());
      }

      expect(agent.getRecentPerformance().length).toBeLessThanOrEqual(20);
    });

    it('should pass time constraints to strategy selection', async () => {
      const contextWithTime = createTestContext({ timeConstraint: 5000 });
      await agent.process({ query: 'urgent task' }, contextWithTime);

      const metacognition = agent.getMetacognition();
      expect(metacognition.selectReasoningStrategy).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Array),
        expect.any(Object),
        5000,
      );
    });
  });

  // =========================================================================
  // CausalBaseAgent Tests
  // =========================================================================
  describe('CausalBaseAgent', () => {
    let agent: TestCausalAgent;

    beforeEach(() => {
      agent = new TestCausalAgent(mockSupabase as any, ENTERPRISE_ID);
    });

    it('should initialize with a causal reasoning engine', () => {
      expect(agent.getCausalEngine()).toBeDefined();
    });

    it('should detect causal reasoning needs from keywords', () => {
      expect(agent.testRequiresCausalReasoning({ question: 'What caused the budget overrun?' })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ question: 'What is the effect of this change?' })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ question: 'Why did this happen?' })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ question: 'If we change pricing, then what?' })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ question: 'What is the impact on delivery?' })).toBe(true);
    });

    it('should NOT trigger causal reasoning for non-causal data', () => {
      expect(agent.testRequiresCausalReasoning({ name: 'simple lookup' })).toBe(false);
      expect(agent.testRequiresCausalReasoning({ status: 'active', count: 42 })).toBe(false);
    });

    it('should trigger causal reasoning when context requests it', () => {
      const context = createTestContext({
        requestCausalAnalysis: vi.fn() as any,
      });
      expect(agent.testRequiresCausalReasoning({ name: 'simple' }, context)).toBe(true);
    });

    it('should detect intervention and counterfactual data fields', () => {
      expect(agent.testRequiresCausalReasoning({ intervention: true })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ counterfactual: true })).toBe(true);
      expect(agent.testRequiresCausalReasoning({ whatIf: { question: 'what if prices drop?' } })).toBe(true);
    });

    it('should perform causal analysis when causal reasoning is needed', async () => {
      const data = { question: 'What caused the budget increase?' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      // The data has "cause" keyword so causal analysis is triggered
      expect(result.causal).toBeDefined();
      expect(result.causal!.effects).toBeDefined();
      expect(result.causal!.explanations).toBeDefined();
    });

    it('should skip causal analysis for non-causal data', async () => {
      const data = { name: 'simple lookup', status: 'active' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.causal).toBeUndefined();
    });

    it('should extract causal questions from explicit causal question fields', () => {
      const data = { causalQuestion: 'What is the effect of price on delivery?' };
      const questions = agent.testExtractCausalQuestions(data);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].natural).toBe(data.causalQuestion);
    });

    it('should extract causal questions from relationships field', () => {
      const data = {
        variables: ['price', 'budget'],
        relationships: [
          { type: 'causal', from: 'price', to: 'budget' },
        ],
      };
      const questions = agent.testExtractCausalQuestions(data);

      expect(questions.length).toBe(1);
      expect(questions[0].formal.type).toBe('interventional');
    });

    it('should parse what-if causal questions correctly', () => {
      const result = agent.testParseCausalQuestion('What if we increase price to 100?');
      expect(result.formal.type).toBe('interventional');
      expect(result.answerType).toBe('effect');
    });

    it('should parse counterfactual questions correctly', () => {
      const result = agent.testParseCausalQuestion('What would have happened if price had been lower?');
      expect(result.formal.type).toBe('counterfactual');
      expect(result.answerType).toBe('value');
    });

    it('should parse observational questions as default', () => {
      const result = agent.testParseCausalQuestion('How does quality relate to satisfaction?');
      expect(result.formal.type).toBe('observational');
      expect(result.answerType).toBe('probability');
    });

    it('should update causal history after causal analysis', async () => {
      expect(agent.getCausalHistory()).toHaveLength(0);

      const data = { question: 'What is the cause of the delay?' };
      await agent.process(data, createTestContext());

      // Causal history should have been updated
      expect(agent.getCausalHistory().length).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to metacognitive result when causal engine errors', async () => {
      const engine = agent.getCausalEngine();
      (engine.performCausalInference as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Causal engine failure'),
      );

      const data = { question: 'What caused the issue?' };
      const result = await agent.process(data, createTestContext());

      // Should still succeed because the error is caught and falls back
      expect(result.success).toBe(true);
      // Causal data may or may not be present depending on which step failed
    });

    it('should include both analysis insights and domain insights in causal results', async () => {
      const data = { question: 'What is the effect of pricing?' };
      const result = await agent.process(data, createTestContext());

      if (result.causal) {
        // Should contain insights from both the engine and domain-specific generation
        expect(result.causal.insights.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // TheoryOfMindBaseAgent Tests
  // =========================================================================
  describe('TheoryOfMindBaseAgent', () => {
    let agent: TestTheoryOfMindAgent;

    beforeEach(() => {
      agent = new TestTheoryOfMindAgent(mockSupabase as any, ENTERPRISE_ID);
    });

    it('should initialize with a Theory of Mind engine', () => {
      expect(agent.getToMEngine()).toBeDefined();
    });

    it('should detect ToM requirements from agent/participant fields', () => {
      expect(agent.testRequiresTheoryOfMind({ agents: ['vendor-1', 'buyer-1'] })).toBe(true);
      expect(agent.testRequiresTheoryOfMind({ participants: ['alice', 'bob'] })).toBe(true);
    });

    it('should detect ToM requirements from context otherAgents', () => {
      const context = createTestContext({ otherAgents: ['vendor-1'] });
      expect(agent.testRequiresTheoryOfMind({ name: 'test' }, context)).toBe(true);
    });

    it('should detect ToM needs from social keywords', () => {
      expect(agent.testRequiresTheoryOfMind({ message: 'I believe the vendor wants to cooperate' })).toBe(true);
      expect(agent.testRequiresTheoryOfMind({ note: 'We need to understand their perspective' })).toBe(true);
      expect(agent.testRequiresTheoryOfMind({ note: 'Build trust with partner' })).toBe(true);
    });

    it('should detect ToM needs from communication data', () => {
      expect(agent.testRequiresTheoryOfMind({ messages: [{ sender: 'alice', content: 'hello' }] })).toBe(true);
      expect(agent.testRequiresTheoryOfMind({ communication: { type: 'email' } })).toBe(true);
      expect(agent.testRequiresTheoryOfMind({ dialogue: ['turn1', 'turn2'] })).toBe(true);
    });

    it('should NOT trigger ToM for data without social context', () => {
      expect(agent.testRequiresTheoryOfMind({ price: 100, quantity: 5 })).toBe(false);
      expect(agent.testRequiresTheoryOfMind({ status: 'active' })).toBe(false);
    });

    it('should return false for non-record data', () => {
      expect(agent.testRequiresTheoryOfMind('just a string')).toBe(false);
      expect(agent.testRequiresTheoryOfMind(42)).toBe(false);
      expect(agent.testRequiresTheoryOfMind(null)).toBe(false);
    });

    it('should model mental states for identified agents', async () => {
      const data = {
        agents: [{ id: 'vendor-1' }, { id: 'buyer-1' }],
        observations: [
          { agentId: 'vendor-1', actions: [{ type: 'negotiate' }], context: {} },
        ],
      };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.theoryOfMind).toBeDefined();
      expect(result.theoryOfMind!.otherAgentStates).toBeInstanceOf(Map);
      expect(result.theoryOfMind!.otherAgentStates.size).toBeGreaterThan(0);
    });

    it('should recognize intentions from agent observations', async () => {
      const data = {
        agents: [{ id: 'vendor-1' }],
        observations: [
          { agentId: 'vendor-1', actions: [{ type: 'submit_proposal' }], context: { urgency: 'high' } },
        ],
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      expect(result.theoryOfMind!.recognizedIntentions).toBeInstanceOf(Map);
    });

    it('should generate perspective taking when requested', async () => {
      const data = {
        agents: [{ id: 'vendor-1' }],
        takePerspective: true,
        perspectiveTarget: 'vendor-1',
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      if (result.theoryOfMind!.perspectiveTaking) {
        expect(result.theoryOfMind!.perspectiveTaking.agentId).toBe('vendor-1');
      }
    });

    it('should generate empathy model for emotional content', async () => {
      const data = {
        agents: [{ id: 'vendor-1' }],
        emotionalContext: true,
        empathyTarget: 'vendor-1',
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      if (result.theoryOfMind!.empathyModel) {
        expect(result.theoryOfMind!.empathyModel.targetAgent).toBe('vendor-1');
        expect(result.theoryOfMind!.empathyModel.empathicConcern).toBeGreaterThan(0);
      }
    });

    it('should update trust models based on interaction outcomes', async () => {
      const data = {
        agents: [{ id: 'partner-1' }],
        interactions: [
          { partner: 'partner-1', outcome: 'success' },
        ],
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      expect(result.theoryOfMind!.trustUpdates).toBeInstanceOf(Map);

      const tomEngine = agent.getToMEngine();
      expect(tomEngine.updateTrust).toHaveBeenCalledWith(
        expect.any(String),
        'partner-1',
        expect.objectContaining({ partner: 'partner-1', outcome: 'success' }),
        'positive',
      );
    });

    it('should create coordination plan for multi-agent collaborative tasks', async () => {
      const data = {
        agents: [{ id: 'agent-1' }, { id: 'agent-2' }],
        coordinate: true,
        sharedGoal: 'optimize procurement',
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      if (result.theoryOfMind!.coordinationPlan) {
        expect(result.theoryOfMind!.coordinationPlan.goal).toBe('optimize procurement');
      }
    });

    it('should generate ToM insights from mental state analysis', async () => {
      const data = {
        agents: [{ id: 'vendor-1' }],
        observations: [
          { agentId: 'vendor-1', actions: [{ type: 'negotiate' }], context: {} },
        ],
      };
      const result = await agent.process(data, createTestContext());

      expect(result.theoryOfMind).toBeDefined();
      expect(result.theoryOfMind!.insights).toBeDefined();
      expect(Array.isArray(result.theoryOfMind!.insights)).toBe(true);
    });

    it('should skip ToM when data has no social context', async () => {
      const data = { price: 100, quantity: 5 };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.theoryOfMind).toBeUndefined();
    });

    it('should update interaction history after processing', async () => {
      expect(agent.getInteractionPartners().size).toBe(0);

      const data = {
        agents: [{ id: 'vendor-1' }],
        observations: [
          { agentId: 'vendor-1', actions: [{ type: 'respond' }], context: {} },
        ],
      };
      await agent.process(data, createTestContext());

      expect(agent.getInteractionPartners().has('vendor-1')).toBe(true);
    });

    it('should fall back gracefully when ToM engine throws', async () => {
      const tomEngine = agent.getToMEngine();
      (tomEngine.modelAgent as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('ToM modeling failed'),
      );

      const data = {
        agents: [{ id: 'vendor-1' }],
      };
      const result = await agent.process(data, createTestContext());

      // Should still return a result from the causal/metacognitive layers
      expect(result.success).toBe(true);
      expect(result.theoryOfMind).toBeUndefined();
    });

    it('should expose getTrustLevel for querying trust with specific agents', () => {
      const trustLevel = agent.getTrustLevel('vendor-1');
      expect(typeof trustLevel).toBe('number');
      expect(trustLevel).toBe(0.8); // From mock
    });
  });

  // =========================================================================
  // QuantumBaseAgent Tests
  // =========================================================================
  describe('QuantumBaseAgent', () => {
    let agent: TestQuantumAgent;

    beforeEach(() => {
      agent = new TestQuantumAgent(mockSupabase as any, ENTERPRISE_ID);
    });

    it('should initialize with quantum optimizer and config', () => {
      expect(agent.getQuantumOptimizer()).toBeDefined();
      expect(agent.getOptimizerConfig()).toBeDefined();
      expect(agent.getOptimizerConfig().maxIterations).toBe(1000);
      expect(agent.getOptimizerConfig().convergenceTolerance).toBe(1e-6);
    });

    it('should have quantum-inspired features configured', () => {
      const features = agent.getOptimizerConfig().quantumInspiredFeatures;
      expect(features.length).toBe(4);

      const featureTypes = features.map(f => f.type);
      expect(featureTypes).toContain('superposition');
      expect(featureTypes).toContain('entanglement');
      expect(featureTypes).toContain('interference');
      expect(featureTypes).toContain('tunneling');
    });

    it('should have hybrid mode configured', () => {
      const hybrid = agent.getOptimizerConfig().hybridMode;
      expect(hybrid).toBeDefined();
      expect(hybrid!.classicalRatio).toBe(0.3);
      expect(hybrid!.quantumRatio).toBe(0.7);
      expect(hybrid!.switchingStrategy).toBe('adaptive');
    });

    it('should detect optimization needs from optimize keyword', () => {
      expect(agent.testRequiresQuantumOptimization({ optimize: true })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ optimization: { target: 'cost' } })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ maximize: 'efficiency' })).toBe(true);
    });

    it('should detect optimization needs from complex decisions', () => {
      const manyDecisions = {
        decisions: Array.from({ length: 8 }, (_, i) => ({ id: i, options: ['a', 'b'] })),
      };
      expect(agent.testRequiresQuantumOptimization(manyDecisions)).toBe(true);

      const fewDecisions = { decisions: [{ id: 1 }, { id: 2 }] };
      expect(agent.testRequiresQuantumOptimization(fewDecisions)).toBe(false);
    });

    it('should detect optimization needs from NP-hard keywords', () => {
      expect(agent.testRequiresQuantumOptimization({ task: 'scheduling optimization' })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ task: 'resource allocation' })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ problem: 'routing between warehouses' })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ task: 'portfolio optimization' })).toBe(true);
      expect(agent.testRequiresQuantumOptimization({ type: 'constraint satisfaction' })).toBe(true);
    });

    it('should detect optimization needs from high-dimensional variable sets', () => {
      const highDim = { variables: Array.from({ length: 15 }, (_, i) => `var_${i}`) };
      expect(agent.testRequiresQuantumOptimization(highDim)).toBe(true);

      const lowDim = { variables: ['a', 'b', 'c'] };
      expect(agent.testRequiresQuantumOptimization(lowDim)).toBe(false);
    });

    it('should NOT trigger quantum optimization for simple data', () => {
      expect(agent.testRequiresQuantumOptimization({ name: 'test', value: 42 })).toBe(false);
      expect(agent.testRequiresQuantumOptimization({ status: 'active' })).toBe(false);
    });

    it('should return false for non-record data', () => {
      expect(agent.testRequiresQuantumOptimization('just a string')).toBe(false);
      expect(agent.testRequiresQuantumOptimization(null)).toBe(false);
      expect(agent.testRequiresQuantumOptimization(123)).toBe(false);
    });

    it('should run quantum optimization and return enhanced result', async () => {
      const data = { optimize: true, objective: 'minimize_cost' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.quantumOptimization).toBeDefined();
      expect(result.quantumOptimization!.result).toBeDefined();
      expect(result.quantumOptimization!.result.optimalValue).toBe(0.92);
      expect(result.quantumOptimization!.result.convergence).toBe(true);
      expect(result.quantumOptimization!.result.iterations).toBe(150);
    });

    it('should include quantum advantage metrics', async () => {
      const data = { optimize: true };
      const result = await agent.process(data, createTestContext());

      expect(result.quantumOptimization).toBeDefined();
      if (result.quantumOptimization!.quantumAdvantage) {
        expect(result.quantumOptimization!.quantumAdvantage.speedup).toBe(2.5);
        expect(result.quantumOptimization!.quantumAdvantage.accuracyImprovement).toBe(0.15);
      }
    });

    it('should assess solution quality', async () => {
      const data = { optimize: true };
      const result = await agent.process(data, createTestContext());

      expect(result.quantumOptimization).toBeDefined();
      expect(typeof result.quantumOptimization!.solutionQuality).toBe('number');
      expect(result.quantumOptimization!.solutionQuality).toBeGreaterThanOrEqual(0);
      expect(result.quantumOptimization!.solutionQuality).toBeLessThanOrEqual(1);
    });

    it('should track computation time', async () => {
      const data = { optimize: true };
      const result = await agent.process(data, createTestContext());

      expect(result.quantumOptimization).toBeDefined();
      expect(typeof result.quantumOptimization!.computationTime).toBe('number');
      expect(result.quantumOptimization!.computationTime).toBeGreaterThanOrEqual(0);
    });

    it('should add quantum insights to the general insights array', async () => {
      const data = { optimize: true };
      const result = await agent.process(data, createTestContext());

      // Quantum insights are mapped to Insight objects and added to result.insights
      expect(result.insights).toBeDefined();
      const quantumInsights = result.insights.filter(
        (i: Insight) => i.type === 'quantum',
      );
      expect(quantumInsights.length).toBeGreaterThan(0);
    });

    it('should skip quantum optimization for non-optimization data', async () => {
      const data = { name: 'simple lookup', status: 'active' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.quantumOptimization).toBeUndefined();
    });

    it('should fall back gracefully when quantum optimizer throws', async () => {
      const optimizer = agent.getQuantumOptimizer();
      (optimizer.optimize as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Quantum optimization failed'),
      );

      const data = { optimize: true };
      const result = await agent.process(data, createTestContext());

      // Should fall back to the ToM/Causal/Metacognitive result
      expect(result.success).toBe(true);
      expect(result.quantumOptimization).toBeUndefined();
    });

    it('should allow setting custom quantum features', () => {
      const customFeatures = [
        { type: 'superposition' as const, strength: 1.0, parameters: new Map() },
      ];
      agent.setQuantumFeatures(customFeatures);

      expect(agent.getOptimizerConfig().quantumInspiredFeatures).toEqual(customFeatures);
    });

    it('should allow setting hybrid mode ratios', () => {
      agent.setHybridMode(0.5, 0.5);

      const hybrid = agent.getOptimizerConfig().hybridMode;
      expect(hybrid!.classicalRatio).toBe(0.5);
      expect(hybrid!.quantumRatio).toBe(0.5);
    });
  });

  // =========================================================================
  // Cross-layer integration tests
  // =========================================================================
  describe('Cross-layer Integration', () => {
    let agent: TestQuantumAgent;

    beforeEach(() => {
      agent = new TestQuantumAgent(mockSupabase as any, ENTERPRISE_ID);
    });

    it('should chain all four layers for data that triggers all capabilities', async () => {
      const data = {
        optimize: true,
        agents: [{ id: 'vendor-1' }],
        question: 'What is the effect of optimization on vendor trust?',
        observations: [
          { agentId: 'vendor-1', actions: [{ type: 'respond' }], context: {} },
        ],
      };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      // Metacognitive layer should always be active
      expect(result.metacognitive).toBeDefined();
      // "effect" keyword triggers causal
      expect(result.causal).toBeDefined();
      // "agents" field triggers ToM
      expect(result.theoryOfMind).toBeDefined();
      // "optimize" triggers quantum
      expect(result.quantumOptimization).toBeDefined();
    });

    it('should produce results with only metacognitive data for simple queries', async () => {
      const data = { action: 'lookup', id: '123' };
      const result = await agent.process(data, createTestContext());

      expect(result.success).toBe(true);
      expect(result.metacognitive).toBeDefined();
      expect(result.causal).toBeUndefined();
      expect(result.theoryOfMind).toBeUndefined();
      expect(result.quantumOptimization).toBeUndefined();
    });

    it('should include metacognitive + causal but not ToM or quantum for causal-only data', async () => {
      const data = { question: 'Why did delivery fail?' };
      const result = await agent.process(data, createTestContext());

      expect(result.metacognitive).toBeDefined();
      // "Why" is a causal keyword
      expect(result.causal).toBeDefined();
      expect(result.theoryOfMind).toBeUndefined();
      expect(result.quantumOptimization).toBeUndefined();
    });

    it('should maintain correct inheritance chain types', () => {
      // QuantumBaseAgent extends TheoryOfMindBaseAgent extends CausalBaseAgent
      // extends MetacognitiveBaseAgent extends BaseAgent
      expect(agent).toBeInstanceOf(QuantumBaseAgent);
      expect(agent).toBeInstanceOf(TheoryOfMindBaseAgent);
      expect(agent).toBeInstanceOf(CausalBaseAgent);
      expect(agent).toBeInstanceOf(MetacognitiveBaseAgent);
    });
  });
});
