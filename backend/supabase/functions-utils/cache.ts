interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60000) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
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