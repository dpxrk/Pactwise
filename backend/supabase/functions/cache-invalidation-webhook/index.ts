/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import {
  invalidateOnDataChange,
  createInvalidationEventFromTrigger,
  invalidatePublicCaches,
  getCacheStats,
  type InvalidationEvent,
} from '../_shared/cache-invalidation.ts';

/**
 * Cache Invalidation Webhook Edge Function
 *
 * Receives database trigger notifications and invalidates appropriate caches.
 * Called by Supabase database webhooks when data changes occur.
 *
 * Endpoints:
 * - POST /cache-invalidation-webhook - Process database trigger payload
 * - GET /cache-invalidation-webhook/stats - Get cache statistics
 * - POST /cache-invalidation-webhook/manual - Manual cache invalidation
 */

interface TriggerPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface ManualInvalidationRequest {
  enterpriseId: string;
  resourceType: string;
  resourceId?: string;
  action: 'resource' | 'enterprise' | 'public';
}

/**
 * Handler for cache invalidation webhook
 */
async function handleCacheInvalidation(context: RequestContext): Promise<Response> {
  const { req, user } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  try {
    // ========================================================================
    // GET /cache-invalidation-webhook/stats - Get cache statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/cache-invalidation-webhook/stats') {
      const stats = await getCacheStats();
      return createSuccessResponse(stats, undefined, 200, req);
    }

    // ========================================================================
    // POST /cache-invalidation-webhook - Process database trigger payload
    // ========================================================================
    if (method === 'POST' && pathname === '/cache-invalidation-webhook') {
      // Parse request body
      const payload = await req.json() as TriggerPayload;

      // Validate payload
      if (!payload.type || !payload.table) {
        return createErrorResponseSync('Invalid payload: missing type or table', 400, req);
      }

      // Create invalidation event from trigger payload
      const event = createInvalidationEventFromTrigger(payload);

      if (!event) {
        // No enterprise_id in payload, skip invalidation
        console.log('Skipping cache invalidation: no enterprise_id in payload');
        return createSuccessResponse({
          success: true,
          message: 'No invalidation needed (no enterprise_id)',
          invalidated: 0,
        }, undefined, 200, req);
      }

      // Perform cache invalidation
      const invalidatedCount = await invalidateOnDataChange(event);

      // Record statistics
      const supabase = createAdminClient();
      await supabase.rpc('record_cache_invalidation_stat', {
        p_enterprise_id: event.enterpriseId,
        p_table_name: event.resourceType,
        p_operation_type: payload.type,
      });

      return createSuccessResponse({
        success: true,
        event: {
          type: event.type,
          resourceType: event.resourceType,
          enterpriseId: event.enterpriseId,
        },
        invalidated: invalidatedCount,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /cache-invalidation-webhook/manual - Manual cache invalidation
    // ========================================================================
    if (method === 'POST' && pathname === '/cache-invalidation-webhook/manual') {
      // Require authentication for manual invalidation
      if (!user) {
        return createErrorResponseSync('Authentication required for manual invalidation', 401, req);
      }

      // Only allow admins/owners to manually invalidate caches
      if (!['admin', 'owner'].includes(user.role)) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json() as ManualInvalidationRequest;

      let invalidatedCount = 0;

      switch (body.action) {
        case 'resource':
          if (!body.resourceType || !body.enterpriseId) {
            return createErrorResponseSync('resourceType and enterpriseId required', 400, req);
          }
          invalidatedCount = await invalidateOnDataChange({
            type: 'update',
            resourceType: body.resourceType,
            resourceId: body.resourceId,
            enterpriseId: body.enterpriseId,
          });
          break;

        case 'enterprise':
          if (!body.enterpriseId) {
            return createErrorResponseSync('enterpriseId required', 400, req);
          }
          // Import and call the function
          const { invalidateEnterpriseCache } = await import('../_shared/cache-invalidation.ts');
          invalidatedCount = await invalidateEnterpriseCache(body.enterpriseId);
          break;

        case 'public':
          invalidatedCount = await invalidatePublicCaches();
          break;

        default:
          return createErrorResponseSync('Invalid action. Use: resource, enterprise, or public', 400, req);
      }

      return createSuccessResponse({
        success: true,
        action: body.action,
        invalidated: invalidatedCount,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /cache-invalidation-webhook/batch - Batch invalidation
    // ========================================================================
    if (method === 'POST' && pathname === '/cache-invalidation-webhook/batch') {
      const body = await req.json() as { events: TriggerPayload[] };

      if (!Array.isArray(body.events)) {
        return createErrorResponseSync('events array required', 400, req);
      }

      // Convert trigger payloads to invalidation events
      const events: InvalidationEvent[] = [];
      for (const payload of body.events) {
        const event = createInvalidationEventFromTrigger(payload);
        if (event) {
          events.push(event);
        }
      }

      // Batch invalidate
      const { batchInvalidate } = await import('../_shared/cache-invalidation.ts');
      const invalidatedCount = await batchInvalidate(events);

      return createSuccessResponse({
        success: true,
        eventsProcessed: events.length,
        invalidated: invalidatedCount,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('Cache invalidation webhook error:', error);
    return createErrorResponseSync(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req
    );
  }
}

// Serve with middleware wrapper
// This webhook is called by database triggers (internal) or admin users (manual)
serve(
  withMiddleware(handleCacheInvalidation, {
    requireAuth: false, // Database triggers don't have auth
    rateLimit: true,
    securityMonitoring: true,
    cache: {
      skipCache: true, // Don't cache the invalidation endpoint itself
    },
  }, 'cache-invalidation-webhook')
);
