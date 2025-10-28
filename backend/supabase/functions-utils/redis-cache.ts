/**
 * Enhanced Redis caching layer for Edge Functions
 * Provides multi-tier caching with memory and Redis backends
 */

import type { CacheEntry } from '../types/api-types.ts';
import { getRedisClient, type RedisClientInterface, type RedisConfig } from './redis-client.ts';

interface CacheConfig {
  defaultTTL: number;
  maxMemorySize: number;
  compressionThreshold: number;
  enableMetrics: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  avgResponseTime: number;
}

/**
 * Multi-tier caching implementation
 * L1: In-memory LRU cache (fast, limited size)
 * L2: Redis cache (distributed, larger capacity)
 */
export class MultiTierCache {
  private memoryCache: Map<string, CacheEntry<unknown>>;
  private cacheOrder: string[];
  private stats: CacheStats;
  private config: CacheConfig;
  private redisConfig?: RedisConfig;
  private redisClient?: RedisClientInterface;
  private compressionEnabled: boolean;

  constructor(config: Partial<CacheConfig> = {}, redisConfig?: RedisConfig) {
    this.config = {
      defaultTTL: config.defaultTTL || 300, // 5 minutes default
      maxMemorySize: config.maxMemorySize || 100, // 100 entries max
      compressionThreshold: config.compressionThreshold || 1024, // Compress if > 1KB
      enableMetrics: config.enableMetrics ?? true,
    };

    this.memoryCache = new Map();
    this.cacheOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
    };

    this.compressionEnabled = redisConfig?.enableCompression ?? true;

    if (redisConfig) {
      this.redisConfig = redisConfig;
      this.initRedisClient(redisConfig);
    }
  }

  /**
   * Initialize Redis client connection
   */
  private async initRedisClient(config: RedisConfig): Promise<void> {
    try {
      const client = getRedisClient(config);
      this.redisClient = client;
      await client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis, falling back to memory cache only:', error);
    }
  }

  /**
   * Get value from cache (checks L1 then L2)
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    // Check L1 (memory cache)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      this.stats.hits++;
      this.updateResponseTime(startTime);
      return memoryEntry.value as T;
    }
    
    // Check L2 (Redis cache)
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const entry = this.deserializeEntry<T>(redisValue);
          if (entry && entry.expiresAt > new Date()) {
            // Promote to L1 cache
            this.setMemoryCache(key, entry);
            this.stats.hits++;
            this.updateResponseTime(startTime);
            return entry.value;
          }
        }
      } catch (error) {
        console.error(`Redis get error for key ${key}:`, error);
      }
    }
    
    this.stats.misses++;
    this.updateResponseTime(startTime);
    return null;
  }

  /**
   * Set value in cache (writes to both L1 and L2)
   */
  async set<T>(
    key: string, 
    value: T, 
    ttlSeconds?: number,
    options?: { 
      skipCompression?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const startTime = performance.now();
    const ttl = ttlSeconds || this.config.defaultTTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt,
      metadata: {
        hitCount: 0,
        createdAt: new Date(),
        lastAccessed: new Date(),
        ...options?.metadata,
      },
    };
    
    // Set in L1 (memory cache)
    this.setMemoryCache(key, entry);
    
    // Set in L2 (Redis cache)
    if (this.redisClient) {
      try {
        const serialized = this.serializeEntry(entry, options?.skipCompression);
        await this.redisClient.setex(key, ttl, serialized);
      } catch (error) {
        console.error(`Redis set error for key ${key}:`, error);
      }
    }
    
    this.stats.sets++;
    this.updateResponseTime(startTime);
  }

  /**
   * Delete value from cache (removes from both L1 and L2)
   */
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now();
    let deleted = false;
    
    // Delete from L1
    if (this.memoryCache.delete(key)) {
      const index = this.cacheOrder.indexOf(key);
      if (index > -1) {
        this.cacheOrder.splice(index, 1);
      }
      deleted = true;
    }
    
    // Delete from L2
    if (this.redisClient) {
      try {
        const redisDeleted = await this.redisClient.del(key);
        deleted = deleted || redisDeleted > 0;
      } catch (error) {
        console.error(`Redis delete error for key ${key}:`, error);
      }
    }
    
    if (deleted) {
      this.stats.deletes++;
    }
    
    this.updateResponseTime(startTime);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.cacheOrder = [];
    
    if (this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        console.error('Redis flush error:', error);
      }
    }
    
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    
    // Invalidate from L1
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        await this.delete(key);
        count++;
      }
    }
    
    // Invalidate from L2
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        for (const key of keys) {
          await this.redisClient.del(key);
          count++;
        }
      } catch (error) {
        console.error(`Redis pattern invalidation error for ${pattern}:`, error);
      }
    }
    
    return count;
  }

  /**
   * Batch get operation
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const missingKeys: string[] = [];
    
    // Check L1 cache first
    for (const key of keys) {
      const value = this.memoryCache.get(key);
      if (value && value.expiresAt > new Date()) {
        results.set(key, value.value as T);
      } else {
        missingKeys.push(key);
      }
    }
    
    // Check L2 cache for missing keys
    if (missingKeys.length > 0 && this.redisClient) {
      try {
        const redisValues = await this.redisClient.mget(missingKeys);
        redisValues.forEach((value, index) => {
          if (value) {
            const entry = this.deserializeEntry<T>(value);
            if (entry && entry.expiresAt > new Date()) {
              results.set(missingKeys[index], entry.value);
              // Promote to L1
              this.setMemoryCache(missingKeys[index], entry);
            } else {
              results.set(missingKeys[index], null);
            }
          } else {
            results.set(missingKeys[index], null);
          }
        });
      } catch (error) {
        console.error('Redis mget error:', error);
        missingKeys.forEach(key => results.set(key, null));
      }
    }
    
    return results;
  }

  /**
   * Batch set operation
   */
  async mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.config.defaultTTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    // Set in L1
    for (const [key, value] of entries) {
      const entry: CacheEntry<T> = {
        key,
        value,
        expiresAt,
        metadata: {
          hitCount: 0,
          createdAt: new Date(),
          lastAccessed: new Date(),
        },
      };
      this.setMemoryCache(key, entry);
    }
    
    // Set in L2
    if (this.redisClient) {
      try {
        const pipeline = this.redisClient.pipeline();
        for (const [key, value] of entries) {
          const entry: CacheEntry<T> = {
            key,
            value,
            expiresAt,
          };
          const serialized = this.serializeEntry(entry);
          pipeline.setex(key, ttl, serialized);
        }
        await pipeline.exec();
      } catch (error) {
        console.error('Redis mset error:', error);
      }
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(
    dataLoader: () => Promise<Map<string, unknown>>,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const data = await dataLoader();
      await this.mset(data, ttlSeconds);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  // Private helper methods

  private setMemoryCache<T>(key: string, entry: CacheEntry<T>): void {
    // Implement LRU eviction if at capacity
    if (this.memoryCache.size >= this.config.maxMemorySize) {
      const oldestKey = this.cacheOrder.shift();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
    
    this.memoryCache.set(key, entry as CacheEntry<unknown>);
    this.cacheOrder.push(key);
    this.updateMemoryUsage();
  }

  private serializeEntry<T>(entry: CacheEntry<T>, skipCompression?: boolean): string {
    const json = JSON.stringify(entry);
    
    if (!skipCompression && this.compressionEnabled && json.length > this.config.compressionThreshold) {
      // In production, you would use a real compression library
      // For now, we'll just mark it as compressed
      return `COMPRESSED:${json}`;
    }
    
    return json;
  }

  private deserializeEntry<T>(data: string): CacheEntry<T> | null {
    try {
      if (data.startsWith('COMPRESSED:')) {
        // In production, decompress the data
        data = data.substring(11);
      }
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching (in production, use proper glob matching)
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }

  private updateResponseTime(startTime: number): void {
    const responseTime = performance.now() - startTime;
    const totalResponses = this.stats.hits + this.stats.misses;
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
  }

  private updateMemoryUsage(): void {
    // Rough estimate of memory usage
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    this.stats.memoryUsage = totalSize;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
    };
  }
}


// Export singleton instance with default configuration
const redisUrl = Deno.env.get('REDIS_URL');
export const cache = new MultiTierCache(
  {
    defaultTTL: 300,
    maxMemorySize: 100,
    compressionThreshold: 1024,
    enableMetrics: true,
  },
  redisUrl ? { url: redisUrl, enableCompression: true } : undefined
);

// Cache key builders for consistent naming
export const cacheKeys = {
  // Contract related
  contract: (id: string) => `contract:${id}`,
  contractList: (enterpriseId: string, page?: number) => `contracts:${enterpriseId}:${page || 1}`,
  contractAnalytics: (enterpriseId: string) => `analytics:contract:${enterpriseId}`,
  contractSearch: (query: string) => `search:contract:${btoa(query)}`,
  
  // Vendor related
  vendor: (id: string) => `vendor:${id}`,
  vendorList: (enterpriseId: string, page?: number) => `vendors:${enterpriseId}:${page || 1}`,
  vendorPerformance: (vendorId: string) => `vendor:performance:${vendorId}`,
  vendorRisk: (vendorId: string) => `vendor:risk:${vendorId}`,
  
  // User/Auth related
  userPermissions: (userId: string) => `user:permissions:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userSettings: (userId: string) => `user:settings:${userId}`,
  
  // Dashboard related
  dashboardData: (enterpriseId: string) => `dashboard:${enterpriseId}`,
  dashboardStats: (enterpriseId: string) => `dashboard:stats:${enterpriseId}`,
  
  // AI/Agent related
  aiResponse: (hash: string) => `ai:response:${hash}`,
  agentTask: (taskId: string) => `agent:task:${taskId}`,
  agentResult: (taskId: string) => `agent:result:${taskId}`,
  
  // Budget related
  budget: (id: string) => `budget:${id}`,
  budgetRollup: (enterpriseId: string) => `budget:rollup:${enterpriseId}`,
  
  // Generic patterns
  list: (entity: string, filters: Record<string, unknown>) => 
    `list:${entity}:${btoa(JSON.stringify(filters))}`,
  count: (entity: string, enterpriseId: string) => 
    `count:${entity}:${enterpriseId}`,
};

// Cache invalidation patterns
export const invalidationPatterns = {
  contractsByEnterprise: (enterpriseId: string) => `contract*:${enterpriseId}:*`,
  vendorsByEnterprise: (enterpriseId: string) => `vendor*:${enterpriseId}:*`,
  userByEnterprise: (enterpriseId: string) => `user:*:${enterpriseId}`,
  dashboardByEnterprise: (enterpriseId: string) => `dashboard*:${enterpriseId}*`,
  allByEnterprise: (enterpriseId: string) => `*:${enterpriseId}:*`,
};