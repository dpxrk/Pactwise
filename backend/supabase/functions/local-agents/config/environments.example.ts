// Example environment configurations

export const developmentConfig = {
  FEATURE_FLAGS: {
    ENABLE_CACHING: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_METRICS: true,
    ENABLE_AUDIT_LOGS: true,
    ENABLE_REAL_TIME: true,
    ENABLE_AI_ANALYSIS: true,
    ENABLE_ENHANCED_EXTRACTION: true,
    ENABLE_DEBUG_LOGGING: true,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ASYNC_PROCESSING: true,
    ENABLE_WORKFLOW_AUTOMATION: true,
    ENABLE_SMART_ROUTING: true,
  },
  TIMEOUTS: {
    DEFAULT: 60000, // More lenient in dev
    LONG_RUNNING: 120000,
    DATABASE_FUNCTION: 90000,
    EXTERNAL_API: 40000,
    AI_PROCESSING: 180000,
    BATCH_OPERATION: 240000,
  },
  RATE_LIMITS: {
    DEFAULT: {
      requests: 1000, // Higher limits in dev
      window: 60,
    },
    AI_ANALYSIS: {
      requests: 100,
      window: 60,
    },
    DATABASE_FUNCTION: {
      requests: 500,
      window: 60,
    },
    EXTERNAL_API: {
      requests: 300,
      window: 60,
    },
  },
  CACHE_TTL: {
    DEFAULT: 60, // Shorter cache in dev for testing
    CONTRACT_DATA: 120,
    VENDOR_DATA: 180,
    BUDGET_DATA: 300,
    ANALYTICS: 600,
    USER_PERMISSIONS: 60,
    AGENT_RESULTS: 300,
  },
  MONITORING: {
    METRICS_ENABLED: true,
    METRICS_FLUSH_INTERVAL: 30000, // More frequent in dev
    LOG_LEVEL: 'debug',
    PERFORMANCE_TRACKING: true,
    ERROR_REPORTING: true,
  },
  SECURITY: {
    ENABLE_REQUEST_VALIDATION: true,
    ENABLE_RESPONSE_SANITIZATION: false, // Less strict in dev
    MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_ORIGINS: ['*'], // Allow all in dev
    JWT_VALIDATION: false, // Can be disabled for local testing
  },
};

export const stagingConfig = {
  FEATURE_FLAGS: {
    ENABLE_CACHING: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_METRICS: true,
    ENABLE_AUDIT_LOGS: true,
    ENABLE_REAL_TIME: true,
    ENABLE_AI_ANALYSIS: true,
    ENABLE_ENHANCED_EXTRACTION: true,
    ENABLE_DEBUG_LOGGING: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ASYNC_PROCESSING: true,
    ENABLE_WORKFLOW_AUTOMATION: true,
    ENABLE_SMART_ROUTING: true,
  },
  TIMEOUTS: {
    DEFAULT: 45000,
    LONG_RUNNING: 90000,
    DATABASE_FUNCTION: 60000,
    EXTERNAL_API: 30000,
    AI_PROCESSING: 120000,
    BATCH_OPERATION: 180000,
  },
  RATE_LIMITS: {
    DEFAULT: {
      requests: 200,
      window: 60,
    },
    AI_ANALYSIS: {
      requests: 20,
      window: 60,
    },
    DATABASE_FUNCTION: {
      requests: 100,
      window: 60,
    },
    EXTERNAL_API: {
      requests: 50,
      window: 60,
    },
  },
  CACHE_TTL: {
    DEFAULT: 300,
    CONTRACT_DATA: 600,
    VENDOR_DATA: 900,
    BUDGET_DATA: 1800,
    ANALYTICS: 3600,
    USER_PERMISSIONS: 300,
    AGENT_RESULTS: 1800,
  },
  MONITORING: {
    METRICS_ENABLED: true,
    METRICS_FLUSH_INTERVAL: 60000,
    LOG_LEVEL: 'info',
    PERFORMANCE_TRACKING: true,
    ERROR_REPORTING: true,
  },
  SECURITY: {
    ENABLE_REQUEST_VALIDATION: true,
    ENABLE_RESPONSE_SANITIZATION: true,
    MAX_REQUEST_SIZE: 5 * 1024 * 1024,
    ALLOWED_ORIGINS: [
      'https://staging.pactwise.com',
      'https://staging-app.pactwise.com',
    ],
    JWT_VALIDATION: true,
  },
};

export const productionConfig = {
  FEATURE_FLAGS: {
    ENABLE_CACHING: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_METRICS: true,
    ENABLE_AUDIT_LOGS: true,
    ENABLE_REAL_TIME: true,
    ENABLE_AI_ANALYSIS: true,
    ENABLE_ENHANCED_EXTRACTION: false, // Feature flag for gradual rollout
    ENABLE_DEBUG_LOGGING: false,
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_ASYNC_PROCESSING: true,
    ENABLE_WORKFLOW_AUTOMATION: true,
    ENABLE_SMART_ROUTING: true,
  },
  TIMEOUTS: {
    DEFAULT: 30000,
    LONG_RUNNING: 60000,
    DATABASE_FUNCTION: 45000,
    EXTERNAL_API: 20000,
    AI_PROCESSING: 90000,
    BATCH_OPERATION: 120000,
  },
  RATE_LIMITS: {
    DEFAULT: {
      requests: 100,
      window: 60,
    },
    AI_ANALYSIS: {
      requests: 10,
      window: 60,
    },
    DATABASE_FUNCTION: {
      requests: 50,
      window: 60,
    },
    EXTERNAL_API: {
      requests: 30,
      window: 60,
    },
  },
  CACHE_TTL: {
    DEFAULT: 300,
    CONTRACT_DATA: 600,
    VENDOR_DATA: 900,
    BUDGET_DATA: 1800,
    ANALYTICS: 3600,
    USER_PERMISSIONS: 300,
    AGENT_RESULTS: 1800,
  },
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 10000,
    BACKOFF_MULTIPLIER: 2,
    JITTER: true,
  },
  AGENT_SPECIFIC: {
    SECRETARY: {
      MAX_DOCUMENT_SIZE: 10 * 1024 * 1024,
      EXTRACTION_CONFIDENCE_THRESHOLD: 0.8, // Higher threshold in prod
      ENABLE_OCR: true,
    },
    FINANCIAL: {
      RISK_CALCULATION_DEPTH: 5, // Deeper analysis in prod
      BUDGET_WARNING_THRESHOLD: 0.75, // More conservative
      COST_ANOMALY_ZSCORE: 3.0, // Less sensitive to reduce false positives
    },
    LEGAL: {
      CLAUSE_DETECTION_THRESHOLD: 0.85, // Higher accuracy required
      COMPLIANCE_CHECK_DEPTH: 'comprehensive',
      RISK_ASSESSMENT_MODEL: 'advanced',
    },
    ANALYTICS: {
      DEFAULT_LOOKBACK_MONTHS: 12,
      TREND_CALCULATION_MIN_POINTS: 5, // More data required
      ANOMALY_DETECTION_SENSITIVITY: 'low', // Reduce false positives
    },
    VENDOR: {
      PERFORMANCE_CALCULATION_PERIOD: 180, // 6 months in prod
      RELATIONSHIP_SCORE_WEIGHTS: {
        performance: 0.30, // Adjusted for production
        compliance: 0.25,
        loyalty: 0.15,
        responsiveness: 0.15,
        financial: 0.15,
      },
    },
    NOTIFICATIONS: {
      MAX_RECIPIENTS_PER_NOTIFICATION: 50, // Lower limit in prod
      DIGEST_GENERATION_HOUR: 8,
      ESCALATION_DELAYS: [3600, 14400, 86400],
      SMART_ROUTING_ENABLED: true,
    },
    MANAGER: {
      MAX_PARALLEL_AGENTS: 3, // More conservative
      ORCHESTRATION_TIMEOUT: 300000,
      DEPENDENCY_RESOLUTION_MAX_DEPTH: 5,
      ENABLE_AGENT_RESULT_AGGREGATION: true,
    },
  },
  MONITORING: {
    METRICS_ENABLED: true,
    METRICS_FLUSH_INTERVAL: 300000, // 5 minutes
    LOG_LEVEL: 'warn', // Less verbose in prod
    PERFORMANCE_TRACKING: true,
    ERROR_REPORTING: true,
  },
  SECURITY: {
    ENABLE_REQUEST_VALIDATION: true,
    ENABLE_RESPONSE_SANITIZATION: true,
    MAX_REQUEST_SIZE: 5 * 1024 * 1024,
    ALLOWED_ORIGINS: [
      'https://app.pactwise.com',
      'https://pactwise.com',
      'https://www.pactwise.com',
    ],
    JWT_VALIDATION: true,
  },
};

// Usage:
// Set environment variable AGENT_CONFIG_PRODUCTION with JSON.stringify(productionConfig)