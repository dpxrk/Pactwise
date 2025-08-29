import Redis from 'ioredis';

import { performanceMonitor } from './performance-monitoring';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
};

// Create Redis clients
let redisClient: Redis | null = null;
let cacheClient: Redis | null = null;
let rateLimitClient: Redis | null = null;

// Initialize Redis clients
export function initializeRedis() {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  if (!cacheClient) {
    cacheClient = new Redis({ ...redisConfig, db: 1 }); // Use DB 1 for cache
  }

  if (!rateLimitClient) {
    rateLimitClient = new Redis({ ...redisConfig, db: 2 }); // Use DB 2 for rate limiting
  }

  return { redisClient, cacheClient, rateLimitClient };
}

// Get Redis clients
export function getRedisClient() {
  if (!redisClient) {
    initializeRedis();
  }
  return redisClient!;
}

export function getCacheClient() {
  if (!cacheClient) {
    initializeRedis();
  }
  return cacheClient!;
}

export function getRateLimitClient() {
  if (!rateLimitClient) {
    initializeRedis();
  }
  return rateLimitClient!;
}

// Cache wrapper with performance monitoring
export class RedisCache {
  private client: Redis;
  private defaultTTL: number;

  constructor(client?: Redis, defaultTTL = 3600) {
    this.client = client || getCacheClient();
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    const measure = performanceMonitor.measureDatabaseQuery(`cache.get.${key}`, 'redis');
    
    try {
      const value = await this.client.get(key);
      measure.end({ success: true });
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      measure.end({ success: false });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery(`cache.set.${key}`, 'redis');
    
    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;
      
      await this.client.setex(key, expiry, serialized);
      measure.end({ success: true });
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      measure.end({ success: false });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery(`cache.delete.${key}`, 'redis');
    
    try {
      await this.client.del(key);
      measure.end({ success: true });
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      measure.end({ success: false });
      return false;
    }
  }

  async flush(): Promise<boolean> {
    const measure = performanceMonitor.measureDatabaseQuery('cache.flush', 'redis');
    
    try {
      await this.client.flushdb();
      measure.end({ success: true });
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      measure.end({ success: false });
      return false;
    }
  }

  // Pattern-based cache invalidation
  async invalidatePattern(pattern: string): Promise<number> {
    const measure = performanceMonitor.measureDatabaseQuery(`cache.invalidate.${pattern}`, 'redis');
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        measure.end({ success: true, keysDeleted: 0 });
        return 0;
      }

      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      measure.end({ success: true, keysDeleted: keys.length });
      return keys.length;
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
      measure.end({ success: false });
      return 0;
    }
  }

  // Cache with fallback
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Get fresh value
    const value = await fallback();
    
    // Store in cache
    await this.set(key, value, ttl);
    
    return value;
  }
}

// Rate limiter using Redis
export class RedisRateLimiter {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client || getRateLimitClient();
  }

  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const measure = performanceMonitor.measureDatabaseQuery(`ratelimit.check.${key}`, 'redis');
    
    try {
      const now = Date.now();
      const window = now - (windowSeconds * 1000);
      
      // Use Redis sorted set for sliding window rate limiting
      const pipeline = this.client.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, window);
      
      // Count current entries
      pipeline.zcard(key);
      
      // Add current request if under limit
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry
      pipeline.expire(key, windowSeconds + 1);
      
      const results = await pipeline.exec();
      
      if (!results) {
        measure.end({ success: false });
        return { allowed: false, remaining: 0, resetAt: now + windowSeconds * 1000 };
      }

      const count = (results[1] && results[1][1]) as number || 0;
      const allowed = count < limit;
      
      // If not allowed, remove the entry we just added
      if (!allowed) {
        await this.client.zremrangebyscore(key, now, now);
      }

      measure.end({ success: true });
      
      return {
        allowed,
        remaining: Math.max(0, limit - count),
        resetAt: now + windowSeconds * 1000,
      };
    } catch (error) {
      console.error(`Rate limit check error for key ${key}:`, error);
      measure.end({ success: false });
      
      // Fail open - allow the request if Redis is down
      return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
    }
  }

  // Simple token bucket rate limiter
  async consumeToken(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillInterval: number = 1000
  ): Promise<{ allowed: boolean; tokens: number }> {
    const measure = performanceMonitor.measureDatabaseQuery(`ratelimit.token.${key}`, 'redis');
    
    try {
      const now = Date.now();
      const bucketKey = `bucket:${key}`;
      const timestampKey = `bucket_ts:${key}`;
      
      // Get current state
      const [tokens, lastRefill] = await Promise.all([
        this.client.get(bucketKey),
        this.client.get(timestampKey),
      ]);

      let currentTokens = tokens ? parseFloat(tokens) : maxTokens;
      const lastRefillTime = lastRefill ? parseInt(lastRefill) : now;
      
      // Calculate tokens to add based on time passed
      const timePassed = now - lastRefillTime;
      const tokensToAdd = (timePassed / refillInterval) * refillRate;
      currentTokens = Math.min(maxTokens, currentTokens + tokensToAdd);
      
      // Check if we can consume a token
      if (currentTokens >= 1) {
        currentTokens -= 1;
        
        // Update state
        await Promise.all([
          this.client.set(bucketKey, currentTokens.toString(), 'EX', 3600),
          this.client.set(timestampKey, now.toString(), 'EX', 3600),
        ]);
        
        measure.end({ success: true });
        return { allowed: true, tokens: Math.floor(currentTokens) };
      }
      
      measure.end({ success: true });
      return { allowed: false, tokens: 0 };
    } catch (error) {
      console.error(`Token bucket error for key ${key}:`, error);
      measure.end({ success: false });
      
      // Fail open
      return { allowed: true, tokens: maxTokens };
    }
  }
}

// Export singleton instances
export const cache = new RedisCache();
export const rateLimiter = new RedisRateLimiter();

// Cache key generators
export const cacheKeys = {
  // Contract keys
  contract: (id: string) => `contract:${id}`,
  contractList: (enterpriseId: string, filters?: Record<string, any>) => 
    `contracts:${enterpriseId}:${filters ? JSON.stringify(filters) : 'all'}`,
  contractAnalysis: (id: string) => `contract_analysis:${id}`,
  
  // Vendor keys
  vendor: (id: string) => `vendor:${id}`,
  vendorList: (enterpriseId: string) => `vendors:${enterpriseId}`,
  vendorPerformance: (id: string) => `vendor_performance:${id}`,
  
  // Dashboard keys
  dashboardStats: (enterpriseId: string) => `dashboard:${enterpriseId}`,
  userPreferences: (userId: string) => `preferences:${userId}`,
  
  // Search keys
  searchResults: (query: string, filters?: Record<string, any>) => 
    `search:${query}:${filters ? JSON.stringify(filters) : 'all'}`,
    
  // Analytics keys
  analytics: (type: string, enterpriseId: string, period: string) => 
    `analytics:${type}:${enterpriseId}:${period}`,
};

// Cache TTL configurations (in seconds)
export const cacheTTL = {
  // Short-lived caches
  searchResults: 300, // 5 minutes
  dashboardStats: 600, // 10 minutes
  
  // Medium-lived caches
  contractList: 1800, // 30 minutes
  vendorList: 1800, // 30 minutes
  userPreferences: 3600, // 1 hour
  
  // Long-lived caches
  contractAnalysis: 86400, // 24 hours
  vendorPerformance: 43200, // 12 hours
  analytics: 21600, // 6 hours
};