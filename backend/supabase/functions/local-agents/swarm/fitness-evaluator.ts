/**
 * Fitness Evaluator Module
 *
 * Calculates fitness scores for agent combinations to enable PSO optimization.
 * Uses multi-factor evaluation considering relevance, performance, coverage,
 * cost, and redundancy.
 *
 * @module FitnessEvaluator
 * @version 1.0.0 (Phase 1: Foundation)
 *
 * ## Fitness Function
 * ```
 * fitness = 0.40 × relevance_score +
 *           0.30 × historical_performance +
 *           0.20 × coverage_score +
 *           0.05 × (1 - cost_score) +
 *           0.05 × (1 - redundancy_penalty)
 * ```
 *
 * ## Factors
 * - **Relevance (40%)**: How well agent capabilities match request requirements
 * - **Historical Performance (30%)**: Past success rate for similar requests
 * - **Coverage (20%)**: How well agents cover all aspects of request
 * - **Cost Efficiency (5%)**: Resource usage and processing time
 * - **Redundancy Penalty (5%)**: Penalty for overlapping capabilities
 *
 * ## Design
 * - Configurable weights for different use cases
 * - Caching for performance
 * - Handles missing data gracefully
 *
 * @example
 * ```typescript
 * const evaluator = new FitnessEvaluator(supabase, enterpriseId);
 *
 * // Evaluate single combination
 * const fitness = await evaluator.evaluateCombination(
 *   [secretary, legal, financial],
 *   requestAnalysis
 * );
 *
 * // Evaluate with custom weights
 * const fitness = await evaluator.evaluateCombination(
 *   agents,
 *   analysis,
 *   { relevance: 0.5, performance: 0.5 }
 * );
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
 * Agent reference
 */
export interface AgentReference {
  type: string;
  taskType?: string;
  reason?: string;
  capabilities?: string[];
  priority: number;
}

/**
 * Fitness weights configuration
 */
export interface FitnessWeights {
  relevance: number;
  performance: number;
  coverage: number;
  cost: number;
  redundancy: number;
}

/**
 * Default fitness weights
 */
export const DEFAULT_FITNESS_WEIGHTS: FitnessWeights = {
  relevance: 0.40,
  performance: 0.30,
  coverage: 0.20,
  cost: 0.05,
  redundancy: 0.05,
};

/**
 * Detailed fitness breakdown
 */
export interface FitnessBreakdown {
  total: number;
  relevance: number;
  performance: number;
  coverage: number;
  cost: number;
  redundancy: number;
  metadata: {
    agentCount: number;
    matchedRequirements: string[];
    unmatchedRequirements: string[];
    redundantCapabilities: string[];
  };
}

/**
 * Fitness Evaluator - Calculates fitness scores for agent combinations
 *
 * Provides multi-factor fitness evaluation for PSO-based agent selection.
 */
export class FitnessEvaluator {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private weights: FitnessWeights;
  private cache: Map<string, FitnessBreakdown>;

  /**
   * Create a new FitnessEvaluator instance
   *
   * @param supabase - Supabase client for database operations
   * @param enterpriseId - Enterprise ID for multi-tenant isolation
   * @param weights - Optional custom fitness weights
   */
  constructor(
    supabase: SupabaseClient,
    enterpriseId: string,
    weights?: Partial<FitnessWeights>,
  ) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
    this.weights = { ...DEFAULT_FITNESS_WEIGHTS, ...weights };
    this.cache = new Map();
  }

  /**
   * Evaluate fitness of an agent combination
   *
   * Calculates overall fitness score considering relevance, performance,
   * coverage, cost, and redundancy.
   *
   * @param agents - Agent combination to evaluate
   * @param analysis - Request analysis
   * @param customWeights - Optional custom weights for this evaluation
   * @returns Fitness score (0-1, higher is better)
   *
   * @example
   * ```typescript
   * const fitness = await evaluator.evaluateCombination(
   *   [secretary, legal, financial],
   *   { type: 'contract_review', complexity: 'high', ... }
   * );
   * // Returns: 0.85 (excellent combination)
   * ```
   */
  async evaluateCombination(
    agents: AgentReference[],
    analysis: RequestAnalysis,
    customWeights?: Partial<FitnessWeights>,
  ): Promise<number> {
    const breakdown = await this.evaluateDetailed(agents, analysis, customWeights);
    return breakdown.total;
  }

  /**
   * Get detailed fitness breakdown
   *
   * Provides component scores and metadata for analysis.
   *
   * @param agents - Agent combination
   * @param analysis - Request analysis
   * @param customWeights - Optional custom weights
   * @returns Detailed fitness breakdown with component scores
   */
  async evaluateDetailed(
    agents: AgentReference[],
    analysis: RequestAnalysis,
    customWeights?: Partial<FitnessWeights>,
  ): Promise<FitnessBreakdown> {
    // Check cache
    const cacheKey = this.getCacheKey(agents, analysis);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Use custom weights if provided
    const weights = customWeights
      ? { ...this.weights, ...customWeights }
      : this.weights;

    // Calculate individual components
    const relevance = await this.calculateRelevance(agents, analysis);
    const performance = await this.calculateHistoricalPerformance(agents, analysis);
    const coverage = this.calculateCoverage(agents, analysis);
    const cost = this.calculateCost(agents);
    const redundancy = this.calculateRedundancy(agents);

    // Calculate total fitness
    const total =
      weights.relevance * relevance +
      weights.performance * performance +
      weights.coverage * coverage +
      weights.cost * (1 - cost) +
      weights.redundancy * (1 - redundancy);

    // Build metadata
    const metadata = {
      agentCount: agents.length,
      matchedRequirements: this.getMatchedRequirements(agents, analysis),
      unmatchedRequirements: this.getUnmatchedRequirements(agents, analysis),
      redundantCapabilities: this.getRedundantCapabilities(agents),
    };

    const breakdown: FitnessBreakdown = {
      total,
      relevance,
      performance,
      coverage,
      cost,
      redundancy,
      metadata,
    };

    // Cache result
    this.cache.set(cacheKey, breakdown);

    return breakdown;
  }

  /**
   * Calculate relevance score (0-1)
   *
   * Measures how well agent capabilities match request requirements.
   */
  async calculateRelevance(
    agents: AgentReference[],
    analysis: RequestAnalysis,
  ): Promise<number> {
    const requirements = this.extractRequirements(analysis);
    if (requirements.length === 0) return 0.5; // Neutral if no clear requirements

    let matchedCount = 0;

    for (const requirement of requirements) {
      // Check if any agent can handle this requirement
      const canHandle = agents.some(agent =>
        this.agentCanHandleRequirement(agent, requirement)
      );
      if (canHandle) matchedCount++;
    }

    return matchedCount / requirements.length;
  }

  /**
   * Calculate historical performance score (0-1)
   *
   * Based on past success rates for similar requests.
   */
  async calculateHistoricalPerformance(
    agents: AgentReference[],
    analysis: RequestAnalysis,
  ): Promise<number> {
    if (agents.length === 0) return 0;

    let totalPerformance = 0;

    for (const agent of agents) {
      const performance = await this.getAgentPerformance(agent.type, analysis.type);
      totalPerformance += performance;
    }

    return totalPerformance / agents.length;
  }

  /**
   * Calculate coverage score (0-1)
   *
   * Measures how well agents cover all aspects of the request.
   */
  calculateCoverage(
    agents: AgentReference[],
    analysis: RequestAnalysis,
  ): number {
    const requirements = this.extractRequirements(analysis);
    if (requirements.length === 0) return 1.0;

    const coverageMap = new Map<string, number>();

    // Count how many agents can handle each requirement
    for (const requirement of requirements) {
      const coverage = agents.filter(agent =>
        this.agentCanHandleRequirement(agent, requirement)
      ).length;
      coverageMap.set(requirement, coverage);
    }

    // Calculate average coverage
    let totalCoverage = 0;
    for (const coverage of coverageMap.values()) {
      // Ideal coverage is 1-2 agents per requirement
      if (coverage === 0) {
        totalCoverage += 0; // Not covered
      } else if (coverage === 1) {
        totalCoverage += 1.0; // Perfect coverage
      } else if (coverage === 2) {
        totalCoverage += 0.9; // Good redundancy
      } else {
        totalCoverage += 0.7; // Over-coverage
      }
    }

    return requirements.length > 0 ? totalCoverage / requirements.length : 1.0;
  }

  /**
   * Calculate cost score (0-1, lower is better)
   *
   * Based on expected resource usage and processing time.
   */
  calculateCost(agents: AgentReference[]): number {
    // Cost increases with agent count
    // 1-2 agents: low cost (0.2)
    // 3-4 agents: medium cost (0.5)
    // 5+ agents: high cost (0.8+)

    if (agents.length <= 2) return 0.2;
    if (agents.length <= 4) return 0.5;
    return Math.min(1.0, 0.5 + (agents.length - 4) * 0.1);
  }

  /**
   * Calculate redundancy penalty (0-1, lower is better)
   *
   * Penalizes overlapping capabilities.
   */
  calculateRedundancy(agents: AgentReference[]): number {
    if (agents.length <= 1) return 0;

    const allCapabilities: string[] = [];
    const uniqueCapabilities = new Set<string>();

    for (const agent of agents) {
      const capabilities = agent.capabilities || [];
      for (const capability of capabilities) {
        allCapabilities.push(capability);
        uniqueCapabilities.add(capability);
      }
    }

    if (allCapabilities.length === 0) return 0;

    // Redundancy = 1 - (unique / total)
    return 1 - (uniqueCapabilities.size / allCapabilities.length);
  }

  /**
   * Clear fitness cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods

  /**
   * Generate cache key
   */
  private getCacheKey(agents: AgentReference[], analysis: RequestAnalysis): string {
    const agentKey = agents.map(a => a.type).sort().join(',');
    return `${agentKey}_${analysis.type}_${analysis.complexity}`;
  }

  /**
   * Extract requirements from analysis
   */
  private extractRequirements(analysis: RequestAnalysis): string[] {
    const requirements: string[] = [];

    if (analysis.hasFinancialImpact) requirements.push('financial_analysis');
    if (analysis.hasLegalImplications) requirements.push('legal_review');
    if (analysis.hasComplianceRequirements) requirements.push('compliance_check');
    if (analysis.requiresAnalysis) requirements.push('analytics');

    // Add type-specific requirements
    if (analysis.type === 'document_processing') {
      requirements.push('document_processing');
    }
    if (analysis.type === 'vendor_evaluation') {
      requirements.push('vendor_management');
    }
    if (analysis.entities.contracts.length > 0) {
      requirements.push('contract_analysis');
    }

    return requirements;
  }

  /**
   * Check if agent can handle requirement
   */
  private agentCanHandleRequirement(agent: AgentReference, requirement: string): boolean {
    const capabilities = agent.capabilities || [];

    // Direct capability match
    if (capabilities.includes(requirement)) return true;

    // Agent type inference
    const agentCapabilityMap: Record<string, string[]> = {
      'secretary': ['document_processing', 'extraction'],
      'financial': ['financial_analysis', 'cost_analysis'],
      'legal': ['legal_review', 'contract_analysis'],
      'compliance': ['compliance_check', 'regulatory_analysis'],
      'vendor': ['vendor_management', 'vendor_evaluation'],
      'analytics': ['analytics', 'data_analysis'],
    };

    const inferredCapabilities = agentCapabilityMap[agent.type] || [];
    return inferredCapabilities.includes(requirement);
  }

  /**
   * Get agent performance for request type
   */
  private async getAgentPerformance(
    agentType: string,
    requestType: string,
  ): Promise<number> {
    try {
      // TODO(Phase 2): Query agent_performance_history table
      const { data, error } = await this.supabase
        .from('agent_logs')
        .select('success, confidence')
        .eq('enterprise_id', this.enterpriseId)
        .eq('agent_type', agentType)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) return 0.5; // Default performance

      // Calculate success rate and average confidence
      const successRate = data.filter(l => l.success).length / data.length;
      const avgConfidence = data.reduce((sum, l) => sum + (l.confidence || 0.5), 0) / data.length;

      // Weighted performance: 60% success rate, 40% confidence
      return (successRate * 0.6) + (avgConfidence * 0.4);
    } catch (error) {
      console.error(`Failed to fetch performance for ${agentType}:`, error);
      return 0.5; // Default on error
    }
  }

  /**
   * Get matched requirements
   */
  private getMatchedRequirements(
    agents: AgentReference[],
    analysis: RequestAnalysis,
  ): string[] {
    const requirements = this.extractRequirements(analysis);
    return requirements.filter(requirement =>
      agents.some(agent => this.agentCanHandleRequirement(agent, requirement))
    );
  }

  /**
   * Get unmatched requirements
   */
  private getUnmatchedRequirements(
    agents: AgentReference[],
    analysis: RequestAnalysis,
  ): string[] {
    const requirements = this.extractRequirements(analysis);
    return requirements.filter(requirement =>
      !agents.some(agent => this.agentCanHandleRequirement(agent, requirement))
    );
  }

  /**
   * Get redundant capabilities
   */
  private getRedundantCapabilities(agents: AgentReference[]): string[] {
    const capabilityCounts = new Map<string, number>();

    for (const agent of agents) {
      const capabilities = agent.capabilities || [];
      for (const capability of capabilities) {
        capabilityCounts.set(capability, (capabilityCounts.get(capability) || 0) + 1);
      }
    }

    // Return capabilities that appear more than once
    const redundant: string[] = [];
    for (const [capability, count] of capabilityCounts.entries()) {
      if (count > 1) redundant.push(capability);
    }

    return redundant;
  }
}
