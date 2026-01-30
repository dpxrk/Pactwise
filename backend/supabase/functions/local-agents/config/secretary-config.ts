import { z } from 'zod';

/**
 * Secretary Agent Configuration System
 *
 * Provides enterprise-customizable thresholds for the Secretary Agent.
 * Configuration is loaded from database (enterprise_settings table) and cached.
 */

// =============================================================================
// CONFIGURATION SCHEMA
// =============================================================================

/**
 * Zod schema for Secretary Agent configuration validation
 */
export const SecretaryConfigSchema = z.object({
  // ================================
  // VALUE THRESHOLDS
  // ================================

  /** Threshold for flagging high-value contracts (in base currency) */
  highValueContractThreshold: z.number()
    .min(0)
    .default(100000),

  /** Threshold for critical-value contracts requiring additional review */
  criticalValueContractThreshold: z.number()
    .min(0)
    .default(500000),

  /** Minimum contract value to process (filter out micro-contracts) */
  minContractValueThreshold: z.number()
    .min(0)
    .default(0),

  // ================================
  // COMPLETENESS THRESHOLDS
  // ================================

  /** Minimum completeness score (0-1) before flagging as incomplete */
  minCompletenessScore: z.number()
    .min(0)
    .max(1)
    .default(0.7),

  /** Minimum readability score (0-100) before flagging as poor readability */
  minReadabilityScore: z.number()
    .min(0)
    .max(100)
    .default(30),

  /** Minimum extraction confidence to consider results reliable */
  minExtractionConfidence: z.number()
    .min(0)
    .max(1)
    .default(0.6),

  // ================================
  // EXTRACTION SETTINGS
  // ================================

  /** Maximum document content length (characters) */
  maxDocumentLength: z.number()
    .min(1000)
    .max(50000000)
    .default(5000000),

  /** Minimum content length for meaningful analysis */
  minContentLength: z.number()
    .min(1)
    .default(10),

  /** Minimum number of parties expected in a valid contract */
  minPartyCount: z.number()
    .min(1)
    .default(2),

  /** Maximum amounts to extract per document */
  maxAmountsToExtract: z.number()
    .min(1)
    .max(1000)
    .default(100),

  /** Maximum parties to extract per document */
  maxPartiesToExtract: z.number()
    .min(1)
    .max(500)
    .default(50),

  /** Maximum dates to extract per document */
  maxDatesToExtract: z.number()
    .min(1)
    .max(500)
    .default(100),

  /** Maximum clauses to analyze per document */
  maxClausesToAnalyze: z.number()
    .min(1)
    .max(2000)
    .default(500),

  // ================================
  // EXPIRATION WARNINGS
  // ================================

  /** Days before expiration to trigger warning */
  expirationWarningDays: z.number()
    .min(1)
    .default(90),

  /** Days before expiration for critical alert */
  criticalExpirationDays: z.number()
    .min(1)
    .default(30),

  /** Days before expiration for urgent alert */
  urgentExpirationDays: z.number()
    .min(1)
    .default(7),

  // ================================
  // RISK PATTERNS
  // ================================

  /** Patterns that indicate risky clauses (regex strings) */
  riskyClausePatterns: z.array(z.string())
    .default([
      'unlimited\\s+liability',
      'auto.?renew',
      'no\\s+termination',
      'exclusive\\s+rights',
      'non.?compete',
      'liquidated\\s+damages',
      'indemnif',
      'waive.*?right',
      'perpetual\\s+license',
      'sole\\s+discretion',
    ]),

  /** Patterns indicating high-risk vendor terms */
  highRiskVendorPatterns: z.array(z.string())
    .default([
      'bankrupt',
      'insolvent',
      'litigation',
      'lawsuit',
      'sanction',
      'embargo',
      'breach',
      'violation',
    ]),

  /** Keywords for compliance-sensitive documents */
  complianceKeywords: z.array(z.string())
    .default([
      'gdpr',
      'hipaa',
      'sox',
      'pci',
      'ferpa',
      'ccpa',
      'data\\s+protection',
      'privacy',
    ]),

  // ================================
  // VENDOR COMPLIANCE
  // ================================

  /** Required vendor document types */
  requiredVendorDocuments: z.array(z.string())
    .default([
      'w9',
      'insurance_certificate',
    ]),

  /** Days before vendor document expiry to warn */
  vendorDocumentExpiryWarningDays: z.number()
    .min(1)
    .default(60),

  // ================================
  // OCR SETTINGS
  // ================================

  /** Enable OCR processing for PDFs */
  enableOcr: z.boolean()
    .default(true),

  /** Minimum OCR confidence threshold */
  minOcrConfidence: z.number()
    .min(0)
    .max(1)
    .default(0.5),

  /** Maximum file size for OCR processing (bytes) */
  maxOcrFileSize: z.number()
    .min(1024)
    .default(50 * 1024 * 1024), // 50MB

  // ================================
  // CACHING
  // ================================

  /** Cache TTL for configuration (seconds) */
  configCacheTtl: z.number()
    .min(60)
    .default(300), // 5 minutes

  /** Cache TTL for contract data (seconds) */
  contractDataCacheTtl: z.number()
    .min(60)
    .default(300),

  /** Cache TTL for vendor data (seconds) */
  vendorDataCacheTtl: z.number()
    .min(60)
    .default(600),

  // ================================
  // FEATURE FLAGS
  // ================================

  /** Enable memory context for processing */
  enableMemoryContext: z.boolean()
    .default(true),

  /** Enable workflow automation */
  enableWorkflowAutomation: z.boolean()
    .default(true),

  /** Enable NER (Named Entity Recognition) */
  enableNer: z.boolean()
    .default(true),

  /** Enable sentiment analysis */
  enableSentimentAnalysis: z.boolean()
    .default(true),

  /** Enable document similarity detection */
  enableSimilarityDetection: z.boolean()
    .default(false),

  // ================================
  // TIMEOUT SETTINGS
  // ================================

  /** Timeout for extraction operations (milliseconds) */
  extractionTimeoutMs: z.number()
    .min(1000)
    .max(300000)
    .default(30000),

  /** Timeout for configuration loading (milliseconds) */
  configLoadTimeoutMs: z.number()
    .min(1000)
    .max(30000)
    .default(5000),

  /** Batch size for OCR processing */
  ocrBatchSize: z.number()
    .min(1)
    .max(50)
    .default(10),

  /** Timeout for database retry operations (milliseconds) */
  maxRetryDelayMs: z.number()
    .min(100)
    .max(10000)
    .default(2000),

  /** Maximum retry attempts for recoverable errors */
  maxRetryAttempts: z.number()
    .min(1)
    .max(10)
    .default(3),
});

// =============================================================================
// TYPES
// =============================================================================

export type SecretaryConfig = z.infer<typeof SecretaryConfigSchema>;

/**
 * Partial configuration for enterprise overrides
 */
export type SecretaryConfigOverride = Partial<SecretaryConfig>;

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default Secretary Agent configuration
 */
export const DEFAULT_SECRETARY_CONFIG: SecretaryConfig = SecretaryConfigSchema.parse({});

// =============================================================================
// CONFIGURATION MANAGER
// =============================================================================

/**
 * Cache entry structure
 */
interface ConfigCacheEntry {
  config: SecretaryConfig;
  timestamp: number;
  enterpriseId: string;
}

/**
 * Secretary Configuration Manager
 *
 * Loads and caches enterprise-specific configuration from the database.
 * Falls back to defaults if no custom configuration exists.
 */
class SecretaryConfigManager {
  private static instance: SecretaryConfigManager;
  private cache: Map<string, ConfigCacheEntry> = new Map();
  private defaultConfig: SecretaryConfig = DEFAULT_SECRETARY_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SecretaryConfigManager {
    if (!SecretaryConfigManager.instance) {
      SecretaryConfigManager.instance = new SecretaryConfigManager();
    }
    return SecretaryConfigManager.instance;
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
  ): Promise<SecretaryConfig> {
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
  getDefaultConfig(): SecretaryConfig {
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
  ): Promise<SecretaryConfig> {
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('value')
        .eq('enterprise_id', enterpriseId)
        .eq('key', 'secretary_agent_config')
        .single();

      if (error || !data) {
        // No custom config, return defaults
        return this.defaultConfig;
      }

      // Parse and validate the override configuration
      const override = data.value as SecretaryConfigOverride;
      return this.mergeConfig(override);
    } catch (error) {
      console.error('[SecretaryConfig] Failed to load config from database:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Merge override configuration with defaults
   */
  private mergeConfig(override: SecretaryConfigOverride): SecretaryConfig {
    try {
      const merged = {
        ...this.defaultConfig,
        ...override,
      };

      // Validate merged config
      return SecretaryConfigSchema.parse(merged);
    } catch (error) {
      console.error('[SecretaryConfig] Invalid config override, using defaults:', error);
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
  setDefaultConfig(config: Partial<SecretaryConfig>): void {
    this.defaultConfig = SecretaryConfigSchema.parse({
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
export const secretaryConfigManager = SecretaryConfigManager.getInstance();

/**
 * Get Secretary Agent configuration for an enterprise
 *
 * @param supabase - Supabase client instance
 * @param enterpriseId - Enterprise ID
 * @returns Configuration object
 */
export async function getSecretaryConfig(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: EnterpriseSettingsRow | null; error: Error | null }> } } } },
  enterpriseId: string,
): Promise<SecretaryConfig> {
  return secretaryConfigManager.getConfig(supabase, enterpriseId);
}

/**
 * Get default Secretary Agent configuration (no database lookup)
 */
export function getDefaultSecretaryConfig(): SecretaryConfig {
  return secretaryConfigManager.getDefaultConfig();
}

/**
 * Clear configuration cache
 */
export function clearSecretaryConfigCache(enterpriseId?: string): void {
  secretaryConfigManager.clearCache(enterpriseId);
}

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

/**
 * Check if a contract value is considered high-value
 */
export function isHighValueContract(value: number, config: SecretaryConfig): boolean {
  return value >= config.highValueContractThreshold;
}

/**
 * Check if a contract value is considered critical
 */
export function isCriticalValueContract(value: number, config: SecretaryConfig): boolean {
  return value >= config.criticalValueContractThreshold;
}

/**
 * Get expiration urgency level based on days until expiration
 */
export function getExpirationUrgency(
  daysUntilExpiration: number,
  config: SecretaryConfig,
): 'critical' | 'urgent' | 'warning' | 'normal' {
  if (daysUntilExpiration <= config.urgentExpirationDays) {
    return 'urgent';
  }
  if (daysUntilExpiration <= config.criticalExpirationDays) {
    return 'critical';
  }
  if (daysUntilExpiration <= config.expirationWarningDays) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Check if content meets minimum requirements for analysis
 */
export function meetsMinimumContentRequirements(
  content: string,
  config: SecretaryConfig,
): boolean {
  return content.length >= config.minContentLength;
}

/**
 * Get compiled regex patterns for risky clauses
 */
export function getRiskyClauseRegexes(config: SecretaryConfig): RegExp[] {
  return config.riskyClausePatterns.map(pattern => {
    try {
      return new RegExp(pattern, 'gi');
    } catch {
      console.warn(`[SecretaryConfig] Invalid regex pattern: ${pattern}`);
      return null;
    }
  }).filter((r): r is RegExp => r !== null);
}

/**
 * Get compiled regex patterns for high-risk vendor terms
 */
export function getHighRiskVendorRegexes(config: SecretaryConfig): RegExp[] {
  return config.highRiskVendorPatterns.map(pattern => {
    try {
      return new RegExp(pattern, 'gi');
    } catch {
      console.warn(`[SecretaryConfig] Invalid regex pattern: ${pattern}`);
      return null;
    }
  }).filter((r): r is RegExp => r !== null);
}

/**
 * Validate a configuration override object
 */
export function validateConfigOverride(override: unknown): {
  valid: boolean;
  config?: SecretaryConfigOverride;
  errors?: string[];
} {
  try {
    // Partial validation - only validate provided fields
    const partialSchema = SecretaryConfigSchema.partial();
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
 * Ensures thresholds have logically consistent values (e.g., critical > high).
 * @param config - The configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateConfigThresholds(config: SecretaryConfig): string[] {
  const errors: string[] = [];

  // Value threshold ordering: critical >= high
  if (config.criticalValueContractThreshold < config.highValueContractThreshold) {
    errors.push(
      `criticalValueContractThreshold (${config.criticalValueContractThreshold}) must be >= highValueContractThreshold (${config.highValueContractThreshold})`
    );
  }

  // Minimum value threshold should be less than high value
  if (config.minContractValueThreshold > config.highValueContractThreshold) {
    errors.push(
      `minContractValueThreshold (${config.minContractValueThreshold}) should be <= highValueContractThreshold (${config.highValueContractThreshold})`
    );
  }

  // Expiration days ordering: urgent < critical < warning
  if (config.urgentExpirationDays >= config.criticalExpirationDays) {
    errors.push(
      `urgentExpirationDays (${config.urgentExpirationDays}) must be < criticalExpirationDays (${config.criticalExpirationDays})`
    );
  }
  if (config.criticalExpirationDays >= config.expirationWarningDays) {
    errors.push(
      `criticalExpirationDays (${config.criticalExpirationDays}) must be < expirationWarningDays (${config.expirationWarningDays})`
    );
  }

  // Content length constraints
  if (config.minContentLength >= config.maxDocumentLength) {
    errors.push(
      `minContentLength (${config.minContentLength}) must be < maxDocumentLength (${config.maxDocumentLength})`
    );
  }

  // OCR confidence should be less than extraction confidence for meaningful filtering
  if (config.minOcrConfidence > config.minExtractionConfidence) {
    errors.push(
      `minOcrConfidence (${config.minOcrConfidence}) should be <= minExtractionConfidence (${config.minExtractionConfidence}) for consistent quality filtering`
    );
  }

  // Timeout constraints
  if (config.configLoadTimeoutMs >= config.extractionTimeoutMs) {
    errors.push(
      `configLoadTimeoutMs (${config.configLoadTimeoutMs}) should be < extractionTimeoutMs (${config.extractionTimeoutMs})`
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
export function validateAndLogConfigWarnings(config: SecretaryConfig): SecretaryConfig {
  const warnings = validateConfigThresholds(config);
  if (warnings.length > 0) {
    console.warn('[SecretaryConfig] Configuration threshold warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  return config;
}
