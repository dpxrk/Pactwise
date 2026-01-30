import { z } from 'zod';

/**
 * Financial Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Financial Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Financial Agent configuration validation
 */
export const FinancialConfigSchema = z.object({
  // ================================
  // VALUE THRESHOLDS
  // ================================

  /** Threshold for flagging high-value contracts */
  highValueThreshold: z.number()
    .min(0)
    .default(100000),

  /** Threshold for critical value contracts requiring C-suite approval */
  criticalValueThreshold: z.number()
    .min(0)
    .default(500000),

  /** VP approval threshold */
  vpApprovalThreshold: z.number()
    .min(0)
    .default(100000),

  /** Director approval threshold */
  directorApprovalThreshold: z.number()
    .min(0)
    .default(50000),

  /** Manager approval threshold */
  managerApprovalThreshold: z.number()
    .min(0)
    .default(10000),

  /** Large upfront payment threshold */
  largeUpfrontPaymentThreshold: z.number()
    .min(0)
    .default(50000),

  // ================================
  // CONTENT LIMITS
  // ================================

  /** Minimum content length for meaningful financial analysis */
  minContentLength: z.number()
    .min(1)
    .default(10),

  /** Maximum content length for processing (10MB default) */
  maxContentLength: z.number()
    .min(1000)
    .max(50000000)
    .default(10 * 1024 * 1024),

  // ================================
  // BUDGET THRESHOLDS
  // ================================

  /** Budget utilization warning threshold (0-1) */
  budgetWarningThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.8),

  /** Budget utilization critical threshold (0-1) */
  budgetCriticalThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.9),

  /** Variance percentage threshold for alerts */
  varianceAlertThreshold: z.number()
    .min(0)
    .max(100)
    .default(20),

  // ================================
  // CASH FLOW THRESHOLDS
  // ================================

  /** Monthly cash flow impact threshold for high severity */
  highCashFlowImpactThreshold: z.number()
    .min(0)
    .default(50000),

  /** Monthly cash flow impact threshold for medium severity */
  mediumCashFlowImpactThreshold: z.number()
    .min(0)
    .default(25000),

  /** Installment impact threshold for medium severity */
  installmentImpactThreshold: z.number()
    .min(0)
    .default(10000),

  // ================================
  // ROI THRESHOLDS
  // ================================

  /** ROI threshold for high ROI notification */
  highRoiThreshold: z.number()
    .default(2),

  /** ROI threshold for negative ROI warning */
  negativeRoiWarning: z.boolean()
    .default(true),

  // ================================
  // VENDOR ANALYSIS THRESHOLDS
  // ================================

  /** Vendor concentration percentage for high risk (0-100) */
  highConcentrationThreshold: z.number()
    .min(0)
    .max(100)
    .default(30),

  /** Vendor concentration percentage for medium risk (0-100) */
  mediumConcentrationThreshold: z.number()
    .min(0)
    .max(100)
    .default(15),

  /** Spend increase rate for rapid increase alert (%) */
  rapidSpendIncreaseThreshold: z.number()
    .min(0)
    .default(20),

  /** Late payment rate threshold for alerts (0-1) */
  latePaymentRateThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.1),

  /** Low average transaction threshold for efficiency scoring */
  lowTransactionThreshold: z.number()
    .min(0)
    .default(20000),

  // ================================
  // SPEND TREND ANALYSIS
  // ================================

  /** Percentage change threshold for increasing trend */
  increasingTrendThreshold: z.number()
    .min(0)
    .default(5),

  /** Percentage change threshold for decreasing trend */
  decreasingTrendThreshold: z.number()
    .max(0)
    .default(-5),

  // ================================
  // TIMEOUT AND RETRY SETTINGS
  // ================================

  /** Timeout for financial analysis operations (milliseconds) */
  analysisTimeoutMs: z.number()
    .min(5000)
    .max(300000)
    .default(60000),

  /** Timeout for database operations (milliseconds) */
  databaseTimeoutMs: z.number()
    .min(1000)
    .max(60000)
    .default(30000),

  /** Maximum retry attempts for recoverable errors */
  maxRetryAttempts: z.number()
    .min(1)
    .max(10)
    .default(3),

  /** Base delay for retry operations (milliseconds) */
  baseRetryDelayMs: z.number()
    .min(100)
    .max(5000)
    .default(1000),

  /** Maximum delay for retry operations (milliseconds) */
  maxRetryDelayMs: z.number()
    .min(1000)
    .max(30000)
    .default(10000),

  // ================================
  // CACHING
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .min(60)
    .default(300),

  /** Cache TTL for financial analysis results (seconds) */
  analysisCacheTtl: z.number()
    .min(60)
    .default(600),

  /** Cache TTL for vendor spend metrics (seconds) */
  vendorSpendCacheTtl: z.number()
    .min(60)
    .default(600),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable ROI calculation */
  enableRoiCalculation: z.boolean()
    .default(true),

  /** Enable vendor concentration analysis */
  enableConcentrationAnalysis: z.boolean()
    .default(true),

  /** Enable spend trend analysis */
  enableSpendTrendAnalysis: z.boolean()
    .default(true),

  /** Enable cash flow impact assessment */
  enableCashFlowAnalysis: z.boolean()
    .default(true),

  /** Enable budget forecasting */
  enableBudgetForecasting: z.boolean()
    .default(true),

  /** Enable graceful degradation on errors */
  enableGracefulDegradation: z.boolean()
    .default(true),

  // ================================
  // NOTIFICATION SETTINGS
  // ================================

  /** Enable automatic notification for high-value contracts */
  autoNotifyHighValue: z.boolean()
    .default(true),

  /** Enable automatic notification for budget overrun risk */
  autoNotifyBudgetOverrun: z.boolean()
    .default(true),

  /** Enable automatic notification for negative ROI */
  autoNotifyNegativeRoi: z.boolean()
    .default(true),
});

// =============================================================================
// TYPES
// =============================================================================

export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type FinancialConfigOverride = Partial<FinancialConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Financial Agent configuration
 */
export const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = FinancialConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: FinancialConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Financial Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class FinancialConfigManager {
  private static instance: FinancialConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: FinancialConfig = DEFAULT_FINANCIAL_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FinancialConfigManager {
    if (!FinancialConfigManager.instance) {
      FinancialConfigManager.instance = new FinancialConfigManager();
    }
    return FinancialConfigManager.instance;
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
  ): Promise<FinancialConfig> {
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
  getDefaultConfig(): FinancialConfig {
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
  ): Promise<FinancialConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'financial_agent_config')
        .single();

      if (error || !data) {
        // No custom config, return defaults
        return this.defaultConfig;
      }

      // Parse and validate the override configuration
      const override = data.value as FinancialConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[FinancialConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: FinancialConfigOverride): FinancialConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      // Validate merged config
      return FinancialConfigSchema.parse(merged);
    } catch (error) {
      console.error('[FinancialConfig] Invalid config override, using defaults:', error);
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
  setDefaultConfig(config: Partial<FinancialConfig>): void {
    this.defaultConfig = FinancialConfigSchema.parse({
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
export const financialConfigManager = FinancialConfigManager.getInstance();

/**
 * Get Financial Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getFinancialConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<FinancialConfig> {
  return financialConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Financial Agent configuration (no database lookup)
 */
export function getDefaultFinancialConfig(): FinancialConfig {
  return financialConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearFinancialConfigCache(enterpriseId?: string): void {
  financialConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Check if a contract value is considered high-value
 */
export function isHighValue(value: number, config: FinancialConfig): boolean {
  return value >= config.highValueThreshold;
}

/**
 * Check if a contract value is critical (requires C-suite approval)
 */
export function isCriticalValue(value: number, config: FinancialConfig): boolean {
  return value >= config.criticalValueThreshold;
}

/**
 * Determine required approval level based on contract value
 */
export function determineApprovalLevel(value: number, config: FinancialConfig): string {
  if (value > config.criticalValueThreshold) return 'C-suite';
  if (value > config.vpApprovalThreshold) return 'VP';
  if (value > config.directorApprovalThreshold) return 'Director';
  if (value > config.managerApprovalThreshold) return 'Manager';
  return 'Standard';
}

/**
 * Check if budget utilization is at warning level
 */
export function isBudgetWarning(utilization: number, config: FinancialConfig): boolean {
  return utilization >= config.budgetWarningThreshold;
}

/**
 * Check if budget utilization is at critical level
 */
export function isBudgetCritical(utilization: number, config: FinancialConfig): boolean {
  return utilization >= config.budgetCriticalThreshold;
}

/**
 * Assess vendor concentration risk level
 */
export function assessConcentrationLevel(
  percentage: number,
  config: FinancialConfig,
): 'low' | 'medium' | 'high' {
  if (percentage >= config.highConcentrationThreshold) return 'high';
  if (percentage >= config.mediumConcentrationThreshold) return 'medium';
  return 'low';
}

/**
 * Assess spend trend direction
 */
export function assessSpendTrend(
  changePercentage: number,
  config: FinancialConfig,
): 'increasing' | 'decreasing' | 'stable' {
  if (changePercentage > config.increasingTrendThreshold) return 'increasing';
  if (changePercentage < config.decreasingTrendThreshold) return 'decreasing';
  return 'stable';
}

/**
 * Assess cash flow severity based on impact amount and payment type
 */
export function assessCashFlowSeverity(
  monthlyImpact: number,
  paymentType: string,
  config: FinancialConfig,
): 'low' | 'medium' | 'high' {
  if (paymentType === 'upfront') {
    return monthlyImpact > config.highCashFlowImpactThreshold ? 'high' : 'medium';
  }
  if (paymentType === 'installment') {
    return monthlyImpact > config.installmentImpactThreshold ? 'medium' : 'low';
  }
  return monthlyImpact > config.mediumCashFlowImpactThreshold ? 'medium' : 'low';
}

/**
 * Check if variance is significant enough for alert
 */
export function isSignificantVariance(variancePercentage: number, config: FinancialConfig): boolean {
  return Math.abs(variancePercentage) > config.varianceAlertThreshold;
}

/**
 * Check if content meets minimum requirements for analysis
 */
export function meetsMinimumContentRequirements(
  content: string,
  config: FinancialConfig,
): boolean {
  return content.length >= config.minContentLength && content.length <= config.maxContentLength;
}

/**
 * Validate a configuration override object
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: FinancialConfigOverride;
  errors?: string[];
} {
  try {
    // Partial validation - only validate provided fields
    const partialSchema = FinancialConfigSchema.partial();
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
export function validateConfigThresholds(config: FinancialConfig): string[] {
  const errors: string[] = [];

  // Value threshold ordering: critical > VP > director > manager
  if (config.criticalValueThreshold <= config.vpApprovalThreshold) {
    errors.push(
      `criticalValueThreshold (${config.criticalValueThreshold}) must be > vpApprovalThreshold (${config.vpApprovalThreshold})`
    );
  }

  if (config.vpApprovalThreshold <= config.directorApprovalThreshold) {
    errors.push(
      `vpApprovalThreshold (${config.vpApprovalThreshold}) must be > directorApprovalThreshold (${config.directorApprovalThreshold})`
    );
  }

  if (config.directorApprovalThreshold <= config.managerApprovalThreshold) {
    errors.push(
      `directorApprovalThreshold (${config.directorApprovalThreshold}) must be > managerApprovalThreshold (${config.managerApprovalThreshold})`
    );
  }

  // Budget threshold ordering: critical > warning
  if (config.budgetCriticalThreshold <= config.budgetWarningThreshold) {
    errors.push(
      `budgetCriticalThreshold (${config.budgetCriticalThreshold}) must be > budgetWarningThreshold (${config.budgetWarningThreshold})`
    );
  }

  // Concentration threshold ordering: high > medium
  if (config.highConcentrationThreshold <= config.mediumConcentrationThreshold) {
    errors.push(
      `highConcentrationThreshold (${config.highConcentrationThreshold}) must be > mediumConcentrationThreshold (${config.mediumConcentrationThreshold})`
    );
  }

  // Cash flow threshold ordering: high > medium
  if (config.highCashFlowImpactThreshold <= config.mediumCashFlowImpactThreshold) {
    errors.push(
      `highCashFlowImpactThreshold (${config.highCashFlowImpactThreshold}) must be > mediumCashFlowImpactThreshold (${config.mediumCashFlowImpactThreshold})`
    );
  }

  // Content length constraints
  if (config.minContentLength >= config.maxContentLength) {
    errors.push(
      `minContentLength (${config.minContentLength}) must be < maxContentLength (${config.maxContentLength})`
    );
  }

  // Timeout constraints
  if (config.databaseTimeoutMs >= config.analysisTimeoutMs) {
    errors.push(
      `databaseTimeoutMs (${config.databaseTimeoutMs}) should be < analysisTimeoutMs (${config.analysisTimeoutMs})`
    );
  }

  // Retry delay constraints
  if (config.baseRetryDelayMs >= config.maxRetryDelayMs) {
    errors.push(
      `baseRetryDelayMs (${config.baseRetryDelayMs}) must be < maxRetryDelayMs (${config.maxRetryDelayMs})`
    );
  }

  // Trend threshold constraints
  if (config.increasingTrendThreshold <= 0) {
    errors.push(
      `increasingTrendThreshold (${config.increasingTrendThreshold}) must be > 0`
    );
  }

  if (config.decreasingTrendThreshold >= 0) {
    errors.push(
      `decreasingTrendThreshold (${config.decreasingTrendThreshold}) must be < 0`
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
export function validateAndLogConfigWarnings(config: FinancialConfig): FinancialConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[FinancialConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
