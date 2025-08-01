/// <reference path="../../types/global.d.ts" />

import { RateLimitRule } from './rate-limiting.ts';

/**
 * Centralized rate limiting configuration
 * Defines rules for different endpoints and user tiers
 */

export interface RateLimitProfile {
  name: string;
  description: string;
  rules: RateLimitRule[];
}

/**
 * Pre-configured rate limiting profiles for different scenarios
 */
export const rateLimitProfiles: Record<string, RateLimitProfile> = {
  // Standard API access
  standard: {
    name: 'Standard API Access',
    description: 'Default rate limits for authenticated users',
    rules: [
      {
        id: 'std_api_general',
        name: 'Standard API - General',
        strategy: 'fixed_window',
        maxRequests: 100,
        windowSeconds: 60,
        scope: 'user',
        enabled: true,
        priority: 1,
      },
      {
        id: 'std_ai_analysis',
        name: 'Standard AI Analysis',
        strategy: 'token_bucket',
        maxRequests: 10,
        windowSeconds: 3600, // 1 hour
        scope: 'user',
        endpoint: '/ai-analysis',
        burstMultiplier: 1.5,
        enabled: true,
        priority: 10,
      },
      {
        id: 'std_file_upload',
        name: 'Standard File Upload',
        strategy: 'sliding_window',
        maxRequests: 5,
        windowSeconds: 300, // 5 minutes
        scope: 'user',
        endpoint: '/storage',
        enabled: true,
        priority: 9,
      },
    ],
  },

  // Anonymous/public access
  anonymous: {
    name: 'Anonymous Access',
    description: 'Rate limits for unauthenticated users',
    rules: [
      {
        id: 'anon_api_general',
        name: 'Anonymous API - General',
        strategy: 'sliding_window',
        maxRequests: 20,
        windowSeconds: 60,
        scope: 'ip',
        enabled: true,
        priority: 2,
      },
      {
        id: 'anon_auth_attempts',
        name: 'Anonymous Auth Attempts',
        strategy: 'sliding_window',
        maxRequests: 5,
        windowSeconds: 900, // 15 minutes
        scope: 'ip',
        endpoint: '/auth',
        enabled: true,
        priority: 15,
      },
      {
        id: 'anon_no_ai',
        name: 'Anonymous AI Blocked',
        strategy: 'fixed_window',
        maxRequests: 0,
        windowSeconds: 1,
        scope: 'ip',
        endpoint: '/ai-analysis',
        enabled: true,
        priority: 20,
      },
    ],
  },

  // Premium tier
  professional: {
    name: 'Professional Tier',
    description: 'Enhanced limits for professional users',
    rules: [
      {
        id: 'prem_api_general',
        name: 'Premium API - General',
        strategy: 'token_bucket',
        maxRequests: 300,
        windowSeconds: 60,
        scope: 'user',
        userTier: 'professional',
        burstMultiplier: 2.0,
        enabled: true,
        priority: 3,
      },
      {
        id: 'prem_ai_analysis',
        name: 'Premium AI Analysis',
        strategy: 'token_bucket',
        maxRequests: 50,
        windowSeconds: 3600,
        scope: 'user',
        endpoint: '/ai-analysis',
        userTier: 'professional',
        burstMultiplier: 3.0,
        enabled: true,
        priority: 8,
      },
      {
        id: 'prem_file_upload',
        name: 'Premium File Upload',
        strategy: 'token_bucket',
        maxRequests: 20,
        windowSeconds: 300,
        scope: 'user',
        endpoint: '/storage',
        userTier: 'professional',
        burstMultiplier: 2.0,
        enabled: true,
        priority: 7,
      },
    ],
  },

  // Enterprise tier
  enterprise: {
    name: 'Enterprise Tier',
    description: 'High-volume limits for enterprise customers',
    rules: [
      {
        id: 'ent_api_general',
        name: 'Enterprise API - General',
        strategy: 'token_bucket',
        maxRequests: 1000,
        windowSeconds: 60,
        scope: 'enterprise',
        userTier: 'enterprise',
        burstMultiplier: 3.0,
        enabled: true,
        priority: 4,
      },
      {
        id: 'ent_ai_analysis',
        name: 'Enterprise AI Analysis',
        strategy: 'token_bucket',
        maxRequests: 200,
        windowSeconds: 3600,
        scope: 'enterprise',
        endpoint: '/ai-analysis',
        userTier: 'enterprise',
        burstMultiplier: 5.0,
        enabled: true,
        priority: 6,
      },
      {
        id: 'ent_file_upload',
        name: 'Enterprise File Upload',
        strategy: 'token_bucket',
        maxRequests: 100,
        windowSeconds: 300,
        scope: 'enterprise',
        endpoint: '/storage',
        userTier: 'enterprise',
        burstMultiplier: 4.0,
        enabled: true,
        priority: 5,
      },
    ],
  },

  // Security-focused (for suspicious activity)
  security: {
    name: 'Security Mode',
    description: 'Restrictive limits for suspicious activity',
    rules: [
      {
        id: 'sec_api_restricted',
        name: 'Security - Restricted API',
        strategy: 'sliding_window',
        maxRequests: 10,
        windowSeconds: 300, // 5 minutes
        scope: 'ip',
        enabled: true,
        priority: 50,
      },
      {
        id: 'sec_auth_lockdown',
        name: 'Security - Auth Lockdown',
        strategy: 'sliding_window',
        maxRequests: 1,
        windowSeconds: 3600, // 1 hour
        scope: 'ip',
        endpoint: '/auth',
        enabled: true,
        priority: 60,
      },
      {
        id: 'sec_no_ai',
        name: 'Security - No AI Access',
        strategy: 'fixed_window',
        maxRequests: 0,
        windowSeconds: 1,
        scope: 'ip',
        endpoint: '/ai-analysis',
        enabled: true,
        priority: 70,
      },
    ],
  },
};

/**
 * Get rate limiting rules based on user context
 */
export function getRateLimitRules(context: {
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  isSecurityMode?: boolean;
  endpoint?: string;
}): RateLimitRule[] {
  const { isAuthenticated, userTier, isSecurityMode, endpoint } = context;

  // Security mode takes precedence
  if (isSecurityMode) {
    return rateLimitProfiles.security.rules;
  }

  // Choose profile based on authentication and tier
  let profileName: string;
  if (!isAuthenticated) {
    profileName = 'anonymous';
  } else {
    switch (userTier) {
      case 'professional':
        profileName = 'professional';
        break;
      case 'enterprise':
        profileName = 'enterprise';
        break;
      default:
        profileName = 'standard';
    }
  }

  const profile = rateLimitProfiles[profileName];
  let rules = [...profile.rules];

  // Filter rules by endpoint if specified
  if (endpoint) {
    rules = rules.filter(rule =>
      !rule.endpoint || rule.endpoint === endpoint || rule.endpoint === '*',
    );
  }

  return rules;
}

/**
 * Rate limiting configuration for specific endpoints
 */
export const endpointRateLimits: Record<string, Partial<RateLimitRule>[]> = {
  '/auth/login': [
    {
      strategy: 'sliding_window',
      maxRequests: 5,
      windowSeconds: 900, // 15 minutes
      scope: 'ip',
      priority: 20,
    },
  ],

  '/auth/register': [
    {
      strategy: 'sliding_window',
      maxRequests: 3,
      windowSeconds: 3600, // 1 hour
      scope: 'ip',
      priority: 20,
    },
  ],

  '/auth/reset-password': [
    {
      strategy: 'sliding_window',
      maxRequests: 3,
      windowSeconds: 3600, // 1 hour
      scope: 'ip',
      priority: 20,
    },
  ],

  '/ai-analysis/contract': [
    {
      strategy: 'token_bucket',
      maxRequests: 5,
      windowSeconds: 3600, // 1 hour
      scope: 'user',
      burstMultiplier: 1.2,
      priority: 15,
    },
  ],

  '/ai-analysis/vendor': [
    {
      strategy: 'token_bucket',
      maxRequests: 10,
      windowSeconds: 3600, // 1 hour
      scope: 'user',
      burstMultiplier: 1.5,
      priority: 12,
    },
  ],

  '/storage/upload': [
    {
      strategy: 'sliding_window',
      maxRequests: 10,
      windowSeconds: 600, // 10 minutes
      scope: 'user',
      priority: 18,
    },
  ],

  '/search': [
    {
      strategy: 'token_bucket',
      maxRequests: 50,
      windowSeconds: 60,
      scope: 'user',
      burstMultiplier: 2.0,
      priority: 8,
    },
  ],

  '/webhooks': [
    {
      strategy: 'fixed_window',
      maxRequests: 100,
      windowSeconds: 60,
      scope: 'ip',
      priority: 5,
    },
  ],
};

/**
 * Dynamic rate limit adjustment based on system load
 */
export class DynamicRateLimitAdjuster {
  private systemLoadThreshold = 0.8;
  private currentLoad = 0;

  updateSystemLoad(load: number): void {
    this.currentLoad = load;
  }

  adjustRules(rules: RateLimitRule[]): RateLimitRule[] {
    if (this.currentLoad < this.systemLoadThreshold) {
      return rules; // No adjustment needed
    }

    // Reduce limits when system is under high load
    const loadFactor = Math.max(0.1, 1 - (this.currentLoad - this.systemLoadThreshold) * 2);

    return rules.map(rule => ({
      ...rule,
      maxRequests: Math.floor(rule.maxRequests * loadFactor),
    }));
  }
}

/**
 * Rate limiting exceptions for trusted sources
 */
export const rateLimitExceptions = {
  trustedIPs: [
    '127.0.0.1',
    '::1',
    // Add your monitoring/health check IPs here
  ],

  trustedUserAgents: [
    'HealthCheck/1.0',
    'StatusPage/1.0',
    // Add your monitoring user agents here
  ],

  bypassEndpoints: [
    '/health',
    '/status',
    '/metrics',
  ],
};

/**
 * Check if request should bypass rate limiting
 */
export function shouldBypassRateLimit(req: Request): boolean {
  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const url = new URL(req.url);
  const endpoint = url.pathname;

  // Check trusted IPs
  if (rateLimitExceptions.trustedIPs.some(trustedIP => ip.includes(trustedIP))) {
    return true;
  }

  // Check trusted user agents
  if (rateLimitExceptions.trustedUserAgents.some(trustedUA => userAgent.includes(trustedUA))) {
    return true;
  }

  // Check bypass endpoints
  if (rateLimitExceptions.bypassEndpoints.some(bypassEP => endpoint.startsWith(bypassEP))) {
    return true;
  }

  return false;
}