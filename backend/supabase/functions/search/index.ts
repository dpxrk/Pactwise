/// <reference path="../../types/global.d.ts" />
// Serve function is available globally in Deno runtime
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { z } from 'zod';
import { sanitizeInput, secureSearchSchema, secureErrorHandler } from '../_shared/validation.ts';
import { rateLimitMiddleware } from '../_shared/rate-limiting.ts';
import { getRateLimitRules, shouldBypassRateLimit } from '../_shared/rate-limit-config.ts';

const searchSchema = z.object({
  query: secureSearchSchema,
  entityTypes: z.array(z.enum(['contract', 'vendor', 'document', 'user'])).optional(),
  filters: z.object({
    status: z.string().optional(),
    category: z.string().optional(),
    dateRange: z.object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    }).optional(),
    valueRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['relevance', 'date', 'title', 'value']).optional().default('relevance'),
});

const advancedSearchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  weights: z.object({
    title: z.number().min(0).max(10).optional(),
    content: z.number().min(0).max(10).optional(),
    tags: z.number().min(0).max(10).optional(),
  }).optional(),
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  // Check if request should bypass rate limiting
  if (!shouldBypassRateLimit(req)) {
    // Apply rate limiting
    const authHeader = req.headers.get('Authorization');
    const isAuthenticated = Boolean(authHeader);

    // Determine user tier (simplified - in real implementation, get from user profile)
    let userTier: 'free' | 'professional' | 'enterprise' = 'free';
    if (isAuthenticated) {
      try {
        await getUserFromAuth(authHeader!); // Validate auth but don't need user object
        // In a real implementation, you'd get the tier from user.profile.subscription_tier
        userTier = 'free'; // Default for now
      } catch {
        // Continue with anonymous rate limiting
      }
    }

    const rateLimitRules = getRateLimitRules({
      isAuthenticated,
      userTier,
      endpoint: '/search',
    });

    const rateLimitResponse = await rateLimitMiddleware(req, rateLimitRules);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's enterprise context
    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Global search
    if (method === 'POST' && pathname === '/search') {
      const body = await req.json();
      const params = searchSchema.parse(body);

      const offset = (params.page - 1) * params.limit;

      // Perform search
      const { data: results, error } = await supabase.rpc('search_entities', {
        p_query: params.query,
        p_enterprise_id: userData.enterprise_id,
        p_entity_types: params.entityTypes,
        p_filters: params.filters || {},
        p_limit: params.limit,
        p_offset: offset,
      });

      if (error) {throw error;}

      // Enhance results with additional data
      const enhancedResults = await Promise.all(
        results.map(async (result: any) => {
          let entityData = {};

          switch (result.entity_type) {
            case 'contract':
              const { data: contract } = await supabase
                .from('contracts')
                .select('*, vendor:vendors(name)')
                .eq('id', result.entity_id)
                .single();
              entityData = contract;
              break;

            case 'vendor':
              const { data: vendor } = await supabase
                .from('vendors')
                .select('*')
                .eq('id', result.entity_id)
                .single();
              entityData = vendor;
              break;

            case 'document':
              const { data: document } = await supabase
                .from('collaborative_documents')
                .select('*')
                .eq('id', result.entity_id)
                .single();
              entityData = document;
              break;
          }

          return {
            ...result,
            entity_data: entityData,
          };
        }),
      );

      // Get total count for pagination
      const { count } = await supabase
        .from('search_indexes')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', userData.enterprise_id)
        .textSearch('search_vector', params.query);

      return new Response(
        JSON.stringify({
          results: enhancedResults,
          pagination: {
            page: params.page,
            limit: params.limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / params.limit),
          },
          query: params.query,
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Advanced search
    if (method === 'POST' && pathname === '/search/advanced') {
      const body = await req.json();
      const searchConfig = advancedSearchSchema.parse(body);

      const { data: results, error } = await supabase.rpc('advanced_search', {
        p_search_config: searchConfig,
        p_enterprise_id: userData.enterprise_id,
        p_limit: body.limit || 50,
        p_offset: body.offset || 0,
      });

      if (error) {throw error;}

      return new Response(JSON.stringify(results), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Search suggestions
    if (method === 'GET' && pathname === '/search/suggestions') {
      const rawQuery = url.searchParams.get('q');
      const query = sanitizeInput.urlParam(rawQuery);

      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Additional sanitization for search query
      const sanitizedQuery = sanitizeInput.searchQuery(query);

      const { data: suggestions, error } = await supabase.rpc('generate_search_suggestions', {
        p_partial_query: sanitizedQuery,
        p_enterprise_id: userData.enterprise_id,
        p_limit: 10,
      });

      if (error) {throw error;}

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Save search
    if (method === 'POST' && pathname === '/search/save') {
      const rawBody = await req.json();
      const sanitizedBody = sanitizeInput.jsonObject(rawBody);
      const { name, description, query, filters, isPublic } = sanitizedBody;

      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          name,
          description,
          query_text: query,
          filters: filters || {},
          is_public: isPublic || false,
          user_id: userData.id,
          enterprise_id: userData.enterprise_id,
        })
        .select()
        .single();

      if (error) {throw error;}

      return new Response(JSON.stringify(data), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // Get saved searches
    if (method === 'GET' && pathname === '/search/saved') {
      const { data: searches, error } = await supabase
        .from('saved_searches')
        .select('*')
        .or(`user_id.eq.${userData.id},and(is_public.eq.true,enterprise_id.eq.${userData.enterprise_id})`)
        .order('created_at', { ascending: false });

      if (error) {throw error;}

      return new Response(JSON.stringify(searches), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Search analytics
    if (method === 'GET' && pathname === '/search/analytics') {
      // Only admins can view search analytics
      if (!['admin', 'owner'].includes(userData.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      const rawTimeRange = url.searchParams.get('range');
      const timeRange = sanitizeInput.urlParam(rawTimeRange) || '30d';

      // Validate timeRange against allowed values
      if (!['7d', '30d', '90d'].includes(timeRange)) {
        return new Response(JSON.stringify({ error: 'Invalid time range' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const startDate = new Date();

      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Get search analytics
      const [topQueries, searchVolume, avgExecutionTime] = await Promise.all([
        // Top queries
        supabase
          .from('search_queries')
          .select('query_text, count:query_text.count()')
          .eq('enterprise_id', userData.enterprise_id)
          .gte('created_at', startDate.toISOString())
          .order('count', { ascending: false })
          .limit(10),

        // Search volume over time
        supabase
          .from('search_queries')
          .select('created_at')
          .eq('enterprise_id', userData.enterprise_id)
          .gte('created_at', startDate.toISOString()),

        // Average execution time
        supabase
          .from('search_queries')
          .select('execution_time_ms')
          .eq('enterprise_id', userData.enterprise_id)
          .gte('created_at', startDate.toISOString()),
      ]);

      // Process analytics data
      const analytics = {
        topQueries: topQueries.data || [],
        searchVolume: processVolumeData(searchVolume.data || [], timeRange),
        avgExecutionTime: calculateAverage(avgExecutionTime.data?.map(d => d.execution_time_ms) || []),
        totalSearches: searchVolume.data?.length || 0,
        uniqueUsers: await getUniqueSearchUsers(supabase, userData.enterprise_id, startDate),
      };

      return new Response(JSON.stringify(analytics), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Rebuild search index (admin only)
    if (method === 'POST' && pathname === '/search/rebuild-index') {
      if (!['admin', 'owner'].includes(userData.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // Queue rebuild task
      const { error } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: await getAgentId(supabase, 'secretary'),
          task_type: 'rebuild_search_index',
          priority: 3,
          payload: { enterprise_id: userData.enterprise_id },
          enterprise_id: userData.enterprise_id,
        });

      if (error) {throw error;}

      return new Response(
        JSON.stringify({ message: 'Search index rebuild queued' }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 202,
        },
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 404,
    });

  } catch (error) {
    // SECURITY FIX: Use secure error handling to prevent information leakage
    const statusCode = secureErrorHandler.isClientError(error) ? 400 : 500;
    const userMessage = error instanceof Error && error.message?.includes('Database operation failed')
      ? secureErrorHandler.sanitizeDatabaseError(error)
      : undefined;

    const response = secureErrorHandler.createErrorResponse(error, req, statusCode, userMessage);

    // Add CORS headers to the secure response
    const corsHeaders = getCorsHeaders(req);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
});

// Helper functions

function processVolumeData(data: any[], range: string) {
  const buckets = new Map<string, number>();

  data.forEach(item => {
    const date = new Date(item.created_at);
    let key: string;

    switch (range) {
      case '7d':
      case '30d':
        key = date.toISOString().split('T')[0]; // Daily
        break;
      case '90d':
        key = `${date.getFullYear()}-W${getWeekNumber(date)}`; // Weekly
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    buckets.set(key, (buckets.get(key) || 0) + 1);
  });

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) {return 0;}
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

async function getUniqueSearchUsers(supabase: any, enterpriseId: string, startDate: Date): Promise<number> {
  const { count } = await supabase
    .from('search_queries')
    .select('user_id', { count: 'exact', head: true })
    .eq('enterprise_id', enterpriseId)
    .gte('created_at', startDate.toISOString())
    .not('user_id', 'is', null);

  return count || 0;
}

async function getAgentId(supabase: any, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id;
}