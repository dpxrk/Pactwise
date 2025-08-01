import { cache, cacheKeys } from './redis';
import { performanceMonitor } from './performance-monitoring';

// Cache invalidation strategies
export enum InvalidationStrategy {
  IMMEDIATE = 'immediate', // Invalidate immediately
  DELAYED = 'delayed', // Invalidate after a delay
  SMART = 'smart', // Invalidate based on dependencies
  SCHEDULED = 'scheduled', // Invalidate on a schedule
}

// Cache dependency tracking
interface CacheDependency {
  key: string;
  dependsOn: string[];
  lastUpdated: number;
  ttl: number;
}

class CacheInvalidationManager {
  private dependencies: Map<string, CacheDependency> = new Map();
  private invalidationQueue: Map<string, NodeJS.Timeout> = new Map();

  // Register cache dependencies
  registerDependency(key: string, dependsOn: string[], ttl: number) {
    this.dependencies.set(key, {
      key,
      dependsOn,
      lastUpdated: Date.now(),
      ttl,
    });
  }

  // Invalidate cache with strategy
  async invalidate(
    key: string | string[],
    strategy: InvalidationStrategy = InvalidationStrategy.IMMEDIATE,
    options?: {
      delay?: number;
      cascade?: boolean;
      pattern?: boolean;
    }
  ) {
    const keys = Array.isArray(key) ? key : [key];
    
    switch (strategy) {
      case InvalidationStrategy.IMMEDIATE:
        await this.invalidateImmediate(keys, options);
        break;
      
      case InvalidationStrategy.DELAYED:
        await this.invalidateDelayed(keys, options?.delay || 5000, options);
        break;
      
      case InvalidationStrategy.SMART:
        await this.invalidateSmart(keys, options);
        break;
      
      case InvalidationStrategy.SCHEDULED:
        // This would be handled by a cron job or scheduler
        console.log('Scheduled invalidation registered for:', keys);
        break;
    }
  }

  // Immediate invalidation
  private async invalidateImmediate(
    keys: string[],
    options?: { cascade?: boolean; pattern?: boolean }
  ) {
    const measure = performanceMonitor.measureOperation(
      'cache.invalidate.immediate',
      async () => {
        const invalidated: string[] = [];

        for (const key of keys) {
          if (options?.pattern) {
            const count = await cache.invalidatePattern(key);
            invalidated.push(`${key} (${count} keys)`);
          } else {
            await cache.delete(key);
            invalidated.push(key);
          }

          // Cascade to dependent caches
          if (options?.cascade) {
            const dependents = this.getDependentKeys(key);
            for (const dependent of dependents) {
              await cache.delete(dependent);
              invalidated.push(`${dependent} (cascaded)`);
            }
          }
        }

        return invalidated;
      },
      { tags: { strategy: 'immediate', keys: keys.join(',') } }
    );

    const result = await measure;
    console.log('Invalidated caches:', result);
  }

  // Delayed invalidation
  private async invalidateDelayed(
    keys: string[],
    delay: number,
    options?: { cascade?: boolean; pattern?: boolean }
  ) {
    for (const key of keys) {
      // Cancel any existing delayed invalidation
      const existing = this.invalidationQueue.get(key);
      if (existing) {
        clearTimeout(existing);
      }

      // Schedule new invalidation
      const timeout = setTimeout(async () => {
        await this.invalidateImmediate([key], options);
        this.invalidationQueue.delete(key);
      }, delay);

      this.invalidationQueue.set(key, timeout);
    }

    console.log(`Scheduled invalidation for ${keys.length} keys after ${delay}ms`);
  }

  // Smart invalidation based on dependencies
  private async invalidateSmart(
    keys: string[],
    options?: { cascade?: boolean }
  ) {
    const measure = performanceMonitor.measureOperation(
      'cache.invalidate.smart',
      async () => {
        const toInvalidate = new Set<string>(keys);
        const checked = new Set<string>();

        // Build invalidation graph
        while (toInvalidate.size > 0) {
          const current = Array.from(toInvalidate);
          toInvalidate.clear();

          for (const key of current) {
            if (checked.has(key)) continue;
            checked.add(key);

            // Find all dependent keys
            const dependents = this.getDependentKeys(key);
            for (const dependent of dependents) {
              if (!checked.has(dependent)) {
                toInvalidate.add(dependent);
              }
            }
          }
        }

        // Invalidate all affected keys
        const invalidated: string[] = [];
        for (const key of checked) {
          await cache.delete(key);
          invalidated.push(key);
        }

        return invalidated;
      },
      { tags: { strategy: 'smart', initialKeys: keys.join(',') } }
    );

    const result = await measure;
    console.log('Smart invalidation completed:', result);
  }

  // Get keys that depend on a given key
  private getDependentKeys(key: string): string[] {
    const dependents: string[] = [];

    for (const [depKey, dep] of this.dependencies) {
      if (dep.dependsOn.includes(key)) {
        dependents.push(depKey);
      }
    }

    return dependents;
  }

  // Cancel pending invalidations
  cancelPendingInvalidations(key?: string) {
    if (key) {
      const timeout = this.invalidationQueue.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.invalidationQueue.delete(key);
      }
    } else {
      // Cancel all
      for (const [key, timeout] of this.invalidationQueue) {
        clearTimeout(timeout);
      }
      this.invalidationQueue.clear();
    }
  }
}

// Export singleton instance
export const cacheInvalidationManager = new CacheInvalidationManager();

// Specific invalidation handlers for different entities
export const invalidationHandlers = {
  // Contract invalidation
  async onContractUpdate(contractId: string, enterpriseId: string) {
    const keys = [
      cacheKeys.contract(contractId),
      cacheKeys.contractAnalysis(contractId),
      cacheKeys.dashboardStats(enterpriseId),
    ];

    // Immediate invalidation for specific contract
    await cacheInvalidationManager.invalidate(
      keys,
      InvalidationStrategy.IMMEDIATE
    );

    // Delayed invalidation for contract lists (to batch multiple updates)
    await cacheInvalidationManager.invalidate(
      [`contracts:${enterpriseId}:*`],
      InvalidationStrategy.DELAYED,
      { pattern: true, delay: 2000 }
    );
  },

  // Vendor invalidation
  async onVendorUpdate(vendorId: string, enterpriseId: string) {
    const keys = [
      cacheKeys.vendor(vendorId),
      cacheKeys.vendorPerformance(vendorId),
      cacheKeys.vendorList(enterpriseId),
      cacheKeys.dashboardStats(enterpriseId),
    ];

    await cacheInvalidationManager.invalidate(
      keys,
      InvalidationStrategy.SMART,
      { cascade: true }
    );
  },

  // Analytics invalidation
  async onAnalyticsUpdate(type: string, enterpriseId: string) {
    // Invalidate all analytics caches for the enterprise
    await cacheInvalidationManager.invalidate(
      [`analytics:${type}:${enterpriseId}:*`],
      InvalidationStrategy.IMMEDIATE,
      { pattern: true }
    );
  },

  // User preferences invalidation
  async onUserPreferencesUpdate(userId: string) {
    await cacheInvalidationManager.invalidate(
      cacheKeys.userPreferences(userId),
      InvalidationStrategy.IMMEDIATE
    );
  },

  // Search results invalidation
  async onSearchIndexUpdate() {
    // Invalidate all search results after a delay to batch updates
    await cacheInvalidationManager.invalidate(
      ['search:*'],
      InvalidationStrategy.DELAYED,
      { pattern: true, delay: 5000 }
    );
  },

  // Bulk operations
  async onBulkContractUpdate(enterpriseId: string) {
    // Clear all contract-related caches for the enterprise
    const patterns = [
      `contracts:${enterpriseId}:*`,
      `contract:*`,
      `contract_analysis:*`,
      cacheKeys.dashboardStats(enterpriseId),
    ];

    await cacheInvalidationManager.invalidate(
      patterns,
      InvalidationStrategy.IMMEDIATE,
      { pattern: true }
    );
  },
};

// Cache warming strategies
export const cacheWarming = {
  // Warm dashboard cache
  async warmDashboardCache(enterpriseId: string) {
    const measure = performanceMonitor.measureOperation(
      'cache.warm.dashboard',
      async () => {
        // This would typically fetch data and populate cache
        console.log(`Warming dashboard cache for enterprise: ${enterpriseId}`);
        
        // In a real implementation, you would:
        // 1. Fetch dashboard stats from database
        // 2. Store in cache with appropriate TTL
        // 3. Optionally pre-fetch related data
      }
    );

    await measure;
  },

  // Warm frequently accessed contracts
  async warmFrequentContracts(enterpriseId: string, limit: number = 20) {
    const measure = performanceMonitor.measureOperation(
      'cache.warm.contracts',
      async () => {
        // This would fetch most frequently accessed contracts
        console.log(`Warming contract cache for enterprise: ${enterpriseId}`);
      }
    );

    await measure;
  },

  // Schedule cache warming
  scheduleWarmup(enterpriseId: string, interval: number = 3600000) {
    setInterval(async () => {
      await this.warmDashboardCache(enterpriseId);
      await this.warmFrequentContracts(enterpriseId);
    }, interval);
  },
};

// Cache coherence utilities
export const cacheCoherence = {
  // Verify cache consistency
  async verifyConsistency(key: string, expectedValue: any): Promise<boolean> {
    const cached = await cache.get(key);
    return JSON.stringify(cached) === JSON.stringify(expectedValue);
  },

  // Repair inconsistent cache
  async repairCache(key: string, correctValue: any, ttl?: number) {
    await cache.set(key, correctValue, ttl);
  },

  // Monitor cache hit rate
  async getCacheStats(pattern: string = '*'): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    const client = cache['client'];
    const keys = await client.keys(pattern);
    const info = await client.info('memory');
    
    return {
      totalKeys: keys.length,
      memoryUsage: info.match(/used_memory_human:(.+)/)?.[1] || 'unknown',
    };
  },
};