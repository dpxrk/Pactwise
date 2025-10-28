/// <reference path="../../types/global.d.ts" />

import { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from './supabase.ts';
import { getCorsHeaders } from './cors.ts';

export type RateLimitStrategy = 'fixed_window' | 'sliding_window' | 'token_bucket';
export type RateLimitScope = 'global' | 'user' | 'ip' | 'endpoint' | 'enterprise';

export interface RateLimitRule {
  id: string;
  name: string;
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowSeconds: number;
  scope: RateLimitScope;
  endpoint?: string;
  userTier?: 'free' | 'professional' | 'enterprise';
  burstMultiplier?: number; // For token bucket
  enabled: boolean;
  priority: number; // Higher priority rules evaluated first
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  rule: RateLimitRule;
  fingerprint: string;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  uniqueClients: number;
  topEndpoints: Array<{ endpoint: string; requests: number }>;
  topBlocked: Array<{ identifier: string; blocks: number }>;
}

export interface DetailedRateLimitMetrics {
  requests: number;
  blocked: number;
  unique_clients: Set<string>;
}

/**
 * Enhanced Rate Limiting System
 * Supports multiple strategies and comprehensive monitoring
 */
export class EnhancedRateLimiter {
  private supabase: SupabaseClient;
  private cache: Map<string, any> = new Map();
  private metrics: Map<string, DetailedRateLimitMetrics> = new Map();

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createSupabaseClient();
  }

  /**
   * Check if request is allowed based on configured rules
   */
  async checkLimit(
    req: Request,
    rules: RateLimitRule[],
    identifier?: string,
  ): Promise<RateLimitResult> {
    const fingerprint = await this.generateFingerprint(req, identifier);

    // Sort rules by priority (highest first)
    const sortedRules = rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    // Check each rule until one blocks or all pass
    for (const rule of sortedRules) {
      const result = await this.checkRule(req, rule, fingerprint);

      // Record metrics
      await this.recordMetrics(rule, result, fingerprint);

      if (!result.allowed) {
        // Log blocked request
        await this.logBlockedRequest(req, rule, fingerprint, result);
        return result;
      }
    }

    // All rules passed
    const defaultRule = sortedRules[0] || this.getDefaultRule();
    return {
      allowed: true,
      limit: defaultRule.maxRequests,
      remaining: defaultRule.maxRequests - 1,
      resetAt: new Date(Date.now() + defaultRule.windowSeconds * 1000),
      rule: defaultRule,
      fingerprint,
    };
  }

  /**
   * Check individual rate limiting rule
   */
  private async checkRule(
    req: Request,
    rule: RateLimitRule,
    fingerprint: string,
  ): Promise<RateLimitResult> {
    switch (rule.strategy) {
      case 'fixed_window':
        return this.checkFixedWindow(req, rule, fingerprint);
      case 'sliding_window':
        return this.checkSlidingWindow(req, rule, fingerprint);
      case 'token_bucket':
        return this.checkTokenBucket(req, rule, fingerprint);
      default:
        return this.checkFixedWindow(req, rule, fingerprint);
    }
  }

  /**
   * Fixed window rate limiting
   */
  private async checkFixedWindow(
    _req: Request,
    rule: RateLimitRule,
    fingerprint: string,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000,
    );
    const windowEnd = new Date(windowStart.getTime() + rule.windowSeconds * 1000);

    const key = `${rule.id}:${fingerprint}:${windowStart.getTime()}`;

    // Check cache first for performance
    const count = this.cache.get(key) || 0;

    if (count >= rule.maxRequests) {
      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetAt: windowEnd,
        retryAfter: Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
        rule,
        fingerprint,
      };
    }

    // Increment counter
    this.cache.set(key, count + 1);

    // Persist to database (async, don't wait)
    this.persistRateLimit(rule, fingerprint, windowStart, count + 1);

    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining: rule.maxRequests - (count + 1),
      resetAt: windowEnd,
      rule,
      fingerprint,
    };
  }

  /**
   * Sliding window rate limiting
   */
  private async checkSlidingWindow(
    req: Request,
    rule: RateLimitRule,
    fingerprint: string,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);

    // Get requests in the sliding window
    const { data: requests } = await this.supabase
      .from('rate_limit_requests')
      .select('created_at')
      .eq('rule_id', rule.id)
      .eq('fingerprint', fingerprint)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    const currentCount = requests?.length || 0;

    if (currentCount >= rule.maxRequests) {
      const oldestRequest = requests?.[requests.length - 1];
      const resetAt = oldestRequest
        ? new Date(new Date(oldestRequest.created_at).getTime() + rule.windowSeconds * 1000)
        : new Date(now.getTime() + rule.windowSeconds * 1000);

      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
        rule,
        fingerprint,
      };
    }

    // Record this request
    await this.supabase
      .from('rate_limit_requests')
      .insert({
        rule_id: rule.id,
        fingerprint,
        endpoint: this.getEndpoint(req),
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      });

    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining: rule.maxRequests - (currentCount + 1),
      resetAt: new Date(now.getTime() + rule.windowSeconds * 1000),
      rule,
      fingerprint,
    };
  }

  /**
   * Token bucket rate limiting
   */
  private async checkTokenBucket(
    _req: Request,
    rule: RateLimitRule,
    fingerprint: string,
  ): Promise<RateLimitResult> {
    const now = new Date();
    const bucketKey = `bucket:${rule.id}:${fingerprint}`;

    // Get or create bucket
    let bucket = this.cache.get(bucketKey);
    if (!bucket) {
      bucket = {
        tokens: rule.maxRequests,
        lastRefill: now.getTime(),
        burstTokens: Math.floor(rule.maxRequests * (rule.burstMultiplier || 1.5)),
      };
    }

    // Refill tokens based on time elapsed
    const elapsed = (now.getTime() - bucket.lastRefill) / 1000;
    const refillRate = rule.maxRequests / rule.windowSeconds;
    const tokensToAdd = Math.floor(elapsed * refillRate);

    bucket.tokens = Math.min(bucket.burstTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now.getTime();

    if (bucket.tokens < 1) {
      // No tokens available
      const refillTime = Math.ceil((1 / refillRate) * 1000);
      return {
        allowed: false,
        limit: rule.maxRequests,
        remaining: 0,
        resetAt: new Date(now.getTime() + refillTime),
        retryAfter: Math.ceil(refillTime / 1000),
        rule,
        fingerprint,
      };
    }

    // Consume token
    bucket.tokens -= 1;
    this.cache.set(bucketKey, bucket);

    return {
      allowed: true,
      limit: rule.maxRequests,
      remaining: bucket.tokens,
      resetAt: new Date(now.getTime() + rule.windowSeconds * 1000),
      rule,
      fingerprint,
    };
  }

  /**
   * Generate unique fingerprint for request
   */
  private async generateFingerprint(req: Request, identifier?: string): Promise<string> {
    if (identifier) {
      return `custom:${identifier}`;
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const { data: { user } } = await this.supabase.auth.getUser(
          authHeader.replace('Bearer ', ''),
        );
        if (user?.id) {
          return `user:${user.id}`;
        }
      } catch {
        // Fall through to IP-based fingerprint
      }
    }

    // Use IP + User-Agent for anonymous users
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Simple hash of IP + partial user agent
    const fingerprint = `${ip}:${userAgent.substring(0, 50)}`;
    return `anon:${btoa(fingerprint).substring(0, 32)}`;
  }

  /**
   * Get endpoint from request
   */
  private getEndpoint(req: Request): string {
    const url = new URL(req.url);
    return `${req.method} ${url.pathname}`;
  }

  /**
   * Record metrics for monitoring
   */
  private async recordMetrics(
    rule: RateLimitRule,
    result: RateLimitResult,
    fingerprint: string,
  ): Promise<void> {
    const key = `metrics:${rule.id}:${new Date().toISOString().slice(0, 13)}`; // Hourly buckets

    const current = this.metrics.get(key) || {
      requests: 0,
      blocked: 0,
      unique_clients: new Set(),
    };

    current.requests += 1;
    if (!result.allowed) {
      current.blocked += 1;
    }
    current.unique_clients.add(fingerprint);

    this.metrics.set(key, current);

    // Persist metrics periodically (every 100 requests)
    if (current.requests % 100 === 0) {
      await this.persistMetrics(rule, current);
    }
  }

  /**
   * Log blocked request for security monitoring
   */
  private async logBlockedRequest(
    req: Request,
    rule: RateLimitRule,
    fingerprint: string,
    result: RateLimitResult,
  ): Promise<void> {
    await this.supabase
      .from('rate_limit_violations')
      .insert({
        rule_id: rule.id,
        fingerprint,
        endpoint: this.getEndpoint(req),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent'),
        violation_count: result.limit - result.remaining,
        blocked_at: new Date().toISOString(),
        metadata: {
          rule_name: rule.name,
          strategy: rule.strategy,
          limit: result.limit,
          reset_at: result.resetAt,
        },
      });
  }

  /**
   * Persist rate limit counter to database
   */
  private async persistRateLimit(
    rule: RateLimitRule,
    fingerprint: string,
    windowStart: Date,
    count: number,
  ): Promise<void> {
    await this.supabase
      .from('rate_limits')
      .upsert({
        rule_id: rule.id,
        fingerprint,
        window_start: windowStart.toISOString(),
        request_count: count,
        last_request: new Date().toISOString(),
      }, {
        onConflict: 'rule_id,fingerprint,window_start',
      });
  }

  /**
   * Persist metrics to database
   */
  private async persistMetrics(rule: RateLimitRule, metrics: DetailedRateLimitMetrics): Promise<void> {
    await this.supabase
      .from('rate_limit_metrics')
      .insert({
        rule_id: rule.id,
        hour_bucket: new Date().toISOString().slice(0, 13),
        total_requests: metrics.requests,
        blocked_requests: metrics.blocked,
        unique_clients: metrics.unique_clients.size,
      });
  }

  /**
   * Get default rate limiting rule
   */
  private getDefaultRule(): RateLimitRule {
    return {
      id: 'default',
      name: 'Default Rate Limit',
      strategy: 'fixed_window',
      maxRequests: 60,
      windowSeconds: 60,
      scope: 'ip',
      enabled: true,
      priority: 0,
    };
  }

  /**
   * Clean up old rate limit data
   */
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    await Promise.all([
      this.supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', cutoff.toISOString()),

      this.supabase
        .from('rate_limit_requests')
        .delete()
        .lt('created_at', cutoff.toISOString()),

      this.supabase
        .from('rate_limit_violations')
        .delete()
        .lt('blocked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Clear memory cache of old entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (typeof value === 'object' && value.lastRefill) {
        if (now - value.lastRefill > 24 * 60 * 60 * 1000) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Get rate limiting metrics
   */
  async getMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<RateLimitMetrics> {
    let cutoff: Date;
    switch (timeRange) {
      case '1h':
        cutoff = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const [requests, violations] = await Promise.all([
      this.supabase
        .from('rate_limit_requests')
        .select('endpoint, fingerprint')
        .gte('created_at', cutoff.toISOString()),

      this.supabase
        .from('rate_limit_violations')
        .select('fingerprint, endpoint')
        .gte('blocked_at', cutoff.toISOString()),
    ]);

    // Process metrics
    const endpointCounts = new Map<string, number>();
    const uniqueClients = new Set<string>();
    const blockedClients = new Map<string, number>();

    requests.data?.forEach((req: { endpoint: string; fingerprint: string }) => {
      endpointCounts.set(req.endpoint, (endpointCounts.get(req.endpoint) || 0) + 1);
      uniqueClients.add(req.fingerprint);
    });

    violations.data?.forEach((violation: { fingerprint: string }) => {
      blockedClients.set(
        violation.fingerprint,
        (blockedClients.get(violation.fingerprint) || 0) + 1,
      );
    });

    return {
      totalRequests: requests.data?.length || 0,
      blockedRequests: violations.data?.length || 0,
      uniqueClients: uniqueClients.size,
      topEndpoints: Array.from(endpointCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, requests]) => ({ endpoint, requests })),
      topBlocked: Array.from(blockedClients.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([identifier, blocks]) => ({ identifier, blocks })),
    };
  }
}

/**
 * Middleware function for easy integration
 */
export async function rateLimitMiddleware(
  req: Request,
  rules: RateLimitRule[],
  identifier?: string,
): Promise<Response | null> {
  const limiter = new EnhancedRateLimiter();
  const result = await limiter.checkLimit(req, rules, identifier);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${result.limit} per ${result.rule.windowSeconds}s`,
        retryAfter: result.retryAfter,
        rule: result.rule.name,
      }),
      {
        status: 429,
        headers: {
          ...getCorsHeaders(req),
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'X-RateLimit-Rule': result.rule.id,
          'Retry-After': (result.retryAfter || 60).toString(),
        },
      },
    );
  }

  return null;
}

/**
 * Pre-configured rate limiting rules
 */
export const rateLimitRules = {
  // API endpoints
  api_default: {
    id: 'api_default',
    name: 'Default API Rate Limit',
    strategy: 'fixed_window' as RateLimitStrategy,
    maxRequests: 100,
    windowSeconds: 60,
    scope: 'user' as RateLimitScope,
    enabled: true,
    priority: 1,
  },

  api_anonymous: {
    id: 'api_anonymous',
    name: 'Anonymous API Rate Limit',
    strategy: 'sliding_window' as RateLimitStrategy,
    maxRequests: 20,
    windowSeconds: 60,
    scope: 'ip' as RateLimitScope,
    enabled: true,
    priority: 2,
  },

  // AI endpoints (more expensive)
  ai_analysis: {
    id: 'ai_analysis',
    name: 'AI Analysis Rate Limit',
    strategy: 'token_bucket' as RateLimitStrategy,
    maxRequests: 10,
    windowSeconds: 3600, // 1 hour
    scope: 'user' as RateLimitScope,
    endpoint: '/ai-analysis',
    burstMultiplier: 2,
    enabled: true,
    priority: 10,
  },

  // File uploads
  file_upload: {
    id: 'file_upload',
    name: 'File Upload Rate Limit',
    strategy: 'token_bucket' as RateLimitStrategy,
    maxRequests: 5,
    windowSeconds: 300, // 5 minutes
    scope: 'user' as RateLimitScope,
    endpoint: '/storage',
    enabled: true,
    priority: 9,
  },

  // Authentication
  auth_login: {
    id: 'auth_login',
    name: 'Login Attempt Rate Limit',
    strategy: 'sliding_window' as RateLimitStrategy,
    maxRequests: 5,
    windowSeconds: 900, // 15 minutes
    scope: 'ip' as RateLimitScope,
    endpoint: '/auth',
    enabled: true,
    priority: 15,
  },

  // Enterprise tier
  enterprise_api: {
    id: 'enterprise_api',
    name: 'Enterprise API Rate Limit',
    strategy: 'token_bucket' as RateLimitStrategy,
    maxRequests: 1000,
    windowSeconds: 60,
    scope: 'enterprise' as RateLimitScope,
    userTier: 'enterprise' as const,
    burstMultiplier: 3,
    enabled: true,
    priority: 5,
  },
} as const;