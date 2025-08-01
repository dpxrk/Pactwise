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
    url: Deno.env.get('REDIS_URL') || 'redis://localhost:6379',
  },
  rateLimit: {
    requestsPerMinute: parseInt(Deno.env.get('RATE_LIMIT_REQUESTS_PER_MINUTE') || '60'),
    aiRequestsPerHour: parseInt(Deno.env.get('RATE_LIMIT_AI_REQUESTS_PER_HOUR') || '100'),
  },
  features: {
    aiAnalysis: Deno.env.get('ENABLE_AI_ANALYSIS') === 'true',
    realTime: Deno.env.get('ENABLE_REAL_TIME') === 'true',
    advancedAnalytics: Deno.env.get('ENABLE_ADVANCED_ANALYTICS') === 'true',
  },
};