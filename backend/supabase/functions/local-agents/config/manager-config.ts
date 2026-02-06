import { z } from 'zod';

/**
 * Manager Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Manager Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Manager Agent configuration validation
 */
export const ManagerConfigSchema = z.object({
  // ================================
  // TASK ROUTING RULES
  // ================================

  /** Minimum confidence score for automatic agent selection (0-1) */
  agentSelectionConfidenceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.7),

  /** Maximum number of agents that can be selected for a single request */
  maxAgentsPerRequest: z.number()
    .min(1)
    .max(10)
    .default(8),

  /** Priority score threshold for critical classification */
  criticalPriorityThreshold: z.number()
    .min(1)
    .max(20)
    .default(6),

  /** Priority score threshold for high classification */
  highPriorityThreshold: z.number()
    .min(1)
    .max(20)
    .default(4),

  /** Priority score threshold for medium classification */
  mediumPriorityThreshold: z.number()
    .min(1)
    .max(20)
    .default(2),

  /** Urgency bonus score for priority calculation */
  urgencyPriorityBonus: z.number()
    .min(0)
    .max(10)
    .default(3),

  /** Financial impact bonus score for priority calculation */
  financialImpactPriorityBonus: z.number()
    .min(0)
    .max(10)
    .default(2),

  /** Legal implications bonus score for priority calculation */
  legalImplicationsPriorityBonus: z.number()
    .min(0)
    .max(10)
    .default(2),

  /** Compliance requirements bonus score for priority calculation */
  complianceRequirementsPriorityBonus: z.number()
    .min(0)
    .max(10)
    .default(2),

  /** High complexity bonus score for priority calculation */
  highComplexityPriorityBonus: z.number()
    .min(0)
    .max(10)
    .default(1),

  // ================================
  // WORKFLOW TIMEOUTS
  // ================================

  /** Overall workflow timeout in milliseconds */
  workflowTimeoutMs: z.number()
    .min(10000)
    .max(600000)
    .default(300000),

  /** Per-step timeout in milliseconds */
  stepTimeoutMs: z.number()
    .min(5000)
    .max(120000)
    .default(60000),

  /** Timeout for agent execution in milliseconds */
  agentExecutionTimeoutMs: z.number()
    .min(5000)
    .max(300000)
    .default(60000),

  /** Timeout for database operations in milliseconds */
  databaseTimeoutMs: z.number()
    .min(1000)
    .max(60000)
    .default(30000),

  // ================================
  // DELEGATION PARAMETERS
  // ================================

  /** Maximum concurrent agent tasks */
  maxConcurrentTasks: z.number()
    .min(1)
    .max(20)
    .default(5),

  /** Maximum retry attempts for failed agent tasks */
  maxRetryAttempts: z.number()
    .min(0)
    .max(10)
    .default(3),

  /** Base delay for retry operations (milliseconds) */
  baseRetryDelayMs: z.number()
    .min(100)
    .max(10000)
    .default(1000),

  /** Maximum delay for retry operations (milliseconds) */
  maxRetryDelayMs: z.number()
    .min(1000)
    .max(60000)
    .default(10000),

  /** Maximum queued tasks per orchestration */
  maxQueuedTasksPerOrchestration: z.number()
    .min(1)
    .max(50)
    .default(20),

  // ================================
  // AGENT CAPABILITY MATCHING
  // ================================

  /** Minimum capability match confidence for agent selection (0-1) */
  capabilityMatchThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Enable fallback agent selection when primary agent is unavailable */
  enableFallbackAgentSelection: z.boolean()
    .default(true),

  /** Default agent to use when no specific agent matches */
  fallbackAgentType: z.string()
    .default('secretary'),

  // ================================
  // RESULT AGGREGATION
  // ================================

  /** Minimum consensus threshold for multi-agent results (0-1) */
  consensusThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Quality gate threshold for result acceptance (0-1) */
  qualityGateThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.5),

  /** Minimum confidence score for including results (0-1) */
  minimumResultConfidence: z.number()
    .min(0)
    .max(1)
    .default(0.3),

  // ================================
  // RATE LIMITING
  // ================================

  /** Maximum tasks per minute per enterprise */
  maxTasksPerMinute: z.number()
    .min(1)
    .max(1000)
    .default(60),

  /** Maximum concurrent workflows per enterprise */
  maxConcurrentWorkflows: z.number()
    .min(1)
    .max(50)
    .default(10),

  /** Maximum orchestrations per hour */
  maxOrchestrationsPerHour: z.number()
    .min(1)
    .max(10000)
    .default(500),

  // ================================
  // ESCALATION RULES
  // ================================

  /** Timeout duration before escalation (milliseconds) */
  escalationTimeoutMs: z.number()
    .min(10000)
    .max(600000)
    .default(120000),

  /** Number of consecutive failures before escalation */
  failureEscalationThreshold: z.number()
    .min(1)
    .max(20)
    .default(3),

  /** Enable automatic escalation on timeout */
  enableTimeoutEscalation: z.boolean()
    .default(true),

  /** Enable automatic escalation on repeated failures */
  enableFailureEscalation: z.boolean()
    .default(true),

  // ================================
  // COMPLEXITY ASSESSMENT
  // ================================

  /** Content length threshold for medium complexity */
  mediumComplexityContentLength: z.number()
    .min(100)
    .default(500),

  /** Content length threshold for high complexity */
  highComplexityContentLength: z.number()
    .min(200)
    .default(1000),

  /** Number of mentioned aspects for medium complexity */
  mediumComplexityAspectCount: z.number()
    .min(1)
    .default(3),

  /** Number of mentioned aspects for high complexity */
  highComplexityAspectCount: z.number()
    .min(2)
    .default(5),

  // ================================
  // CACHING SETTINGS
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .min(60)
    .default(300),

  /** Cache TTL for orchestration plans (seconds) */
  planCacheTtl: z.number()
    .min(30)
    .default(120),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable parallel agent execution */
  enableParallelExecution: z.boolean()
    .default(true),

  /** Enable asynchronous orchestration mode */
  enableAsyncOrchestration: z.boolean()
    .default(true),

  /** Enable workflow delegation to WorkflowAgent */
  enableWorkflowDelegation: z.boolean()
    .default(true),

  /** Enable graceful degradation on agent failures */
  enableGracefulDegradation: z.boolean()
    .default(true),

  /** Enable dependency-based execution ordering */
  enableDependencyResolution: z.boolean()
    .default(true),

  /** Enable complexity-based routing */
  enableComplexityRouting: z.boolean()
    .default(true),

  /** Enable orchestration tracking/recording */
  enableOrchestrationTracking: z.boolean()
    .default(true),

  /** Number of agents that triggers complex workflow delegation */
  complexWorkflowAgentThreshold: z.number()
    .min(2)
    .max(20)
    .default(5),

  // ================================
  // AGENT DURATION ESTIMATES
  // ================================

  /** Estimated secretary agent duration (seconds) */
  secretaryDurationEstimate: z.number().min(5).default(30),
  /** Estimated financial agent duration (seconds) */
  financialDurationEstimate: z.number().min(5).default(45),
  /** Estimated legal agent duration (seconds) */
  legalDurationEstimate: z.number().min(5).default(60),
  /** Estimated vendor agent duration (seconds) */
  vendorDurationEstimate: z.number().min(5).default(40),
  /** Estimated analytics agent duration (seconds) */
  analyticsDurationEstimate: z.number().min(5).default(50),
  /** Estimated notifications agent duration (seconds) */
  notificationsDurationEstimate: z.number().min(5).default(20),
  /** Default agent duration estimate (seconds) */
  defaultDurationEstimate: z.number().min(5).default(30),
});

// =============================================================================
// TYPES
// =============================================================================

export type ManagerConfig = z.infer<typeof ManagerConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type ManagerConfigOverride = Partial<ManagerConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Manager Agent configuration
 */
export const DEFAULT_MANAGER_CONFIG: ManagerConfig = ManagerConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: ManagerConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Manager Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class ManagerConfigManager {
  private static instance: ManagerConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: ManagerConfig = DEFAULT_MANAGER_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ManagerConfigManager {
    if (!ManagerConfigManager.instance) {
      ManagerConfigManager.instance = new ManagerConfigManager();
    }
    return ManagerConfigManager.instance;
  }

  /**
   * Get configuration for an enterprise
   *
   * @param supabase - Supabase client instance
   * @param enterpriseId - Enterprise ID to get config for
   * @returns Merged configuration (defaults + enterprise overrides)
   */
  async getConfig(
    supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
    enterpriseId: string,
  ): Promise<ManagerConfig> {
    // Check cache first
    const cached = this.cache.get(enterpriseId);
    if (cached && this.isCacheValid(cached)) {
      return cached.config;
    }

    // Load from database
    const config = await this.loadFromDatabase(supabase, enterpriseId);

    // Cache the result
    this.cache.set(enterpriseId, {
      config,
      timestamp: Date.now(),
      enterpriseId,
    });

    return config;
  }

  /**
   * Get default configuration (no database lookup)
   */
  getDefaultConfig(): ManagerConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(entry: ConfigCacheEntry): boolean {
    const ttlMs = (entry.config.configCacheTtl || 300) * 1000;
    return Date.now() - entry.timestamp < ttlMs;
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(
    supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
    enterpriseId: string,
  ): Promise<ManagerConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'manager_agent_config')
        .single();

      if (error || !data) {
        return this.defaultConfig;
      }

      const override = data.value as ManagerConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[ManagerConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: ManagerConfigOverride): ManagerConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      return ManagerConfigSchema.parse(merged);
    } catch (error) {
      console.error('[ManagerConfig] Invalid config override, using defaults:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Clear cache for an enterprise (call when config is updated)
   */
  clearCache(enterpriseId?: string): void {
    if (enterpriseId) {
      this.cache.delete(enterpriseId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Update the default configuration (for testing or global overrides)
   */
  setDefaultConfig(config: Partial<ManagerConfig>): void {
    this.defaultConfig = ManagerConfigSchema.parse({
      ...this.defaultConfig,
      ...config,
    });
  }
}

// =============================================================================
// HELPER TYPES
// =============================================================================

interface EnterpriseSettingsRow {
  value: unknown;
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Singleton config manager instance
 */
export const managerConfigManager = ManagerConfigManager.getInstance();

/**
 * Get Manager Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getManagerConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<ManagerConfig> {
  return managerConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Manager Agent configuration (no database lookup)
 */
export function getDefaultManagerConfig(): ManagerConfig {
  return managerConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearManagerConfigCache(enterpriseId?: string): void {
  managerConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS - PRIORITY
// =============================================================================

/**
 * Calculate priority score from request analysis flags
 */
export function calculatePriorityScore(
  flags: {
    hasUrgency: boolean;
    hasFinancialImpact: boolean;
    hasLegalImplications: boolean;
    hasComplianceRequirements: boolean;
    isHighComplexity: boolean;
  },
  config: ManagerConfig,
): number {
  let score = 0;
  if (flags.hasUrgency) score += config.urgencyPriorityBonus;
  if (flags.hasFinancialImpact) score += config.financialImpactPriorityBonus;
  if (flags.hasLegalImplications) score += config.legalImplicationsPriorityBonus;
  if (flags.hasComplianceRequirements) score += config.complianceRequirementsPriorityBonus;
  if (flags.isHighComplexity) score += config.highComplexityPriorityBonus;
  return score;
}

/**
 * Get priority level from priority score
 */
export function getPriorityLevel(
  score: number,
  config: ManagerConfig,
): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= config.criticalPriorityThreshold) return 'critical';
  if (score >= config.highPriorityThreshold) return 'high';
  if (score >= config.mediumPriorityThreshold) return 'medium';
  return 'low';
}

/**
 * Check if a priority is critical
 */
export function isCriticalPriority(score: number, config: ManagerConfig): boolean {
  return score >= config.criticalPriorityThreshold;
}

// =============================================================================
// CONFIGURATION HELPERS - COMPLEXITY
// =============================================================================

/**
 * Assess content complexity based on length and aspect count
 */
export function assessComplexity(
  contentLength: number,
  aspectCount: number,
  config: ManagerConfig,
): 'low' | 'medium' | 'high' {
  let complexityScore = 0;

  if (contentLength > config.highComplexityContentLength) complexityScore += 2;
  else if (contentLength > config.mediumComplexityContentLength) complexityScore += 1;

  complexityScore += aspectCount;

  if (complexityScore >= config.highComplexityAspectCount) return 'high';
  if (complexityScore >= config.mediumComplexityAspectCount) return 'medium';
  return 'low';
}

// =============================================================================
// CONFIGURATION HELPERS - RATE LIMITING
// =============================================================================

/**
 * Check if task rate limit would be exceeded
 */
export function wouldExceedTaskRateLimit(
  currentTaskCount: number,
  config: ManagerConfig,
): boolean {
  return currentTaskCount >= config.maxTasksPerMinute;
}

/**
 * Check if concurrent workflow limit would be exceeded
 */
export function wouldExceedWorkflowLimit(
  currentWorkflowCount: number,
  config: ManagerConfig,
): boolean {
  return currentWorkflowCount >= config.maxConcurrentWorkflows;
}

// =============================================================================
// CONFIGURATION HELPERS - ESCALATION
// =============================================================================

/**
 * Check if failure count triggers escalation
 */
export function shouldEscalateOnFailure(
  failureCount: number,
  config: ManagerConfig,
): boolean {
  return config.enableFailureEscalation && failureCount >= config.failureEscalationThreshold;
}

/**
 * Check if elapsed time triggers timeout escalation
 */
export function shouldEscalateOnTimeout(
  elapsedMs: number,
  config: ManagerConfig,
): boolean {
  return config.enableTimeoutEscalation && elapsedMs >= config.escalationTimeoutMs;
}

// =============================================================================
// CONFIGURATION HELPERS - AGENT DURATION
// =============================================================================

/**
 * Get estimated duration for an agent type
 */
export function getAgentDurationEstimate(
  agentType: string,
  config: ManagerConfig,
): number {
  const durationMap: Record<string, number> = {
    secretary: config.secretaryDurationEstimate,
    financial: config.financialDurationEstimate,
    legal: config.legalDurationEstimate,
    vendor: config.vendorDurationEstimate,
    analytics: config.analyticsDurationEstimate,
    notifications: config.notificationsDurationEstimate,
  };

  return durationMap[agentType] || config.defaultDurationEstimate;
}

/**
 * Estimate total orchestration duration
 */
export function estimateOrchestrationDuration(
  agentTypes: string[],
  complexity: 'low' | 'medium' | 'high',
  config: ManagerConfig,
): number {
  const baseDuration = agentTypes.reduce(
    (sum, type) => sum + getAgentDurationEstimate(type, config),
    0,
  );

  const complexityMultiplier = {
    low: 1,
    medium: 1.5,
    high: 2,
  };

  return Math.round(baseDuration * complexityMultiplier[complexity]);
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate a configuration override object
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: ManagerConfigOverride;
  errors?: string[];
} {
  try {
    const partialSchema = ManagerConfigSchema.partial();
    const parsed = partialSchema.parse(override);
    return { valid: true, config: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Validate configuration threshold relationships.
 * Ensures thresholds have logically consistent values.
 * @param config - The configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfigThresholds(config: ManagerConfig): string[] {
  const errors: string[] = [];

  // Priority threshold ordering: critical > high > medium
  if (config.criticalPriorityThreshold <= config.highPriorityThreshold) {
    errors.push(
      `criticalPriorityThreshold (${config.criticalPriorityThreshold}) must be > highPriorityThreshold (${config.highPriorityThreshold})`
    );
  }

  if (config.highPriorityThreshold <= config.mediumPriorityThreshold) {
    errors.push(
      `highPriorityThreshold (${config.highPriorityThreshold}) must be > mediumPriorityThreshold (${config.mediumPriorityThreshold})`
    );
  }

  // Timeout constraints
  if (config.stepTimeoutMs >= config.workflowTimeoutMs) {
    errors.push(
      `stepTimeoutMs (${config.stepTimeoutMs}) should be < workflowTimeoutMs (${config.workflowTimeoutMs})`
    );
  }

  if (config.databaseTimeoutMs >= config.agentExecutionTimeoutMs) {
    errors.push(
      `databaseTimeoutMs (${config.databaseTimeoutMs}) should be < agentExecutionTimeoutMs (${config.agentExecutionTimeoutMs})`
    );
  }

  // Retry delay constraints
  if (config.baseRetryDelayMs >= config.maxRetryDelayMs) {
    errors.push(
      `baseRetryDelayMs (${config.baseRetryDelayMs}) must be < maxRetryDelayMs (${config.maxRetryDelayMs})`
    );
  }

  // Complexity threshold ordering
  if (config.highComplexityContentLength <= config.mediumComplexityContentLength) {
    errors.push(
      `highComplexityContentLength (${config.highComplexityContentLength}) must be > mediumComplexityContentLength (${config.mediumComplexityContentLength})`
    );
  }

  if (config.highComplexityAspectCount <= config.mediumComplexityAspectCount) {
    errors.push(
      `highComplexityAspectCount (${config.highComplexityAspectCount}) must be > mediumComplexityAspectCount (${config.mediumComplexityAspectCount})`
    );
  }

  // Quality/consensus thresholds
  if (config.qualityGateThreshold > config.consensusThreshold) {
    errors.push(
      `qualityGateThreshold (${config.qualityGateThreshold}) should be <= consensusThreshold (${config.consensusThreshold})`
    );
  }

  return errors;
}

/**
 * Validate and return a sanitized configuration.
 * Logs warnings for any threshold inconsistencies.
 * @param config - The configuration to validate
 * @returns The original config (validation is advisory)
 */
export function validateAndLogConfigWarnings(config: ManagerConfig): ManagerConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[ManagerConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
