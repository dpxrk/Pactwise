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
    analysis: RequestAnalysis,
    candidates: AgentReference[],
    context: AgentContext,
  ): Promise<AgentReference[]> {
    if (!this.config.agentSelectionEnabled || candidates.length <= 2) {
      // Skip optimization for simple cases
      return candidates;
    }

    try {
      // Phase 2: PSO-based agent selection
      const startTime = Date.now();

      // Evaluate all possible agent combinations using PSO
      const bestCombination = await this.runPSOOptimization(
        analysis,
        candidates,
        context,
      );

      const optimizationTime = Date.now() - startTime;

      // Check timeout
      if (optimizationTime > this.config.optimizationTimeout) {
        console.warn(`PSO optimization exceeded timeout (${optimizationTime}ms)`);
        return candidates; // Fallback
      }

      // Record performance for learning
      await this.recordOptimizationPerformance(
        analysis,
        bestCombination,
        optimizationTime,
      );

      return bestCombination;
    } catch (error) {
      console.error('Swarm agent selection failed:', error);
      return candidates; // Graceful fallback
    }
  }

  /**
   * Run PSO optimization to find best agent combination
   *
   * Uses binary PSO where each particle represents a combination of agents.
   * Position dimensions are binary (0 or 1) indicating agent inclusion.
   */
  private async runPSOOptimization(
    analysis: RequestAnalysis,
    candidates: AgentReference[],
    _context: AgentContext,
  ): Promise<AgentReference[]> {
    const populationSize = Math.min(20, candidates.length * 3);
    const maxIterations = 30;
    const numAgents = candidates.length;

    // Initialize particles (each represents an agent combination)
    const particles: PSOParticle[] = [];
    let globalBest: PSOParticle | null = null;
    let globalBestFitness = -Infinity;

    // Create initial population
    for (let i = 0; i < populationSize; i++) {
      const particle = await this.createPSOParticle(candidates, numAgents, i);
      particles.push(particle);
    }

    // PSO main loop
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Evaluate fitness for each particle
      for (const particle of particles) {
        const selectedAgents = this.particleToAgents(particle, candidates);
        const fitness = await this.fitnessEvaluator.evaluateCombination(
          selectedAgents,
          analysis,
        );

        particle.fitness = fitness;

        // Update personal best
        if (fitness > particle.bestFitness) {
          particle.bestFitness = fitness;
          particle.bestPosition = [...particle.position];
        }

        // Update global best
        if (fitness > globalBestFitness) {
          globalBestFitness = fitness;
          globalBest = particle;
        }
      }

      // Update velocities and positions
      for (const particle of particles) {
        this.updatePSOParticle(particle, globalBest!);
      }

      // Early stopping if converged
      if (this.hasConverged(particles, 0.01)) {
        break;
      }
    }

    // Extract best agent combination
    if (globalBest) {
      return this.particleToAgents(globalBest, candidates);
    }

    return candidates;
  }

  /**
   * Create a PSO particle representing an agent combination
   */
  private async createPSOParticle(
    candidates: AgentReference[],
    numAgents: number,
    index: number,
  ): Promise<PSOParticle> {
    // Initialize position (binary: 0 or 1 for each agent)
    const position: number[] = [];

    if (index === 0) {
      // First particle: include all agents
      for (let i = 0; i < numAgents; i++) {
        position.push(1);
      }
    } else if (index === 1) {
      // Second particle: include only high-priority agents
      for (let i = 0; i < numAgents; i++) {
        position.push(candidates[i].priority === 1 ? 1 : 0);
      }
    } else {
      // Random initialization with bias toward inclusion
      for (let i = 0; i < numAgents; i++) {
        position.push(Math.random() > 0.4 ? 1 : 0);
      }
    }

    // Ensure at least one agent is selected
    if (position.every(p => p === 0)) {
      position[0] = 1;
    }

    return {
      position,
      velocity: new Array(numAgents).fill(0).map(() => Math.random() * 0.1),
      fitness: 0,
      bestPosition: [...position],
      bestFitness: -Infinity,
    };
  }

  /**
   * Update PSO particle using standard PSO equations
   */
  private updatePSOParticle(particle: PSOParticle, globalBest: PSOParticle): void {
    const w = 0.729; // Inertia weight
    const c1 = 1.49445; // Cognitive weight
    const c2 = 1.49445; // Social weight

    for (let i = 0; i < particle.position.length; i++) {
      const r1 = Math.random();
      const r2 = Math.random();

      // Update velocity
      particle.velocity[i] =
        w * particle.velocity[i] +
        c1 * r1 * (particle.bestPosition[i] - particle.position[i]) +
        c2 * r2 * (globalBest.bestPosition[i] - particle.position[i]);

      // Clamp velocity
      particle.velocity[i] = Math.max(-4, Math.min(4, particle.velocity[i]));

      // Update position using sigmoid for binary PSO
      const sigmoid = 1 / (1 + Math.exp(-particle.velocity[i]));
      particle.position[i] = Math.random() < sigmoid ? 1 : 0;
    }

    // Ensure at least one agent is selected
    if (particle.position.every(p => p === 0)) {
      const randomIndex = Math.floor(Math.random() * particle.position.length);
      particle.position[randomIndex] = 1;
    }
  }

  /**
   * Convert particle position to agent list
   */
  private particleToAgents(
    particle: PSOParticle,
    candidates: AgentReference[],
  ): AgentReference[] {
    return candidates.filter((_agent, index) => particle.position[index] === 1);
  }

  /**
   * Check if swarm has converged
   */
  private hasConverged(particles: PSOParticle[], threshold: number): boolean {
    if (particles.length === 0) return true;

    const avgFitness =
      particles.reduce((sum, p) => sum + p.fitness, 0) / particles.length;
    const variance =
      particles.reduce((sum, p) => sum + Math.pow(p.fitness - avgFitness, 2), 0) /
      particles.length;

    return variance < threshold;
  }

  /**
   * Record optimization performance for learning
   */
  private async recordOptimizationPerformance(
    analysis: RequestAnalysis,
    selectedAgents: AgentReference[],
    optimizationTime: number,
  ): Promise<void> {
    try {
      // Store optimization metadata for analysis
      await this.supabase
        .from('agent_performance_history')
        .insert({
          enterprise_id: this.enterpriseId,
          agent_type: 'manager',
          request_type: analysis.type,
          success: true,
          confidence: 0.95,
          duration_ms: optimizationTime,
          request_signature: {
            type: analysis.type,
            complexity: analysis.complexity,
            agentsSelected: selectedAgents.map(a => a.type),
            optimizationMethod: 'pso',
          },
        });
    } catch (error) {
      // Non-critical, just log
      console.error('Failed to record optimization performance:', error);
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
    context: AgentContext,
  ): Promise<ExecutionStep[]> {
    if (!this.config.workflowOptimizationEnabled || agents.length <= 2) {
      return this.createSimpleSteps(agents);
    }

    try {
      // Phase 3: ACO-based workflow optimization
      const requestType = (context.metadata?.requestType as string) || 'general';

      // Read pheromone trails for this workflow type
      const pheromones = await this.readPheromonesForWorkflow(requestType, agents);

      // Find optimal path using pheromone-guided search
      const optimalSequence = await this.findOptimalAgentSequence(
        agents,
        pheromones,
      );

      // Convert sequence to execution steps
      return this.sequenceToSteps(optimalSequence);
    } catch (error) {
      console.error('Swarm workflow optimization failed:', error);
      return this.createSimpleSteps(agents); // Graceful fallback
    }
  }

  /**
   * Read pheromone trails for workflow optimization
   */
  private async readPheromonesForWorkflow(
    requestType: string,
    agents: AgentReference[],
  ): Promise<Map<string, number>> {
    const pheromoneMap = new Map<string, number>();

    try {
      // Read pheromones for each possible agent transition
      for (let i = 0; i < agents.length; i++) {
        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;

          const from = agents[i].type;
          const to = agents[j].type;

          const deposits = await this.pheromoneStore.readPheromones(
            requestType,
            {
              agentSequence: [from, to],
              requestType,
            },
          );

          // Sum pheromone strength for this transition
          const totalStrength = deposits.reduce(
            (sum, d) => sum + (d.strength || 0),
            0,
          );

          if (totalStrength > 0) {
            pheromoneMap.set(`${from}->${to}`, totalStrength);
          }
        }
      }
    } catch (error) {
      console.error('Failed to read workflow pheromones:', error);
    }

    return pheromoneMap;
  }

  /**
   * Find optimal agent sequence using ACO
   */
  private async findOptimalAgentSequence(
    agents: AgentReference[],
    pheromones: Map<string, number>,
  ): Promise<AgentReference[]> {
    const numAnts = Math.min(10, agents.length * 2);
    const iterations = 5;

    let bestSequence: AgentReference[] = [];
    let bestScore = -Infinity;

    // ACO iterations
    for (let iter = 0; iter < iterations; iter++) {
      // Each ant constructs a solution
      for (let ant = 0; ant < numAnts; ant++) {
        const sequence = await this.constructAntSolution(agents, pheromones);
        const score = this.evaluateSequence(sequence, pheromones);

        if (score > bestScore) {
          bestScore = score;
          bestSequence = sequence;
        }
      }
    }

    return bestSequence.length > 0 ? bestSequence : agents;
  }

  /**
   * Construct solution using probabilistic pheromone-guided selection
   */
  private async constructAntSolution(
    agents: AgentReference[],
    pheromones: Map<string, number>,
  ): Promise<AgentReference[]> {
    const sequence: AgentReference[] = [];
    const remaining = [...agents];

    // Start with random agent (or secretary if available)
    const startAgent =
      remaining.find(a => a.type === 'secretary') ||
      remaining[Math.floor(Math.random() * remaining.length)];

    sequence.push(startAgent);
    remaining.splice(remaining.indexOf(startAgent), 1);

    // Build sequence using pheromone-guided selection
    while (remaining.length > 0) {
      const current = sequence[sequence.length - 1];
      const next = this.selectNextAgent(current, remaining, pheromones);

      sequence.push(next);
      remaining.splice(remaining.indexOf(next), 1);
    }

    return sequence;
  }

  /**
   * Select next agent using pheromone probability
   */
  private selectNextAgent(
    current: AgentReference,
    remaining: AgentReference[],
    pheromones: Map<string, number>,
  ): AgentReference {
    const alpha = 1.0; // Pheromone importance
    const beta = 2.0; // Heuristic importance

    // Calculate probabilities for each remaining agent
    const probabilities: number[] = [];
    let totalProbability = 0;

    for (const agent of remaining) {
      const pheromoneKey = `${current.type}->${agent.type}`;
      const pheromoneStrength = pheromones.get(pheromoneKey) || 0.1;

      // Heuristic: prefer high-priority agents
      const heuristic = 1 / Math.max(agent.priority, 1);

      // Probability combines pheromone and heuristic
      const probability =
        Math.pow(pheromoneStrength, alpha) * Math.pow(heuristic, beta);

      probabilities.push(probability);
      totalProbability += probability;
    }

    // Roulette wheel selection
    if (totalProbability === 0) {
      return remaining[Math.floor(Math.random() * remaining.length)];
    }

    let random = Math.random() * totalProbability;
    for (let i = 0; i < remaining.length; i++) {
      random -= probabilities[i];
      if (random <= 0) {
        return remaining[i];
      }
    }

    return remaining[remaining.length - 1];
  }

  /**
   * Evaluate sequence quality
   */
  private evaluateSequence(
    sequence: AgentReference[],
    pheromones: Map<string, number>,
  ): number {
    let score = 0;

    // Score based on pheromone trail strength
    for (let i = 0; i < sequence.length - 1; i++) {
      const from = sequence[i].type;
      const to = sequence[i + 1].type;
      const pheromoneKey = `${from}->${to}`;

      score += pheromones.get(pheromoneKey) || 0;
    }

    // Bonus for starting with secretary (common pattern)
    if (sequence[0].type === 'secretary') {
      score += 2.0;
    }

    // Penalty for low-priority agents appearing early
    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i].priority > 2) {
        score -= (i === 0 ? 1.0 : 0.5);
      }
    }

    return score;
  }

  /**
   * Convert agent sequence to execution steps
   */
  private sequenceToSteps(sequence: AgentReference[]): ExecutionStep[] {
    return sequence.map((agent, index) => {
      const dependencies: string[] = [];

      // Each step depends on the previous one
      if (index > 0) {
        dependencies.push(`step_${sequence[index - 1].type}_${index - 1}`);
      }

      return {
        stepId: `step_${agent.type}_${index}`,
        agentType: agent.type,
        taskType: agent.taskType,
        dependencies,
        estimatedDuration: 30,
        canParallelize: dependencies.length === 0,
      };
    });
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
    plan: OrchestrationPlan,
    results: Record<string, ProcessingResult<unknown>>,
    success: boolean,
  ): Promise<void> {
    try {
      // Phase 3: Deposit pheromones for successful paths
      if (success && plan.steps && plan.steps.length > 1) {
        await this.depositWorkflowPheromones(plan, results);
      }

      // Phase 5: Pattern learning (TODO)
      if (this.config.patternLearningEnabled) {
        // TODO(Phase 5): Detect and store emergent patterns
      }
    } catch (error) {
      console.error('Swarm learning failed:', error);
      // Fail silently - learning is non-critical
    }
  }

  /**
   * Deposit pheromones for successful workflow execution
   */
  private async depositWorkflowPheromones(
    plan: OrchestrationPlan,
    results: Record<string, ProcessingResult<unknown>>,
  ): Promise<void> {
    const requestType = plan.requestType || 'general';

    // Extract agent sequence from executed steps
    const executedSteps = plan.steps.filter(step =>
      results[step.stepId]?.success
    );

    if (executedSteps.length < 2) return;

    // Deposit pheromones for each successful transition
    for (let i = 0; i < executedSteps.length - 1; i++) {
      const fromAgent = executedSteps[i].agentType || executedSteps[i].agent!;
      const toAgent = executedSteps[i + 1].agentType || executedSteps[i + 1].agent!;

      // Calculate pheromone strength based on result confidence
      const fromResult = results[executedSteps[i].stepId];
      const toResult = results[executedSteps[i + 1].stepId];

      const avgConfidence =
        ((fromResult?.confidence || 0.5) + (toResult?.confidence || 0.5)) / 2;

      const pheromoneStrength = 1.0 + avgConfidence * 4.0; // 1.0 to 5.0

      try {
        await this.pheromoneStore.depositPheromone(requestType, {
          type: 'trail',
          position: {
            agentSequence: [fromAgent, toAgent],
            requestType,
          },
          strength: pheromoneStrength,
          depositorId: 'manager',
          metadata: {
            orchestrationId: plan.orchestrationId,
            complexity: plan.complexity,
            priority: plan.priority,
            confidence: avgConfidence,
          },
        });
      } catch (error) {
        console.error(`Failed to deposit pheromone ${fromAgent}->${toAgent}:`, error);
      }
    }

    // Deposit high-quality marker for overall successful workflow
    if (executedSteps.length === plan.steps.length) {
      const overallConfidence =
        Object.values(results).reduce(
          (sum, r) => sum + (r.confidence || 0.5),
          0,
        ) / Object.values(results).length;

      if (overallConfidence > 0.8) {
        try {
          await this.pheromoneStore.depositPheromone(requestType, {
            type: 'quality',
            position: {
              agentSequence: executedSteps.map(s => s.agentType || s.agent!),
              requestType,
            },
            strength: overallConfidence * 5.0,
            depositorId: 'manager',
            metadata: {
              orchestrationId: plan.orchestrationId,
              highQuality: true,
            },
          });
        } catch (error) {
          console.error('Failed to deposit quality pheromone:', error);
        }
      }
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

/**
 * PSO Particle for agent selection optimization
 */
interface PSOParticle {
  position: number[]; // Binary array (0 or 1 for each agent)
  velocity: number[];
  fitness: number;
  bestPosition: number[];
  bestFitness: number;
}

/**
 * Orchestration plan from ManagerAgent
 */
export interface OrchestrationPlan {
  orchestrationId: string;
  type: string;
  requestType: string;
  complexity: string;
  priority: string;
  requiredAgents: AgentReference[];
  dependencies: unknown[];
  steps: ExecutionStep[];
  estimatedDuration: number;
  metadata: {
    requestedAt: string;
    context?: AgentContext;
    originalData: unknown;
  };
}
