/// <reference path="../../../types/global.d.ts" />

/**
 * AI Cost Tracking Service
 *
 * Tracks AI API usage costs per enterprise with:
 * - Real-time cost accumulation
 * - Budget enforcement with soft/hard limits
 * - Usage analytics and reporting
 * - Cost alerts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ClaudeModel } from './claude-client.ts';

// ==================== Types ====================

export interface UsageRecord {
  id?: string;
  enterpriseId: string;
  userId?: string;
  agentType?: string;
  model: string;
  provider: 'anthropic' | 'openai';
  inputTokens: number;
  outputTokens: number;
  cost: number;
  operationType: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  byModel: Record<string, { cost: number; requests: number }>;
  byAgent: Record<string, { cost: number; requests: number }>;
  byOperation: Record<string, { cost: number; requests: number }>;
}

export interface BudgetConfig {
  monthlySoftLimit: number;
  monthlyHardLimit: number;
  dailyLimit?: number;
  alertThresholds: number[]; // Percentages like [50, 75, 90]
}

export interface BudgetStatus {
  currentMonthCost: number;
  currentDayCost: number;
  monthlyBudget: number;
  dailyBudget?: number;
  remainingMonthly: number;
  remainingDaily?: number;
  percentUsed: number;
  isOverSoftLimit: boolean;
  isOverHardLimit: boolean;
  alertLevel: 'normal' | 'warning' | 'critical' | 'exceeded';
}

// ==================== User-Level AI Limits ====================

export interface UserAILimits {
  daily: number;       // $ per day
  monthly: number;     // $ per month
  maxTokens: number;   // tokens per request
  source: 'custom' | 'role' | 'default';
}

export interface UserBudgetStatus {
  userId: string;
  limits: UserAILimits;
  usage: {
    today: number;
    thisMonth: number;
    todayTokens: number;
    monthTokens: number;
  };
  remaining: {
    daily: number;
    monthly: number;
  };
  canOperate: boolean;
  blockReason?: string;
}

export interface UserOperationCheck {
  allowed: boolean;
  reason?: string;
  userBudgetStatus: UserBudgetStatus;
  enterpriseBudgetStatus: BudgetStatus;
}

// Model pricing per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude models
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  // OpenAI models (for embeddings)
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

// Default budget configuration
const DEFAULT_BUDGET: BudgetConfig = {
  monthlySoftLimit: 400,
  monthlyHardLimit: 500,
  dailyLimit: 50,
  alertThresholds: [50, 75, 90, 100],
};

// ==================== Cost Tracker ====================

export class CostTracker {
  private supabase: SupabaseClient;
  private enterpriseId: string;
  private usageBuffer: UsageRecord[] = [];
  private flushInterval: number | null = null;
  private budgetCache: Map<string, { budget: BudgetConfig; expiry: number }> = new Map();
  private userLimitsCache: Map<string, { limits: UserAILimits; expiry: number }> = new Map();

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    this.supabase = supabase;
    this.enterpriseId = enterpriseId;

    // Start periodic flush (every 30 seconds)
    this.startPeriodicFlush();
  }

  /**
   * Record token usage and calculate cost
   */
  async recordUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    operationType: string,
    options: {
      userId?: string;
      agentType?: string;
      provider?: 'anthropic' | 'openai';
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<{ cost: number; budgetStatus: BudgetStatus }> {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    const record: UsageRecord = {
      enterpriseId: this.enterpriseId,
      userId: options.userId,
      agentType: options.agentType,
      model,
      provider: options.provider || this.detectProvider(model),
      inputTokens,
      outputTokens,
      cost,
      operationType,
      metadata: options.metadata,
      createdAt: new Date().toISOString(),
    };

    // Add to buffer for batch insert
    this.usageBuffer.push(record);

    // Flush if buffer is large
    if (this.usageBuffer.length >= 10) {
      await this.flushBuffer();
    }

    // Check budget status
    const budgetStatus = await this.getBudgetStatus();

    // Send alerts if needed
    await this.checkAndSendAlerts(budgetStatus);

    return { cost, budgetStatus };
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      console.warn(`Unknown model pricing: ${model}, using default`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<BudgetStatus> {
    const budget = await this.getEnterpriseBudget();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get monthly cost
    const { data: monthlyData } = await this.supabase
      .from('ai_usage_logs')
      .select('cost')
      .eq('enterprise_id', this.enterpriseId)
      .gte('created_at', startOfMonth.toISOString());

    const currentMonthCost = monthlyData?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;

    // Get daily cost
    const { data: dailyData } = await this.supabase
      .from('ai_usage_logs')
      .select('cost')
      .eq('enterprise_id', this.enterpriseId)
      .gte('created_at', startOfDay.toISOString());

    const currentDayCost = dailyData?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;

    const percentUsed = (currentMonthCost / budget.monthlyHardLimit) * 100;
    const isOverSoftLimit = currentMonthCost >= budget.monthlySoftLimit;
    const isOverHardLimit = currentMonthCost >= budget.monthlyHardLimit;

    let alertLevel: BudgetStatus['alertLevel'] = 'normal';
    if (isOverHardLimit) {
      alertLevel = 'exceeded';
    } else if (percentUsed >= 90) {
      alertLevel = 'critical';
    } else if (percentUsed >= 75) {
      alertLevel = 'warning';
    }

    return {
      currentMonthCost,
      currentDayCost,
      monthlyBudget: budget.monthlyHardLimit,
      dailyBudget: budget.dailyLimit,
      remainingMonthly: Math.max(0, budget.monthlyHardLimit - currentMonthCost),
      remainingDaily: budget.dailyLimit ? Math.max(0, budget.dailyLimit - currentDayCost) : undefined,
      percentUsed,
      isOverSoftLimit,
      isOverHardLimit,
      alertLevel,
    };
  }

  /**
   * Get usage summary for a time period
   */
  async getUsageSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<CostSummary> {
    const { data } = await this.supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const records = data || [];

    const summary: CostSummary = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      requestCount: records.length,
      byModel: {},
      byAgent: {},
      byOperation: {},
    };

    for (const record of records) {
      summary.totalCost += record.cost || 0;
      summary.totalInputTokens += record.input_tokens || 0;
      summary.totalOutputTokens += record.output_tokens || 0;

      // By model
      const model = record.model || 'unknown';
      if (!summary.byModel[model]) {
        summary.byModel[model] = { cost: 0, requests: 0 };
      }
      summary.byModel[model].cost += record.cost || 0;
      summary.byModel[model].requests++;

      // By agent
      const agent = record.agent_type || 'unknown';
      if (!summary.byAgent[agent]) {
        summary.byAgent[agent] = { cost: 0, requests: 0 };
      }
      summary.byAgent[agent].cost += record.cost || 0;
      summary.byAgent[agent].requests++;

      // By operation
      const operation = record.operation_type || 'unknown';
      if (!summary.byOperation[operation]) {
        summary.byOperation[operation] = { cost: 0, requests: 0 };
      }
      summary.byOperation[operation].cost += record.cost || 0;
      summary.byOperation[operation].requests++;
    }

    return summary;
  }

  /**
   * Check if operation is allowed within budget
   */
  async canPerformOperation(estimatedCost: number): Promise<{
    allowed: boolean;
    reason?: string;
    budgetStatus: BudgetStatus;
  }> {
    const budgetStatus = await this.getBudgetStatus();

    if (budgetStatus.isOverHardLimit) {
      return {
        allowed: false,
        reason: 'Monthly budget limit exceeded',
        budgetStatus,
      };
    }

    if (budgetStatus.dailyBudget && budgetStatus.currentDayCost + estimatedCost > budgetStatus.dailyBudget) {
      return {
        allowed: false,
        reason: 'Daily budget limit would be exceeded',
        budgetStatus,
      };
    }

    if (budgetStatus.currentMonthCost + estimatedCost > budgetStatus.monthlyBudget) {
      return {
        allowed: false,
        reason: 'Monthly budget limit would be exceeded',
        budgetStatus,
      };
    }

    return { allowed: true, budgetStatus };
  }

  /**
   * Estimate cost for an operation
   */
  estimateCost(
    model: ClaudeModel | string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
  ): number {
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  // ==================== User-Level Budget Methods ====================

  /**
   * Get AI limits for a specific user
   * Checks custom overrides first, then falls back to role-based limits
   */
  async getUserLimits(userId: string): Promise<UserAILimits> {
    // Check cache first
    const cacheKey = `${userId}_${this.enterpriseId}`;
    const cached = this.userLimitsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.limits;
    }

    // Call database function to get effective limits
    const { data, error } = await this.supabase.rpc('get_user_ai_limits', {
      p_user_id: userId,
      p_enterprise_id: this.enterpriseId,
    });

    if (error || !data || data.length === 0) {
      // Return defaults if lookup fails
      const defaults: UserAILimits = {
        daily: 5,
        monthly: 50,
        maxTokens: 4000,
        source: 'default',
      };
      return defaults;
    }

    const row = data[0];
    const limits: UserAILimits = {
      daily: Number(row.daily_limit),
      monthly: Number(row.monthly_limit),
      maxTokens: Number(row.max_tokens_per_request),
      source: row.source as 'custom' | 'role' | 'default',
    };

    // Cache for 5 minutes
    this.userLimitsCache.set(cacheKey, {
      limits,
      expiry: Date.now() + 5 * 60 * 1000,
    });

    return limits;
  }

  /**
   * Get full budget status for a user including usage and remaining amounts
   */
  async getUserBudgetStatus(userId: string): Promise<UserBudgetStatus> {
    // Get user limits
    const limits = await this.getUserLimits(userId);

    // Get user's current usage via database function
    const { data: usageData, error } = await this.supabase.rpc('get_user_ai_usage', {
      p_user_id: userId,
      p_enterprise_id: this.enterpriseId,
    });

    let usage = {
      today: 0,
      thisMonth: 0,
      todayTokens: 0,
      monthTokens: 0,
    };

    if (!error && usageData && usageData.length > 0) {
      const row = usageData[0];
      usage = {
        today: Number(row.today_cost || 0),
        thisMonth: Number(row.month_cost || 0),
        todayTokens: Number(row.today_tokens || 0),
        monthTokens: Number(row.month_tokens || 0),
      };
    }

    const remaining = {
      daily: Math.max(0, limits.daily - usage.today),
      monthly: Math.max(0, limits.monthly - usage.thisMonth),
    };

    // Determine if user can operate and why not
    let canOperate = true;
    let blockReason: string | undefined;

    if (usage.today >= limits.daily) {
      canOperate = false;
      blockReason = `Daily AI budget exceeded ($${limits.daily.toFixed(2)} limit)`;
    } else if (usage.thisMonth >= limits.monthly) {
      canOperate = false;
      blockReason = `Monthly AI budget exceeded ($${limits.monthly.toFixed(2)} limit)`;
    }

    return {
      userId,
      limits,
      usage,
      remaining,
      canOperate,
      blockReason,
    };
  }

  /**
   * Check if a user can perform an AI operation
   * Validates against all three limits: daily, monthly, and token count
   */
  async canUserPerformOperation(
    userId: string,
    estimatedCost: number,
    estimatedTokens: number = 0,
  ): Promise<UserOperationCheck> {
    // Get user budget status
    const userStatus = await this.getUserBudgetStatus(userId);

    // Get enterprise budget status
    const enterpriseStatus = await this.getBudgetStatus();

    // Check token limit first (hard cap on request size)
    if (estimatedTokens > 0 && estimatedTokens > userStatus.limits.maxTokens) {
      return {
        allowed: false,
        reason: `Request exceeds maximum tokens per request (${userStatus.limits.maxTokens})`,
        userBudgetStatus: {
          ...userStatus,
          canOperate: false,
          blockReason: `Request exceeds maximum tokens per request (${userStatus.limits.maxTokens})`,
        },
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    // Check user daily limit
    if (userStatus.usage.today + estimatedCost > userStatus.limits.daily) {
      return {
        allowed: false,
        reason: `Daily AI budget would be exceeded ($${userStatus.limits.daily.toFixed(2)} limit)`,
        userBudgetStatus: {
          ...userStatus,
          canOperate: false,
          blockReason: `Daily AI budget would be exceeded ($${userStatus.limits.daily.toFixed(2)} limit)`,
        },
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    // Check user monthly limit
    if (userStatus.usage.thisMonth + estimatedCost > userStatus.limits.monthly) {
      return {
        allowed: false,
        reason: `Monthly AI budget would be exceeded ($${userStatus.limits.monthly.toFixed(2)} limit)`,
        userBudgetStatus: {
          ...userStatus,
          canOperate: false,
          blockReason: `Monthly AI budget would be exceeded ($${userStatus.limits.monthly.toFixed(2)} limit)`,
        },
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    // Check enterprise-level limits
    if (enterpriseStatus.isOverHardLimit) {
      return {
        allowed: false,
        reason: 'Enterprise monthly budget limit exceeded',
        userBudgetStatus: userStatus,
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    if (enterpriseStatus.dailyBudget &&
        enterpriseStatus.currentDayCost + estimatedCost > enterpriseStatus.dailyBudget) {
      return {
        allowed: false,
        reason: 'Enterprise daily budget limit would be exceeded',
        userBudgetStatus: userStatus,
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    if (enterpriseStatus.currentMonthCost + estimatedCost > enterpriseStatus.monthlyBudget) {
      return {
        allowed: false,
        reason: 'Enterprise monthly budget limit would be exceeded',
        userBudgetStatus: userStatus,
        enterpriseBudgetStatus: enterpriseStatus,
      };
    }

    return {
      allowed: true,
      userBudgetStatus: userStatus,
      enterpriseBudgetStatus: enterpriseStatus,
    };
  }

  /**
   * Get the max tokens allowed for a user's request
   */
  async getUserMaxTokens(userId: string): Promise<number> {
    const limits = await this.getUserLimits(userId);
    return limits.maxTokens;
  }

  /**
   * Clear user limits cache (call when limits are updated)
   */
  clearUserLimitsCache(userId?: string): void {
    if (userId) {
      this.userLimitsCache.delete(`${userId}_${this.enterpriseId}`);
    } else {
      this.userLimitsCache.clear();
    }
  }

  /**
   * Update enterprise budget configuration
   */
  async updateBudget(config: Partial<BudgetConfig>): Promise<void> {
    const { error } = await this.supabase
      .from('enterprises')
      .update({
        ai_budget_config: config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.enterpriseId);

    if (error) {
      throw new Error(`Failed to update budget: ${error.message}`);
    }

    // Clear cache
    this.budgetCache.delete(this.enterpriseId);
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushBuffer();
  }

  // ==================== Private Methods ====================

  private detectProvider(model: string): 'anthropic' | 'openai' {
    if (model.startsWith('claude')) {
      return 'anthropic';
    }
    return 'openai';
  }

  private async getEnterpriseBudget(): Promise<BudgetConfig> {
    // Check cache
    const cached = this.budgetCache.get(this.enterpriseId);
    if (cached && cached.expiry > Date.now()) {
      return cached.budget;
    }

    // Fetch from database
    const { data } = await this.supabase
      .from('enterprises')
      .select('ai_budget_config')
      .eq('id', this.enterpriseId)
      .single();

    const budget = data?.ai_budget_config || DEFAULT_BUDGET;

    // Cache for 5 minutes
    this.budgetCache.set(this.enterpriseId, {
      budget,
      expiry: Date.now() + 5 * 60 * 1000,
    });

    return budget;
  }

  private async flushBuffer(): Promise<void> {
    if (this.usageBuffer.length === 0) return;

    const records = this.usageBuffer.map(r => ({
      enterprise_id: r.enterpriseId,
      user_id: r.userId,
      agent_type: r.agentType,
      model: r.model,
      provider: r.provider,
      input_tokens: r.inputTokens,
      output_tokens: r.outputTokens,
      cost: r.cost,
      operation_type: r.operationType,
      metadata: r.metadata,
      created_at: r.createdAt,
    }));

    this.usageBuffer = [];

    try {
      const { error } = await this.supabase
        .from('ai_usage_logs')
        .insert(records);

      if (error) {
        console.error('Failed to flush usage records:', error);
        // Re-add to buffer for retry
        this.usageBuffer.push(...records.map(r => ({
          enterpriseId: r.enterprise_id,
          userId: r.user_id,
          agentType: r.agent_type,
          model: r.model,
          provider: r.provider as 'anthropic' | 'openai',
          inputTokens: r.input_tokens,
          outputTokens: r.output_tokens,
          cost: r.cost,
          operationType: r.operation_type,
          metadata: r.metadata,
          createdAt: r.created_at,
        })));
      }
    } catch (error) {
      console.error('Failed to flush usage records:', error);
    }
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffer().catch(console.error);
    }, 30000) as unknown as number;
  }

  private async checkAndSendAlerts(status: BudgetStatus): Promise<void> {
    const budget = await this.getEnterpriseBudget();

    for (const threshold of budget.alertThresholds) {
      if (status.percentUsed >= threshold) {
        // Check if we already sent this alert this month
        const alertKey = `budget_alert_${this.enterpriseId}_${threshold}_${new Date().toISOString().slice(0, 7)}`;

        const { data: existingAlert } = await this.supabase
          .from('notifications')
          .select('id')
          .eq('metadata->>alert_key', alertKey)
          .single();

        if (!existingAlert) {
          // Send alert
          await this.supabase
            .from('notifications')
            .insert({
              enterprise_id: this.enterpriseId,
              type: 'budget_alert',
              title: `AI Budget ${threshold}% Used`,
              message: `Your AI usage has reached ${status.percentUsed.toFixed(1)}% of your monthly budget ($${status.currentMonthCost.toFixed(2)} of $${status.monthlyBudget})`,
              severity: threshold >= 100 ? 'critical' : threshold >= 90 ? 'high' : 'medium',
              metadata: {
                alert_key: alertKey,
                threshold,
                current_cost: status.currentMonthCost,
                budget: status.monthlyBudget,
              },
            });
        }
        break; // Only send highest threshold alert
      }
    }
  }
}

// ==================== Factory Function ====================

const trackerInstances: Map<string, CostTracker> = new Map();

export function getCostTracker(supabase: SupabaseClient, enterpriseId: string): CostTracker {
  const key = enterpriseId;
  if (!trackerInstances.has(key)) {
    trackerInstances.set(key, new CostTracker(supabase, enterpriseId));
  }
  return trackerInstances.get(key)!;
}
