import { z } from 'zod';

/**
 * Vendor Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Vendor Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Vendor Agent configuration validation
 */
export const VendorConfigSchema = z.object({
  // ================================
  // PERFORMANCE THRESHOLDS
  // ================================

  /** Threshold for excellent performance score (0-1) */
  excellentPerformanceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.9),

  /** Threshold for good performance score (0-1) */
  goodPerformanceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.75),

  /** Threshold for average performance score (0-1) */
  averagePerformanceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Threshold for poor performance score (0-1) */
  poorPerformanceThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.4),

  // ================================
  // RISK THRESHOLDS
  // ================================

  /** High risk concentration threshold (0-1) - 30% default */
  highRiskConcentrationThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.3),

  /** Medium risk concentration threshold (0-1) - 15% default */
  mediumRiskConcentrationThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.15),

  /** Performance decline rate threshold for alerts (0-1) - 10% default */
  performanceDeclineAlertThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.1),

  /** High issue frequency threshold (number of issues) */
  issueFrequencyHighThreshold: z.number()
    .min(1)
    .default(5),

  /** Medium issue frequency threshold (number of issues) */
  issueFrequencyMediumThreshold: z.number()
    .min(1)
    .default(2),

  /** Single vendor dependency risk threshold (0-1) */
  singleVendorDependencyThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.5),

  /** Financial stability risk score threshold */
  financialStabilityRiskThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.3),

  // ================================
  // RELATIONSHIP SCORING WEIGHTS
  // ================================

  /** Weight for performance in relationship scoring (0-1) */
  performanceWeight: z.number()
    .min(0)
    .max(1)
    .default(0.3),

  /** Weight for relationship longevity (0-1) */
  longevityWeight: z.number()
    .min(0)
    .max(1)
    .default(0.2),

  /** Weight for spend volume in relationship scoring (0-1) */
  spendWeight: z.number()
    .min(0)
    .max(1)
    .default(0.2),

  /** Weight for issue history in relationship scoring (0-1) */
  issuesWeight: z.number()
    .min(0)
    .max(1)
    .default(0.15),

  /** Weight for compliance in relationship scoring (0-1) */
  complianceWeight: z.number()
    .min(0)
    .max(1)
    .default(0.15),

  // ================================
  // SPEND LEVEL THRESHOLDS
  // ================================

  /** Strategic spend threshold (annual) */
  strategicSpendThreshold: z.number()
    .min(0)
    .default(1000000),

  /** Significant spend threshold (annual) */
  significantSpendThreshold: z.number()
    .min(0)
    .default(500000),

  /** Moderate spend threshold (annual) */
  moderateSpendThreshold: z.number()
    .min(0)
    .default(100000),

  /** Small spend threshold (annual) */
  smallSpendThreshold: z.number()
    .min(0)
    .default(10000),

  // ================================
  // COMPLIANCE SETTINGS
  // ================================

  /** Days until audit certification expires */
  auditExpirationDays: z.number()
    .min(30)
    .default(365),

  /** Required certifications for vendor compliance */
  requiredCertifications: z.array(z.string())
    .default(['ISO9001', 'SOC2']),

  /** Whether insurance is required for vendors */
  insuranceRequired: z.boolean()
    .default(true),

  /** Minimum insurance coverage amount */
  minimumInsuranceCoverage: z.number()
    .min(0)
    .default(1000000),

  /** Days before certification expiration to send warning */
  certificationExpirationWarningDays: z.number()
    .min(1)
    .default(60),

  /** Days before insurance expiration to send warning */
  insuranceExpirationWarningDays: z.number()
    .min(1)
    .default(30),

  // ================================
  // ONBOARDING THRESHOLDS
  // ================================

  /** Score threshold for automatic onboarding approval (0-1) */
  onboardingApprovalThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.75),

  /** Score threshold for conditional onboarding approval (0-1) */
  onboardingConditionalThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Minimum number of references required */
  minimumReferenceCount: z.number()
    .min(0)
    .default(3),

  /** Minimum average reference rating (1-5 scale) */
  minimumReferenceRating: z.number()
    .min(1)
    .max(5)
    .default(3.5),

  /** Maximum days allowed for onboarding process */
  maxOnboardingDays: z.number()
    .min(1)
    .default(30),

  /** Require background check for onboarding */
  requireBackgroundCheck: z.boolean()
    .default(true),

  // ================================
  // PRICING ANALYSIS
  // ================================

  /** Threshold for flagging above-market pricing (percentage) */
  aboveMarketPricingThreshold: z.number()
    .min(0)
    .default(15),

  /** Threshold for flagging below-market pricing (negative percentage) */
  belowMarketPricingThreshold: z.number()
    .max(0)
    .default(-15),

  /** Minimum data points required for market comparison */
  minimumMarketDataPoints: z.number()
    .min(1)
    .default(5),

  /** Price volatility threshold for alerts (percentage) */
  priceVolatilityThreshold: z.number()
    .min(0)
    .default(10),

  // ================================
  // TIMEOUT AND RETRY SETTINGS
  // ================================

  /** Timeout for vendor analysis operations (milliseconds) */
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
  // CACHING SETTINGS
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .min(60)
    .default(300),

  /** Cache TTL for vendor data (seconds) */
  vendorDataCacheTtl: z.number()
    .min(60)
    .default(600),

  /** Cache TTL for portfolio analysis (seconds) */
  portfolioCacheTtl: z.number()
    .min(60)
    .default(1800),

  /** Cache TTL for performance metrics (seconds) */
  performanceMetricsCacheTtl: z.number()
    .min(60)
    .default(900),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable performance tracking */
  enablePerformanceTracking: z.boolean()
    .default(true),

  /** Enable risk assessment */
  enableRiskAssessment: z.boolean()
    .default(true),

  /** Enable relationship scoring */
  enableRelationshipScoring: z.boolean()
    .default(true),

  /** Enable concentration analysis */
  enableConcentrationAnalysis: z.boolean()
    .default(true),

  /** Enable graceful degradation on errors */
  enableGracefulDegradation: z.boolean()
    .default(true),

  /** Enable automated vendor recommendations */
  enableVendorRecommendations: z.boolean()
    .default(true),

  /** Enable market price comparison */
  enableMarketComparison: z.boolean()
    .default(true),

  /** Enable compliance monitoring */
  enableComplianceMonitoring: z.boolean()
    .default(true),

  // ================================
  // NOTIFICATION SETTINGS
  // ================================

  /** Enable automatic notification for performance issues */
  autoNotifyPerformanceIssues: z.boolean()
    .default(true),

  /** Enable automatic notification for compliance expiration */
  autoNotifyComplianceExpiration: z.boolean()
    .default(true),

  /** Enable automatic notification for high concentration risk */
  autoNotifyConcentrationRisk: z.boolean()
    .default(true),

  /** Enable automatic notification for pricing anomalies */
  autoNotifyPricingAnomalies: z.boolean()
    .default(true),

  // ================================
  // SCORING PARAMETERS
  // ================================

  /** Minimum relationship duration in months for longevity bonus */
  longevityBonusMonths: z.number()
    .min(1)
    .default(24),

  /** Maximum longevity score cap in months */
  maxLongevityMonths: z.number()
    .min(12)
    .default(120),

  /** Issue decay rate in days (older issues have less impact) */
  issueDecayDays: z.number()
    .min(1)
    .default(180),

  /** Minimum transactions for reliable scoring */
  minimumTransactionsForScoring: z.number()
    .min(1)
    .default(5),
});

// =============================================================================
// TYPES
// =============================================================================

export type VendorConfig = z.infer<typeof VendorConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type VendorConfigOverride = Partial<VendorConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Vendor Agent configuration
 */
export const DEFAULT_VENDOR_CONFIG: VendorConfig = VendorConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: VendorConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Vendor Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class VendorConfigManager {
  private static instance: VendorConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: VendorConfig = DEFAULT_VENDOR_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): VendorConfigManager {
    if (!VendorConfigManager.instance) {
      VendorConfigManager.instance = new VendorConfigManager();
    }
    return VendorConfigManager.instance;
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
  ): Promise<VendorConfig> {
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
  getDefaultConfig(): VendorConfig {
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
  ): Promise<VendorConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'vendor_agent_config')
        .single();

      if (error || !data) {
        // No custom config, return defaults
        return this.defaultConfig;
      }

      // Parse and validate the override configuration
      const override = data.value as VendorConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[VendorConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: VendorConfigOverride): VendorConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      // Validate merged config
      return VendorConfigSchema.parse(merged);
    } catch (error) {
      console.error('[VendorConfig] Invalid config override, using defaults:', error);
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
  setDefaultConfig(config: Partial<VendorConfig>): void {
    this.defaultConfig = VendorConfigSchema.parse({
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
export const vendorConfigManager = VendorConfigManager.getInstance();

/**
 * Get Vendor Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getVendorConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<VendorConfig> {
  return vendorConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Vendor Agent configuration (no database lookup)
 */
export function getDefaultVendorConfig(): VendorConfig {
  return vendorConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearVendorConfigCache(enterpriseId?: string): void {
  vendorConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS - PERFORMANCE
// =============================================================================

/**
 * Check if a performance score is considered excellent
 */
export function isExcellentPerformance(score: number, config: VendorConfig): boolean {
  return score >= config.excellentPerformanceThreshold;
}

/**
 * Check if a performance score is considered good
 */
export function isGoodPerformance(score: number, config: VendorConfig): boolean {
  return score >= config.goodPerformanceThreshold && score < config.excellentPerformanceThreshold;
}

/**
 * Check if a performance score is considered average
 */
export function isAveragePerformance(score: number, config: VendorConfig): boolean {
  return score >= config.averagePerformanceThreshold && score < config.goodPerformanceThreshold;
}

/**
 * Check if a performance score is considered poor
 */
export function isPoorPerformance(score: number, config: VendorConfig): boolean {
  return score < config.poorPerformanceThreshold;
}

/**
 * Get performance rating label
 */
export function getPerformanceRating(
  score: number,
  config: VendorConfig,
): 'excellent' | 'good' | 'average' | 'poor' | 'critical' {
  if (score >= config.excellentPerformanceThreshold) return 'excellent';
  if (score >= config.goodPerformanceThreshold) return 'good';
  if (score >= config.averagePerformanceThreshold) return 'average';
  if (score >= config.poorPerformanceThreshold) return 'poor';
  return 'critical';
}

// =============================================================================
// CONFIGURATION HELPERS - RISK
// =============================================================================

/**
 * Assess vendor concentration risk level
 */
export function assessConcentrationRisk(
  percentage: number,
  config: VendorConfig,
): 'low' | 'medium' | 'high' {
  if (percentage >= config.highRiskConcentrationThreshold) return 'high';
  if (percentage >= config.mediumRiskConcentrationThreshold) return 'medium';
  return 'low';
}

/**
 * Check if issue frequency indicates high risk
 */
export function isHighIssueFrequency(issueCount: number, config: VendorConfig): boolean {
  return issueCount >= config.issueFrequencyHighThreshold;
}

/**
 * Check if issue frequency indicates medium risk
 */
export function isMediumIssueFrequency(issueCount: number, config: VendorConfig): boolean {
  return issueCount >= config.issueFrequencyMediumThreshold &&
         issueCount < config.issueFrequencyHighThreshold;
}

/**
 * Assess issue frequency risk level
 */
export function assessIssueFrequencyRisk(
  issueCount: number,
  config: VendorConfig,
): 'low' | 'medium' | 'high' {
  if (issueCount >= config.issueFrequencyHighThreshold) return 'high';
  if (issueCount >= config.issueFrequencyMediumThreshold) return 'medium';
  return 'low';
}

/**
 * Check if performance decline exceeds alert threshold
 */
export function isSignificantPerformanceDecline(
  declineRate: number,
  config: VendorConfig,
): boolean {
  return declineRate >= config.performanceDeclineAlertThreshold;
}

// =============================================================================
// CONFIGURATION HELPERS - SPEND
// =============================================================================

/**
 * Determine spend level classification
 */
export function determineSpendLevel(
  amount: number,
  config: VendorConfig,
): 'strategic' | 'significant' | 'moderate' | 'small' | 'minimal' {
  if (amount >= config.strategicSpendThreshold) return 'strategic';
  if (amount >= config.significantSpendThreshold) return 'significant';
  if (amount >= config.moderateSpendThreshold) return 'moderate';
  if (amount >= config.smallSpendThreshold) return 'small';
  return 'minimal';
}

/**
 * Check if spend is at strategic level
 */
export function isStrategicSpend(amount: number, config: VendorConfig): boolean {
  return amount >= config.strategicSpendThreshold;
}

/**
 * Check if spend is significant
 */
export function isSignificantSpend(amount: number, config: VendorConfig): boolean {
  return amount >= config.significantSpendThreshold;
}

// =============================================================================
// CONFIGURATION HELPERS - COMPLIANCE
// =============================================================================

/**
 * Check if vendor compliance audit has expired
 */
export function isComplianceExpired(
  lastAuditDate: Date | string,
  config: VendorConfig,
): boolean {
  const auditDate = new Date(lastAuditDate);
  const expirationDate = new Date(auditDate);
  expirationDate.setDate(expirationDate.getDate() + config.auditExpirationDays);
  return new Date() > expirationDate;
}

/**
 * Check if compliance audit is expiring soon
 */
export function isComplianceExpiringSoon(
  lastAuditDate: Date | string,
  config: VendorConfig,
): boolean {
  const auditDate = new Date(lastAuditDate);
  const expirationDate = new Date(auditDate);
  expirationDate.setDate(expirationDate.getDate() + config.auditExpirationDays);

  const warningDate = new Date(expirationDate);
  warningDate.setDate(warningDate.getDate() - config.certificationExpirationWarningDays);

  const now = new Date();
  return now > warningDate && now <= expirationDate;
}

/**
 * Get days until compliance expiration
 */
export function getDaysUntilComplianceExpiration(
  lastAuditDate: Date | string,
  config: VendorConfig,
): number {
  const auditDate = new Date(lastAuditDate);
  const expirationDate = new Date(auditDate);
  expirationDate.setDate(expirationDate.getDate() + config.auditExpirationDays);

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if vendor has required certifications
 */
export function hasRequiredCertifications(
  vendorCertifications: string[],
  config: VendorConfig,
): boolean {
  return config.requiredCertifications.every(
    required => vendorCertifications.includes(required)
  );
}

/**
 * Get missing certifications
 */
export function getMissingCertifications(
  vendorCertifications: string[],
  config: VendorConfig,
): string[] {
  return config.requiredCertifications.filter(
    required => !vendorCertifications.includes(required)
  );
}

/**
 * Check if insurance coverage is adequate
 */
export function isInsuranceCoverageAdequate(
  coverageAmount: number,
  config: VendorConfig,
): boolean {
  if (!config.insuranceRequired) return true;
  return coverageAmount >= config.minimumInsuranceCoverage;
}

// =============================================================================
// CONFIGURATION HELPERS - ONBOARDING
// =============================================================================

/**
 * Determine if vendor should be approved for onboarding
 */
export function shouldApproveOnboarding(
  score: number,
  config: VendorConfig,
): 'approve' | 'conditional' | 'reject' {
  if (score >= config.onboardingApprovalThreshold) return 'approve';
  if (score >= config.onboardingConditionalThreshold) return 'conditional';
  return 'reject';
}

/**
 * Check if reference count meets minimum requirement
 */
export function meetsReferenceCountRequirement(
  referenceCount: number,
  config: VendorConfig,
): boolean {
  return referenceCount >= config.minimumReferenceCount;
}

/**
 * Check if reference rating meets minimum requirement
 */
export function meetsReferenceRatingRequirement(
  averageRating: number,
  config: VendorConfig,
): boolean {
  return averageRating >= config.minimumReferenceRating;
}

/**
 * Validate onboarding requirements
 */
export function validateOnboardingRequirements(
  vendor: {
    score: number;
    referenceCount: number;
    averageReferenceRating: number;
    hasBackgroundCheck: boolean;
    certifications: string[];
  },
  config: VendorConfig,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!meetsReferenceCountRequirement(vendor.referenceCount, config)) {
    issues.push(`Insufficient references: ${vendor.referenceCount}/${config.minimumReferenceCount} required`);
  }

  if (!meetsReferenceRatingRequirement(vendor.averageReferenceRating, config)) {
    issues.push(`Reference rating too low: ${vendor.averageReferenceRating}/${config.minimumReferenceRating} required`);
  }

  if (config.requireBackgroundCheck && !vendor.hasBackgroundCheck) {
    issues.push('Background check required but not completed');
  }

  const missingCerts = getMissingCertifications(vendor.certifications, config);
  if (missingCerts.length > 0) {
    issues.push(`Missing certifications: ${missingCerts.join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// CONFIGURATION HELPERS - PRICING
// =============================================================================

/**
 * Check if pricing is above market
 */
export function isAboveMarketPricing(
  variancePercent: number,
  config: VendorConfig,
): boolean {
  return variancePercent > config.aboveMarketPricingThreshold;
}

/**
 * Check if pricing is below market (suspicious)
 */
export function isBelowMarketPricing(
  variancePercent: number,
  config: VendorConfig,
): boolean {
  return variancePercent < config.belowMarketPricingThreshold;
}

/**
 * Assess pricing competitiveness
 */
export function assessPricingCompetitiveness(
  variancePercent: number,
  config: VendorConfig,
): 'above_market' | 'competitive' | 'below_market' {
  if (variancePercent > config.aboveMarketPricingThreshold) return 'above_market';
  if (variancePercent < config.belowMarketPricingThreshold) return 'below_market';
  return 'competitive';
}

/**
 * Check if price volatility exceeds threshold
 */
export function isPriceVolatile(
  volatilityPercent: number,
  config: VendorConfig,
): boolean {
  return volatilityPercent > config.priceVolatilityThreshold;
}

// =============================================================================
// CONFIGURATION HELPERS - RELATIONSHIP SCORING
// =============================================================================

/**
 * Calculate relationship score
 */
export function calculateRelationshipScore(
  metrics: {
    performanceScore: number;
    longevityMonths: number;
    annualSpend: number;
    totalSpend: number;
    issueCount: number;
    complianceScore: number;
  },
  config: VendorConfig,
): number {
  // Normalize longevity (capped at max)
  const normalizedLongevity = Math.min(
    metrics.longevityMonths / config.maxLongevityMonths,
    1
  );

  // Normalize spend (using strategic threshold as max)
  const normalizedSpend = Math.min(
    metrics.annualSpend / config.strategicSpendThreshold,
    1
  );

  // Calculate issue score (inverse - fewer issues = higher score)
  const issueScore = Math.max(
    1 - (metrics.issueCount / (config.issueFrequencyHighThreshold * 2)),
    0
  );

  // Calculate weighted score
  const score =
    metrics.performanceScore * config.performanceWeight +
    normalizedLongevity * config.longevityWeight +
    normalizedSpend * config.spendWeight +
    issueScore * config.issuesWeight +
    metrics.complianceScore * config.complianceWeight;

  return Math.min(Math.max(score, 0), 1);
}

/**
 * Validate that relationship scoring weights sum to 1
 */
export function validateScoringWeights(config: VendorConfig): boolean {
  const total =
    config.performanceWeight +
    config.longevityWeight +
    config.spendWeight +
    config.issuesWeight +
    config.complianceWeight;

  return Math.abs(total - 1) < 0.001;
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate a configuration override object
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: VendorConfigOverride;
  errors?: string[];
} {
  try {
    // Partial validation - only validate provided fields
    const partialSchema = VendorConfigSchema.partial();
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
export function validateConfigThresholds(config: VendorConfig): string[] {
  const errors: string[] = [];

  // Performance threshold ordering: excellent > good > average > poor
  if (config.excellentPerformanceThreshold <= config.goodPerformanceThreshold) {
    errors.push(
      `excellentPerformanceThreshold (${config.excellentPerformanceThreshold}) must be > goodPerformanceThreshold (${config.goodPerformanceThreshold})`
    );
  }

  if (config.goodPerformanceThreshold <= config.averagePerformanceThreshold) {
    errors.push(
      `goodPerformanceThreshold (${config.goodPerformanceThreshold}) must be > averagePerformanceThreshold (${config.averagePerformanceThreshold})`
    );
  }

  if (config.averagePerformanceThreshold <= config.poorPerformanceThreshold) {
    errors.push(
      `averagePerformanceThreshold (${config.averagePerformanceThreshold}) must be > poorPerformanceThreshold (${config.poorPerformanceThreshold})`
    );
  }

  // Risk concentration threshold ordering: high > medium
  if (config.highRiskConcentrationThreshold <= config.mediumRiskConcentrationThreshold) {
    errors.push(
      `highRiskConcentrationThreshold (${config.highRiskConcentrationThreshold}) must be > mediumRiskConcentrationThreshold (${config.mediumRiskConcentrationThreshold})`
    );
  }

  // Issue frequency threshold ordering: high > medium
  if (config.issueFrequencyHighThreshold <= config.issueFrequencyMediumThreshold) {
    errors.push(
      `issueFrequencyHighThreshold (${config.issueFrequencyHighThreshold}) must be > issueFrequencyMediumThreshold (${config.issueFrequencyMediumThreshold})`
    );
  }

  // Spend threshold ordering: strategic > significant > moderate > small
  if (config.strategicSpendThreshold <= config.significantSpendThreshold) {
    errors.push(
      `strategicSpendThreshold (${config.strategicSpendThreshold}) must be > significantSpendThreshold (${config.significantSpendThreshold})`
    );
  }

  if (config.significantSpendThreshold <= config.moderateSpendThreshold) {
    errors.push(
      `significantSpendThreshold (${config.significantSpendThreshold}) must be > moderateSpendThreshold (${config.moderateSpendThreshold})`
    );
  }

  if (config.moderateSpendThreshold <= config.smallSpendThreshold) {
    errors.push(
      `moderateSpendThreshold (${config.moderateSpendThreshold}) must be > smallSpendThreshold (${config.smallSpendThreshold})`
    );
  }

  // Onboarding threshold ordering: approval > conditional
  if (config.onboardingApprovalThreshold <= config.onboardingConditionalThreshold) {
    errors.push(
      `onboardingApprovalThreshold (${config.onboardingApprovalThreshold}) must be > onboardingConditionalThreshold (${config.onboardingConditionalThreshold})`
    );
  }

  // Pricing threshold constraints
  if (config.aboveMarketPricingThreshold <= 0) {
    errors.push(
      `aboveMarketPricingThreshold (${config.aboveMarketPricingThreshold}) must be > 0`
    );
  }

  if (config.belowMarketPricingThreshold >= 0) {
    errors.push(
      `belowMarketPricingThreshold (${config.belowMarketPricingThreshold}) must be < 0`
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

  // Longevity constraints
  if (config.longevityBonusMonths >= config.maxLongevityMonths) {
    errors.push(
      `longevityBonusMonths (${config.longevityBonusMonths}) must be < maxLongevityMonths (${config.maxLongevityMonths})`
    );
  }

  // Validate scoring weights sum to 1
  if (!validateScoringWeights(config)) {
    const total =
      config.performanceWeight +
      config.longevityWeight +
      config.spendWeight +
      config.issuesWeight +
      config.complianceWeight;
    errors.push(
      `Relationship scoring weights must sum to 1.0, got ${total.toFixed(3)}`
    );
  }

  // Reference rating constraints
  if (config.minimumReferenceRating < 1 || config.minimumReferenceRating > 5) {
    errors.push(
      `minimumReferenceRating (${config.minimumReferenceRating}) must be between 1 and 5`
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
export function validateAndLogConfigWarnings(config: VendorConfig): VendorConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[VendorConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
