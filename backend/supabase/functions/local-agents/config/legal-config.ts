import { z } from 'zod';

/**
 * Legal Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Legal Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Legal Agent configuration validation
 */
export const LegalConfigSchema = z.object({
  // ================================
  // RISK THRESHOLDS
  // ================================

  /** Score threshold for flagging high-risk contracts (0-10 scale) */
  highRiskScoreThreshold: z.number()
    .min(0)
    .max(10)
    .default(6),

  /** Score threshold for critical risk requiring immediate review (0-10 scale) */
  criticalRiskScoreThreshold: z.number()
    .min(0)
    .max(10)
    .default(10),

  /** Maximum number of high-risk clauses before flagging contract */
  maxHighRiskClauses: z.number()
    .min(1)
    .max(100)
    .default(3),

  // ================================
  // CONTENT LIMITS
  // ================================

  /** Minimum content length for meaningful legal analysis */
  minContentLength: z.number()
    .min(1)
    .default(10),

  /** Maximum content length for processing (10MB default) */
  maxContentLength: z.number()
    .min(1000)
    .max(50000000)
    .default(10 * 1024 * 1024),

  /** Maximum clauses to extract per document */
  maxClauses: z.number()
    .min(10)
    .max(2000)
    .default(500),

  /** Maximum obligations to extract per document */
  maxObligations: z.number()
    .min(10)
    .max(5000)
    .default(1000),

  /** Context window for clause analysis (characters) */
  clauseContextWindow: z.number()
    .min(100)
    .max(5000)
    .default(1000),

  // ================================
  // ANALYSIS THRESHOLDS
  // ================================

  /** Minimum confidence for legal analysis results */
  minAnalysisConfidence: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  /** Similarity threshold for obligation deduplication (0-1) */
  obligationSimilarityThreshold: z.number()
    .min(0)
    .max(1)
    .default(0.8),

  /** Maximum cross-references to extract */
  maxCrossReferences: z.number()
    .min(10)
    .max(500)
    .default(100),

  /** Maximum amendments to detect */
  maxAmendments: z.number()
    .min(5)
    .max(200)
    .default(50),

  // ================================
  // COMPLIANCE SETTINGS
  // ================================

  /** Enable GDPR compliance checking */
  enableGdprChecks: z.boolean()
    .default(true),

  /** Enable CCPA compliance checking */
  enableCcpaChecks: z.boolean()
    .default(true),

  /** Enable HIPAA compliance checking */
  enableHipaaChecks: z.boolean()
    .default(true),

  /** Industry standards to check (PCI DSS, SOC 2, ISO 27001, etc.) */
  industryStandardsToCheck: z.array(z.string())
    .default(['PCI DSS', 'SOC 2', 'ISO 27001', 'HIPAA', 'HITECH']),

  /** Required vendor document types for compliance */
  requiredVendorDocuments: z.array(z.string())
    .default(['w9', 'insurance_certificate', 'business_license']),

  // ================================
  // RISK PATTERNS
  // ================================

  /** Patterns for high-risk clause detection (regex strings) */
  highRiskClausePatterns: z.array(z.string())
    .default([
      'unlimited\\s+liability',
      'any\\s+and\\s+all',
      'sole\\s+discretion',
      'perpetual',
      'irrevocable',
      'binding\\s+arbitration',
      'waive.*?jury',
      'liquidated\\s+damages',
      'punitive\\s+damages',
    ]),

  /** Patterns for red flag detection */
  redFlagPatterns: z.array(z.string())
    .default([
      'perpetual\\s+obligation',
      'jury\\s+trial\\s+waiver',
      'attorney.*?fees',
      'non.?compete',
      'assignment\\s+restriction',
    ]),

  /** Patterns indicating missing essential clauses */
  essentialClausePatterns: z.array(z.object({
    name: z.string(),
    type: z.string(),
    pattern: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  }))
    .default([
      { name: 'Limitation of Liability', type: 'limitation_liability', pattern: 'limit.*?liab', severity: 'high' },
      { name: 'Termination Clause', type: 'termination', pattern: 'terminat', severity: 'high' },
      { name: 'Confidentiality', type: 'confidentiality', pattern: 'confidential', severity: 'medium' },
      { name: 'Dispute Resolution', type: 'dispute_resolution', pattern: 'dispute.*?resolut', severity: 'medium' },
      { name: 'Indemnification', type: 'indemnification', pattern: 'indemnif', severity: 'medium' },
      { name: 'Governing Law', type: 'governing_law', pattern: 'govern.*?law', severity: 'low' },
    ]),

  // ================================
  // NOTIFICATION SETTINGS
  // ================================

  /** Risk levels that trigger legal team notification */
  notifyOnRiskLevels: z.array(z.enum(['high', 'critical']))
    .default(['high', 'critical']),

  /** Enable automatic notification to legal team for high-risk contracts */
  autoNotifyLegalTeam: z.boolean()
    .default(true),

  /** Days before contract expiration to notify legal team */
  expirationNotificationDays: z.number()
    .min(1)
    .default(60),

  // ================================
  // TIMEOUT AND RETRY SETTINGS
  // ================================

  /** Timeout for legal analysis operations (milliseconds) */
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

  /** Cache TTL for contract analysis results (seconds) */
  analysisCacheTtl: z.number()
    .min(60)
    .default(600),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable NDA-specific analysis */
  enableNdaAnalysis: z.boolean()
    .default(true),

  /** Enable cross-reference detection */
  enableCrossReferenceDetection: z.boolean()
    .default(true),

  /** Enable amendment detection */
  enableAmendmentDetection: z.boolean()
    .default(true),

  /** Enable IP clause analysis */
  enableIpClauseAnalysis: z.boolean()
    .default(true),

  /** Enable jurisdiction analysis */
  enableJurisdictionAnalysis: z.boolean()
    .default(true),

  /** Enable graceful degradation on errors */
  enableGracefulDegradation: z.boolean()
    .default(true),
});

// =============================================================================
// TYPES
// =============================================================================

export type LegalConfig = z.infer<typeof LegalConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type LegalConfigOverride = Partial<LegalConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Legal Agent configuration
 */
export const DEFAULT_LEGAL_CONFIG: LegalConfig = LegalConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: LegalConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Legal Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class LegalConfigManager {
  private static instance: LegalConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: LegalConfig = DEFAULT_LEGAL_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): LegalConfigManager {
    if (!LegalConfigManager.instance) {
      LegalConfigManager.instance = new LegalConfigManager();
    }
    return LegalConfigManager.instance;
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
  ): Promise<LegalConfig> {
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
  getDefaultConfig(): LegalConfig {
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
  ): Promise<LegalConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'legal_agent_config')
        .single();

      if (error || !data) {
        // No custom config, return defaults
        return this.defaultConfig;
      }

      // Parse and validate the override configuration
      const override = data.value as LegalConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[LegalConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: LegalConfigOverride): LegalConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      // Validate merged config
      return LegalConfigSchema.parse(merged);
    } catch (error) {
      console.error('[LegalConfig] Invalid config override, using defaults:', error);
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
  setDefaultConfig(config: Partial<LegalConfig>): void {
    this.defaultConfig = LegalConfigSchema.parse({
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
export const legalConfigManager = LegalConfigManager.getInstance();

/**
 * Get Legal Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getLegalConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<LegalConfig> {
  return legalConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Legal Agent configuration (no database lookup)
 */
export function getDefaultLegalConfig(): LegalConfig {
  return legalConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearLegalConfigCache(enterpriseId?: string): void {
  legalConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Check if a risk score is considered high-risk
 */
export function isHighRisk(score: number, config: LegalConfig): boolean {
  return score >= config.highRiskScoreThreshold;
}

/**
 * Check if a risk score is considered critical
 */
export function isCriticalRisk(score: number, config: LegalConfig): boolean {
  return score >= config.criticalRiskScoreThreshold;
}

/**
 * Get compiled regex patterns for high-risk clauses
 */
export function getHighRiskClauseRegexes(config: LegalConfig): RegExp[] {
  return config.highRiskClausePatterns.map(pattern => {
    try {
      return new RegExp(pattern, 'gi');
    } catch {
      console.warn(`[LegalConfig] Invalid regex pattern: ${pattern}`);
      return null;
    }
  }).filter((r): r is RegExp => r !== null);
}

/**
 * Get compiled regex patterns for red flags
 */
export function getRedFlagRegexes(config: LegalConfig): RegExp[] {
  return config.redFlagPatterns.map(pattern => {
    try {
      return new RegExp(pattern, 'gi');
    } catch {
      console.warn(`[LegalConfig] Invalid regex pattern: ${pattern}`);
      return null;
    }
  }).filter((r): r is RegExp => r !== null);
}

/**
 * Check if content meets minimum requirements for analysis
 */
export function meetsMinimumContentRequirements(
  content: string,
  config: LegalConfig,
): boolean {
  return content.length >= config.minContentLength && content.length <= config.maxContentLength;
}

/**
 * Validate a configuration override object
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: LegalConfigOverride;
  errors?: string[];
} {
  try {
    // Partial validation - only validate provided fields
    const partialSchema = LegalConfigSchema.partial();
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
export function validateConfigThresholds(config: LegalConfig): string[] {
  const errors: string[] = [];

  // Risk threshold ordering: critical >= high
  if (config.criticalRiskScoreThreshold < config.highRiskScoreThreshold) {
    errors.push(
      `criticalRiskScoreThreshold (${config.criticalRiskScoreThreshold}) must be >= highRiskScoreThreshold (${config.highRiskScoreThreshold})`
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

  // Cache TTL constraints
  if (config.configCacheTtl > config.analysisCacheTtl) {
    errors.push(
      `configCacheTtl (${config.configCacheTtl}) should typically be <= analysisCacheTtl (${config.analysisCacheTtl})`
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
export function validateAndLogConfigWarnings(config: LegalConfig): LegalConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[LegalConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}

/**
 * Get the essential clause patterns as RegExp objects with metadata
 */
export function getEssentialClauseChecks(config: LegalConfig): Array<{
  name: string;
  type: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> {
  return config.essentialClausePatterns.map(clause => {
    try {
      return {
        ...clause,
        pattern: new RegExp(clause.pattern, 'gi'),
      };
    } catch {
      console.warn(`[LegalConfig] Invalid essential clause pattern: ${clause.pattern}`);
      return null;
    }
  }).filter((c): c is NonNullable<typeof c> => c !== null);
}
