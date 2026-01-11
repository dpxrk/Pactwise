import { useState, useEffect, useRef } from 'react';

import { performanceMonitor } from './performance-monitoring';
import { cache, cacheKeys, cacheTTL } from './redis';

// Cache configuration for different query types
const queryCacheConfig: Record<string, { ttl: number; cacheKey: (args: any) => string }> = {
  'contracts.getContracts': {
    ttl: cacheTTL.contractList,
    cacheKey: (args) => cacheKeys.contractList(args.enterpriseId, args),
  },
  'contracts.getContractById': {
    ttl: cacheTTL.contractList,
    cacheKey: (args) => cacheKeys.contract(args.contractId),
  },
  'vendors.getVendors': {
    ttl: cacheTTL.vendorList,
    cacheKey: (args) => cacheKeys.vendorList(args.enterpriseId),
  },
  'vendors.getVendorById': {
    ttl: cacheTTL.vendorList,
    cacheKey: (args) => cacheKeys.vendor(args.vendorId),
  },
  'contracts.getContractStats': {
    ttl: cacheTTL.dashboardStats,
    cacheKey: (args) => cacheKeys.dashboardStats(args.enterpriseId),
  },
  'analytics.getAnalytics': {
    ttl: cacheTTL.analytics,
    cacheKey: (args) => cacheKeys.analytics(args.type, args.enterpriseId, args.period),
  },
};

// Placeholder cached query hook - will be replaced with Supabase queries
export function useCachedQuery<T>(
  queryName: string,
  args: any | 'skip',
  options?: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnMount?: boolean;
    refetchOnWindowFocus?: boolean;
    enabled?: boolean;
  }
) {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchTime = useRef<number>(0);

  const cacheConfig = queryCacheConfig[queryName];
  
  // Generate cache key
  const cacheKey = cacheConfig && args !== 'skip' 
    ? cacheConfig.cacheKey(args)
    : null;

  // Check cache on mount
  useEffect(() => {
    if (!cacheKey || args === 'skip' || !options?.enabled) {
      setIsLoading(false);
      return;
    }

    const checkCache = async () => {
      try {
        const cached = await cache.get(cacheKey);
        if (cached) {
          setCachedData(cached as T);
          lastFetchTime.current = Date.now();
        }
      } catch (err) {
        console.error('Cache read error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkCache();
  }, [cacheKey, args, options?.enabled]);

  // Note: Primary data fetching is done via individual hooks (useContracts, useVendors, etc.)
  // This hook provides optional cache-layer functionality for advanced caching needs
  useEffect(() => {
    if (args !== 'skip' && options?.enabled !== false && process.env.NODE_ENV === 'development') {
      console.log(`Cached query layer: ${queryName}`, args);
    }
  }, [queryName, args, options?.enabled]);

  // Refetch logic
  const refetch = async () => {
    if (!cacheKey || args === 'skip') return;

    setIsFetching(true);
    setError(null);

    try {
      // Force cache invalidation
      await cache.delete(cacheKey);

      // Cache invalidated - React Query hooks handle actual data refetching
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cache invalidated for: ${queryName}`, args);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsFetching(false);
    }
  };

  // Check if data is stale
  const isStale = options?.staleTime 
    ? Date.now() - lastFetchTime.current > options.staleTime
    : false;

  return {
    data: cachedData,
    isLoading: isLoading && !cachedData,
    isFetching,
    isStale,
    error,
    refetch,
  };
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate all contract-related caches
  async invalidateContracts(enterpriseId: string) {
    const patterns = [
      `contract:*`,
      `contracts:${enterpriseId}:*`,
      `contract_analysis:*`,
      `dashboard:${enterpriseId}`,
    ];

    for (const pattern of patterns) {
      await cache.invalidatePattern(pattern);
    }
  },

  // Invalidate specific contract
  async invalidateContract(contractId: string, enterpriseId: string) {
    await Promise.all([
      cache.delete(cacheKeys.contract(contractId)),
      cache.invalidatePattern(`contracts:${enterpriseId}:*`),
      cache.delete(cacheKeys.contractAnalysis(contractId)),
      cache.delete(cacheKeys.dashboardStats(enterpriseId)),
    ]);
  },

  // Invalidate all vendor-related caches
  async invalidateVendors(enterpriseId: string) {
    const patterns = [
      `vendor:*`,
      `vendors:${enterpriseId}`,
      `vendor_performance:*`,
      `dashboard:${enterpriseId}`,
    ];

    for (const pattern of patterns) {
      await cache.invalidatePattern(pattern);
    }
  },

  // Invalidate specific vendor
  async invalidateVendor(vendorId: string, enterpriseId: string) {
    await Promise.all([
      cache.delete(cacheKeys.vendor(vendorId)),
      cache.delete(cacheKeys.vendorList(enterpriseId)),
      cache.delete(cacheKeys.vendorPerformance(vendorId)),
      cache.delete(cacheKeys.dashboardStats(enterpriseId)),
    ]);
  },

  // Invalidate user preferences
  async invalidateUserPreferences(userId: string) {
    await cache.delete(cacheKeys.userPreferences(userId));
  },

  // Invalidate search results
  async invalidateSearch() {
    await cache.invalidatePattern('search:*');
  },

  // Invalidate all caches for an enterprise
  async invalidateEnterprise(enterpriseId: string) {
    const patterns = [
      `contracts:${enterpriseId}:*`,
      `vendors:${enterpriseId}`,
      `dashboard:${enterpriseId}`,
      `analytics:*:${enterpriseId}:*`,
    ];

    for (const pattern of patterns) {
      await cache.invalidatePattern(pattern);
    }
  },
};

// Placeholder mutation wrapper that invalidates cache
export function useCachedMutation<T>(
  mutationName: string,
  options?: {
    onSuccess?: (data: T) => void | Promise<void>;
    invalidates?: string[] | ((args: any) => string[]);
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (args: any) => {
    setIsLoading(true);
    setError(null);

    const measure = performanceMonitor.measureDatabaseQuery(mutationName);

    try {
      // Note: Primary mutations are done via individual hooks (useUpdateContract, useCreateVendor, etc.)
      // This wrapper provides cache invalidation for mutations that need it
      if (process.env.NODE_ENV === 'development') {
        console.log(`Cached mutation layer: ${mutationName}`, args);
      }
      const result = null as unknown as T;
      
      measure.end();

      // Invalidate caches
      if (options?.invalidates) {
        const cacheKeysToInvalidate = typeof options.invalidates === 'function'
          ? options.invalidates(args)
          : options.invalidates;

        await Promise.all(cacheKeysToInvalidate.map(key => cache.delete(key)));
      }

      // Call success callback
      if (options?.onSuccess) {
        await options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      measure.end();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}

// Prefetch data into cache (placeholder)
export async function prefetchQuery(
  queryName: string,
  args: any
): Promise<void> {
  const cacheConfig = queryCacheConfig[queryName];
  
  if (!cacheConfig) {
    console.warn(`No cache configuration for query: ${queryName}`);
    return;
  }

  const cacheKey = cacheConfig.cacheKey(args);
  
  // Check if already cached
  const existing = await cache.get(cacheKey);
  if (existing) {
    return;
  }

  // Prefetch placeholder - use React Query's prefetchQuery for actual prefetching
  // This sets up cache keys for when React Query hooks fetch the actual data
  if (process.env.NODE_ENV === 'development') {
    console.log(`Prefetch cache setup for: ${queryName}`, args);
  }
}

// Batch prefetch multiple queries
export async function batchPrefetch(
  queries: Array<{
    queryName: string;
    args: any;
  }>
): Promise<void> {
  await Promise.all(
    queries.map(({ queryName, args }) => prefetchQuery(queryName, args))
  );
}