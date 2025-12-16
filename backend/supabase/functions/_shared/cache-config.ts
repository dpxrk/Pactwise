/**
 * HTTP Cache Configuration Registry
 *
 * Defines caching policies per endpoint type with enterprise-aware settings.
 * Integrates with middleware for automatic header injection.
 *
 * Cache strategies follow HTTP/1.1 Cache-Control semantics:
 * - public: Response can be cached by any cache (CDN, browser)
 * - private: Response is user-specific, only browser can cache
 * - no-store: Response must never be cached
 */

export type CacheScope = 'public' | 'private' | 'no-store';
export type ETagStrategy = 'content-hash' | 'version' | 'timestamp';

export interface CachePolicy {
  // HTTP Cache-Control settings
  scope: CacheScope;
  maxAge: number; // seconds
  staleWhileRevalidate?: number; // seconds - serve stale while fetching fresh
  staleIfError?: number; // seconds - serve stale if origin errors

  // ETag settings
  enableETag: boolean;
  etagStrategy: ETagStrategy;

  // Redis response caching settings
  enableResponseCache: boolean;
  responseTTL?: number; // seconds, for Redis cache

  // CDN settings
  varyHeaders: string[];

  // Invalidation triggers (table names that invalidate this cache)
  invalidationTriggers?: string[];
}

/**
 * Predefined cache policies for different endpoint types
 */
export const CachePolicies: Record<string, CachePolicy> = {
  // Public endpoints (no auth required) - CDN-friendly
  'public-metrics': {
    scope: 'public',
    maxAge: 60,
    staleWhileRevalidate: 300,
    staleIfError: 3600,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 60,
    varyHeaders: ['Accept-Encoding'],
    invalidationTriggers: ['contracts', 'vendors', 'enterprises'],
  },

  // Dashboard statistics (expensive queries, 5-min cache)
  'dashboard-stats': {
    scope: 'private',
    maxAge: 300,
    staleWhileRevalidate: 600,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 300,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
    invalidationTriggers: [
      'contracts',
      'vendors',
      'budgets',
      'compliance_checks',
    ],
  },

  // Dashboard widgets (per-widget caching)
  'dashboard-widgets': {
    scope: 'private',
    maxAge: 180,
    staleWhileRevalidate: 300,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 180,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },

  // List endpoints (moderate caching)
  'list-contracts': {
    scope: 'private',
    maxAge: 60,
    staleWhileRevalidate: 120,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 60,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
    invalidationTriggers: ['contracts'],
  },

  'list-vendors': {
    scope: 'private',
    maxAge: 60,
    staleWhileRevalidate: 120,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 60,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
    invalidationTriggers: ['vendors'],
  },

  'list-budgets': {
    scope: 'private',
    maxAge: 60,
    staleWhileRevalidate: 120,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 60,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
    invalidationTriggers: ['budgets', 'budget_allocations'],
  },

  // Single resource (short cache, ETag-based)
  'single-resource': {
    scope: 'private',
    maxAge: 30,
    staleWhileRevalidate: 60,
    enableETag: true,
    etagStrategy: 'timestamp',
    enableResponseCache: true,
    responseTTL: 60,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },

  // Reference data (long cache - rarely changes)
  'reference-data': {
    scope: 'private',
    maxAge: 3600,
    staleWhileRevalidate: 7200,
    enableETag: true,
    etagStrategy: 'version',
    enableResponseCache: true,
    responseTTL: 3600,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },

  // User-specific data (no caching, but ETag for validation)
  'user-profile': {
    scope: 'private',
    maxAge: 0,
    enableETag: true,
    etagStrategy: 'timestamp',
    enableResponseCache: false,
    varyHeaders: ['Authorization'],
  },

  // Mutations (no caching ever)
  mutation: {
    scope: 'no-store',
    maxAge: 0,
    enableETag: false,
    etagStrategy: 'content-hash',
    enableResponseCache: false,
    varyHeaders: [],
  },

  // Real-time features (no caching)
  realtime: {
    scope: 'no-store',
    maxAge: 0,
    enableETag: false,
    etagStrategy: 'content-hash',
    enableResponseCache: false,
    varyHeaders: [],
  },

  // Search results (short cache)
  search: {
    scope: 'private',
    maxAge: 30,
    staleWhileRevalidate: 60,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 30,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },

  // Analytics/Reports (longer cache)
  analytics: {
    scope: 'private',
    maxAge: 600,
    staleWhileRevalidate: 1200,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 600,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },

  // AI/Agent responses (moderate cache)
  'ai-analysis': {
    scope: 'private',
    maxAge: 300,
    staleWhileRevalidate: 600,
    enableETag: true,
    etagStrategy: 'content-hash',
    enableResponseCache: true,
    responseTTL: 300,
    varyHeaders: ['Authorization', 'Accept-Encoding'],
  },
};

/**
 * Endpoint to policy mapping
 * Format: 'METHOD:pathname' -> policy name
 * Supports wildcards with :param and * patterns
 */
export const EndpointPolicyMap: Record<string, string> = {
  // Public
  'GET:/public-metrics': 'public-metrics',

  // Dashboard
  'GET:/dashboard': 'dashboard-stats',
  'GET:/dashboard/stats': 'dashboard-stats',
  'GET:/dashboard/contracts/timeline': 'dashboard-widgets',
  'GET:/dashboard/contracts/expiring': 'dashboard-widgets',
  'GET:/dashboard/vendors/performance': 'dashboard-widgets',
  'GET:/dashboard/budgets/utilization': 'dashboard-widgets',
  'GET:/dashboard/approvals/pending': 'user-profile',
  'GET:/dashboard/compliance/issues': 'dashboard-widgets',
  'GET:/dashboard/activity': 'dashboard-widgets',
  'GET:/dashboard/kpis': 'dashboard-stats',

  // Contracts
  'GET:/contracts': 'list-contracts',
  'GET:/contracts/archived': 'list-contracts',
  'GET:/contracts/:id': 'single-resource',
  'POST:/contracts': 'mutation',
  'PUT:/contracts/:id': 'mutation',
  'PATCH:/contracts/:id': 'mutation',
  'DELETE:/contracts/:id': 'mutation',
  'POST:/contracts/:id/analyze': 'mutation',
  'POST:/contracts/:id/archive': 'mutation',
  'POST:/contracts/bulk-delete': 'mutation',
  'POST:/contracts/bulk-update': 'mutation',

  // Vendors
  'GET:/vendors': 'list-vendors',
  'GET:/vendors/:id': 'single-resource',
  'GET:/vendors/:id/contracts': 'list-contracts',
  'POST:/vendors': 'mutation',
  'PUT:/vendors/:id': 'mutation',
  'PATCH:/vendors/:id': 'mutation',
  'DELETE:/vendors/:id': 'mutation',
  'POST:/vendors/:id/merge': 'mutation',
  'POST:/vendors/bulk-delete': 'mutation',
  'POST:/vendors/bulk-update': 'mutation',

  // Budgets
  'GET:/budgets': 'list-budgets',
  'GET:/budgets/:id': 'single-resource',
  'POST:/budgets': 'mutation',
  'PUT:/budgets/:id': 'mutation',
  'DELETE:/budgets/:id': 'mutation',
  'POST:/budgets/:id/allocate': 'mutation',

  // Search
  'GET:/search': 'search',
  'POST:/search': 'search',

  // Analytics
  'GET:/vendor-analytics': 'analytics',
  'GET:/kpis': 'analytics',
  'GET:/market-intelligence': 'analytics',

  // Reference Data
  'GET:/tags': 'reference-data',
  'GET:/clause-library': 'reference-data',
  'GET:/negotiation-playbooks': 'reference-data',

  // User-specific
  'GET:/users/me': 'user-profile',
  'GET:/notification-preferences': 'user-profile',
  'GET:/notifications': 'user-profile',

  // Real-time
  'GET:/realtime': 'realtime',

  // AI Analysis
  'GET:/ai-analysis/:id': 'ai-analysis',
  'POST:/ai-analysis': 'mutation',
  'POST:/local-agents': 'mutation',
  'GET:/donna-terminal': 'ai-analysis',
};

/**
 * Get cache policy for an endpoint
 *
 * @param method HTTP method (GET, POST, etc.)
 * @param pathname URL pathname
 * @returns CachePolicy for the endpoint
 */
export function getCachePolicy(method: string, pathname: string): CachePolicy {
  // Normalize method to uppercase
  const normalizedMethod = method.toUpperCase();

  // Exact match first
  const exactKey = `${normalizedMethod}:${pathname}`;
  if (EndpointPolicyMap[exactKey]) {
    return CachePolicies[EndpointPolicyMap[exactKey]];
  }

  // Pattern match for parameterized routes
  for (const [pattern, policyName] of Object.entries(EndpointPolicyMap)) {
    const [patternMethod, patternPath] = pattern.split(':');
    if (patternMethod !== normalizedMethod) continue;

    // Convert route params (:id, :param) to regex
    // Also handle wildcards (*)
    const regexPattern = patternPath
      .replace(/:[a-zA-Z_]+/g, '[a-f0-9-]+')
      .replace(/\*/g, '.*');

    if (new RegExp(`^${regexPattern}$`).test(pathname)) {
      return CachePolicies[policyName];
    }
  }

  // Default: no caching for unknown endpoints (safety first)
  return CachePolicies['mutation'];
}

/**
 * Check if an endpoint should be cached
 *
 * @param method HTTP method
 * @param pathname URL pathname
 * @returns true if the endpoint is cacheable
 */
export function isCacheable(method: string, pathname: string): boolean {
  // Only GET requests are cacheable
  if (method.toUpperCase() !== 'GET') {
    return false;
  }

  const policy = getCachePolicy(method, pathname);
  return policy.scope !== 'no-store' && policy.maxAge > 0;
}

/**
 * HTTP cache key builders for response caching
 * Keys are structured for easy pattern-based invalidation
 */
export const httpCacheKeys = {
  // Response cache keys (enterprise-isolated)
  responseCache: (
    enterpriseId: string,
    endpoint: string,
    queryHash: string
  ): string => `http:response:${enterpriseId}:${endpoint}:${queryHash}`,

  // ETag storage
  etag: (
    enterpriseId: string,
    resourceType: string,
    resourceId: string
  ): string => `http:etag:${enterpriseId}:${resourceType}:${resourceId}`,

  // Dashboard cache
  dashboardStats: (enterpriseId: string): string =>
    `http:dashboard:stats:${enterpriseId}`,

  dashboardWidget: (enterpriseId: string, widgetName: string): string =>
    `http:dashboard:widget:${enterpriseId}:${widgetName}`,

  // List cache with pagination
  list: (
    enterpriseId: string,
    resource: string,
    page: number,
    filters: string
  ): string => `http:list:${enterpriseId}:${resource}:${page}:${filters}`,

  // Single resource cache
  resource: (
    enterpriseId: string,
    resourceType: string,
    resourceId: string
  ): string => `http:resource:${enterpriseId}:${resourceType}:${resourceId}`,

  // Public endpoints (no enterprise isolation)
  public: (endpoint: string): string => `http:public:${endpoint}`,
};

/**
 * Invalidation patterns for HTTP cache
 * Used with Redis SCAN to invalidate matching keys
 */
export const httpInvalidationPatterns = {
  // Invalidate all HTTP caches for an enterprise
  allForEnterprise: (enterpriseId: string): string =>
    `http:*:${enterpriseId}:*`,

  // Invalidate specific resource type caches
  resourceType: (enterpriseId: string, resourceType: string): string =>
    `http:*:${enterpriseId}:${resourceType}:*`,

  // Invalidate list caches for a resource
  lists: (enterpriseId: string, resource: string): string =>
    `http:list:${enterpriseId}:${resource}:*`,

  // Invalidate dashboard caches
  dashboard: (enterpriseId: string): string =>
    `http:dashboard:*:${enterpriseId}`,

  // Invalidate all public caches
  publicAll: (): string => `http:public:*`,
};
