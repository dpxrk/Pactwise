/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

/**
 * Public Metrics Edge Function
 *
 * Returns aggregated platform metrics for the landing page.
 * NO AUTHENTICATION REQUIRED - designed for public access.
 *
 * Rate limited and cached to prevent abuse.
 */

// Simple in-memory cache
let cachedMetrics: { data: Record<string, unknown>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Rate limiting map (IP -> timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Filter out old timestamps
  const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  // Add current timestamp
  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);

  return false;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getCorsHeaders(req);

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const now = Date.now();
    if (cachedMetrics && (now - cachedMetrics.timestamp) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({
          success: true,
          data: cachedMetrics.data,
          cached: true,
        }),
        {
          status: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
          }
        }
      );
    }

    // Fetch fresh metrics from database
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc('get_platform_metrics');

    if (error) {
      console.error('Error fetching platform metrics:', error);

      // Return cached data if available, even if stale
      if (cachedMetrics) {
        return new Response(
          JSON.stringify({
            success: true,
            data: cachedMetrics.data,
            cached: true,
            stale: true,
          }),
          { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // Return fallback static data
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            contracts: 0,
            active_contracts: 0,
            vendors: 0,
            compliance_avg: 0,
            agents: 6,
            processing_time_ms: 150,
            updated_at: new Date().toISOString(),
          },
          cached: false,
          fallback: true,
        }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Update cache
    cachedMetrics = {
      data: data as Record<string, unknown>,
      timestamp: now,
    };

    return new Response(
      JSON.stringify({
        success: true,
        data,
        cached: false,
      }),
      {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error in public-metrics:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        success: false,
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
});
