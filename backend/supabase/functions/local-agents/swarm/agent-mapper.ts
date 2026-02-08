/**
 * Agent Mapper Module
 *
 * Translates between BaseAgent architecture (existing enterprise agents)
 * and SwarmAgent architecture (swarm optimization system).
 *
 * @module AgentMapper
 * @version 1.0.0 (Phase 1: Foundation)
 *
 * ## Purpose
 * Bridges incompatible type systems to enable swarm optimization without
 * modifying existing agents. Creates virtual SwarmAgent representations
 * that can be used by SwarmEngine for PSO, ACO, and consensus algorithms.
 *
 * ## Mapping Strategy
 * - Capability Vector: Converts agent capabilities to numerical feature vector
 * - Historical Performance: Fetches past success metrics from database
 * - Position/Velocity: Maps agent state to solution space coordinates
 * - Pheromone Sensitivity: Determines how agent responds to trails
 *
 * ## Key Design
 * - Read-only mapping (never modifies original agents)
 * - Caches mappings for performance
 * - Handles missing/incomplete agent data gracefully
 *
 * @example
 * ```typescript
 * const mapper = new AgentMapper(supabase, enterpriseId);
 *
 * // Map single agent
 * const swarmAgent = await mapper.mapToSwarmAgent(agentReference);
 *
 * // Map multiple agents
 * const swarmAgents = await mapper.mapAgentList(agentReferences);
 *
 * // Get capability vector
 * const vector = mapper.getCapabilityVector(agentReference);
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type {
  SwarmAgent,
  SwarmAgentType,
  Position,
  Velocity,
  LocalMemory,
  SwarmRole,
  AgentState,
} from './types.ts';

/**
 * Agent reference from ManagerAgent
 */
export interface AgentReference {
  type: string;
  taskType?: string;
  reason?: string;
  capabilities?: string[];
  priority: number;
}

/**
 * Historical performance data
 */
export interface PerformanceHistory {
  totalExecutions: number;
  successfulExecutions: number;
  averageConfidence: number;
  averageDuration: number;
  lastExecuted: Date | null;
}

/**
 * Capability mapping configuration
 */
interface CapabilityMapping {
  name: string;
  weight: number;
  dimension: number;
}

/**
 * Agent Mapper - Translates BaseAgent to SwarmAgent
 *
 * Creates virtual SwarmAgent representations from existing enterprise
 * agents to enable swarm optimization algorithms.
 */
export class AgentMapper {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private cache: Map<string, SwarmAgent>;
  private performanceCache: Map<string, PerformanceHistory>;
  private capabilityMappings: Map<string, CapabilityMapping>;

  /**
   * Create a new AgentMapper instance
   *
   * @param supabase - Supabase client for database operations
   * @param enterpriseId - Enterprise ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.cache = new Map();
    this.performanceCache = new Map();
    this.capabilityMappings = this.initializeCapabilityMappings();
  }

  /**
   * Map an AgentReference to a SwarmAgent
   *
   * Creates a virtual SwarmAgent representation that can be used
   * by SwarmEngine for optimization algorithms.
   *
   * @param agent - Agent reference from ManagerAgent
   * @param requestContext - Optional request context for contextual mapping
   * @returns Virtual SwarmAgent representation
   *
   * @example
   * ```typescript
   * const swarmAgent = await mapper.mapToSwarmAgent({
   *   type: 'legal',
   *   capabilities: ['legal_review', 'contract_analysis'],
   *   priority: 1
   * });
   * ```
   */
  async mapToSwarmAgent(
    agent: AgentReference,
    requestContext?: Record<string, unknown>,
  ): Promise<SwarmAgent> {
    // Check cache first
    const cacheKey = this.getCacheKey(agent);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Get historical performance
    const performance = await this.getHistoricalPerformance(agent.type);

    // Map agent type to swarm type
    const swarmType = this.mapToSwarmType(agent.type);

    // Get capability vector for position
    const capabilityVector = this.getCapabilityVector(agent);

    // Create position in solution space
    const position: Position = {
      dimensions: capabilityVector,
      confidence: performance.averageConfidence,
      timestamp: Date.now(),
    };

    // Initialize velocity (based on agent flexibility)
    const velocity: Velocity = {
      components: capabilityVector.map(() => 0.1), // Small initial velocity
      magnitude: 0.1,
      inertia: 0.7, // Moderate resistance to change
    };

    // Create local memory
    const memory: LocalMemory = {
      bestPosition: position,
      bestFitness: performance.averageConfidence,
      tabuList: [],
      shortcuts: new Map(),
      patterns: [],
    };

    // Determine role
    const role: SwarmRole = {
      primary: swarmType,
      secondary: this.getSecondaryRoles(agent),
      specialization: this.calculateSpecialization(agent),
      flexibility: this.calculateFlexibility(agent),
    };

    // Create agent state
    const state: AgentState = {
      energy: 1.0,
      activity: this.mapActivityState(requestContext),
      knowledge: [],
      currentTask: null,
      exploration: 0.3, // Balanced exploration
      commitment: 0.7, // High commitment
      influence: this.calculateInfluence(performance),
    };

    // Create SwarmAgent
    const swarmAgent: SwarmAgent = {
      id: `swarm_${agent.type}_${Date.now()}`,
      type: swarmType,
      state,
      position,
      velocity,
      fitness: performance.averageConfidence,
      memory,
      neighbors: [],
      role,
      pheromones: [],
      messages: [],
    };

    // Cache for reuse
    this.cache.set(cacheKey, swarmAgent);

    return swarmAgent;
  }

  /**
   * Map multiple agents at once
   *
   * @param agents - List of agent references
   * @param requestContext - Optional request context
   * @returns Array of SwarmAgents
   */
  async mapAgentList(
    agents: AgentReference[],
    requestContext?: Record<string, unknown>,
  ): Promise<SwarmAgent[]> {
    return await Promise.all(
      agents.map(agent => this.mapToSwarmAgent(agent, requestContext))
    );
  }

  /**
   * Get capability vector for an agent
   *
   * Converts agent capabilities to numerical feature vector that can be
   * used in optimization algorithms.
   *
   * @param agent - Agent reference
   * @returns Numerical capability vector (8 dimensions)
   *
   * @example
   * ```typescript
   * const vector = mapper.getCapabilityVector({
   *   type: 'legal',
   *   capabilities: ['legal_review', 'contract_analysis']
   * });
   * // Returns: [0.9, 0.8, 0.1, 0.2, 0.1, 0.1, 0.5, 0.3]
   * ```
   */
  getCapabilityVector(agent: AgentReference): number[] {
    const capabilities = agent.capabilities || [];
    const vector = new Array(8).fill(0); // 8 capability dimensions

    // Map each capability to vector dimensions
    for (const capability of capabilities) {
      const mapping = this.capabilityMappings.get(capability);
      if (mapping) {
        vector[mapping.dimension] = Math.max(
          vector[mapping.dimension],
          mapping.weight
        );
      }
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0
      ? vector.map(v => v / magnitude)
      : vector;
  }

  /**
   * Get historical performance for an agent type
   *
   * Fetches performance metrics from database or cache.
   *
   * @param agentType - Type of agent
   * @returns Performance history with success rate and confidence
   */
  async getHistoricalPerformance(agentType: string): Promise<PerformanceHistory> {
    // Check cache first
    if (this.performanceCache.has(agentType)) {
      return this.performanceCache.get(agentType)!;
    }

    try {
      // Query performance history from database
      // TODO(Phase 2): Query agent_performance_history table
      const { data, error } = await this.supabase
        .from('agent_logs')
        .select('success, confidence, created_at, processing_time')
        .eq('enterprise_id', this.enterpriseId)
        .eq('agent_type', agentType)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate metrics
      const logs = data || [];
      const totalExecutions = logs.length;
      const successfulExecutions = logs.filter(l => l.success).length;
      const averageConfidence = logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.confidence || 0.5), 0) / logs.length
        : 0.5;
      const averageDuration = logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.processing_time || 30), 0) / logs.length
        : 30;
      const lastExecuted = logs.length > 0
        ? new Date(logs[0].created_at)
        : null;

      const performance: PerformanceHistory = {
        totalExecutions,
        successfulExecutions,
        averageConfidence,
        averageDuration,
        lastExecuted,
      };

      // Cache result
      this.performanceCache.set(agentType, performance);

      return performance;
    } catch (error) {
      console.error(`Failed to fetch performance for ${agentType}:`, error);

      // Return default performance
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageConfidence: 0.5,
        averageDuration: 30,
        lastExecuted: null,
      };
    }
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.cache.clear();
    this.performanceCache.clear();
  }

  // Private helper methods

  /**
   * Generate cache key for agent
   */
  private getCacheKey(agent: AgentReference): string {
    return `${agent.type}_${agent.taskType || 'default'}`;
  }

  /**
   * Map agent type to swarm agent type
   */
  private mapToSwarmType(agentType: string): SwarmAgentType {
    const mapping: Record<string, SwarmAgentType> = {
      'secretary': 'worker',
      'financial': 'scout',
      'legal': 'scout',
      'analytics': 'aggregator',
      'vendor': 'scout',
      'notifications': 'messenger',
      'manager': 'coordinator',
      'compliance': 'sentinel',
    };

    return mapping[agentType] || 'worker';
  }

  /**
   * Get secondary roles for flexibility
   */
  private getSecondaryRoles(agent: AgentReference): SwarmAgentType[] {
    const roles: SwarmAgentType[] = [];

    // All agents can explore
    roles.push('explorer');

    // Agents with analysis capabilities can aggregate
    if (agent.capabilities?.some(c => c.includes('analysis'))) {
      roles.push('aggregator');
    }

    return roles;
  }

  /**
   * Calculate specialization level (0-1)
   */
  private calculateSpecialization(agent: AgentReference): number {
    const capabilities = agent.capabilities?.length || 1;
    // More capabilities = less specialized
    return Math.max(0.3, 1 - (capabilities * 0.1));
  }

  /**
   * Calculate flexibility level (0-1)
   */
  private calculateFlexibility(agent: AgentReference): number {
    const capabilities = agent.capabilities?.length || 1;
    // More capabilities = more flexible
    return Math.min(0.9, 0.3 + (capabilities * 0.1));
  }

  /**
   * Calculate influence based on performance
   */
  private calculateInfluence(performance: PerformanceHistory): number {
    if (performance.totalExecutions === 0) return 0.5;

    const successRate = performance.successfulExecutions / performance.totalExecutions;
    const confidence = performance.averageConfidence;

    // Weighted influence: 60% success rate, 40% confidence
    return (successRate * 0.6) + (confidence * 0.4);
  }

  /**
   * Map request context to activity state
   */
  private mapActivityState(context?: Record<string, unknown>): string {
    if (!context) return 'foraging';

    const urgency = context.urgency as boolean | undefined;
    const complexity = context.complexity as string | undefined;

    if (urgency) return 'recruiting';
    if (complexity === 'high') return 'synchronizing';

    return 'foraging';
  }

  /**
   * Initialize capability mappings
   */
  private initializeCapabilityMappings(): Map<string, CapabilityMapping> {
    const mappings = new Map<string, CapabilityMapping>();

    // Dimension 0: Document Processing
    mappings.set('document_processing', { name: 'Document Processing', weight: 1.0, dimension: 0 });
    mappings.set('extraction', { name: 'Extraction', weight: 0.8, dimension: 0 });

    // Dimension 1: Financial Analysis
    mappings.set('financial_analysis', { name: 'Financial Analysis', weight: 1.0, dimension: 1 });
    mappings.set('cost_analysis', { name: 'Cost Analysis', weight: 0.7, dimension: 1 });

    // Dimension 2: Legal Review
    mappings.set('legal_review', { name: 'Legal Review', weight: 1.0, dimension: 2 });
    mappings.set('contract_analysis', { name: 'Contract Analysis', weight: 0.9, dimension: 2 });

    // Dimension 3: Compliance Check
    mappings.set('compliance_check', { name: 'Compliance Check', weight: 1.0, dimension: 3 });
    mappings.set('regulatory_analysis', { name: 'Regulatory Analysis', weight: 0.8, dimension: 3 });

    // Dimension 4: Vendor Management
    mappings.set('vendor_management', { name: 'Vendor Management', weight: 1.0, dimension: 4 });
    mappings.set('vendor_evaluation', { name: 'Vendor Evaluation', weight: 0.9, dimension: 4 });

    // Dimension 5: Analytics
    mappings.set('analytics', { name: 'Analytics', weight: 1.0, dimension: 5 });
    mappings.set('data_analysis', { name: 'Data Analysis', weight: 0.8, dimension: 5 });

    // Dimension 6: Notifications
    mappings.set('notifications', { name: 'Notifications', weight: 1.0, dimension: 6 });
    mappings.set('alerting', { name: 'Alerting', weight: 0.7, dimension: 6 });

    // Dimension 7: Orchestration
    mappings.set('orchestration', { name: 'Orchestration', weight: 1.0, dimension: 7 });
    mappings.set('coordination', { name: 'Coordination', weight: 0.9, dimension: 7 });

    return mappings;
  }
}
