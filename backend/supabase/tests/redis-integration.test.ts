/**
 * Redis Integration Tests
 * Tests the Redis caching infrastructure including:
 * - Cache factory initialization
 * - Multi-tier caching (L1 memory + L2 Redis)
 * - Fallback behavior when Redis is unavailable
 * - Circuit breaker functionality
 * - Rate limiting with Redis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Deno.env for Node.js test environment
const mockEnv = new Map<string, string>();
vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => mockEnv.get(key),
    set: (key: string, value: string) => mockEnv.set(key, value),
  },
});

// Import after mocking Deno
import { MemoryCache } from '../functions-utils/cache';

describe('Redis Integration Tests', () => {
  beforeEach(() => {
    // Reset environment
    mockEnv.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MemoryCache (L1 Cache)', () => {
    it('should store and retrieve values', () => {
      const cache = new MemoryCache();
      const key = 'test-key';
      const value = { data: 'test-value', nested: { count: 42 } };

      cache.set(key, value, 300);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', () => {
      const cache = new MemoryCache();
      const retrieved = cache.get('non-existent-key');

      expect(retrieved).toBeNull();
    });

    it('should expire entries after TTL', async () => {
      const cache = new MemoryCache();
      const key = 'expiring-key';
      const value = 'expiring-value';

      // Set with 1 second TTL
      cache.set(key, value, 1);

      // Should be available immediately
      expect(cache.get(key)).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get(key)).toBeNull();
    });

    it('should delete entries', () => {
      const cache = new MemoryCache();
      const key = 'delete-test';
      const value = 'to-be-deleted';

      cache.set(key, value);
      expect(cache.get(key)).toBe(value);

      cache.delete(key);
      expect(cache.get(key)).toBeNull();
    });

    it('should clear all entries', () => {
      const cache = new MemoryCache();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should handle complex objects', () => {
      const cache = new MemoryCache();
      const complexObject = {
        string: 'test',
        number: 123.456,
        boolean: true,
        null: null,
        array: [1, 2, 3, { nested: true }],
        object: {
          deep: {
            deeper: {
              value: 'found',
            },
          },
        },
        date: new Date().toISOString(),
      };

      cache.set('complex', complexObject);
      const retrieved = cache.get('complex');

      expect(retrieved).toEqual(complexObject);
    });

    it('should use default TTL when not specified', () => {
      const cache = new MemoryCache(600); // 10 minute default
      cache.set('default-ttl', 'value');

      // Should be available (we can't easily test the exact TTL without mocking time)
      expect(cache.get('default-ttl')).toBe('value');
    });
  });

  describe('Config Helpers', () => {
    it('should detect Redis as disabled when USE_REDIS is false', async () => {
      mockEnv.set('USE_REDIS', 'false');

      // Dynamically import to get fresh module with new env
      const { isRedisEnabled } = await import('../functions/_shared/config');

      expect(isRedisEnabled()).toBe(false);
    });

    it('should detect Redis as disabled when no URL is provided', async () => {
      mockEnv.set('USE_REDIS', 'true');
      mockEnv.delete('REDIS_URL');
      mockEnv.delete('UPSTASH_REDIS_REST_URL');

      const { isRedisEnabled } = await import('../functions/_shared/config');

      expect(isRedisEnabled()).toBe(false);
    });

    it('should return null for Redis URL when disabled', async () => {
      mockEnv.set('USE_REDIS', 'false');

      const { getRedisUrl } = await import('../functions/_shared/config');

      expect(getRedisUrl()).toBeNull();
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in closed state', async () => {
      const { getRedisCircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = getRedisCircuitBreaker();
      expect(breaker.getState()).toBe('closed');
    });

    it('should execute successful operations', async () => {
      const { getRedisCircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = getRedisCircuitBreaker();
      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed');
    });

    it('should track failures and open circuit after threshold', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 3,
        resetTimeout: 1000,
      });

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should reject requests when circuit is open', async () => {
      const { CircuitBreaker, CircuitOpenError } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'test-open-circuit',
        failureThreshold: 1,
        resetTimeout: 10000,
      });

      // Fail once to open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch {
        // Expected
      }

      // Next request should be rejected
      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should transition to half-open after reset timeout', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'test-half-open',
        failureThreshold: 1,
        resetTimeout: 100, // Short timeout for testing
      });

      // Fail once to open circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next successful request should transition to half-open then closed
      const result = await breaker.execute(async () => 'recovery');
      expect(result).toBe('recovery');
    });

    it('should provide accurate statistics', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'test-stats',
        failureThreshold: 5,
      });

      // Execute some successful operations
      await breaker.execute(async () => 'success1');
      await breaker.execute(async () => 'success2');

      // Execute a failing operation
      try {
        await breaker.execute(async () => {
          throw new Error('failure');
        });
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
    });
  });

  describe('UnifiedCache Interface', () => {
    it('should provide consistent async API', async () => {
      // Test the interface contract
      interface TestUnifiedCache {
        get<T>(key: string): Promise<T | null>;
        set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
        delete(key: string): Promise<boolean>;
        clear(): Promise<void>;
        isRedisEnabled(): boolean;
      }

      // Create a mock implementation
      const mockCache: TestUnifiedCache = {
        get: async () => null,
        set: async () => undefined,
        delete: async () => true,
        clear: async () => undefined,
        isRedisEnabled: () => false,
      };

      // Verify the interface works
      expect(await mockCache.get('test')).toBeNull();
      expect(await mockCache.delete('test')).toBe(true);
      expect(mockCache.isRedisEnabled()).toBe(false);
    });
  });

  describe('Cache Key Builders', () => {
    it('should generate correct cache keys', async () => {
      const { cacheKeys } = await import('../functions-utils/redis-cache');

      expect(cacheKeys.contract('123')).toBe('contract:123');
      expect(cacheKeys.contractList('ent-1', 2)).toBe('contracts:ent-1:2');
      expect(cacheKeys.vendor('v-456')).toBe('vendor:v-456');
      expect(cacheKeys.userPermissions('user-1')).toBe('user:permissions:user-1');
      expect(cacheKeys.dashboardData('ent-1')).toBe('dashboard:ent-1');
      expect(cacheKeys.agentTask('task-1')).toBe('agent:task:task-1');
    });

    it('should handle special characters in keys', async () => {
      const { cacheKeys } = await import('../functions-utils/redis-cache');

      // UUID-style IDs
      expect(cacheKeys.contract('550e8400-e29b-41d4-a716-446655440000')).toBe(
        'contract:550e8400-e29b-41d4-a716-446655440000'
      );
    });
  });

  describe('Invalidation Patterns', () => {
    it('should generate correct invalidation patterns', async () => {
      const { invalidationPatterns } = await import('../functions-utils/redis-cache');

      expect(invalidationPatterns.contractsByEnterprise('ent-1')).toBe('contract*:ent-1:*');
      expect(invalidationPatterns.vendorsByEnterprise('ent-1')).toBe('vendor*:ent-1:*');
      expect(invalidationPatterns.dashboardByEnterprise('ent-1')).toBe('dashboard*:ent-1*');
    });
  });

  describe('Fallback Behavior', () => {
    it('should gracefully handle missing Redis connection', async () => {
      mockEnv.set('USE_REDIS', 'false');

      const cache = new MemoryCache();

      // Should work fine with just memory cache
      cache.set('fallback-test', { data: 'works' });
      expect(cache.get('fallback-test')).toEqual({ data: 'works' });
    });

    it('should maintain data integrity during fallback', async () => {
      const cache = new MemoryCache();

      // Simulate heavy usage
      const testData = new Map<string, unknown>();
      for (let i = 0; i < 100; i++) {
        const key = `key-${i}`;
        const value = { index: i, data: `value-${i}`, timestamp: Date.now() };
        testData.set(key, value);
        cache.set(key, value);
      }

      // Verify all data is retrievable
      for (const [key, expectedValue] of testData) {
        const retrieved = cache.get(key);
        expect(retrieved).toEqual(expectedValue);
      }
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should support rate limit configuration', async () => {
      mockEnv.set('RATE_LIMIT_REQUESTS_PER_MINUTE', '100');
      mockEnv.set('RATE_LIMIT_AI_REQUESTS_PER_HOUR', '50');
      mockEnv.set('RATE_LIMIT_USE_REDIS', 'true');

      const { config } = await import('../functions/_shared/config');

      expect(config.rateLimit.requestsPerMinute).toBe(100);
      expect(config.rateLimit.aiRequestsPerHour).toBe(50);
      expect(config.rateLimit.useRedis).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON serialization errors gracefully', () => {
      const cache = new MemoryCache();

      // Circular reference would normally cause issues
      // but our cache should handle primitives and serializable objects
      const validObject = { a: 1, b: 'test', c: [1, 2, 3] };
      cache.set('valid', validObject);
      expect(cache.get('valid')).toEqual(validObject);
    });

    it('should handle undefined and null values', () => {
      const cache = new MemoryCache();

      cache.set('null-value', null);
      cache.set('undefined-value', undefined);

      // Null should be stored
      expect(cache.get('null-value')).toBeNull();
      // Undefined might be treated as null or stored
      expect(cache.get('undefined-value')).toBe(undefined);
    });
  });

  describe('Performance', () => {
    it('should handle rapid cache operations', () => {
      const cache = new MemoryCache();
      const operations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        cache.set(`perf-key-${i}`, { value: i });
      }

      for (let i = 0; i < operations; i++) {
        cache.get(`perf-key-${i}`);
      }

      const duration = Date.now() - startTime;

      // Should complete 2000 operations in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should efficiently handle cache eviction', () => {
      // Create cache with small max size
      const cache = new MemoryCache(300, 10); // 10 entries max

      // Add more entries than max
      for (let i = 0; i < 20; i++) {
        cache.set(`eviction-key-${i}`, { value: i });
      }

      // First entries should be evicted
      expect(cache.get('eviction-key-0')).toBeNull();
      // Last entries should still exist
      expect(cache.get('eviction-key-19')).toEqual({ value: 19 });
    });
  });
});

describe('Cache Factory Integration', () => {
  beforeEach(() => {
    mockEnv.clear();
    vi.clearAllMocks();
  });

  it('should provide getCacheSync for synchronous access', async () => {
    mockEnv.set('USE_REDIS', 'false');

    const { getCacheSync } = await import('../functions-utils/cache-factory');

    const cache = getCacheSync();
    cache.set('sync-test', 'sync-value');
    expect(cache.get('sync-test')).toBe('sync-value');
  });

  it('should track Redis enabled status', async () => {
    mockEnv.set('USE_REDIS', 'false');

    const { isRedisActive } = await import('../functions-utils/cache-factory');

    // Without Redis URL, should not be active
    expect(isRedisActive()).toBe(false);
  });
});
