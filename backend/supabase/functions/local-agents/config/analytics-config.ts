import { z } from 'zod';

/**
 * Analytics Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Analytics Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Analytics Agent configuration validation
 */
export const AnalyticsConfigSchema = z.object({
  // ================================
  // TREND ANALYSIS THRESHOLDS
  // ================================

  /** Minimum trend rate to be considered significant (0-1) */
  significantTrendThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.1),

  /** High significance trend threshold (0-1) */
  highSignificanceTrendThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.2),

  /** Minimum data points for reliable trend analysis */
  minDataPointsForTrend: z.number()
    .int()
    .min(2)
    .default(3),

  // ================================
  // CONTRACT ANALYSIS THRESHOLDS
  // ================================

  /** Number of expiring contracts to trigger mass expiration alert */
  massExpirationThreshold: z.number()
    .int()
    .min(1)
    .default(5),

  /** Days ahead to check for expiring contracts */
  expirationLookaheadDays: z.number()
    .int()
    .min(1)
    .max(365)
    .default(30),

  /** Auto-renewal rate threshold for risk alert (0-1) */
  autoRenewalRiskThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.3),

  /** Expiration concentration rate for risk alert (0-1) */
  expirationConcentrationThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.1),

  /** Minimum contracts for consolidation opportunity */
  consolidationThreshold: z.number()
    .int()
    .min(1)
    .default(20),

  // ================================
  // VENDOR ANALYSIS THRESHOLDS
  // ================================

  /** Vendor performance score threshold for poor performance (0-1) */
  poorPerformanceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Concentration ratio for high risk (0-1) */
  highConcentrationRatioThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.7),

  /** Concentration ratio for medium risk (0-1) */
  mediumConcentrationRatioThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.5),

  /** Herfindahl-Hirschman Index for high concentration */
  highHhiThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.25),

  /** Herfindahl-Hirschman Index for medium concentration */
  mediumHhiThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.15),

  /** Minimum savings potential for optimization insight */
  vendorOptimizationMinSavings: z.number()
    .min(0)
    .default(25000),

  /** Minimum vendors in category for consolidation */
  vendorConsolidationMinCount: z.number()
    .int()
    .min(2)
    .default(5),

  // ================================
  // BUDGET ANALYSIS THRESHOLDS
  // ================================

  /** Months until depletion for critical alert */
  budgetDepletionCriticalMonths: z.number()
    .int()
    .min(1)
    .default(2),

  /** Budget reallocation minimum amount for insight */
  budgetReallocationMinAmount: z.number()
    .min(0)
    .default(50000),

  // ================================
  // SPENDING ANALYSIS THRESHOLDS
  // ================================

  /** Large transaction threshold for anomaly detection */
  largeTransactionThreshold: z.number()
    .min(0)
    .default(50000),

  /** Z-score threshold for anomaly detection */
  anomalyZscoreThreshold: z.number()
    .min(0)
    .default(3),

  /** High anomaly z-score threshold */
  highAnomalyZscoreThreshold: z.number()
    .min(0)
    .default(4),

  /** Category growth rate threshold for alert (%) */
  categoryGrowthAlertThreshold: z.number()
    .min(0)
    .default(20),

  /** Seasonality variation threshold */
  seasonalityVariationThreshold: z.number()
    .min(1)
    .default(1.2),

  // ================================
  // ENTERPRISE ANALYTICS THRESHOLDS
  // ================================

  /** Contract growth rate for rapid growth alert (%) */
  rapidGrowthThreshold: z.number()
    .min(0)
    .default(20),

  /** Spend growth rate for rapid spend growth alert (%) */
  rapidSpendGrowthThreshold: z.number()
    .min(0)
    .default(30),

  /** Compliance rate threshold for gap alert (%) */
  complianceGapThreshold: z.number()
    .min(0)
    .max(100)
    .default(80),

  /** AI tasks processed threshold for efficiency insight */
  aiUtilizationThreshold: z.number()
    .int()
    .min(0)
    .default(1000),

  /** Minimum potential for opportunity insight */
  opportunityMinPotential: z.number()
    .min(0)
    .default(50000),

  /** Minimum contracts for consolidation opportunity */
  enterpriseConsolidationMinContracts: z.number()
    .int()
    .min(1)
    .default(100),

  /** Minimum vendors for optimization opportunity */
  enterpriseOptimizationMinVendors: z.number()
    .int()
    .min(1)
    .default(50),

  // ================================
  // INSIGHT GENERATION
  // ================================

  /** Minimum risk probability for insight generation (0-1) */
  riskInsightMinProbability: z.number()
    .min(0)
    .max(1)
    .default(0.7),

  /** Maximum number of insights to generate per analysis */
  maxInsightsPerAnalysis: z.number()
    .int()
    .min(1)
    .max(50)
    .default(20),

  /** Maximum number of prioritized insights to return */
  maxPrioritizedInsights: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  // ================================
  // CACHING
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .int()
    .min(60)
    .default(300),

  /** Cache TTL for contract metrics (seconds) */
  contractMetricsCacheTtl: z.number()
    .int()
    .min(60)
    .default(300),

  /** Cache TTL for vendor metrics (seconds) */
  vendorMetricsCacheTtl: z.number()
    .int()
    .min(60)
    .default(300),

  /** Cache TTL for spending data (seconds) */
  spendingDataCacheTtl: z.number()
    .int()
    .min(60)
    .default(300),

  // ================================
  // TIMEOUT AND RETRY SETTINGS
  // ================================

  /** Timeout for analytics operations (milliseconds) */
  analysisTimeoutMs: z.number()
    .int()
    .min(5000)
    .max(300000)
    .default(60000),

  /** Timeout for database operations (milliseconds) */
  databaseTimeoutMs: z.number()
    .int()
    .min(1000)
    .max(60000)
    .default(30000),

  /** Maximum retry attempts for recoverable errors */
  maxRetryAttempts: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  /** Base delay for retry operations (milliseconds) */
  baseRetryDelayMs: z.number()
    .int()
    .min(100)
    .max(5000)
    .default(1000),

  /** Maximum delay for retry operations (milliseconds) */
  maxRetryDelayMs: z.number()
    .int()
    .min(1000)
    .max(30000)
    .default(10000),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable trend analysis */
  enableTrendAnalysis: z.boolean().default(true),

  /** Enable anomaly detection */
  enableAnomalyDetection: z.boolean().default(true),

  /** Enable predictive analytics */
  enablePredictiveAnalysis: z.boolean().default(true),

  /** Enable vendor concentration analysis */
  enableConcentrationAnalysis: z.boolean().default(true),

  /** Enable graceful degradation on errors */
  enableGracefulDegradation: z.boolean().default(true),

  /** Enable automatic task queuing for follow-up actions */
  enableAutoTaskQueuing: z.boolean().default(true),
});

// =============================================================================
// TYPES
// =============================================================================

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type AnalyticsConfigOverride = Partial<AnalyticsConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Analytics Agent configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = AnalyticsConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: AnalyticsConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Analytics Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class AnalyticsConfigManager {
  private static instance: AnalyticsConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AnalyticsConfigManager {
    if (!AnalyticsConfigManager.instance) {
      AnalyticsConfigManager.instance = new AnalyticsConfigManager();
    }
    return AnalyticsConfigManager.instance;
  }

  /**
   * Get configuration for an enterprise
   */
  async getConfig(
    supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
    enterpriseId: string,
  ): Promise<AnalyticsConfig> {
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
  getDefaultConfig(): AnalyticsConfig {
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
  ): Promise<AnalyticsConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'analytics_agent_config')
        .single();

      if (error || !data) {
        return this.defaultConfig;
      }

      const override = data.value as AnalyticsConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[AnalyticsConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: AnalyticsConfigOverride): AnalyticsConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };
      return AnalyticsConfigSchema.parse(merged);
    } catch (error) {
      console.error('[AnalyticsConfig] Invalid config override, using defaults:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Clear cache for an enterprise
   */
  clearCache(enterpriseId?: string): void {
    if (enterpriseId) {
      this.cache.delete(enterpriseId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Update the default configuration (for testing)
   */
  setDefaultConfig(config: Partial<AnalyticsConfig>): void {
    this.defaultConfig = AnalyticsConfigSchema.parse({
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
export const analyticsConfigManager = AnalyticsConfigManager.getInstance();

/**
 * Get Analytics Agent configuration for an enterprise
 */
export async function getAnalyticsConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<AnalyticsConfig> {
  return analyticsConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Analytics Agent configuration
 */
export function getDefaultAnalyticsConfig(): AnalyticsConfig {
  return analyticsConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearAnalyticsConfigCache(enterpriseId?: string): void {
  analyticsConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Check if trend is significant
 */
export function isSignificantTrend(rate: number, config: AnalyticsConfig): boolean {
  return Math.abs(rate) >= config.significantTrendThreshold;
}

/**
 * Check if trend has high significance
 */
export function isHighSignificanceTrend(rate: number, config: AnalyticsConfig): boolean {
  return Math.abs(rate) >= config.highSignificanceTrendThreshold;
}

/**
 * Assess vendor concentration risk level
 */
export function assessConcentrationRisk(
  concentrationRatio: number,
  hhi: number,
  config: AnalyticsConfig,
): 'low' | 'medium' | 'high' {
  if (concentrationRatio > config.highConcentrationRatioThreshold || hhi > config.highHhiThreshold) {
    return 'high';
  }
  if (concentrationRatio > config.mediumConcentrationRatioThreshold || hhi > config.mediumHhiThreshold) {
    return 'medium';
  }
  return 'low';
}

/**
 * Check if vendor performance is poor
 */
export function isPoorPerformance(score: number, config: AnalyticsConfig): boolean {
  return score < config.poorPerformanceThreshold;
}

/**
 * Assess anomaly severity based on z-score
 */
export function assessAnomalySeverity(
  zscore: number,
  config: AnalyticsConfig,
): 'low' | 'medium' | 'high' {
  if (zscore >= config.highAnomalyZscoreThreshold) return 'high';
  if (zscore >= config.anomalyZscoreThreshold) return 'medium';
  return 'low';
}

/**
 * Check if budget depletion is critical
 */
export function isBudgetDepletionCritical(
  monthsUntilDepletion: number,
  config: AnalyticsConfig,
): boolean {
  return monthsUntilDepletion < config.budgetDepletionCriticalMonths;
}

/**
 * Check if category growth warrants an alert
 */
export function isCategoryGrowthSignificant(
  growthRate: number,
  config: AnalyticsConfig,
): boolean {
  return growthRate > config.categoryGrowthAlertThreshold;
}

/**
 * Check if compliance gap requires attention
 */
export function hasComplianceGap(
  complianceRate: number,
  config: AnalyticsConfig,
): boolean {
  return complianceRate < config.complianceGapThreshold;
}

/**
 * Check if contract growth is rapid
 */
export function isRapidGrowth(
  growthRate: number,
  config: AnalyticsConfig,
): boolean {
  return growthRate > config.rapidGrowthThreshold;
}

/**
 * Validate configuration threshold relationships
 */
export function validateConfigThresholds(config: AnalyticsConfig): string[] {
  const errors: string[] = [];

  // Concentration thresholds: high > medium
  if (config.highConcentrationRatioThreshold <= config.mediumConcentrationRatioThreshold) {
    errors.push(
      `highConcentrationRatioThreshold (${config.highConcentrationRatioThreshold}) must be > mediumConcentrationRatioThreshold (${config.mediumConcentrationRatioThreshold})`
    );
  }

  if (config.highHhiThreshold <= config.mediumHhiThreshold) {
    errors.push(
      `highHhiThreshold (${config.highHhiThreshold}) must be > mediumHhiThreshold (${config.mediumHhiThreshold})`
    );
  }

  // Anomaly thresholds: high > standard
  if (config.highAnomalyZscoreThreshold <= config.anomalyZscoreThreshold) {
    errors.push(
      `highAnomalyZscoreThreshold (${config.highAnomalyZscoreThreshold}) must be > anomalyZscoreThreshold (${config.anomalyZscoreThreshold})`
    );
  }

  // Trend thresholds: high > significant
  if (config.highSignificanceTrendThreshold <= config.significantTrendThreshold) {
    errors.push(
      `highSignificanceTrendThreshold (${config.highSignificanceTrendThreshold}) must be > significantTrendThreshold (${config.significantTrendThreshold})`
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

  return errors;
}

/**
 * Validate and log configuration warnings
 */
export function validateAndLogConfigWarnings(config: AnalyticsConfig): AnalyticsConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[AnalyticsConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
