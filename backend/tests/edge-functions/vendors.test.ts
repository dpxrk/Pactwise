import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, cleanupTestData, getTestClient } from '../setup';

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

describe('Vendors Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  // let regularUser: { id: string; email: string; authToken: string };
  // let viewerUser: { id: string; email: string; authToken: string };

  const createTestVendor = async (overrides = {}) => {
    const { data } = await supabase
      .from('vendors')
      .insert({
        name: 'Test Vendor',
        category: 'software',
        status: 'active',
        enterprise_id: testEnterprise.id,
        created_by: adminUser.id,
        ...overrides,
      })
      .select()
      .single();
    return data!;
  };

  beforeEach(async () => {
    supabase = getTestClient();

    // Create test enterprise and users
    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
    // regularUser = await createTestUser(testEnterprise.id, 'user');
    // viewerUser = await createTestUser(testEnterprise.id, 'viewer');

    // Mock the find_duplicate_vendors function
    vi.spyOn(supabase, 'rpc').mockImplementation((fn: string, _params: unknown) => {
      if (fn === 'find_duplicate_vendors') {
        return createMockRpcResponse([]);
      }
      if (fn === 'update_vendor_performance_metrics') {
        return createMockRpcResponse(null);
      }
      return createMockRpcResponse(null);
    });
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  describe('GET /vendors', () => {
    beforeEach(async () => {
      // Create test vendors
      for (let i = 0; i < 15; i++) {
        await createTestVendor({
          name: `Vendor ${i}`,
          category: i % 3 === 0 ? 'software' : i % 3 === 1 ? 'hardware' : 'services',
          status: i % 2 === 0 ? 'active' : 'inactive',
          website: `https://vendor${i}.com`,
          contact_email: `contact@vendor${i}.com`,
        });
      }
    });

    it('should list vendors with default pagination', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(10); // Default limit
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors?page=2&limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });

    it('should filter by category', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors?category=software`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((v: { category: string }) => v.category === 'software')).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors?status=active`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((v: { status: string }) => v.status === 'active')).toBe(true);
    });

    it('should search by name', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors?search=Vendor%201`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.some((v: { name: string }) => v.name.includes('Vendor 1'))).toBe(true);
    });

    it('should support sorting', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors?sortBy=name&sortOrder=desc`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      const names = result.data.map((v: { name: string }) => v.name);
      const sortedNames = [...names].sort().reverse();
      expect(names).toEqual(sortedNames);
    });

    it('should include active contracts count', async () => {
      const vendor = await createTestVendor({ name: 'Vendor with Contracts' });

      // Create active contract
      await supabase
        .from('contracts')
        .insert({
          title: 'Active Contract',
          vendor_id: vendor.id,
          status: 'active',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
          owner_id: adminUser.id,
          file_name: 'test.pdf',
          file_type: 'pdf',
          storage_id: 'test-id',
        });

      const response = await fetch(`${FUNCTION_URL}/vendors?search=Vendor%20with%20Contracts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data[0].active_contracts).toBe(1);
    });

    it('should exclude soft deleted vendors', async () => {
      const deletedVendor = await createTestVendor({
        name: 'Deleted Vendor',
        deleted_at: new Date().toISOString(),
      });

      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((v: { id: string }) => v.id !== deletedVendor.id)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /vendors', () => {
    it('should create a new vendor', async () => {
      const vendorData = {
        name: 'New Test Vendor',
        category: 'software',
        status: 'active',
        website: 'https://newtestvendor.com',
        contactEmail: 'contact@newtestvendor.com',
        contactPhone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        country: 'Test Country',
        postalCode: '12345',
        taxId: 'TAX123456',
        description: 'A test vendor description',
        tags: ['test', 'software', 'new'],
      };

      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(vendorData.name);
      expect(data.category).toBe(vendorData.category);
      expect(data.enterprise_id).toBe(testEnterprise.id);
      expect(data.created_by).toBe(adminUser.id);
      expect(data.tags).toEqual(vendorData.tags);
    });

    it('should detect exact duplicate vendors', async () => {
      // Create existing vendor
      const existingVendor = await createTestVendor({ name: 'Existing Vendor' });

      // Mock duplicate detection
      vi.spyOn(supabase, 'rpc').mockImplementation((fn: string, _params: unknown) => {
        if (fn === 'find_duplicate_vendors') {
          return createMockRpcResponse([{
            id: existingVendor.id,
            name: 'Existing Vendor',
            match_type: 'exact',
            similarity: 1.0,
          }]);
        }
        return createMockRpcResponse(null);
      });

      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Existing Vendor',
          category: 'software',
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already exists');
      expect(data.duplicates).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required name field
          category: 'software',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should validate enum fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Invalid Category Vendor',
          category: 'invalid_category',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Invalid Email Vendor',
          category: 'software',
          contactEmail: 'invalid-email',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'No Auth Vendor',
          category: 'software',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /vendors/:id', () => {
    it('should get vendor with full details', async () => {
      const vendor = await createTestVendor({
        name: 'Detailed Vendor',
        website: 'https://detailed.com',
      });

      // Create contract for the vendor
      await supabase
        .from('contracts')
        .insert({
          title: 'Vendor Contract',
          vendor_id: vendor.id,
          status: 'active',
          value: 50000,
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
          owner_id: adminUser.id,
          file_name: 'contract.pdf',
          file_type: 'pdf',
          storage_id: 'test-id',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        });

      // Create compliance check
      await supabase
        .from('compliance_checks')
        .insert({
          vendor_id: vendor.id,
          check_type: 'financial',
          performed_by: adminUser.id,
          passed: true,
          notes: 'All financial documents verified',
        });

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(vendor.id);
      expect(data.name).toBe('Detailed Vendor');
      expect(data.created_by_user).toBeDefined();
      expect(data.contracts).toHaveLength(1);
      expect(data.compliance_checks).toHaveLength(1);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.total_contracts).toBe(1);
      expect(data.analytics.active_contracts).toBe(1);
      expect(data.analytics.total_value).toBe(50000);
      expect(data.analytics.compliance_issues).toBe(0);
    });

    it('should calculate analytics correctly', async () => {
      const vendor = await createTestVendor();

      // Create multiple contracts with different statuses and values
      await supabase
        .from('contracts')
        .insert([
          {
            title: 'Active Contract 1',
            vendor_id: vendor.id,
            status: 'active',
            value: 30000,
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            file_name: 'c1.pdf',
            file_type: 'pdf',
            storage_id: 'id1',
          },
          {
            title: 'Active Contract 2',
            vendor_id: vendor.id,
            status: 'active',
            value: 20000,
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            file_name: 'c2.pdf',
            file_type: 'pdf',
            storage_id: 'id2',
          },
          {
            title: 'Expired Contract',
            vendor_id: vendor.id,
            status: 'expired',
            value: 10000,
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            file_name: 'c3.pdf',
            file_type: 'pdf',
            storage_id: 'id3',
          },
        ]);

      // Create compliance checks with mixed results
      await supabase
        .from('compliance_checks')
        .insert([
          {
            vendor_id: vendor.id,
            check_type: 'financial',
            performed_by: adminUser.id,
            passed: true,
          },
          {
            vendor_id: vendor.id,
            check_type: 'security',
            performed_by: adminUser.id,
            passed: false,
            notes: 'Security certification expired',
          },
        ]);

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.analytics.total_contracts).toBe(3);
      expect(data.analytics.active_contracts).toBe(2);
      expect(data.analytics.total_value).toBe(60000);
      expect(data.analytics.avg_contract_value).toBe(20000);
      expect(data.analytics.compliance_issues).toBe(1);
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Vendor not found');
    });

    it('should not allow access to vendors from other enterprises', async () => {
      const otherEnterprise = await createTestEnterprise();
      const { data: otherVendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Other Enterprise Vendor',
          category: 'software',
          enterprise_id: otherEnterprise.id,
          created_by: adminUser.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/vendors/${otherVendor!.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /vendors/:id', () => {
    it('should update vendor details', async () => {
      const vendor = await createTestVendor({
        name: 'Original Name',
        status: 'active',
      });

      const updates = {
        name: 'Updated Name',
        status: 'inactive',
        website: 'https://updated.com',
        description: 'Updated description',
        tags: ['updated', 'test'],
      };

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(updates.name);
      expect(data.status).toBe(updates.status);
      expect(data.website).toBe(updates.website);
      expect(data.description).toBe(updates.description);
      expect(data.tags).toEqual(updates.tags);
    });

    it('should only update allowed fields', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          enterprise_id: 'should-not-update', // Should be ignored
          created_by: 'should-not-update', // Should be ignored
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Updated Name');
      expect(data.enterprise_id).toBe(testEnterprise.id);
      expect(data.created_by).toBe(adminUser.id);
    });

    it('should update performance metrics', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'active',
        }),
      });

      expect(response.status).toBe(200);

      // Verify performance metrics update was called
      expect(supabase.rpc).toHaveBeenCalledWith('update_vendor_performance_metrics', {
        p_vendor_id: vendor.id,
      });
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors/00000000-0000-0000-0000-000000000000`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Update Non-existent',
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'No Auth Update',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /vendors/:id/merge', () => {
    it('should merge vendors successfully', async () => {
      const sourceVendor = await createTestVendor({ name: 'Source Vendor' });
      const targetVendor = await createTestVendor({ name: 'Target Vendor' });

      // Create contracts for source vendor
      await supabase
        .from('contracts')
        .insert({
          title: 'Source Contract',
          vendor_id: sourceVendor.id,
          status: 'active',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
          owner_id: adminUser.id,
          file_name: 'source.pdf',
          file_type: 'pdf',
          storage_id: 'source-id',
        });

      const response = await fetch(`${FUNCTION_URL}/vendors/${(sourceVendor as { id: string }).id}/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVendorId: (targetVendor as { id: string }).id,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('merged successfully');

      // Verify source vendor is soft deleted
      const { data: sourceData } = await supabase
        .from('vendors')
        .select('deleted_at, metadata')
        .eq('id', (sourceVendor as { id: string }).id)
        .single();

      expect(sourceData!.deleted_at).toBeDefined();
      expect((sourceData!.metadata as { merged_into?: string }).merged_into).toBe((targetVendor as { id: string }).id);

      // Verify contracts were transferred
      const { data: contracts } = await supabase
        .from('contracts')
        .select('vendor_id')
        .eq('vendor_id', (targetVendor as { id: string }).id);

      expect(contracts).toHaveLength(1);
    });

    it('should require target vendor ID', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Target vendor ID required');
    });

    it('should validate both vendors exist in same enterprise', async () => {
      const sourceVendor = await createTestVendor();
      const otherEnterprise = await createTestEnterprise();
      const { data: otherVendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Other Enterprise Vendor',
          category: 'software',
          enterprise_id: otherEnterprise.id,
          created_by: adminUser.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/vendors/${(sourceVendor as { id: string }).id}/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVendorId: otherVendor!.id,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Invalid vendor IDs');
    });

    it('should not merge non-existent vendors', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVendorId: '00000000-0000-0000-0000-000000000000',
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetVendorId: vendor.id,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const vendor = await createTestVendor();

      const response = await fetch(`${FUNCTION_URL}/vendors/${vendor.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      vi.spyOn(supabase.from('vendors'), 'select').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await fetch(`${FUNCTION_URL}/vendors`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Database connection failed');
    });
  });
});