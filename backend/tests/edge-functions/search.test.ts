import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, createTestContract, createTestVendor, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

// Helper to create mock RPC response
const createMockRpcResponse = (data: unknown, error: Error | null = null) => {
  return {
    data,
    error,
    select: () => ({ data, error }),
    single: () => ({ data, error }),
    limit: () => ({ data, error }),
    eq: () => ({ data, error }),
    order: () => ({ data, error }),
  } as unknown as Request;
};

describe('Search Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  let regularUser: { id: string; email: string; authToken: string };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create test enterprise and users
    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
    regularUser = await createTestUser(testEnterprise.id, 'user');

    // Mock RPC functions
    vi.spyOn(supabase, 'rpc').mockImplementation((fn: string, _params: unknown) => {
      if (fn === 'search_entities') {
        // Mock search results
        const mockResults = [
          {
            entity_id: 'contract-1',
            entity_type: 'contract',
            title: 'Service Agreement Contract',
            relevance_score: 0.9,
            highlighted_text: '<mark>Service Agreement</mark> Contract',
          },
          {
            entity_id: 'vendor-1',
            entity_type: 'vendor',
            title: 'ABC Services Inc',
            relevance_score: 0.8,
            highlighted_text: 'ABC <mark>Services</mark> Inc',
          },
        ];
        return createMockRpcResponse(mockResults);
      }
      if (fn === 'advanced_search') {
        return createMockRpcResponse({
          results: [],
          total: 0,
        });
      }
      if (fn === 'generate_search_suggestions') {
        return createMockRpcResponse(['service agreement', 'service contract', 'service provider']);
      }
      return createMockRpcResponse(null);
    });

    // Create test data for searches
    await createTestContract(testEnterprise.id, {
      id: 'contract-1',
      title: 'Service Agreement Contract',
      created_by: adminUser.id,
    });

    await createTestVendor(testEnterprise.id, {
      id: 'vendor-1',
      name: 'ABC Services Inc',
      created_by: adminUser.id,
    });

    // Create search index entries
    await supabase
      .from('search_indexes')
      .insert([
        {
          entity_id: 'contract-1',
          entity_type: 'contract',
          enterprise_id: testEnterprise.id,
          title: 'Service Agreement Contract',
          content: 'This is a service agreement contract for IT services',
          search_vector: 'service agreement contract',
        },
        {
          entity_id: 'vendor-1',
          entity_type: 'vendor',
          enterprise_id: testEnterprise.id,
          title: 'ABC Services Inc',
          content: 'Technology service provider',
          search_vector: 'abc services technology provider',
        },
      ]);
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  describe('POST /search', () => {
    it('should perform global search', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'service',
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.results).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results[0].entity_type).toBeDefined();
      expect(result.results[0].entity_data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.query).toBe('service');
    });

    it('should support entity type filtering', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'service',
          entityTypes: ['contract'],
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.results).toBeDefined();
      expect(supabase.rpc).toHaveBeenCalledWith('search_entities',
        expect.objectContaining({
          p_entity_types: ['contract'],
        }),
      );
    });

    it('should support advanced filters', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'contract',
          filters: {
            status: 'active',
            category: 'software',
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z',
            },
            valueRange: {
              min: 10000,
              max: 100000,
            },
            tags: ['important', 'renewal'],
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(supabase.rpc).toHaveBeenCalledWith('search_entities',
        expect.objectContaining({
          p_filters: {
            status: 'active',
            category: 'software',
            dateRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-12-31T23:59:59Z',
            },
            valueRange: {
              min: 10000,
              max: 100000,
            },
            tags: ['important', 'renewal'],
          },
        }),
      );
    });

    it('should support pagination', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'service',
          page: 2,
          limit: 10,
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(supabase.rpc).toHaveBeenCalledWith('search_entities',
        expect.objectContaining({
          p_limit: 10,
          p_offset: 10, // (page 2 - 1) * limit 10
        }),
      );
    });

    it('should support sorting options', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'service',
          sortBy: 'date',
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should validate query length', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'A'.repeat(501), // Exceeds max length
        }),
      });

      expect(response.status).toBe(500);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'service',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /search/advanced', () => {
    it('should perform advanced search', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'service agreement',
          content: 'contract terms',
          tags: ['renewal', 'annual'],
          metadata: {
            vendor: 'ABC Corp',
          },
          weights: {
            title: 5,
            content: 3,
            tags: 2,
          },
          limit: 25,
          offset: 0,
        }),
      });

      expect(response.status).toBe(200);
      expect(supabase.rpc).toHaveBeenCalledWith('advanced_search',
        expect.objectContaining({
          p_search_config: {
            title: 'service agreement',
            content: 'contract terms',
            tags: ['renewal', 'annual'],
            metadata: { vendor: 'ABC Corp' },
            weights: { title: 5, content: 3, tags: 2 },
          },
          p_limit: 25,
          p_offset: 0,
        }),
      );
    });

    it('should work with partial search config', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'contract',
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should validate weight ranges', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'contract',
          weights: {
            title: 15, // Exceeds max of 10
          },
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /search/suggestions', () => {
    it('should return search suggestions', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/suggestions?q=serv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('service agreement');
      expect(result.suggestions).toContain('service contract');
    });

    it('should return empty suggestions for short queries', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/suggestions?q=s`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.suggestions).toEqual([]);
    });

    it('should handle missing query parameter', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/suggestions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('POST /search/save', () => {
    it('should save a search', async () => {
      const savedSearch = {
        name: 'Active Software Contracts',
        description: 'All active contracts for software vendors',
        query: 'software contract',
        filters: {
          status: 'active',
          category: 'software',
        },
        isPublic: false,
      };

      const response = await fetch(`${FUNCTION_URL}/search/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(savedSearch),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.name).toBe(savedSearch.name);
      expect(result.query_text).toBe(savedSearch.query);
      expect(result.filters).toEqual(savedSearch.filters);
      expect(result.is_public).toBe(false);
      expect(result.user_id).toBe(regularUser.id);
    });

    it('should save public searches', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Team Search',
          query: 'team contracts',
          isPublic: true,
        }),
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.is_public).toBe(true);
    });
  });

  describe('GET /search/saved', () => {
    beforeEach(async () => {
      // Create saved searches
      await supabase
        .from('saved_searches')
        .insert([
          {
            name: 'My Private Search',
            query_text: 'private contracts',
            user_id: regularUser.id,
            enterprise_id: testEnterprise.id,
            is_public: false,
          },
          {
            name: 'Public Team Search',
            query_text: 'team contracts',
            user_id: adminUser.id,
            enterprise_id: testEnterprise.id,
            is_public: true,
          },
          {
            name: 'Another User Private',
            query_text: 'other contracts',
            user_id: adminUser.id,
            enterprise_id: testEnterprise.id,
            is_public: false,
          },
        ]);
    });

    it('should return user own searches and public searches', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/saved`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const searches = await response.json();
      expect(searches).toHaveLength(2); // Own private + public team search
      expect(searches.some((s: { name: string }) => s.name === 'My Private Search')).toBe(true);
      expect(searches.some((s: { name: string }) => s.name === 'Public Team Search')).toBe(true);
      expect(searches.some((s: { name: string }) => s.name === 'Another User Private')).toBe(false);
    });

    it('should order by created date descending', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/saved`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const searches = await response.json();
      // Verify ordering (newest first)
      for (let i = 1; i < searches.length; i++) {
        expect(new Date(searches[i - 1].created_at) >= new Date(searches[i].created_at)).toBe(true);
      }
    });
  });

  describe('GET /search/analytics', () => {
    beforeEach(async () => {
      // Create search query logs
      const queries = [];
      const now = new Date();

      for (let i = 0; i < 20; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        queries.push({
          query_text: i % 3 === 0 ? 'contract' : i % 3 === 1 ? 'vendor' : 'budget',
          user_id: i % 2 === 0 ? regularUser.id : adminUser.id,
          enterprise_id: testEnterprise.id,
          execution_time_ms: 50 + Math.random() * 100,
          result_count: Math.floor(Math.random() * 20),
          created_at: date.toISOString(),
        });
      }

      await supabase.from('search_queries').insert(queries);
    });

    it('should return analytics for admins', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/analytics?range=30d`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const analytics = await response.json();
      expect(analytics.topQueries).toBeDefined();
      expect(analytics.searchVolume).toBeDefined();
      expect(analytics.avgExecutionTime).toBeGreaterThan(0);
      expect(analytics.totalSearches).toBe(20);
      expect(analytics.uniqueUsers).toBeGreaterThan(0);
    });

    it('should support different time ranges', async () => {
      const ranges = ['7d', '30d', '90d'];

      for (const range of ranges) {
        const response = await fetch(`${FUNCTION_URL}/search/analytics?range=${range}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminUser.authToken}`,
          },
        });

        expect(response.status).toBe(200);
        const analytics = await response.json();
        expect(analytics.searchVolume).toBeDefined();
      }
    });

    it('should deny access to non-admin users', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toContain('Insufficient permissions');
    });
  });

  describe('POST /search/rebuild-index', () => {
    beforeEach(async () => {
      // Create mock agent
      await supabase
        .from('agents')
        .insert({
          id: 'secretary-agent',
          name: 'Secretary Agent',
          type: 'secretary',
          is_active: true,
        });

      // Update mock to handle getAgentId
      vi.spyOn(supabase, 'rpc').mockImplementation((_fn: string, _params: unknown) => {
        return createMockRpcResponse(null);
      });
    });

    it('should queue index rebuild for admins', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/rebuild-index`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(202);
      const result = await response.json();
      expect(result.message).toContain('rebuild queued');

      // Verify task was created
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('task_type', 'rebuild_search_index')
        .eq('enterprise_id', testEnterprise.id);

      expect(tasks).toHaveLength(1);
      expect(tasks![0].priority).toBe(3);
    });

    it('should deny access to non-admin users', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/rebuild-index`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${FUNCTION_URL}/search/unknown`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle RPC errors gracefully', async () => {
      vi.spyOn(supabase, 'rpc').mockRejectedValue(new Error('Database error'));

      const response = await fetch(`${FUNCTION_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'test',
        }),
      });

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.error).toContain('Database error');
    });
  });
});