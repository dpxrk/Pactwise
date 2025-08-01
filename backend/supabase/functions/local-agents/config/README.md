# Agent Configuration Management

This directory contains the centralized configuration system for all local agents.

## Overview

The configuration system provides:
- Feature flags for enabling/disabling functionality
- Timeout configurations for different operation types
- Rate limiting settings
- Cache TTL management
- Retry configuration with exponential backoff
- Agent-specific settings
- Environment-based configuration

## Configuration Structure

```typescript
{
  FEATURE_FLAGS: {
    ENABLE_CACHING: boolean,
    ENABLE_RATE_LIMITING: boolean,
    ENABLE_METRICS: boolean,
    ENABLE_AUDIT_LOGS: boolean,
    ENABLE_REAL_TIME: boolean,
    ENABLE_AI_ANALYSIS: boolean,
    // ... more flags
  },
  TIMEOUTS: {
    DEFAULT: number,
    LONG_RUNNING: number,
    DATABASE_FUNCTION: number,
    EXTERNAL_API: number,
    // ... more timeouts
  },
  RATE_LIMITS: {
    DEFAULT: { requests: number, window: number },
    AI_ANALYSIS: { requests: number, window: number },
    // ... more limits
  },
  CACHE_TTL: {
    DEFAULT: number,
    CONTRACT_DATA: number,
    VENDOR_DATA: number,
    // ... more TTLs
  },
  RETRY_CONFIG: {
    MAX_RETRIES: number,
    INITIAL_DELAY: number,
    MAX_DELAY: number,
    BACKOFF_MULTIPLIER: number,
    JITTER: boolean,
  },
  AGENT_SPECIFIC: {
    SECRETARY: { /* agent-specific config */ },
    FINANCIAL: { /* agent-specific config */ },
    // ... more agents
  },
  MONITORING: { /* monitoring config */ },
  SECURITY: { /* security config */ },
}
```

## Usage

### In Base Agent

The configuration is automatically loaded in the BaseAgent class:

```typescript
import { getFeatureFlag, getTimeout, getRateLimit, getCacheTTL } from '../config';

// Check feature flag
if (getFeatureFlag('ENABLE_CACHING')) {
  // Use caching
}

// Get timeout
const timeout = getTimeout('DATABASE_FUNCTION'); // 45000ms

// Get rate limit
const rateLimit = getRateLimit('AI_ANALYSIS'); // { requests: 10, window: 60 }

// Get cache TTL
const ttl = getCacheTTL('CONTRACT_DATA'); // 600 seconds
```

### In Specific Agents

```typescript
import { getAgentConfig } from '../config';

class SecretaryAgent extends BaseAgent {
  async process(data: any) {
    const config = getAgentConfig('SECRETARY');
    
    if (data.size > config.MAX_DOCUMENT_SIZE) {
      throw new Error('Document too large');
    }
    
    if (confidence < config.EXTRACTION_CONFIDENCE_THRESHOLD) {
      // Handle low confidence
    }
  }
}
```

## Environment Configuration

### Development

```bash
export AGENT_CONFIG_DEVELOPMENT='{
  "FEATURE_FLAGS": {
    "ENABLE_DEBUG_LOGGING": true,
    "ENABLE_CACHING": true
  },
  "TIMEOUTS": {
    "DEFAULT": 60000
  }
}'
```

### Staging

```bash
export AGENT_CONFIG_STAGING='{
  "FEATURE_FLAGS": {
    "ENABLE_DEBUG_LOGGING": false,
    "ENABLE_PERFORMANCE_MONITORING": true
  }
}'
```

### Production

```bash
export AGENT_CONFIG_PRODUCTION='{
  "FEATURE_FLAGS": {
    "ENABLE_DEBUG_LOGGING": false,
    "ENABLE_PERFORMANCE_MONITORING": true
  },
  "RATE_LIMITS": {
    "DEFAULT": { "requests": 100, "window": 60 }
  }
}'
```

## Feature Flag Overrides

Individual feature flags can be overridden with environment variables:

```bash
# Override specific feature flags
export FEATURE_ENABLE_CACHING=false
export FEATURE_ENABLE_AI_ANALYSIS=true
export FEATURE_ENABLE_DEBUG_LOGGING=true
```

## Default Values

All configuration values have sensible defaults defined in the schema. The system will:
1. Load default configuration
2. Apply environment-specific overrides
3. Apply individual feature flag overrides
4. Validate the final configuration

## Configuration API

### Getting Configuration

```typescript
import { config } from '../config';

// Get full config
const fullConfig = config.getConfig();

// Get specific values
const isProduction = config.isProduction();
const isDevelopment = config.isDevelopment();
const environment = config.getEnvironment();
```

### Updating Configuration (Runtime)

```typescript
// Update configuration at runtime (useful for testing)
config.updateConfig({
  FEATURE_FLAGS: {
    ENABLE_NEW_FEATURE: true
  }
});

// Reset to original configuration
config.resetConfig();
```

## Best Practices

1. **Feature Flags**: Use feature flags for gradual rollouts and A/B testing
2. **Timeouts**: Set appropriate timeouts based on operation complexity
3. **Rate Limits**: Configure rate limits based on infrastructure capacity
4. **Cache TTLs**: Balance between performance and data freshness
5. **Environment-Specific**: Always test configuration changes in staging first

## Testing

When testing agents, you can override configuration:

```typescript
import { config } from '../config';

beforeEach(() => {
  config.updateConfig({
    FEATURE_FLAGS: {
      ENABLE_CACHING: false, // Disable caching for tests
      ENABLE_RATE_LIMITING: false, // Disable rate limiting for tests
    }
  });
});

afterEach(() => {
  config.resetConfig();
});
```

## Monitoring

The configuration system integrates with monitoring:
- Configuration load errors are logged
- Feature flag usage is tracked
- Performance metrics respect configuration settings

## Security Considerations

1. Never expose sensitive configuration in logs
2. Use environment variables for secrets
3. Validate all configuration values
4. Apply appropriate CORS settings per environment
5. Enable request validation in production