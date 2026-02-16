/**
 * Prompt Version Manager
 *
 * Tracks prompt template versions, manages A/B testing,
 * records performance metrics, and supports rollback.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  PromptTemplate,
  PromptVersion,
  PromptPerformanceMetrics,
  PromptABTest,
  PromptAgentType,
  PromptCategory,
} from './types.ts';
import { hashContent } from './template-renderer.ts';

/** Default empty metrics for new prompt versions */
const EMPTY_METRICS: PromptPerformanceMetrics = {
  totalUsageCount: 0,
  successRate: 0,
  averageLatencyMs: 0,
  averageInputTokens: 0,
  averageOutputTokens: 0,
  averageCost: 0,
  userSatisfactionScore: null,
  lastUsedAt: null,
};

export class PromptVersionManager {
  private supabase: SupabaseClient;
  private enterpriseId: string;

  /** In-memory cache for active versions (refreshed on access) */
  private activeVersionCache: Map<string, PromptVersion> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private cacheTTLMs = 5 * 60 * 1000; // 5 minutes

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;
  }

  /**
   * Register a new prompt version in the database.
   * Automatically deactivates previous versions for the same template.
   */
  async registerVersion(
    template: PromptTemplate,
    createdBy: string = 'system',
  ): Promise<PromptVersion> {
    const checksum = await hashContent(template.template);
    const now = new Date().toISOString();

    // Deactivate previous active versions for this template
    await this.supabase
      .from('agent_prompt_versions')
      .update({ is_active: false, updated_at: now })
      .eq('template_id', template.id)
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true);

    // Insert new version
    const versionRecord = {
      template_id: template.id,
      agent_type: template.agentType,
      category: template.category,
      version: template.version,
      name: template.name,
      content: template.template,
      checksum,
      is_active: true,
      created_by: createdBy,
      enterprise_id: this.enterpriseId,
      metrics: EMPTY_METRICS,
      metadata: template.metadata,
      variables: template.variables,
      few_shot_examples: template.fewShotExamples || [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .from('agent_prompt_versions')
      .insert(versionRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register prompt version: ${error.message}`);
    }

    // Update cache
    this.activeVersionCache.set(template.id, this.mapRowToVersion(data));
    this.cacheExpiry.set(template.id, Date.now() + this.cacheTTLMs);

    return this.mapRowToVersion(data);
  }

  /**
   * Get the active version for a given template ID.
   * Uses in-memory cache with TTL.
   */
  async getActiveVersion(templateId: string): Promise<PromptVersion | null> {
    // Check cache
    const expiry = this.cacheExpiry.get(templateId);
    if (expiry && Date.now() < expiry) {
      const cached = this.activeVersionCache.get(templateId);
      if (cached) return cached;
    }

    const { data, error } = await this.supabase
      .from('agent_prompt_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    const version = this.mapRowToVersion(data);
    this.activeVersionCache.set(templateId, version);
    this.cacheExpiry.set(templateId, Date.now() + this.cacheTTLMs);
    return version;
  }

  /**
   * Get all versions for a template, ordered by creation date descending.
   */
  async getVersionHistory(templateId: string): Promise<PromptVersion[]> {
    const { data, error } = await this.supabase
      .from('agent_prompt_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('enterprise_id', this.enterpriseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch version history: ${error.message}`);
    return (data || []).map(row => this.mapRowToVersion(row));
  }

  /**
   * Rollback to a specific version by ID.
   * Deactivates the current version and activates the target.
   */
  async rollback(templateId: string, targetVersionId: string): Promise<PromptVersion> {
    const now = new Date().toISOString();

    // Deactivate current
    await this.supabase
      .from('agent_prompt_versions')
      .update({ is_active: false, updated_at: now })
      .eq('template_id', templateId)
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true);

    // Activate target
    const { data, error } = await this.supabase
      .from('agent_prompt_versions')
      .update({ is_active: true, updated_at: now })
      .eq('id', targetVersionId)
      .eq('enterprise_id', this.enterpriseId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Rollback failed: ${error?.message || 'Version not found'}`);
    }

    // Update cache
    const version = this.mapRowToVersion(data);
    this.activeVersionCache.set(templateId, version);
    this.cacheExpiry.set(templateId, Date.now() + this.cacheTTLMs);

    return version;
  }

  // ── Performance Tracking ──────────────────────────────────────────

  /**
   * Record a prompt execution and update running performance metrics.
   */
  async recordExecution(
    versionId: string,
    execution: {
      success: boolean;
      latencyMs: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      satisfactionScore?: number;
    },
  ): Promise<void> {
    const now = new Date().toISOString();

    // Insert execution log
    await this.supabase.from('agent_prompt_executions').insert({
      version_id: versionId,
      enterprise_id: this.enterpriseId,
      success: execution.success,
      latency_ms: execution.latencyMs,
      input_tokens: execution.inputTokens,
      output_tokens: execution.outputTokens,
      cost: execution.cost,
      satisfaction_score: execution.satisfactionScore ?? null,
      executed_at: now,
    });

    // Update aggregate metrics on the version row
    const { data: current } = await this.supabase
      .from('agent_prompt_versions')
      .select('metrics')
      .eq('id', versionId)
      .single();

    if (current) {
      const m = current.metrics as PromptPerformanceMetrics;
      const n = m.totalUsageCount + 1;
      const updated: PromptPerformanceMetrics = {
        totalUsageCount: n,
        successRate: ((m.successRate * m.totalUsageCount) + (execution.success ? 1 : 0)) / n,
        averageLatencyMs: ((m.averageLatencyMs * m.totalUsageCount) + execution.latencyMs) / n,
        averageInputTokens: ((m.averageInputTokens * m.totalUsageCount) + execution.inputTokens) / n,
        averageOutputTokens: ((m.averageOutputTokens * m.totalUsageCount) + execution.outputTokens) / n,
        averageCost: ((m.averageCost * m.totalUsageCount) + execution.cost) / n,
        userSatisfactionScore: execution.satisfactionScore != null
          ? ((m.userSatisfactionScore ?? 0) * m.totalUsageCount + execution.satisfactionScore) / n
          : m.userSatisfactionScore,
        lastUsedAt: now,
      };

      await this.supabase
        .from('agent_prompt_versions')
        .update({ metrics: updated, updated_at: now })
        .eq('id', versionId);
    }
  }

  /**
   * Get performance metrics for a specific version.
   */
  async getMetrics(versionId: string): Promise<PromptPerformanceMetrics | null> {
    const { data, error } = await this.supabase
      .from('agent_prompt_versions')
      .select('metrics')
      .eq('id', versionId)
      .single();

    if (error || !data) return null;
    return data.metrics as PromptPerformanceMetrics;
  }

  /**
   * Compare metrics between two versions (for A/B test evaluation).
   */
  async compareVersions(
    versionAId: string,
    versionBId: string,
  ): Promise<{
    versionA: PromptPerformanceMetrics;
    versionB: PromptPerformanceMetrics;
    winner: 'A' | 'B' | 'inconclusive';
    reason: string;
  }> {
    const [metricsA, metricsB] = await Promise.all([
      this.getMetrics(versionAId),
      this.getMetrics(versionBId),
    ]);

    if (!metricsA || !metricsB) {
      throw new Error('Cannot compare: one or both versions have no metrics');
    }

    // Determine winner based on composite score:
    // 60% success rate + 20% latency (lower is better) + 20% cost (lower is better)
    const scoreA = this.computeCompositeScore(metricsA);
    const scoreB = this.computeCompositeScore(metricsB);

    const minSamples = 30;
    const significanceThreshold = 0.05; // 5% difference needed

    let winner: 'A' | 'B' | 'inconclusive' = 'inconclusive';
    let reason = '';

    if (metricsA.totalUsageCount < minSamples || metricsB.totalUsageCount < minSamples) {
      reason = `Insufficient samples (A: ${metricsA.totalUsageCount}, B: ${metricsB.totalUsageCount}). Need ${minSamples} each.`;
    } else if (Math.abs(scoreA - scoreB) < significanceThreshold) {
      reason = `No significant difference (A: ${scoreA.toFixed(3)}, B: ${scoreB.toFixed(3)})`;
    } else {
      winner = scoreA > scoreB ? 'A' : 'B';
      reason = `Version ${winner} scores higher (A: ${scoreA.toFixed(3)}, B: ${scoreB.toFixed(3)})`;
    }

    return { versionA: metricsA, versionB: metricsB, winner, reason };
  }

  // ── A/B Testing ───────────────────────────────────────────────────

  /**
   * Create a new A/B test between two prompt versions.
   */
  async createABTest(
    name: string,
    templateId: string,
    variantAVersionId: string,
    variantBVersionId: string,
    trafficSplitPercent: number = 50,
  ): Promise<PromptABTest> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('agent_prompt_ab_tests')
      .insert({
        name,
        template_id: templateId,
        variant_a: variantAVersionId,
        variant_b: variantBVersionId,
        traffic_split_percent: Math.min(100, Math.max(0, trafficSplitPercent)),
        status: 'draft',
        enterprise_id: this.enterpriseId,
        sample_size: 0,
        confidence_level: 0.95,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create A/B test: ${error.message}`);
    return this.mapRowToABTest(data);
  }

  /**
   * Select which variant to use for a given A/B test.
   * Returns the version ID to use based on traffic split.
   */
  async selectABVariant(testId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('agent_prompt_ab_tests')
      .select('*')
      .eq('id', testId)
      .eq('status', 'running')
      .single();

    if (error || !data) {
      throw new Error('A/B test not found or not running');
    }

    // Simple random assignment based on traffic split
    const random = Math.random() * 100;
    const selectedVersion = random < data.traffic_split_percent
      ? data.variant_b
      : data.variant_a;

    // Increment sample size
    await this.supabase
      .from('agent_prompt_ab_tests')
      .update({
        sample_size: data.sample_size + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', testId);

    return selectedVersion;
  }

  /**
   * Complete an A/B test and determine the winner.
   */
  async completeABTest(testId: string): Promise<PromptABTest> {
    const { data: test, error: fetchError } = await this.supabase
      .from('agent_prompt_ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (fetchError || !test) throw new Error('A/B test not found');

    const comparison = await this.compareVersions(test.variant_a, test.variant_b);
    const now = new Date().toISOString();

    const winnerVersion = comparison.winner === 'A'
      ? test.variant_a
      : comparison.winner === 'B'
        ? test.variant_b
        : null;

    const { data, error } = await this.supabase
      .from('agent_prompt_ab_tests')
      .update({
        status: 'completed',
        completed_at: now,
        winner_version: winnerVersion,
        updated_at: now,
      })
      .eq('id', testId)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete A/B test: ${error.message}`);

    // If there's a winner, activate it
    if (winnerVersion) {
      await this.supabase
        .from('agent_prompt_versions')
        .update({ is_active: false, updated_at: now })
        .eq('template_id', test.template_id)
        .eq('enterprise_id', this.enterpriseId)
        .eq('is_active', true);

      await this.supabase
        .from('agent_prompt_versions')
        .update({ is_active: true, updated_at: now })
        .eq('id', winnerVersion);
    }

    return this.mapRowToABTest(data);
  }

  // ── Listing & Querying ────────────────────────────────────────────

  /**
   * List all active prompt templates for an agent type.
   */
  async listActiveTemplates(
    agentType?: PromptAgentType,
    category?: PromptCategory,
  ): Promise<PromptVersion[]> {
    let query = this.supabase
      .from('agent_prompt_versions')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true);

    if (agentType) query = query.eq('agent_type', agentType);
    if (category) query = query.eq('category', category);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list templates: ${error.message}`);
    return (data || []).map(row => this.mapRowToVersion(row));
  }

  // ── Private Helpers ───────────────────────────────────────────────

  private computeCompositeScore(m: PromptPerformanceMetrics): number {
    // Normalize latency (lower is better, cap at 10s)
    const normalizedLatency = 1 - Math.min(m.averageLatencyMs / 10000, 1);
    // Normalize cost (lower is better, cap at $0.10)
    const normalizedCost = 1 - Math.min(m.averageCost / 0.10, 1);

    return (m.successRate * 0.6) + (normalizedLatency * 0.2) + (normalizedCost * 0.2);
  }

  private mapRowToVersion(row: Record<string, unknown>): PromptVersion {
    return {
      id: row.id as string,
      templateId: row.template_id as string,
      version: row.version as string,
      content: row.content as string,
      checksum: row.checksum as string,
      isActive: row.is_active as boolean,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      metrics: row.metrics as PromptPerformanceMetrics,
    };
  }

  private mapRowToABTest(row: Record<string, unknown>): PromptABTest {
    return {
      id: row.id as string,
      name: row.name as string,
      templateId: row.template_id as string,
      variantA: row.variant_a as string,
      variantB: row.variant_b as string,
      trafficSplitPercent: row.traffic_split_percent as number,
      status: row.status as PromptABTest['status'],
      startedAt: row.started_at as string | null,
      completedAt: row.completed_at as string | null,
      winnerVersion: row.winner_version as string | null,
      sampleSize: row.sample_size as number,
      confidenceLevel: row.confidence_level as number,
    };
  }
}
