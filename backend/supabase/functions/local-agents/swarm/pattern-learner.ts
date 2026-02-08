/**
 * Pattern Learner Module
 *
 * Detects and stores emergent collaboration patterns from successful
 * multi-agent orchestrations.
 *
 * @module PatternLearner
 * @version 2.0.0 (Phase 5: Full Implementation)
 *
 * ## Pattern Types
 * - **Sequential**: Ordered agent chains (A → B → C)
 * - **Parallel**: Concurrent execution with synthesis (A || B || C → D)
 * - **Conditional**: Threshold-based agent selection
 * - **Escalation**: Risk-triggered additional reviews
 *
 * ## Learning Mechanism
 * - Patterns with 80%+ success rate and 10+ uses are auto-suggested
 * - Stores requestSignature for pattern matching
 * - Tracks emergenceScore (organic discovery vs manual design)
 * - Surfaces patterns to users with explanations
 *
 * ## Pattern Detection
 * 1. Group similar requests by signature (type, complexity, entities)
 * 2. Identify common agent sequences
 * 3. Calculate success rates and confidence scores
 * 4. Assign emergence scores (1.0 = fully organic, 0.0 = manual)
 * 5. Store patterns with 80%+ success and 10+ uses
 *
 * @example
 * ```typescript
 * const learner = new PatternLearner(supabase, enterpriseId);
 *
 * // Detect patterns from execution history
 * const patterns = await learner.detectPatterns(executionHistory);
 *
 * // Find matching patterns for a request
 * const match = await learner.findMatchingPatterns({
 *   type: 'contract_review',
 *   complexity: 'high',
 *   hasLegalImplications: true
 * });
 *
 * // Store a new pattern
 * await learner.storePattern({
 *   type: 'sequential',
 *   name: 'Contract Review - High Complexity',
 *   agentSequence: ['secretary', 'legal', 'financial', 'compliance']
 * });
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Pattern type enumeration
 */
export type PatternType = 'sequential' | 'parallel' | 'conditional' | 'escalation';

/**
 * Request signature for pattern matching
 */
export interface RequestSignature {
  type: string;
  complexity: string;
  hasFinancialImpact?: boolean;
  hasLegalImplications?: boolean;
  hasComplianceRequirements?: boolean;
  requiresAnalysis?: boolean;
  entityCount?: number;
}

/**
 * Detected pattern
 */
export interface DetectedPattern {
  type: PatternType;
  name: string;
  description?: string;
  requestSignature: RequestSignature;
  agentSequence: string[];
  successRate: number;
  avgConfidence: number;
  avgDuration: number;
  usageCount: number;
  emergenceScore: number;
}

/**
 * Stored pattern from database
 */
export interface StoredPattern extends DetectedPattern {
  id: string;
  discoveredAt: Date;
  lastUsedAt: Date | null;
}

/**
 * Execution record for pattern detection
 */
export interface ExecutionRecord {
  orchestrationId: string;
  requestType: string;
  complexity: string;
  agentSequence: string[];
  success: boolean;
  confidence: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Pattern Learner - Detects and stores emergent patterns
 */
export class PatternLearner {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private cache: Map<string, StoredPattern[]> = new Map();

  /**
   * Create a new PatternLearner instance
   *
   * @param supabase - Supabase client for database operations
   * @param enterpriseId - Enterprise ID for multi-tenant isolation
   */
  constructor(supabase: SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
  }

  /**
   * Detect patterns from execution history
   *
   * Analyzes recent executions to identify recurring successful patterns.
   *
   * @param executionHistory - Recent orchestration executions
   * @param minOccurrences - Minimum occurrences to consider (default: 5)
   * @returns Array of detected patterns
   */
  async detectPatterns(
    executionHistory: ExecutionRecord[],
    minOccurrences: number = 5,
  ): Promise<DetectedPattern[]> {
    if (executionHistory.length === 0) return [];

    // Group executions by request signature
    const groups = this.groupBySignature(executionHistory);

    const detectedPatterns: DetectedPattern[] = [];

    for (const [signatureKey, executions] of groups.entries()) {
      if (executions.length < minOccurrences) continue;

      // Find common agent sequences
      const sequenceGroups = this.groupBySequence(executions);

      for (const [sequence, records] of sequenceGroups.entries()) {
        if (records.length < minOccurrences) continue;

        // Calculate metrics
        const successRate = records.filter(r => r.success).length / records.length;
        const avgConfidence =
          records.reduce((sum, r) => sum + r.confidence, 0) / records.length;
        const avgDuration =
          records.reduce((sum, r) => sum + r.duration, 0) / records.length;

        // Only consider high-performing patterns
        if (successRate < 0.8) continue;

        // Determine pattern type
        const patternType = this.determinePatternType(
          sequence.split('->'),
          records,
        );

        // Calculate emergence score (1.0 = fully organic)
        const emergenceScore = Math.min(
          1.0,
          records.length / 20, // More uses = more organic
        );

        // Parse signature
        const signature = this.parseSignature(signatureKey);

        detectedPatterns.push({
          type: patternType,
          name: this.generatePatternName(signature, sequence.split('->')),
          description: this.generatePatternDescription(
            patternType,
            sequence.split('->'),
            successRate,
          ),
          requestSignature: signature,
          agentSequence: sequence.split('->'),
          successRate,
          avgConfidence,
          avgDuration,
          usageCount: records.length,
          emergenceScore,
        });
      }
    }

    return detectedPatterns;
  }

  /**
   * Find matching patterns for a request
   *
   * Searches for stored patterns that match the request signature.
   *
   * @param signature - Request signature to match
   * @param minSuccessRate - Minimum success rate (default: 0.8)
   * @returns Best matching pattern or null
   */
  async findMatchingPatterns(
    signature: RequestSignature,
    minSuccessRate: number = 0.8,
  ): Promise<StoredPattern | null> {
    const cacheKey = this.getSignatureKey(signature);

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached.length > 0 ? cached[0] : null;
    }

    try {
      // Query database for matching patterns
      const { data, error } = await this.supabase
        .from('agent_swarm_patterns')
        .select('*')
        .eq('enterprise_id', this.enterpriseId)
        .gte('success_rate', minSuccessRate)
        .gte('usage_count', 10) // Only well-established patterns
        .contains('request_signature', signature as unknown as Record<string, unknown>)
        .order('success_rate', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(5);

      if (error) throw error;

      const patterns = (data || []).map(row => this.rowToPattern(row));

      // Cache results
      this.cache.set(cacheKey, patterns);

      // Return best pattern
      return patterns.length > 0 ? patterns[0] : null;
    } catch (error) {
      console.error('Failed to find matching patterns:', error);
      return null;
    }
  }

  /**
   * Store a new pattern
   *
   * Persists a detected or manually created pattern to the database.
   *
   * @param pattern - Pattern to store
   * @returns Pattern ID
   */
  async storePattern(pattern: DetectedPattern): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('agent_swarm_patterns')
        .insert({
          enterprise_id: this.enterpriseId,
          pattern_type: pattern.type,
          name: pattern.name,
          description: pattern.description,
          request_signature: pattern.requestSignature,
          agent_sequence: pattern.agentSequence,
          success_rate: pattern.successRate,
          avg_confidence: pattern.avgConfidence,
          avg_duration_ms: Math.round(pattern.avgDuration),
          usage_count: pattern.usageCount,
          emergence_score: pattern.emergenceScore,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Invalidate cache
      this.cache.clear();

      return data.id;
    } catch (error) {
      console.error('Failed to store pattern:', error);
      throw error;
    }
  }

  /**
   * Update pattern metrics after execution
   *
   * Updates success rate, confidence, and usage count for a pattern.
   *
   * @param patternId - Pattern identifier
   * @param success - Whether execution succeeded
   * @param confidence - Confidence score
   * @param duration - Execution duration in ms
   */
  async updatePatternMetrics(
    patternId: string,
    success: boolean,
    confidence: number,
    duration: number,
  ): Promise<void> {
    try {
      // Fetch current metrics
      const { data: current } = await this.supabase
        .from('agent_swarm_patterns')
        .select('success_rate, avg_confidence, avg_duration_ms, usage_count')
        .eq('id', patternId)
        .single();

      if (!current) return;

      // Calculate new metrics (running average)
      const oldCount = current.usage_count;
      const newCount = oldCount + 1;

      const newSuccessRate =
        (current.success_rate * oldCount + (success ? 1 : 0)) / newCount;
      const newAvgConfidence =
        (current.avg_confidence * oldCount + confidence) / newCount;
      const newAvgDuration =
        (current.avg_duration_ms * oldCount + duration) / newCount;

      // Update database
      await this.supabase
        .from('agent_swarm_patterns')
        .update({
          success_rate: newSuccessRate,
          avg_confidence: newAvgConfidence,
          avg_duration_ms: Math.round(newAvgDuration),
          usage_count: newCount,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', patternId);

      // Invalidate cache
      this.cache.clear();
    } catch (error) {
      console.error('Failed to update pattern metrics:', error);
    }
  }

  /**
   * Get all patterns for analytics
   */
  async getAllPatterns(
    minUsageCount: number = 10,
  ): Promise<StoredPattern[]> {
    try {
      const { data, error } = await this.supabase
        .from('agent_swarm_patterns')
        .select('*')
        .eq('enterprise_id', this.enterpriseId)
        .gte('usage_count', minUsageCount)
        .order('success_rate', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => this.rowToPattern(row));
    } catch (error) {
      console.error('Failed to get patterns:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Group executions by request signature
   */
  private groupBySignature(
    executions: ExecutionRecord[],
  ): Map<string, ExecutionRecord[]> {
    const groups = new Map<string, ExecutionRecord[]>();

    for (const exec of executions) {
      const signature: RequestSignature = {
        type: exec.requestType,
        complexity: exec.complexity,
        hasFinancialImpact: exec.metadata?.hasFinancialImpact as boolean,
        hasLegalImplications: exec.metadata?.hasLegalImplications as boolean,
        hasComplianceRequirements: exec.metadata?.hasComplianceRequirements as boolean,
        requiresAnalysis: exec.metadata?.requiresAnalysis as boolean,
      };

      const key = this.getSignatureKey(signature);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(exec);
    }

    return groups;
  }

  /**
   * Group executions by agent sequence
   */
  private groupBySequence(
    executions: ExecutionRecord[],
  ): Map<string, ExecutionRecord[]> {
    const groups = new Map<string, ExecutionRecord[]>();

    for (const exec of executions) {
      const key = exec.agentSequence.join('->');

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(exec);
    }

    return groups;
  }

  /**
   * Determine pattern type from sequence and records
   */
  private determinePatternType(
    sequence: string[],
    records: ExecutionRecord[],
  ): PatternType {
    // Check if pattern involves escalation (additional agents for high risk)
    const hasEscalation = records.some(r =>
      r.metadata?.escalated === true
    );
    if (hasEscalation) return 'escalation';

    // Check if pattern is conditional (varies based on conditions)
    const uniqueSequences = new Set(records.map(r => r.agentSequence.join('->')));
    if (uniqueSequences.size > 1) return 'conditional';

    // Check if agents can run in parallel (simple heuristic)
    const canParallelize = sequence.length >= 3 &&
      !sequence.includes('secretary'); // Secretary usually runs first
    if (canParallelize) return 'parallel';

    // Default to sequential
    return 'sequential';
  }

  /**
   * Generate pattern name
   */
  private generatePatternName(
    signature: RequestSignature,
    sequence: string[],
  ): string {
    const typeLabel = signature.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const complexityLabel = signature.complexity.charAt(0).toUpperCase() + signature.complexity.slice(1);

    return `${typeLabel} - ${complexityLabel} Complexity (${sequence.length} agents)`;
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(
    type: PatternType,
    sequence: string[],
    successRate: number,
  ): string {
    const typeDescriptions = {
      sequential: `Sequential execution: ${sequence.join(' → ')}`,
      parallel: `Parallel execution with final synthesis: ${sequence.join(' || ')}`,
      conditional: `Conditional execution based on request characteristics`,
      escalation: `Escalation pattern with risk-based agent addition`,
    };

    const successPct = Math.round(successRate * 100);
    return `${typeDescriptions[type]}. Success rate: ${successPct}%`;
  }

  /**
   * Get signature key for caching/grouping
   */
  private getSignatureKey(signature: RequestSignature): string {
    return JSON.stringify({
      type: signature.type,
      complexity: signature.complexity,
      financial: signature.hasFinancialImpact || false,
      legal: signature.hasLegalImplications || false,
      compliance: signature.hasComplianceRequirements || false,
    });
  }

  /**
   * Parse signature from key
   */
  private parseSignature(key: string): RequestSignature {
    const parsed = JSON.parse(key);
    return {
      type: parsed.type,
      complexity: parsed.complexity,
      hasFinancialImpact: parsed.financial,
      hasLegalImplications: parsed.legal,
      hasComplianceRequirements: parsed.compliance,
    };
  }

  /**
   * Convert database row to StoredPattern
   */
  private rowToPattern(row: DatabasePattern): StoredPattern {
    return {
      id: row.id,
      type: row.pattern_type as PatternType,
      name: row.name,
      description: row.description || undefined,
      requestSignature: row.request_signature as RequestSignature,
      agentSequence: row.agent_sequence,
      successRate: parseFloat(row.success_rate),
      avgConfidence: parseFloat(row.avg_confidence),
      avgDuration: row.avg_duration_ms,
      usageCount: row.usage_count,
      emergenceScore: parseFloat(row.emergence_score),
      discoveredAt: new Date(row.discovered_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
    };
  }
}

/**
 * Database pattern row type
 */
interface DatabasePattern {
  id: string;
  enterprise_id: string;
  pattern_type: string;
  name: string;
  description: string | null;
  request_signature: unknown;
  agent_sequence: string[];
  success_rate: string;
  avg_confidence: string;
  avg_duration_ms: number;
  usage_count: number;
  emergence_score: string;
  discovered_at: string;
  last_used_at: string | null;
}
