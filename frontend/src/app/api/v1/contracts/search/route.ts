import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withRateLimit, rateLimitPresets, userKeyGenerator } from '@/middleware/redis-rate-limit';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';
import { performanceMonitor } from '@/lib/performance-monitoring';

async function handleSearch(req: NextRequest) {
  const measure = performanceMonitor.measureAPICall('/api/contracts/search', 'GET');

  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      measure.end(401);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse search parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      measure.end(400);
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = cacheKeys.searchResults(query, {
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
      measure.end(200);
      return NextResponse.json({
        results: cached,
        cached: true,
      });
    }

    // Perform search (this would typically call your Convex action)
    const searchMeasure = performanceMonitor.measureOperation(
      'contract.search',
      async () => {
        // Simulate search operation
        // In real implementation, this would call your Convex search function
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          contracts: [
            {
              id: 'contract-1',
              title: 'Sample Contract',
              vendor: 'Sample Vendor',
              value: 10000,
              status: 'active',
              relevanceScore: 0.95,
            },
          ],
          totalCount: 1,
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

    measure.end(200);
    return NextResponse.json({
      results,
      cached: false,
    });
  } catch (error) {
    console.error('Search error:', error);
    measure.end(500, error as Error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the route handler with rate limiting
export const GET = withRateLimit(handleSearch, {
  ...rateLimitPresets.search,
  keyGenerator: userKeyGenerator,
});