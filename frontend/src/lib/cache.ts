/**
 * Optimized caching implementation for Pactwise
 * Provides in-memory and Redis caching with LRU eviction
 */

import { logger } from './logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Time in seconds to serve stale content while revalidating
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt?: number;
}

// LRU Cache implementation for in-memory caching
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 300) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, options?: CacheOptions): void {
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + (ttl * 1000),
      staleAt: options?.staleWhileRevalidate 
        ? now + ((ttl + options.staleWhileRevalidate) * 1000)
        : undefined,
    };

    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, entry);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get stale value if available (for stale-while-revalidate)
  getStale(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if within stale window
    if (entry.staleAt && now <= entry.staleAt) {
      return entry.value;
    }

    // Completely expired
    this.cache.delete(key);
    return null;
  }
}

// Cache manager singleton
class CacheManager {
  private static instance: CacheManager;
  private memoryCache: LRUCache<unknown>;
  private redisClient: unknown = null; // Will be initialized if Redis URL is provided

  private constructor() {
    this.memoryCache = new LRUCache(
      parseInt(process.env.CACHE_MAX_SIZE || '1000'),
      parseInt(process.env.CACHE_DEFAULT_TTL || '300')
    );

    // Initialize Redis if URL is provided
    if (process.env.REDIS_URL) {
      this.initializeRedis();
    }
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private async initializeRedis() {
    try {
      // Dynamic import to avoid loading Redis in development if not needed
      const Redis = await import('ioredis').then(m => m.default);
      this.redisClient = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.redisClient.on('error', (err: Error) => {
        logger.error('Redis error', err);
      });

      logger.info('Redis cache initialized');
    } catch (error) {
      logger.warn('Redis initialization failed, falling back to memory cache only', { error });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== null) {
      return memoryValue;
    }

    // Try Redis if available
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          // Populate memory cache
          this.memoryCache.set(key, parsed, { ttl: 60 }); // Short TTL for memory
          return parsed;
        }
      } catch (error) {
        logger.error('Redis get error', error as Error, { key });
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Always set in memory cache
    this.memoryCache.set(key, value, options);

    // Set in Redis if available
    if (this.redisClient) {
      try {
        const ttl = options?.ttl || 300;
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
      } catch (error) {
        logger.error('Redis set error', error as Error, { key });
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    // Delete from memory
    const memoryDeleted = this.memoryCache.delete(key);

    // Delete from Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        logger.error('Redis delete error', error as Error, { key });
      }
    }

    return memoryDeleted;
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis if available
    if (this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        logger.error('Redis clear error', error as Error);
      }
    }
  }

  // Cache decorator for functions
  async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check for stale value (stale-while-revalidate pattern)
    const stale = this.memoryCache.getStale(key);
    if (stale !== null && options?.staleWhileRevalidate) {
      // Return stale value and revalidate in background
      this.revalidateInBackground(key, fetcher, options);
      return stale;
    }

    // Fetch fresh value
    try {
      const fresh = await fetcher();
      await this.set(key, fresh, options);
      return fresh;
    } catch (error) {
      // If fetch fails and we have stale data, return it
      if (stale !== null) {
        logger.warn('Using stale cache due to fetch error', { key, error });
        return stale;
      }
      throw error;
    }
  }

  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const fresh = await fetcher();
      await this.set(key, fresh, options);
    } catch (error) {
      logger.error('Background revalidation failed', error as Error, { key });
    }
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// Convenience cache decorators
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  options?: CacheOptions
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return cache.cached(key, () => fn(...args), options);
  }) as T;
}

// Common cache key generators
export const cacheKeys = {
  contract: (id: string) => `contract:${id}`,
  contractList: (enterpriseId: string, page: number) => `contracts:${enterpriseId}:${page}`,
  vendor: (id: string) => `vendor:${id}`,
  vendorList: (enterpriseId: string) => `vendors:${enterpriseId}`,
  user: (id: string) => `user:${id}`,
  analytics: (enterpriseId: string, metric: string) => `analytics:${enterpriseId}:${metric}`,
  search: (query: string, filters: string) => `search:${query}:${filters}`,
};