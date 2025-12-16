/**
 * Cache Invalidation Service
 *
 * Provides methods to invalidate caches based on data changes.
 * Supports:
 * - Event-based invalidation (triggered by database changes)
 * - Cascading invalidation for related data
 * - Manual cache clearing
 * - Performance metrics tracking
 */

import { getCache, getMultiTierCache } from '../../functions-utils/cache-factory.ts';
import { httpInvalidationPatterns } from './cache-config.ts';

/**
 * Invalidation event structure
 */
export interface InvalidationEvent {
  type: 'create' | 'update' | 'delete' | 'bulk';
  resourceType: string;
  resourceId?: string;
  enterpriseId: string;
  relatedResources?: Array<{ type: string; id: string }>;
  metadata?: Record<string, unknown>;
}

/**
 * Map of resource types to related cache patterns that should be invalidated
 * When a resource changes, all related caches are invalidated
 */
const INVALIDATION_MAP: Record<string, string[]> = {
  // Contract changes affect dashboard, vendors (linked contracts), budgets (allocations)
  contracts: ['contracts', 'dashboard', 'vendors', 'budgets', 'analytics'],

  // Vendor changes affect dashboard, contracts (linked vendors)
  vendors: ['vendors', 'dashboard', 'contracts', 'analytics'],

  // Budget changes affect dashboard, contracts (allocations)
  budgets: ['budgets', 'dashboard', 'contracts'],

  // Budget allocations affect both budgets and contracts
  budget_allocations: ['budgets', 'contracts', 'dashboard'],

  // Compliance checks affect dashboard
  compliance_checks: ['dashboard', 'compliance', 'analytics'],

  // Contract approvals affect dashboard and contracts
  contract_approvals: ['dashboard', 'approvals', 'contracts'],

  // User changes affect user profile caches
  users: ['users', 'dashboard'],

  // Enterprise changes affect public metrics and dashboard
  enterprises: ['public', 'dashboard'],

  // Tags affect any resource that uses them
  tags: ['contracts', 'vendors', 'budgets'],

  // Clause library changes
  clause_library: ['clause_library', 'contracts'],

  // Agent tasks don't typically invalidate caches
  agent_tasks: [],

  // Notifications are user-specific
  notifications: ['notifications'],
};

/**
 * Invalidate caches based on a data change event
 *
 * @param event The invalidation event describing what changed
 * @returns Number of patterns invalidated
 */
export async function invalidateOnDataChange(
  event: InvalidationEvent
): Promise<number> {
  const cache = getMultiTierCache();
  if (!cache) {
    // No Redis available, nothing to invalidate
    return 0;
  }

  const patterns: string[] = [];

  // Primary resource invalidation
  patterns.push(
    httpInvalidationPatterns.resourceType(event.enterpriseId, event.resourceType)
  );
  patterns.push(
    httpInvalidationPatterns.lists(event.enterpriseId, event.resourceType)
  );

  // Related resources from map
  const relatedTypes = INVALIDATION_MAP[event.resourceType] || [];
  for (const relatedType of relatedTypes) {
    if (relatedType === 'public') {
      patterns.push(httpInvalidationPatterns.publicAll());
    } else if (relatedType === 'dashboard') {
      patterns.push(httpInvalidationPatterns.dashboard(event.enterpriseId));
    } else if (relatedType === 'analytics') {
      // Analytics typically use the same pattern as lists
      patterns.push(httpInvalidationPatterns.lists(event.enterpriseId, relatedType));
    } else {
      patterns.push(
        httpInvalidationPatterns.lists(event.enterpriseId, relatedType)
      );
    }
  }

  // Explicit related resources from event
  if (event.relatedResources) {
    for (const related of event.relatedResources) {
      patterns.push(
        httpInvalidationPatterns.resourceType(event.enterpriseId, related.type)
      );
    }
  }

  // Deduplicate patterns
  const uniquePatterns = [...new Set(patterns)];

  // Execute invalidations
  let totalInvalidated = 0;
  await Promise.all(
    uniquePatterns.map(async (pattern) => {
      try {
        const count = await cache.invalidatePattern(pattern);
        totalInvalidated += count;
      } catch (error) {
        console.error(`Cache invalidation failed for pattern ${pattern}:`, error);
      }
    })
  );

  // Log for observability
  console.log(`[Cache] Invalidation: ${event.type} ${event.resourceType}`, {
    enterprise: event.enterpriseId,
    patterns: uniquePatterns.length,
    keysInvalidated: totalInvalidated,
  });

  return totalInvalidated;
}

/**
 * Invalidate specific resource cache
 *
 * @param enterpriseId Enterprise ID
 * @param resourceType Resource type (e.g., 'contracts', 'vendors')
 * @param resourceId Resource ID
 */
export async function invalidateResource(
  enterpriseId: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  await invalidateOnDataChange({
    type: 'update',
    resourceType,
    resourceId,
    enterpriseId,
  });
}

/**
 * Invalidate all caches for an enterprise
 * Use sparingly - this is a heavy operation
 *
 * @param enterpriseId Enterprise ID
 */
export async function invalidateEnterpriseCache(
  enterpriseId: string
): Promise<number> {
  const cache = getMultiTierCache();
  if (!cache) return 0;

  const count = await cache.invalidatePattern(
    httpInvalidationPatterns.allForEnterprise(enterpriseId)
  );

  console.log(`[Cache] Full enterprise cache invalidation`, {
    enterprise: enterpriseId,
    keysInvalidated: count,
  });

  return count;
}

/**
 * Invalidate all public caches
 * Called when public-facing metrics change
 */
export async function invalidatePublicCaches(): Promise<number> {
  const cache = getMultiTierCache();
  if (!cache) return 0;

  const count = await cache.invalidatePattern(
    httpInvalidationPatterns.publicAll()
  );

  console.log(`[Cache] Public cache invalidation`, {
    keysInvalidated: count,
  });

  return count;
}

/**
 * Invalidate dashboard caches for an enterprise
 *
 * @param enterpriseId Enterprise ID
 */
export async function invalidateDashboardCache(
  enterpriseId: string
): Promise<number> {
  const cache = getMultiTierCache();
  if (!cache) return 0;

  const count = await cache.invalidatePattern(
    httpInvalidationPatterns.dashboard(enterpriseId)
  );

  console.log(`[Cache] Dashboard cache invalidation`, {
    enterprise: enterpriseId,
    keysInvalidated: count,
  });

  return count;
}

/**
 * Manual cache clearing (admin use)
 * Clears ALL HTTP caches - use with extreme caution
 */
export async function clearAllHttpCaches(): Promise<number> {
  const cache = getMultiTierCache();
  if (!cache) return 0;

  const count = await cache.invalidatePattern('http:*');

  console.log(`[Cache] Full HTTP cache clear`, {
    keysInvalidated: count,
  });

  return count;
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  redisConnected: boolean;
}> {
  const cache = getMultiTierCache();
  if (!cache) {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      redisConnected: false,
    };
  }

  try {
    const stats = await cache.getStats();
    return {
      ...stats,
      redisConnected: true,
    };
  } catch {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      redisConnected: false,
    };
  }
}

/**
 * Batch invalidation for bulk operations
 * More efficient than individual invalidations
 *
 * @param events Array of invalidation events
 */
export async function batchInvalidate(
  events: InvalidationEvent[]
): Promise<number> {
  // Group events by enterprise for efficiency
  const byEnterprise = new Map<string, InvalidationEvent[]>();
  for (const event of events) {
    const existing = byEnterprise.get(event.enterpriseId) || [];
    existing.push(event);
    byEnterprise.set(event.enterpriseId, existing);
  }

  let totalInvalidated = 0;

  // Process each enterprise's events
  for (const [enterpriseId, enterpriseEvents] of byEnterprise) {
    // Collect all unique resource types
    const resourceTypes = new Set<string>();
    for (const event of enterpriseEvents) {
      resourceTypes.add(event.resourceType);

      // Add related types
      const related = INVALIDATION_MAP[event.resourceType] || [];
      for (const type of related) {
        resourceTypes.add(type);
      }
    }

    // Invalidate once per resource type (more efficient than per-event)
    const cache = getMultiTierCache();
    if (cache) {
      for (const resourceType of resourceTypes) {
        if (resourceType === 'public') {
          totalInvalidated += await cache.invalidatePattern(
            httpInvalidationPatterns.publicAll()
          );
        } else if (resourceType === 'dashboard') {
          totalInvalidated += await cache.invalidatePattern(
            httpInvalidationPatterns.dashboard(enterpriseId)
          );
        } else {
          totalInvalidated += await cache.invalidatePattern(
            httpInvalidationPatterns.lists(enterpriseId, resourceType)
          );
        }
      }
    }
  }

  console.log(`[Cache] Batch invalidation completed`, {
    events: events.length,
    enterprises: byEnterprise.size,
    keysInvalidated: totalInvalidated,
  });

  return totalInvalidated;
}

/**
 * Create invalidation event from database trigger payload
 * Used by the cache-invalidation-webhook edge function
 *
 * @param payload Database trigger payload
 * @returns InvalidationEvent or null if invalid
 */
export function createInvalidationEventFromTrigger(payload: {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}): InvalidationEvent | null {
  const record = payload.record || payload.old_record;
  if (!record) return null;

  const enterpriseId = record.enterprise_id as string | undefined;
  if (!enterpriseId) return null;

  return {
    type:
      payload.type === 'INSERT'
        ? 'create'
        : payload.type === 'DELETE'
        ? 'delete'
        : 'update',
    resourceType: payload.table,
    resourceId: record.id as string | undefined,
    enterpriseId,
  };
}
