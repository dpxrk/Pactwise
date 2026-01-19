import { NextRequest, NextResponse } from 'next/server';

import { performanceMonitor } from '@/lib/performance-monitoring';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';
import { withRateLimit, rateLimitPresets, userKeyGenerator } from '@/middleware/redis-rate-limit';
import { createClient } from '@/utils/supabase/server';

// Valid contract statuses from database enum
const VALID_CONTRACT_STATUSES = [
  'draft',
  'pending_analysis',
  'pending_review',
  'active',
  'expired',
  'terminated',
  'archived',
  'pending_signature',
  'pending_approval',
  'renewed',
] as const;

type ContractStatus = (typeof VALID_CONTRACT_STATUSES)[number];

async function handleSearch(req: NextRequest) {
  return performanceMonitor.measureOperation(
    '/api/contracts/search',
    async () => {
      try {
        // Authenticate with Supabase
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }

        // SECURITY CRITICAL: Get user's enterprise_id for tenant isolation
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('enterprise_id')
          .eq('auth_id', user.id)
          .is('deleted_at', null)
          .single();

        if (userError || !userProfile?.enterprise_id) {
          return NextResponse.json(
            { error: 'User profile not found' },
            { status: 403 }
          );
        }

        const enterpriseId = userProfile.enterprise_id;

        // Parse search parameters
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const status = searchParams.get('status');
        const vendorId = searchParams.get('vendorId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        // Parse page with bounds checking (default 1, minimum 1)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
        // Enforce pagination limit (max 100 per CLAUDE.md security rules)
        const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 100);

        if (!query || query.length < 2) {
          return NextResponse.json(
            { error: 'Query must be at least 2 characters' },
            { status: 400 }
          );
        }

        // Generate cache key including enterprise_id for tenant isolation
        const cacheKey = cacheKeys.searchResults(query, {
          enterpriseId,
          status,
          vendorId,
          startDate,
          endDate,
          page,
          limit,
        });

        // Check cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
          return NextResponse.json({
            results: cached,
            cached: true,
          });
        }

        const searchMeasure = performanceMonitor.measureOperation(
          'contract.search',
          async () => {
            // Calculate pagination offset
            const offset = (page - 1) * limit;
            // Escape LIKE wildcard characters to prevent pattern injection
            const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
            const searchTerm = `%${escapedQuery.toLowerCase()}%`;

            // Build the query with SECURITY CRITICAL filters
            let contractQuery = supabase
              .from('contracts')
              .select(`
                id,
                title,
                value,
                status,
                start_date,
                end_date,
                vendor_id,
                vendors (
                  id,
                  name
                )
              `, { count: 'exact' })
              .eq('enterprise_id', enterpriseId)  // SECURITY CRITICAL: tenant isolation
              .is('deleted_at', null)              // Required for soft deletes
              .ilike('title', searchTerm);

            // Apply optional filters
            if (status && VALID_CONTRACT_STATUSES.includes(status as ContractStatus)) {
              contractQuery = contractQuery.eq('status', status as ContractStatus);
            }

            // UUID validation helper
            const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            // Date validation helper
            const isValidDate = (str: string) => !isNaN(Date.parse(str));

            if (vendorId && isValidUUID(vendorId)) {
              contractQuery = contractQuery.eq('vendor_id', vendorId);
            }

            if (startDate && isValidDate(startDate)) {
              contractQuery = contractQuery.gte('start_date', startDate);
            }

            if (endDate && isValidDate(endDate)) {
              contractQuery = contractQuery.lte('end_date', endDate);
            }

            // Apply pagination
            contractQuery = contractQuery
              .order('updated_at', { ascending: false })
              .range(offset, offset + limit - 1);

            const { data: contracts, count, error } = await contractQuery;

            if (error) {
              throw error;
            }

            // Transform results to match expected format
            const transformedContracts = (contracts || []).map((contract) => ({
              id: contract.id,
              title: contract.title,
              vendor: (contract.vendors as { name: string } | null)?.name || null,
              vendorId: contract.vendor_id,
              value: contract.value,
              status: contract.status,
              startDate: contract.start_date,
              endDate: contract.end_date,
              relevanceScore: 1.0, // Text search doesn't provide relevance scores
            }));

            return {
              contracts: transformedContracts,
              totalCount: count || 0,
              page,
              pageSize: limit,
            };
          },
          {
            op: 'search',
            data: { query, filters: { status, vendorId, startDate, endDate } },
          }
        );

        const results = await searchMeasure;

        // Cache the results
        await cache.set(cacheKey, results, cacheTTL.searchResults);

        return NextResponse.json({
          results,
          cached: false,
        });
      } catch (error) {
        // Never expose internal database errors to clients
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
    },
    { op: 'GET' }
  );
}

// Export the route handler with rate limiting
export const GET = withRateLimit(handleSearch, {
  ...rateLimitPresets.search,
  keyGenerator: userKeyGenerator,
});