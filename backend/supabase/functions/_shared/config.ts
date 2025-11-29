/// <reference path="../../types/global.d.ts" />

export const config = {
  localAI: {
    enabled: true,
    analysisEngine: 'rule_based', // Local rule-based analysis
    embeddingEngine: 'tfidf', // TF-IDF for local embeddings
    maxTokens: 4000,
    temperature: 0.7,
  },
  stripe: {
    secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '',
    webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
  },
  redis: {
    url: Deno.env.get('REDIS_URL') || '',
    // Upstash REST API (alternative for edge functions)
    upstashUrl: Deno.env.get('UPSTASH_REDIS_REST_URL') || '',
    upstashToken: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '',
    // Feature flag to enable/disable Redis (for rollback)
    enabled: Deno.env.get('USE_REDIS') !== 'false',
    // Connection settings
    connectionTimeout: parseInt(Deno.env.get('REDIS_CONNECTION_TIMEOUT') || '5000'),
    commandTimeout: parseInt(Deno.env.get('REDIS_COMMAND_TIMEOUT') || '3000'),
    maxRetries: parseInt(Deno.env.get('REDIS_MAX_RETRIES') || '3'),
  },
  rateLimit: {
    requestsPerMinute: parseInt(Deno.env.get('RATE_LIMIT_REQUESTS_PER_MINUTE') || '60'),
    aiRequestsPerHour: parseInt(Deno.env.get('RATE_LIMIT_AI_REQUESTS_PER_HOUR') || '100'),
    // Use Redis for distributed rate limiting
    useRedis: Deno.env.get('RATE_LIMIT_USE_REDIS') !== 'false',
  },
  features: {
    aiAnalysis: Deno.env.get('ENABLE_AI_ANALYSIS') === 'true',
    realTime: Deno.env.get('ENABLE_REAL_TIME') === 'true',
    advancedAnalytics: Deno.env.get('ENABLE_ADVANCED_ANALYTICS') === 'true',
  },
};

/**
 * Check if Redis is properly configured and enabled
 */
export function isRedisEnabled(): boolean {
  return config.redis.enabled && !!(config.redis.url || config.redis.upstashUrl);
}

/**
 * Get Redis URL (prefers standard URL, falls back to Upstash)
 */
export function getRedisUrl(): string | null {
  if (!config.redis.enabled) return null;
  return config.redis.url || null;
}