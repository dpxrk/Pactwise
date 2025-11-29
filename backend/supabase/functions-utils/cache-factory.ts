/**
 * Cache Factory - Unified cache access for Pactwise
 *
 * Provides a single entry point for getting the appropriate cache instance
 * based on configuration. Supports graceful fallback from Redis to memory-only.
 */

/// <reference path="../types/global.d.ts" />

import { MultiTierCache, cache as defaultCache, cacheKeys, invalidationPatterns } from './redis-cache.ts';
import { MemoryCache, globalCache } from './cache.ts';
import { config, isRedisEnabled, getRedisUrl } from '../functions/_shared/config.ts';

// Singleton instances
let multiTierCacheInstance: MultiTierCache | null = null;
let cacheInitialized = false;
let cacheInitPromise: Promise<void> | null = null;

/**
 * Cache type returned by the factory
 */
export interface UnifiedCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  isRedisEnabled(): boolean;
}

/**
 * Wrapper around MemoryCache to provide async interface
 */
class AsyncMemoryCacheWrapper implements UnifiedCache {
  private cache: MemoryCache;

  constructor(cache: MemoryCache) {
    this.cache = cache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) as T | null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    this.cache.delete(key);
    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  isRedisEnabled(): boolean {
    return false;
  }
}

/**
 * Wrapper around MultiTierCache to conform to UnifiedCache interface
 */
class MultiTierCacheWrapper implements UnifiedCache {
  private cache: MultiTierCache;

  constructor(cache: MultiTierCache) {
    this.cache = cache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  isRedisEnabled(): boolean {
    return true;
  }
}

/**
 * Initialize the cache system
 * Call this early in your edge function to warm up the cache connection
 */
export async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;
  if (cacheInitPromise) return cacheInitPromise;

  cacheInitPromise = (async () => {
    try {
      if (!isRedisEnabled()) {
        console.log('Cache Factory: Redis disabled, using memory cache only');
        cacheInitialized = true;
        return;
      }

      const redisUrl = getRedisUrl();
      if (!redisUrl) {
        console.log('Cache Factory: No Redis URL, using memory cache only');
        cacheInitialized = true;
        return;
      }

      // Create MultiTierCache with Redis
      multiTierCacheInstance = new MultiTierCache(
        {
          defaultTTL: 300, // 5 minutes
          maxMemorySize: 100, // 100 entries in L1
          compressionThreshold: 1024, // Compress if > 1KB
          enableMetrics: true,
        },
        {
          url: redisUrl,
          connectionTimeout: config.redis.connectionTimeout,
          commandTimeout: config.redis.commandTimeout,
          maxRetries: config.redis.maxRetries,
          enableCompression: true,
        }
      );

      console.log('Cache Factory: Redis cache initialized');
      cacheInitialized = true;
    } catch (error) {
      console.error('Cache Factory: Failed to initialize Redis, falling back to memory cache:', error);
      multiTierCacheInstance = null;
      cacheInitialized = true;
    }
  })();

  await cacheInitPromise;
  cacheInitPromise = null;
}

/**
 * Get the cache instance
 * Returns MultiTierCache if Redis is enabled and connected, otherwise MemoryCache
 *
 * @example
 * const cache = await getCache();
 * await cache.set('myKey', { data: 'value' }, 300);
 * const data = await cache.get('myKey');
 */
export async function getCache(): Promise<UnifiedCache> {
  // Ensure cache is initialized
  if (!cacheInitialized) {
    await initializeCache();
  }

  // Return MultiTierCache if available
  if (multiTierCacheInstance) {
    return new MultiTierCacheWrapper(multiTierCacheInstance);
  }

  // Fall back to memory cache
  return new AsyncMemoryCacheWrapper(globalCache);
}

/**
 * Get cache synchronously (for use in constructors or sync contexts)
 * Prefers memory cache for immediate availability
 * Use getCache() for full Redis support
 */
export function getCacheSync(): MemoryCache {
  return globalCache;
}

/**
 * Get the raw MultiTierCache instance (if Redis is enabled)
 * Use this for advanced operations like batch get/set
 */
export function getMultiTierCache(): MultiTierCache | null {
  return multiTierCacheInstance;
}

/**
 * Check if Redis is currently enabled and connected
 */
export function isRedisActive(): boolean {
  return cacheInitialized && multiTierCacheInstance !== null;
}

/**
 * Invalidate cache entries by pattern
 * Works with both memory and Redis caches
 */
export async function invalidateByPattern(pattern: string): Promise<number> {
  const cache = await getCache();

  if (multiTierCacheInstance) {
    return multiTierCacheInstance.invalidatePattern(pattern);
  }

  // For memory cache, do a simple key iteration
  let count = 0;
  const memoryCache = getCacheSync();
  // Note: MemoryCache doesn't expose keys() - would need to enhance
  // For now, just clear the whole cache if using memory-only
  memoryCache.clear();
  return count;
}

/**
 * Warm the cache with frequently accessed data
 */
export async function warmCache(
  dataLoader: () => Promise<Map<string, unknown>>,
  ttlSeconds?: number
): Promise<void> {
  if (multiTierCacheInstance) {
    await multiTierCacheInstance.warmCache(dataLoader, ttlSeconds);
  } else {
    // For memory cache, load data manually
    const cache = getCacheSync();
    const data = await dataLoader();
    for (const [key, value] of data) {
      cache.set(key, value, ttlSeconds);
    }
  }
}

// Re-export useful utilities
export { cacheKeys, invalidationPatterns };
export type { CacheEntry } from '../types/api-types.ts';
