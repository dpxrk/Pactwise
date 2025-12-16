/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';

/**
 * Public Metrics Edge Function
 *
 * Returns aggregated platform metrics for the landing page.
 * NO AUTHENTICATION REQUIRED - designed for public access.
 *
 * Uses HTTP caching with:
 * - CDN-friendly Cache-Control headers (public, max-age=60, stale-while-revalidate=300)
 * - ETag support for conditional requests
 * - Redis response caching for reduced database load
 *
 * Endpoints:
 * - GET /public-metrics - Platform metrics (contracts, vendors, etc.)
 * - GET /public-metrics?include=agents - Include agent statistics
 */

/**
 * Handler for public metrics endpoint
 */
async function handlePublicMetrics(context: RequestContext): Promise<Response> {
  const { req } = context;
  const url = new URL(req.url);

  // Only allow GET requests
  if (req.method !== 'GET') {
    return createErrorResponseSync('Method not allowed', 405, req);
  }

  try {
    // Parse query parameters
    const includeAgents = url.searchParams.get('include') === 'agents';

    // Fetch fresh metrics from database
    const adminClient = createAdminClient();

    // Fetch platform metrics
    const { data: platformData, error: platformError } = await adminClient.rpc('get_platform_metrics');

    if (platformError) {
      console.error('Error fetching platform metrics:', platformError);

      // Return fallback static data on error
      return createSuccessResponse({
        contracts: 0,
        active_contracts: 0,
        vendors: 0,
        compliance_avg: 0,
        agents: 6,
        processing_time_ms: 150,
        updated_at: new Date().toISOString(),
        fallback: true,
      }, undefined, 200, req);
    }

    // If agents are requested, fetch agent statistics
    let agentData: Record<string, unknown> | null = null;
    if (includeAgents) {
      const { data: agentStats, error: agentError } = await adminClient.rpc('get_public_agent_statistics');

      if (agentError) {
        console.error('Error fetching agent statistics:', agentError);
        // Don't fail the whole request, just skip agent data
      } else {
        agentData = agentStats as Record<string, unknown>;
      }
    }

    // Build response
    const responseData = includeAgents && agentData
      ? { ...platformData, agent_statistics: agentData }
      : platformData;

    return createSuccessResponse(responseData, undefined, 200, req);

  } catch (error) {
    console.error('Unexpected error in public-metrics:', error);
    return createErrorResponseSync('Internal server error', 500, req);
  }
}

// Serve with middleware wrapper
// Public endpoint - no auth required, but rate limiting and caching enabled
serve(
  withMiddleware(handlePublicMetrics, {
    requireAuth: false,
    rateLimit: true,
    securityMonitoring: true,
    cache: {
      policy: 'public-metrics',
      enableResponseCache: true,
    },
  }, 'public-metrics')
);
