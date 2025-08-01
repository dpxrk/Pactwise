"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.getFeatureFlag = getFeatureFlag;
exports.getTimeout = getTimeout;
exports.getRateLimit = getRateLimit;
exports.getCacheTTL = getCacheTTL;
exports.getAgentConfig = getAgentConfig;
var zod_1 = require("zod");
// Configuration schema
var ConfigSchema = zod_1.z.object({
    FEATURE_FLAGS: zod_1.z.object({
        ENABLE_CACHING: zod_1.z.boolean().default(true),
        ENABLE_RATE_LIMITING: zod_1.z.boolean().default(true),
        ENABLE_METRICS: zod_1.z.boolean().default(true),
        ENABLE_AUDIT_LOGS: zod_1.z.boolean().default(true),
        ENABLE_REAL_TIME: zod_1.z.boolean().default(true),
        ENABLE_AI_ANALYSIS: zod_1.z.boolean().default(true),
        ENABLE_ENHANCED_EXTRACTION: zod_1.z.boolean().default(false),
        ENABLE_DEBUG_LOGGING: zod_1.z.boolean().default(false),
        ENABLE_PERFORMANCE_MONITORING: zod_1.z.boolean().default(false),
        ENABLE_ASYNC_PROCESSING: zod_1.z.boolean().default(true),
        ENABLE_WORKFLOW_AUTOMATION: zod_1.z.boolean().default(true),
        ENABLE_SMART_ROUTING: zod_1.z.boolean().default(true),
        ENABLE_DONNA_AI: zod_1.z.boolean().default(true),
        ENABLE_MEMORY_SYSTEM: zod_1.z.boolean().default(true),
    }),
    TIMEOUTS: zod_1.z.object({
        DEFAULT: zod_1.z.number().default(30000), // 30 seconds
        LONG_RUNNING: zod_1.z.number().default(60000), // 60 seconds
        DATABASE_FUNCTION: zod_1.z.number().default(45000), // 45 seconds
        EXTERNAL_API: zod_1.z.number().default(20000), // 20 seconds
        AI_PROCESSING: zod_1.z.number().default(90000), // 90 seconds
        BATCH_OPERATION: zod_1.z.number().default(120000), // 2 minutes
    }),
    RATE_LIMITS: zod_1.z.object({
        DEFAULT: zod_1.z.object({
            requests: zod_1.z.number().default(100),
            window: zod_1.z.number().default(60), // seconds
        }),
        AI_ANALYSIS: zod_1.z.object({
            requests: zod_1.z.number().default(10),
            window: zod_1.z.number().default(60),
        }),
        DATABASE_FUNCTION: zod_1.z.object({
            requests: zod_1.z.number().default(50),
            window: zod_1.z.number().default(60),
        }),
        EXTERNAL_API: zod_1.z.object({
            requests: zod_1.z.number().default(30),
            window: zod_1.z.number().default(60),
        }),
    }),
    CACHE_TTL: zod_1.z.object({
        DEFAULT: zod_1.z.number().default(300), // 5 minutes
        CONTRACT_DATA: zod_1.z.number().default(600), // 10 minutes
        VENDOR_DATA: zod_1.z.number().default(900), // 15 minutes
        BUDGET_DATA: zod_1.z.number().default(1800), // 30 minutes
        ANALYTICS: zod_1.z.number().default(3600), // 1 hour
        USER_PERMISSIONS: zod_1.z.number().default(300), // 5 minutes
        AGENT_RESULTS: zod_1.z.number().default(1800), // 30 minutes
    }),
    RETRY_CONFIG: zod_1.z.object({
        MAX_RETRIES: zod_1.z.number().default(3),
        INITIAL_DELAY: zod_1.z.number().default(1000), // 1 second
        MAX_DELAY: zod_1.z.number().default(10000), // 10 seconds
        BACKOFF_MULTIPLIER: zod_1.z.number().default(2),
        JITTER: zod_1.z.boolean().default(true),
    }),
    AGENT_SPECIFIC: zod_1.z.object({
        SECRETARY: zod_1.z.object({
            MAX_DOCUMENT_SIZE: zod_1.z.number().default(10 * 1024 * 1024), // 10MB
            EXTRACTION_CONFIDENCE_THRESHOLD: zod_1.z.number().default(0.7),
            ENABLE_OCR: zod_1.z.boolean().default(true),
        }),
        FINANCIAL: zod_1.z.object({
            RISK_CALCULATION_DEPTH: zod_1.z.number().default(3),
            BUDGET_WARNING_THRESHOLD: zod_1.z.number().default(0.8), // 80% utilization
            COST_ANOMALY_ZSCORE: zod_1.z.number().default(2.5),
        }),
        LEGAL: zod_1.z.object({
            CLAUSE_DETECTION_THRESHOLD: zod_1.z.number().default(0.75),
            COMPLIANCE_CHECK_DEPTH: zod_1.z.string().default('comprehensive'),
            RISK_ASSESSMENT_MODEL: zod_1.z.string().default('advanced'),
        }),
        ANALYTICS: zod_1.z.object({
            DEFAULT_LOOKBACK_MONTHS: zod_1.z.number().default(12),
            TREND_CALCULATION_MIN_POINTS: zod_1.z.number().default(3),
            ANOMALY_DETECTION_SENSITIVITY: zod_1.z.string().default('medium'),
        }),
        VENDOR: zod_1.z.object({
            PERFORMANCE_CALCULATION_PERIOD: zod_1.z.number().default(90), // days
            RELATIONSHIP_SCORE_WEIGHTS: zod_1.z.object({
                performance: zod_1.z.number().default(0.25),
                compliance: zod_1.z.number().default(0.20),
                loyalty: zod_1.z.number().default(0.20),
                responsiveness: zod_1.z.number().default(0.15),
                financial: zod_1.z.number().default(0.20),
            }),
        }),
        NOTIFICATIONS: zod_1.z.object({
            MAX_RECIPIENTS_PER_NOTIFICATION: zod_1.z.number().default(100),
            DIGEST_GENERATION_HOUR: zod_1.z.number().default(8), // 8 AM
            ESCALATION_DELAYS: zod_1.z.array(zod_1.z.number()).default([3600, 14400, 86400]), // 1h, 4h, 24h
            SMART_ROUTING_ENABLED: zod_1.z.boolean().default(true),
        }),
        MANAGER: zod_1.z.object({
            MAX_PARALLEL_AGENTS: zod_1.z.number().default(5),
            ORCHESTRATION_TIMEOUT: zod_1.z.number().default(300000), // 5 minutes
            DEPENDENCY_RESOLUTION_MAX_DEPTH: zod_1.z.number().default(5),
            ENABLE_AGENT_RESULT_AGGREGATION: zod_1.z.boolean().default(true),
        }),
    }),
    MONITORING: zod_1.z.object({
        METRICS_ENABLED: zod_1.z.boolean().default(true),
        METRICS_FLUSH_INTERVAL: zod_1.z.number().default(60000), // 1 minute
        LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
        PERFORMANCE_TRACKING: zod_1.z.boolean().default(true),
        ERROR_REPORTING: zod_1.z.boolean().default(true),
    }),
    SECURITY: zod_1.z.object({
        ENABLE_REQUEST_VALIDATION: zod_1.z.boolean().default(true),
        ENABLE_RESPONSE_SANITIZATION: zod_1.z.boolean().default(true),
        MAX_REQUEST_SIZE: zod_1.z.number().default(5 * 1024 * 1024), // 5MB
        ALLOWED_ORIGINS: zod_1.z.array(zod_1.z.string()).default(['*']),
        JWT_VALIDATION: zod_1.z.boolean().default(true),
    }),
});
// Configuration loader
var ConfigurationManager = /** @class */ (function () {
    function ConfigurationManager() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
    }
    ConfigurationManager.getInstance = function () {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    };
    ConfigurationManager.prototype.detectEnvironment = function () {
        var _a;
        // Check various environment indicators
        if (process.env.NODE_ENV) {
            return process.env.NODE_ENV;
        }
        if (process.env.ENVIRONMENT) {
            return process.env.ENVIRONMENT;
        }
        if ((_a = process.env.SUPABASE_URL) === null || _a === void 0 ? void 0 : _a.includes('localhost')) {
            return 'development';
        }
        return 'production';
    };
    ConfigurationManager.prototype.loadConfiguration = function () {
        try {
            // Load base configuration
            var baseConfig = this.getDefaultConfig();
            // Load environment-specific config
            var envConfigKey = "AGENT_CONFIG_".concat(this.environment.toUpperCase());
            var envConfig = process.env[envConfigKey] || process.env.AGENT_CONFIG;
            if (envConfig) {
                var parsedEnvConfig = JSON.parse(envConfig);
                baseConfig = this.deepMerge(baseConfig, parsedEnvConfig);
            }
            // Load feature flag overrides
            var featureFlagOverrides = this.loadFeatureFlagOverrides();
            if (featureFlagOverrides) {
                baseConfig.FEATURE_FLAGS = __assign(__assign({}, baseConfig.FEATURE_FLAGS), featureFlagOverrides);
            }
            // Validate configuration
            return ConfigSchema.parse(baseConfig);
        }
        catch (error) {
            console.error('Failed to load configuration:', error);
            // Return default config on error
            return this.getDefaultConfig();
        }
    };
    ConfigurationManager.prototype.getDefaultConfig = function () {
        var defaults = ConfigSchema.parse({});
        // Apply environment-specific defaults
        if (this.environment === 'development') {
            defaults.FEATURE_FLAGS.ENABLE_DEBUG_LOGGING = true;
            defaults.MONITORING.LOG_LEVEL = 'debug';
        }
        else if (this.environment === 'production') {
            defaults.FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING = true;
            defaults.MONITORING.ERROR_REPORTING = true;
            defaults.SECURITY.ALLOWED_ORIGINS = [
                'https://app.pactwise.com',
                'https://pactwise.com',
            ];
        }
        return defaults;
    };
    ConfigurationManager.prototype.loadFeatureFlagOverrides = function () {
        var overrides = {};
        // Check individual feature flag environment variables
        Object.keys(this.getDefaultConfig().FEATURE_FLAGS).forEach(function (flag) {
            var envVar = "FEATURE_".concat(flag);
            if (process.env[envVar] !== undefined) {
                overrides[flag] = process.env[envVar] === 'true';
            }
        });
        return Object.keys(overrides).length > 0 ? overrides : null;
    };
    ConfigurationManager.prototype.deepMerge = function (target, source) {
        var _this = this;
        var output = __assign({}, target);
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(function (key) {
                var _a, _b;
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, (_a = {}, _a[key] = source[key], _a));
                    }
                    else {
                        output[key] = _this.deepMerge(target[key], source[key]);
                    }
                }
                else {
                    Object.assign(output, (_b = {}, _b[key] = source[key], _b));
                }
            });
        }
        return output;
    };
    // Public methods
    ConfigurationManager.prototype.getConfig = function () {
        return this.config;
    };
    ConfigurationManager.prototype.getFeatureFlag = function (flag) {
        return this.config.FEATURE_FLAGS[flag];
    };
    ConfigurationManager.prototype.getTimeout = function (type) {
        return this.config.TIMEOUTS[type];
    };
    ConfigurationManager.prototype.getRateLimit = function (type) {
        return this.config.RATE_LIMITS[type];
    };
    ConfigurationManager.prototype.getCacheTTL = function (type) {
        return this.config.CACHE_TTL[type];
    };
    ConfigurationManager.prototype.getAgentConfig = function (agent) {
        return this.config.AGENT_SPECIFIC[agent];
    };
    ConfigurationManager.prototype.updateConfig = function (updates) {
        this.config = ConfigSchema.parse(this.deepMerge(this.config, updates));
    };
    ConfigurationManager.prototype.resetConfig = function () {
        this.config = this.loadConfiguration();
    };
    ConfigurationManager.prototype.getEnvironment = function () {
        return this.environment;
    };
    ConfigurationManager.prototype.isProduction = function () {
        return this.environment === 'production';
    };
    ConfigurationManager.prototype.isDevelopment = function () {
        return this.environment === 'development';
    };
    return ConfigurationManager;
}());
// Helper function
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
// Export singleton instance
exports.config = ConfigurationManager.getInstance();
// Export config helper functions
function getFeatureFlag(flag) {
    return exports.config.getFeatureFlag(flag);
}
function getTimeout(type) {
    return exports.config.getTimeout(type);
}
function getRateLimit(type) {
    return exports.config.getRateLimit(type);
}
function getCacheTTL(type) {
    return exports.config.getCacheTTL(type);
}
function getAgentConfig(agent) {
    return exports.config.getAgentConfig(agent);
}
