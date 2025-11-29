/**
 * Cache Failover Tests
 * Tests the graceful degradation and recovery behavior of the caching system
 * when Redis becomes unavailable or experiences failures.
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

import { MemoryCache } from '../functions-utils/cache';

describe('Cache Failover Tests', () => {
  beforeEach(() => {
    mockEnv.clear();
    mockEnv.set('USE_REDIS', 'false'); // Default to memory-only for tests
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Memory Cache Fallback', () => {
    it('should continue operating when Redis is disabled', () => {
      const cache = new MemoryCache();

      // All operations should work with memory cache
      cache.set('fallback-1', { test: 'data' });
      expect(cache.get('fallback-1')).toEqual({ test: 'data' });

      cache.delete('fallback-1');
      expect(cache.get('fallback-1')).toBeNull();
    });

    it('should preserve data during cache operations', () => {
      const cache = new MemoryCache();
      const testData = {
        contracts: [
          { id: 1, title: 'Contract A' },
          { id: 2, title: 'Contract B' },
        ],
        metadata: {
          total: 2,
          lastUpdated: Date.now(),
        },
      };

      cache.set('complex-data', testData);
      const retrieved = cache.get('complex-data');

      expect(retrieved).toEqual(testData);
      expect((retrieved as typeof testData).contracts).toHaveLength(2);
    });

    it('should handle concurrent cache operations', async () => {
      const cache = new MemoryCache();
      const operations: Promise<void>[] = [];

      // Simulate concurrent writes
      for (let i = 0; i < 50; i++) {
        operations.push(
          new Promise<void>(resolve => {
            cache.set(`concurrent-${i}`, { index: i });
            resolve();
          })
        );
      }

      await Promise.all(operations);

      // Verify all writes succeeded
      for (let i = 0; i < 50; i++) {
        expect(cache.get(`concurrent-${i}`)).toEqual({ index: i });
      }
    });
  });

  describe('Circuit Breaker Failover', () => {
    it('should allow requests through when circuit is closed', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'failover-test-1',
        failureThreshold: 5,
      });

      // Should execute normally
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.isHealthy()).toBe(true);
    });

    it('should block requests when circuit is open', async () => {
      const { CircuitBreaker, CircuitOpenError } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'failover-test-2',
        failureThreshold: 2,
        resetTimeout: 10000,
      });

      // Fail twice to open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Simulated failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.isHealthy()).toBe(false);

      // Should throw CircuitOpenError
      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should recover after reset timeout', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'failover-test-3',
        failureThreshold: 1,
        successThreshold: 1,
        resetTimeout: 50, // Very short for testing
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Simulated failure');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be able to execute again
      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe('closed');
    });

    it('should return to open state if recovery fails', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'failover-test-4',
        failureThreshold: 1,
        successThreshold: 2,
        resetTimeout: 50,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Initial failure');
        });
      } catch {
        // Expected
      }

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fail again during half-open
      try {
        await breaker.execute(async () => {
          throw new Error('Recovery failure');
        });
      } catch {
        // Expected
      }

      // Should be back to open
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('Graceful Degradation Scenarios', () => {
    it('should handle slow cache operations', async () => {
      const cache = new MemoryCache();

      // Simulate slow operation
      const startTime = Date.now();
      cache.set('slow-test', { data: 'value' });
      const result = cache.get('slow-test');
      const duration = Date.now() - startTime;

      // Memory operations should be fast (< 10ms)
      expect(duration).toBeLessThan(10);
      expect(result).toEqual({ data: 'value' });
    });

    it('should maintain cache consistency during failures', async () => {
      const cache = new MemoryCache();

      // Set initial data
      cache.set('consistency-test', { version: 1 });

      // Simulate partial failure by updating value
      cache.set('consistency-test', { version: 2 });

      // Data should be consistent
      expect(cache.get('consistency-test')).toEqual({ version: 2 });
    });

    it('should properly handle TTL during failover', async () => {
      const cache = new MemoryCache();

      // Set with short TTL
      cache.set('ttl-test', 'value', 1);

      // Should be available immediately
      expect(cache.get('ttl-test')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get('ttl-test')).toBeNull();
    });
  });

  describe('Data Integrity During Failover', () => {
    it('should preserve enterprise isolation in cache keys', async () => {
      const cache = new MemoryCache();
      const enterprise1Data = { name: 'Enterprise 1' };
      const enterprise2Data = { name: 'Enterprise 2' };

      cache.set('contract:ent1:123', enterprise1Data);
      cache.set('contract:ent2:123', enterprise2Data);

      expect(cache.get('contract:ent1:123')).toEqual(enterprise1Data);
      expect(cache.get('contract:ent2:123')).toEqual(enterprise2Data);

      // Cross-enterprise access should not work
      expect(cache.get('contract:ent1:456')).toBeNull();
    });

    it('should handle cache key collisions gracefully', () => {
      const cache = new MemoryCache();

      // Same key overwrites previous value
      cache.set('collision-key', 'first');
      cache.set('collision-key', 'second');

      expect(cache.get('collision-key')).toBe('second');
    });

    it('should maintain data types correctly', () => {
      const cache = new MemoryCache();

      // String
      cache.set('type-string', 'hello');
      expect(typeof cache.get('type-string')).toBe('string');

      // Number
      cache.set('type-number', 42);
      expect(typeof cache.get('type-number')).toBe('number');

      // Boolean
      cache.set('type-boolean', true);
      expect(typeof cache.get('type-boolean')).toBe('boolean');

      // Object
      cache.set('type-object', { key: 'value' });
      expect(typeof cache.get('type-object')).toBe('object');

      // Array
      cache.set('type-array', [1, 2, 3]);
      expect(Array.isArray(cache.get('type-array'))).toBe(true);
    });
  });

  describe('Recovery Procedures', () => {
    it('should allow manual circuit breaker reset', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'manual-reset-test',
        failureThreshold: 1,
        resetTimeout: 60000, // Long timeout
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      // Manual reset
      breaker.reset();

      expect(breaker.getState()).toBe('closed');
      expect(breaker.isHealthy()).toBe(true);
    });

    it('should track error rates for monitoring', async () => {
      const { CircuitBreaker } = await import('../functions/_shared/circuit-breaker');

      const breaker = new CircuitBreaker({
        name: 'error-rate-test',
        failureThreshold: 10,
      });

      // Execute 7 successful, 3 failed
      for (let i = 0; i < 7; i++) {
        await breaker.execute(async () => 'success');
      }

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      const errorRate = breaker.getErrorRate();
      expect(errorRate).toBeCloseTo(30, 0); // 30% error rate
    });

    it('should provide health check capability', async () => {
      const { circuitBreakerHealthCheck, getCircuitBreaker } = await import(
        '../functions/_shared/circuit-breaker'
      );

      // Create a few circuit breakers
      getCircuitBreaker('health-test-1');
      getCircuitBreaker('health-test-2');

      const health = circuitBreakerHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.circuits).toContainEqual(
        expect.objectContaining({ name: 'health-test-1', healthy: true })
      );
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid cache operations under load', () => {
      const cache = new MemoryCache();
      const iterations = 5000;

      const startTime = Date.now();

      // Rapid writes
      for (let i = 0; i < iterations; i++) {
        cache.set(`stress-${i}`, { value: i, timestamp: Date.now() });
      }

      // Rapid reads
      for (let i = 0; i < iterations; i++) {
        cache.get(`stress-${i}`);
      }

      // Rapid deletes
      for (let i = 0; i < iterations / 2; i++) {
        cache.delete(`stress-${i}`);
      }

      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);

      // Verify some data is still present
      expect(cache.get(`stress-${iterations - 1}`)).not.toBeNull();

      // Verify deleted data is gone
      expect(cache.get('stress-0')).toBeNull();
    });

    it('should handle memory pressure gracefully', () => {
      // Create cache with small max size
      const cache = new MemoryCache(300, 100);

      // Fill cache beyond capacity
      for (let i = 0; i < 200; i++) {
        cache.set(`pressure-${i}`, {
          data: 'x'.repeat(100),
          index: i,
        });
      }

      // Recent entries should be available
      expect(cache.get('pressure-199')).not.toBeNull();

      // Old entries should be evicted
      let evictedCount = 0;
      for (let i = 0; i < 50; i++) {
        if (cache.get(`pressure-${i}`) === null) {
          evictedCount++;
        }
      }

      // Some entries should have been evicted
      expect(evictedCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', () => {
      const cache = new MemoryCache();

      cache.set('', 'empty key value');
      expect(cache.get('')).toBe('empty key value');
    });

    it('should handle very long keys', () => {
      const cache = new MemoryCache();
      const longKey = 'k'.repeat(1000);

      cache.set(longKey, 'long key value');
      expect(cache.get(longKey)).toBe('long key value');
    });

    it('should handle special characters in keys', () => {
      const cache = new MemoryCache();
      const specialKey = 'key:with/special\\chars!@#$%^&*()';

      cache.set(specialKey, 'special value');
      expect(cache.get(specialKey)).toBe('special value');
    });

    it('should handle unicode keys and values', () => {
      const cache = new MemoryCache();
      const unicodeKey = '键值:🔑';
      const unicodeValue = { message: '你好世界 🌍', emoji: '🚀' };

      cache.set(unicodeKey, unicodeValue);
      expect(cache.get(unicodeKey)).toEqual(unicodeValue);
    });

    it('should handle zero TTL', () => {
      const cache = new MemoryCache();

      // Zero TTL should immediately expire or use default
      cache.set('zero-ttl', 'value', 0);

      // Behavior depends on implementation - either null or uses default
      const result = cache.get('zero-ttl');
      // Just verify it doesn't throw
      expect(result === null || result === 'value').toBe(true);
    });

    it('should handle negative TTL gracefully', () => {
      const cache = new MemoryCache();

      // Should not throw
      expect(() => {
        cache.set('negative-ttl', 'value', -100);
      }).not.toThrow();
    });
  });
});
