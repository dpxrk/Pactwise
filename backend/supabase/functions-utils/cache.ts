import { LRUCache, CachePresets } from './lru-cache.ts';

// Re-export LRUCache as MemoryCache for backward compatibility
export class MemoryCache extends LRUCache {
  constructor(cleanupIntervalMs = 60000) {
    super({
      ...CachePresets.medium,
      cleanupIntervalMs,
    });
  }

  // Override set to match old interface
  set<T>(key: string, value: T, ttlSeconds: number): void {
    super.set(key, value, ttlSeconds);
  }

  // Add cleanup method for compatibility
  private cleanup(): void {
    this.prune();
  }
}

// Global cache instance
export const globalCache = new MemoryCache();

// Cache key builders
export const cacheKeys = {
  contractAnalytics: (enterpriseId: string) => `analytics:contract:${enterpriseId}`,
  vendorPerformance: (vendorId: string) => `vendor:performance:${vendorId}`,
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  dashboardData: (enterpriseId: string) => `dashboard:${enterpriseId}`,
  aiResponse: (hash: string) => `ai:response:${hash}`,
};