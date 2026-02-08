/**
 * Swarm Coordinator Module
 *
 * Main adapter between ManagerAgent and SwarmEngine for intelligent
 * agent orchestration, workflow optimization, and consensus resolution.
 *
 * @module SwarmCoordinator
 * @version 1.0.0 (Phase 1: Foundation)
 *
 * ## Purpose
 * Bridges the gap between existing BaseAgent-based enterprise agents
 * and the sophisticated SwarmEngine infrastructure. Provides four key
 * optimization capabilities:
 *
 * 1. **PSO Agent Selection** - Particle Swarm Optimization determines
 *    optimal agent combinations based on relevance, historical performance,
 *    and coverage scores.
 *
 * 2. **ACO Workflow Optimization** - Ant Colony Optimization learns and
 *    follows successful execution patterns through pheromone trails.
 *
 * 3. **Honeybee Consensus** - Resolves conflicting agent recommendations
 *    through weighted democratic voting.
 *
 * 4. **Pattern Learning** - Detects and amplifies successful collaboration
 *    patterns through stigmergic communication.
 *
 * ## Integration Pattern
 * Uses adapter pattern to translate between incompatible type systems:
 * - Input: BaseAgent, AgentReference (from ManagerAgent)
 * - Output: SwarmAgent, ProblemDefinition (for SwarmEngine)
 *
 * ## Key Design Decisions
 * - Zero modifications to existing agents
 * - All swarm logic isolated in separate modules
 * - Graceful fallback to traditional orchestration on any failure
 * - Feature flags for gradual rollout
 * - Aggressive timeouts (100ms) to prevent latency
 *
 * @example
 * ```typescript
 * const coordinator = new SwarmCoordinator(supabase, enterpriseId, config);
 *
 * // Optimize agent selection
 * const optimizedAgents = await coordinator.optimizeAgentSelection(
 *   analysis,
 *   candidateAgents,
 *   context
 * );
 *
 * // Optimize workflow
 * const optimizedSteps = await coordinator.optimizeWorkflow(
 *   agents,
 *   context
 * );
 *
 * // Aggregate results with consensus
 * const aggregated = await coordinator.aggregateResults(
 *   results,
 *   agents
 * );
 *
 * // Learn from execution
 * await coordinator.learnFromExecution(plan, results, success);
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SwarmEngine } from './swarm-engine.ts';
import { AgentMapper } from './agent-mapper.ts';
import { FitnessEvaluator } from './fitness-evaluator.ts';
import { PheromoneStore } from './pheromone-store.ts';
import { PatternLearner } from './pattern-learner.ts';
import type {
  ProblemDefinition,
  SwarmConfig,
  SwarmAgent,
} from './types.ts';

/**
 * Configuration for SwarmCoordinator behavior
 */
export interface SwarmCoordinatorConfig {
  /** Enable PSO-based agent selection */
  agentSelectionEnabled: boolean;
  /** Enable ACO-based workflow optimization */
  workflowOptimizationEnabled: boolean;
  /** Enable Honeybee Democracy consensus */
  consensusEnabled: boolean;
  /** Enable pattern learning and amplification */
  patternLearningEnabled: boolean;
  /** Algorithm to use for optimization */
  algorithm: 'pso' | 'aco' | 'abc' | 'hybrid';
  /** Maximum timeout for optimization (ms) */
  optimizationTimeout: number;
  /** Minimum confidence threshold for consensus */
  consensusThreshold: number;
  /** Enable Redis caching for pheromones */
  useRedisCache: boolean;
}

/**
 * Default configuration for swarm coordination
 */
export const DEFAULT_SWARM_CONFIG: SwarmCoordinatorConfig = {
  agentSelectionEnabled: true,
  workflowOptimizationEnabled: true,
  consensusEnabled: true,
  patternLearningEnabled: true,
  algorithm: 'pso',
  optimizationTimeout: 100, // 100ms maximum
  consensusThreshold: 0.66, // 66% agreement
  useRedisCache: true,
};

/**
 * Request analysis from ManagerAgent
 */
export interface RequestAnalysis {
  type: string;
  complexity: string;
  entities: {
    contracts: string[];
    vendors: string[];
    amounts: string[];
    dates: string[];
    emails: string[];
  };
  hasUrgency: boolean;
  hasFinancialImpact: boolean;
  hasLegalImplications: boolean;
  hasComplianceRequirements: boolean;
  requiresAnalysis: boolean;
}

/**
 * Agent reference from ManagerAgent
 */
export interface AgentReference {
  type: string;
  taskType?: string;
  reason?: string;
  capabilities?: string[];
  priority: number;
  agent?: string;
  status?: string;
  result?: ProcessingResult<unknown>;
}

/**
 * Processing result from agents
 */
export interface ProcessingResult<T> {
  success: boolean;
  data: T;
  insights?: Insight[];
  rulesApplied?: string[];
  confidence?: number;
  processingTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insight from agent processing
 */
export interface Insight {
  type: string;
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
  data?: Record<string, unknown>;
  actionable?: boolean;
}

/**
 * Agent context for execution
 */
export interface AgentContext {
  enterpriseId: string;
  sessionId: string;
  environment: Record<string, unknown>;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated result with consensus
 */
export interface AggregatedResult {
  success: boolean;
  data: unknown;
  insights: Insight[];
  confidence: number;
  metadata: {
    agentsUsed: string[];
    consensusReached: boolean;
    consensusScore?: number;
    minorityOpinions?: Array<{
      agent: string;
      opinion: unknown;
      confidence: number;
    }>;
    optimizationScore?: number;
    patternId?: string;
  };
}

/**
 * SwarmCoordinator - Main adapter for swarm intelligence integration
 *
 * Bridges ManagerAgent with SwarmEngine to provide:
 * - Optimized agent selection via PSO
 * - Workflow optimization via ACO
 * - Consensus resolution via Honeybee Democracy
 * - Pattern learning via stigmergy
 */
export class SwarmCoordinator {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private config: SwarmCoordinatorConfig;
  private swarmEngine: SwarmEngine;
  private agentMapper: AgentMapper;
  private fitnessEvaluator: FitnessEvaluator;
  private pheromoneStore: PheromoneStore;
  private patternLearner: PatternLearner;

  /**
   * Create a new SwarmCoordinator instance
   *
   * @param supabase - Supabase client for database operations
   * @param enterpriseId - Enterprise ID for multi-tenant isolation
   * @param config - Optional swarm configuration (uses defaults if not provided)
   */
  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    config?: Partial<SwarmCoordinatorConfig>,
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };

    // Initialize swarm infrastructure components
    this.swarmEngine = new SwarmEngine();
    this.agentMapper = new AgentMapper(supabase, enterpriseId);
    this.fitnessEvaluator = new FitnessEvaluator(supabase, enterpriseId);
    this.pheromoneStore = new PheromoneStore(supabase, enterpriseId, {
      useRedis: this.config.useRedisCache,
      ttl: 24 * 60 * 60, // 24 hours
      evaporationRate: 0.1, // 10% per day
    });
    this.patternLearner = new PatternLearner(supabase, enterpriseId);
  }

  /**
   * Optimize agent selection using Particle Swarm Optimization
   *
   * Uses PSO to find the optimal combination of agents for a given request.
   * Fitness function considers:
   * - Relevance (40%) - How well agent capabilities match requirements
   * - Historical Performance (30%) - Past success rate for similar requests
   * - Coverage (20%) - How well agents cover all request aspects
   * - Cost Efficiency (5%) - Resource usage
   * - Redundancy Penalty (5%) - Avoid overlapping capabilities
   *
   * @param analysis - Request analysis from ManagerAgent
   * @param candidates - Candidate agents to choose from
   * @param context - Execution context
   * @returns Optimized list of agents to use
   *
   * @throws Never throws - returns candidates on error for graceful fallback
   *
   * @example
   * ```typescript
   * const optimized = await coordinator.optimizeAgentSelection(
   *   { type: 'contract_review', complexity: 'high', ... },
   *   [secretary, legal, financial, vendor],
   *   context
   * );
   * // Returns: [secretary, legal, financial] (vendor removed as redundant)
   * ```
   */
  async optimizeAgentSelection(
    _analysis: RequestAnalysis,
    candidates: AgentReference[],
    _context: AgentContext,
  ): Promise<AgentReference[]> {
    // Phase 1: Return candidates as-is (PSO implementation in Phase 2)
    // TODO(Phase 2): Implement PSO optimization
    if (!this.config.agentSelectionEnabled) {
      return candidates;
    }

    try {
      // Placeholder for Phase 2 PSO implementation
      // Will use SwarmEngine with ProblemDefinition for optimization
      return candidates;
    } catch (error) {
      console.error('Swarm agent selection failed:', error);
      return candidates; // Graceful fallback
    }
  }

  /**
   * Optimize workflow execution order using Ant Colony Optimization
   *
   * Uses ACO to find optimal execution path through agent dependency graph.
   * Learns from pheromone trails deposited by successful past executions.
   *
   * @param agents - Agents to orchestrate
   * @param context - Execution context
   * @returns Optimized execution steps
   *
   * @throws Never throws - returns simple sequential steps on error
   *
   * @example
   * ```typescript
   * const optimized = await coordinator.optimizeWorkflow(
   *   [secretary, legal, financial],
   *   context
   * );
   * // Returns steps following learned pheromone trails
   * ```
   */
  async optimizeWorkflow(
    agents: AgentReference[],
    _context: AgentContext,
  ): Promise<ExecutionStep[]> {
    // Phase 1: Return simple sequential steps (ACO implementation in Phase 3)
    // TODO(Phase 3): Implement ACO workflow optimization
    if (!this.config.workflowOptimizationEnabled) {
      return this.createSimpleSteps(agents);
    }

    try {
      // Placeholder for Phase 3 ACO implementation
      return this.createSimpleSteps(agents);
    } catch (error) {
      console.error('Swarm workflow optimization failed:', error);
      return this.createSimpleSteps(agents); // Graceful fallback
    }
  }

  /**
   * Aggregate results with fitness-weighted synthesis and consensus
   *
   * Combines results from multiple agents with intelligent weighting.
   * Detects conflicts and invokes Honeybee Democracy consensus when needed.
   *
   * @param results - Results from agent executions
   * @param agents - Agents that produced results
   * @returns Aggregated result with consensus information
   *
   * @example
   * ```typescript
   * const aggregated = await coordinator.aggregateResults(
   *   { legal: {...}, financial: {...} },
   *   [legalAgent, financialAgent]
   * );
   * ```
   */
  async aggregateResults(
    results: Record<string, ProcessingResult<unknown>>,
    agents: AgentReference[],
  ): Promise<AggregatedResult> {
    // Phase 1: Simple aggregation (Consensus implementation in Phase 4)
    // TODO(Phase 4): Implement Honeybee Democracy consensus
    if (!this.config.consensusEnabled) {
      return this.simpleAggregation(results, agents);
    }

    try {
      // Placeholder for Phase 4 consensus implementation
      return this.simpleAggregation(results, agents);
    } catch (error) {
      console.error('Swarm result aggregation failed:', error);
      return this.simpleAggregation(results, agents);
    }
  }

  /**
   * Learn from execution for pattern detection and pheromone reinforcement
   *
   * Analyzes completed orchestration to:
   * - Deposit pheromones on successful paths
   * - Detect emergent collaboration patterns
   * - Update performance history
   * - Store valuable patterns in database
   *
   * @param plan - Original orchestration plan
   * @param results - Execution results
   * @param success - Whether execution succeeded
   *
   * @example
   * ```typescript
   * await coordinator.learnFromExecution(
   *   orchestrationPlan,
   *   executionResults,
   *   true
   * );
   * ```
   */
  async learnFromExecution(
    _plan: unknown,
    _results: Record<string, ProcessingResult<unknown>>,
    _success: boolean,
  ): Promise<void> {
    // Phase 1: No-op (Pattern learning implementation in Phase 5)
    // TODO(Phase 5): Implement pattern learning and pheromone deposition
    if (!this.config.patternLearningEnabled) {
      return;
    }

    try {
      // Placeholder for Phase 5 pattern learning
      return;
    } catch (error) {
      console.error('Swarm learning failed:', error);
      // Fail silently - learning is non-critical
    }
  }

  // Private helper methods

  /**
   * Create simple sequential execution steps (fallback)
   */
  private createSimpleSteps(agents: AgentReference[]): ExecutionStep[] {
    return agents.map((agent, index) => ({
      stepId: `step_${agent.type}_${Date.now()}_${index}`,
      agentType: agent.type,
      taskType: agent.taskType,
      dependencies: [],
      estimatedDuration: 30,
      canParallelize: true,
    }));
  }

  /**
   * Simple result aggregation (fallback)
   */
  private simpleAggregation(
    results: Record<string, ProcessingResult<unknown>>,
    agents: AgentReference[],
  ): AggregatedResult {
    const insights: Insight[] = [];
    let totalConfidence = 0;
    let successCount = 0;

    // Collect insights and calculate average confidence
    for (const [_agentType, result] of Object.entries(results)) {
      if (result.success) {
        successCount++;
        totalConfidence += result.confidence || 0.5;
      }
      if (result.insights) {
        insights.push(...result.insights);
      }
    }

    const avgConfidence = successCount > 0 ? totalConfidence / successCount : 0.5;

    return {
      success: successCount > 0,
      data: results,
      insights,
      confidence: avgConfidence,
      metadata: {
        agentsUsed: agents.map(a => a.type),
        consensusReached: false,
      },
    };
  }
}

/**
 * Execution step for workflow
 */
export interface ExecutionStep {
  stepId: string;
  agentType: string;
  taskType?: string;
  dependencies: string[];
  estimatedDuration: number;
  canParallelize: boolean;
  status?: string;
  duration?: number;
  error?: string;
  result?: ProcessingResult<unknown>;
}
