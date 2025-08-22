import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Configuration schema
const ConfigSchema = z.object({
  FEATURE_FLAGS: z.object({
    ENABLE_CACHING: z.boolean().default(true),
    ENABLE_RATE_LIMITING: z.boolean().default(true),
    ENABLE_METRICS: z.boolean().default(true),
    ENABLE_AUDIT_LOGS: z.boolean().default(true),
    ENABLE_REAL_TIME: z.boolean().default(true),
    ENABLE_AI_ANALYSIS: z.boolean().default(true),
    ENABLE_ENHANCED_EXTRACTION: z.boolean().default(false),
    ENABLE_DEBUG_LOGGING: z.boolean().default(false),
    ENABLE_PERFORMANCE_MONITORING: z.boolean().default(false),
    ENABLE_ASYNC_PROCESSING: z.boolean().default(true),
    ENABLE_WORKFLOW_AUTOMATION: z.boolean().default(true),
    ENABLE_SMART_ROUTING: z.boolean().default(true),
    ENABLE_DONNA_AI: z.boolean().default(true),
    ENABLE_MEMORY_SYSTEM: z.boolean().default(true),
  }),
  TIMEOUTS: z.object({
    DEFAULT: z.number().default(30000), // 30 seconds
    LONG_RUNNING: z.number().default(60000), // 60 seconds
    DATABASE_FUNCTION: z.number().default(45000), // 45 seconds
    EXTERNAL_API: z.number().default(20000), // 20 seconds
    AI_PROCESSING: z.number().default(90000), // 90 seconds
    BATCH_OPERATION: z.number().default(120000), // 2 minutes
  }),
  RATE_LIMITS: z.object({
    DEFAULT: z.object({
      requests: z.number().default(100),
      window: z.number().default(60), // seconds
    }),
    AI_ANALYSIS: z.object({
      requests: z.number().default(10),
      window: z.number().default(60),
    }),
    DATABASE_FUNCTION: z.object({
      requests: z.number().default(50),
      window: z.number().default(60),
    }),
    EXTERNAL_API: z.object({
      requests: z.number().default(30),
      window: z.number().default(60),
    }),
  }),
  CACHE_TTL: z.object({
    DEFAULT: z.number().default(300), // 5 minutes
    CONTRACT_DATA: z.number().default(600), // 10 minutes
    VENDOR_DATA: z.number().default(900), // 15 minutes
    BUDGET_DATA: z.number().default(1800), // 30 minutes
    ANALYTICS: z.number().default(3600), // 1 hour
    USER_PERMISSIONS: z.number().default(300), // 5 minutes
    AGENT_RESULTS: z.number().default(1800), // 30 minutes
  }),
  RETRY_CONFIG: z.object({
    MAX_RETRIES: z.number().default(3),
    INITIAL_DELAY: z.number().default(1000), // 1 second
    MAX_DELAY: z.number().default(10000), // 10 seconds
    BACKOFF_MULTIPLIER: z.number().default(2),
    JITTER: z.boolean().default(true),
  }),
  AGENT_SPECIFIC: z.object({
    SECRETARY: z.object({
      MAX_DOCUMENT_SIZE: z.number().default(10 * 1024 * 1024), // 10MB
      EXTRACTION_CONFIDENCE_THRESHOLD: z.number().default(0.7),
      ENABLE_OCR: z.boolean().default(true),
    }),
    FINANCIAL: z.object({
      RISK_CALCULATION_DEPTH: z.number().default(3),
      BUDGET_WARNING_THRESHOLD: z.number().default(0.8), // 80% utilization
      COST_ANOMALY_ZSCORE: z.number().default(2.5),
    }),
    LEGAL: z.object({
      CLAUSE_DETECTION_THRESHOLD: z.number().default(0.75),
      COMPLIANCE_CHECK_DEPTH: z.string().default('comprehensive'),
      RISK_ASSESSMENT_MODEL: z.string().default('advanced'),
    }),
    ANALYTICS: z.object({
      DEFAULT_LOOKBACK_MONTHS: z.number().default(12),
      TREND_CALCULATION_MIN_POINTS: z.number().default(3),
      ANOMALY_DETECTION_SENSITIVITY: z.string().default('medium'),
    }),
    VENDOR: z.object({
      PERFORMANCE_CALCULATION_PERIOD: z.number().default(90), // days
      RELATIONSHIP_SCORE_WEIGHTS: z.object({
        performance: z.number().default(0.25),
        compliance: z.number().default(0.20),
        loyalty: z.number().default(0.20),
        responsiveness: z.number().default(0.15),
        financial: z.number().default(0.20),
      }),
    }),
    NOTIFICATIONS: z.object({
      MAX_RECIPIENTS_PER_NOTIFICATION: z.number().default(100),
      DIGEST_GENERATION_HOUR: z.number().default(8), // 8 AM
      ESCALATION_DELAYS: z.array(z.number()).default([3600, 14400, 86400]), // 1h, 4h, 24h
      SMART_ROUTING_ENABLED: z.boolean().default(true),
    }),
    MANAGER: z.object({
      MAX_PARALLEL_AGENTS: z.number().default(5),
      ORCHESTRATION_TIMEOUT: z.number().default(300000), // 5 minutes
      DEPENDENCY_RESOLUTION_MAX_DEPTH: z.number().default(5),
      ENABLE_AGENT_RESULT_AGGREGATION: z.boolean().default(true),
    }),
  }),
  MONITORING: z.object({
    METRICS_ENABLED: z.boolean().default(true),
    METRICS_FLUSH_INTERVAL: z.number().default(60000), // 1 minute
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    PERFORMANCE_TRACKING: z.boolean().default(true),
    ERROR_REPORTING: z.boolean().default(true),
  }),
  SECURITY: z.object({
    ENABLE_REQUEST_VALIDATION: z.boolean().default(true),
    ENABLE_RESPONSE_SANITIZATION: z.boolean().default(true),
    MAX_REQUEST_SIZE: z.number().default(5 * 1024 * 1024), // 5MB
    ALLOWED_ORIGINS: z.array(z.string()).default(['*']),
    JWT_VALIDATION: z.boolean().default(true),
  }),
});

export type AgentConfig = z.infer<typeof ConfigSchema>;

// Configuration loader
class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AgentConfig;
  private environment: string;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.loadConfiguration();
  }

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  private detectEnvironment(): string {
    // Check various environment indicators
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    if (process.env.ENVIRONMENT) {
      return process.env.ENVIRONMENT;
    }
    if (process.env.SUPABASE_URL?.includes('localhost')) {
      return 'development';
    }
    return 'production';
  }

  private loadConfiguration(): AgentConfig {
    try {
      // Load base configuration
      let baseConfig = this.getDefaultConfig();

      // Load environment-specific config
      const envConfigKey = `AGENT_CONFIG_${this.environment.toUpperCase()}`;
      const envConfig = process.env[envConfigKey] || process.env.AGENT_CONFIG;

      if (envConfig) {
        const parsedEnvConfig = JSON.parse(envConfig);
        baseConfig = this.deepMerge(baseConfig, parsedEnvConfig);
      }

      // Load feature flag overrides
      const featureFlagOverrides = this.loadFeatureFlagOverrides();
      if (featureFlagOverrides) {
        baseConfig.FEATURE_FLAGS = { ...baseConfig.FEATURE_FLAGS, ...featureFlagOverrides };
      }

      // Validate configuration
      return ConfigSchema.parse(baseConfig);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      // Return default config on error
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AgentConfig {
    const defaults = ConfigSchema.parse({});

    // Apply environment-specific defaults
    if (this.environment === 'development') {
      defaults.FEATURE_FLAGS.ENABLE_DEBUG_LOGGING = true;
      defaults.MONITORING.LOG_LEVEL = 'debug';
    } else if (this.environment === 'production') {
      defaults.FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING = true;
      defaults.MONITORING.ERROR_REPORTING = true;
      defaults.SECURITY.ALLOWED_ORIGINS = [
        'https://app.pactwise.com',
        'https://pactwise.com',
      ];
    }

    return defaults;
  }

  private loadFeatureFlagOverrides(): Record<string, boolean> | null {
    const overrides: Record<string, boolean> = {};

    // Check individual feature flag environment variables
    Object.keys(this.getDefaultConfig().FEATURE_FLAGS).forEach(flag => {
      const envVar = `FEATURE_${flag}`;
      if (process.env[envVar] !== undefined) {
        overrides[flag] = process.env[envVar] === 'true';
      }
    });

    return Object.keys(overrides).length > 0 ? overrides : null;
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  // Public methods
  getConfig(): AgentConfig {
    return this.config;
  }

  getFeatureFlag(flag: keyof AgentConfig['FEATURE_FLAGS']): boolean {
    return this.config.FEATURE_FLAGS[flag];
  }

  getTimeout(type: keyof AgentConfig['TIMEOUTS']): number {
    return this.config.TIMEOUTS[type];
  }

  getRateLimit(type: keyof AgentConfig['RATE_LIMITS']): { requests: number; window: number } {
    return this.config.RATE_LIMITS[type];
  }

  getCacheTTL(type: keyof AgentConfig['CACHE_TTL']): number {
    return this.config.CACHE_TTL[type];
  }

  getAgentConfig<T extends keyof AgentConfig['AGENT_SPECIFIC']>(
    agent: T,
  ): AgentConfig['AGENT_SPECIFIC'][T] {
    return this.config.AGENT_SPECIFIC[agent];
  }

  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = ConfigSchema.parse(this.deepMerge(this.config, updates));
  }

  resetConfig(): void {
    this.config = this.loadConfiguration();
  }

  getEnvironment(): string {
    return this.environment;
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }
}

// Helper function
function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

// Export singleton instance
export const config = ConfigurationManager.getInstance();

// Export config helper functions
export function getFeatureFlag(flag: keyof AgentConfig['FEATURE_FLAGS']): boolean {
  return config.getFeatureFlag(flag);
}

export function getTimeout(type: keyof AgentConfig['TIMEOUTS']): number {
  return config.getTimeout(type);
}

export function getRateLimit(type: keyof AgentConfig['RATE_LIMITS']): { requests: number; window: number } {
  return config.getRateLimit(type);
}

export function getCacheTTL(type: keyof AgentConfig['CACHE_TTL']): number {
  return config.getCacheTTL(type);
}

export function getAgentConfig<T extends keyof AgentConfig['AGENT_SPECIFIC']>(
  agent: T,
): AgentConfig['AGENT_SPECIFIC'][T] {
  return config.getAgentConfig(agent);
}

// Export types
export type FeatureFlags = AgentConfig['FEATURE_FLAGS'];
export type Timeouts = AgentConfig['TIMEOUTS'];
export type RateLimits = AgentConfig['RATE_LIMITS'];
export type CacheTTL = AgentConfig['CACHE_TTL'];
export type RetryConfig = AgentConfig['RETRY_CONFIG'];
export type MonitoringConfig = AgentConfig['MONITORING'];
export type SecurityConfig = AgentConfig['SECURITY'];