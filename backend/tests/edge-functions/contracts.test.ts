import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, createTestContract, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Contracts Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  let regularUser: { id: string; email: string; authToken: string };
  let viewerUser: { id: string; email: string; authToken: string };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create test enterprise and users
    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
    regularUser = await createTestUser(testEnterprise.id, 'user');
    viewerUser = await createTestUser(testEnterprise.id, 'viewer');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /contracts', () => {
    it('should create a new contract', async () => {
      const contractData = {
        title: 'Test Service Agreement',
        fileName: 'service-agreement.pdf',
        fileType: 'pdf',
        storageId: 'test-storage-id',
        value: 50000,
        category: 'professional_services',
        vendors: [],
        assignedUsers: [regularUser.id],
        tags: ['test', 'service'],
        description: 'Test contract description',
      };

      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.title).toBe(contractData.title);
      expect(data.status).toBe('draft');
      expect(data.enterprise_id).toBe(testEnterprise.id);
      expect(data.created_by).toBe(adminUser.id);
      expect(data.owner_id).toBe(adminUser.id);
      expect(data.value).toBe(contractData.value);
      expect(data.category).toBe(contractData.category);
      expect(data.tags).toEqual(contractData.tags);

      // Verify assignments were created
      const { data: assignments } = await supabase
        .from('contract_assignments')
        .select('*')
        .eq('contract_id', data.id);

      expect(assignments).toHaveLength(1);
      expect(assignments![0].user_id).toBe(regularUser.id);
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          fileName: 'test.pdf',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should validate enum fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Contract',
          fileName: 'test.pdf',
          fileType: 'pdf',
          storageId: 'test-id',
          category: 'invalid_category', // Invalid enum value
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should handle dates properly', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Contract with Dates',
          fileName: 'dated-contract.pdf',
          fileType: 'pdf',
          storageId: 'test-id',
          startDate,
          endDate,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.start_date).toBe(startDate);
      expect(data.end_date).toBe(endDate);
    });

    it('should allow viewers to read but not create', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${viewerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Viewer Attempt',
          fileName: 'test.pdf',
          fileType: 'pdf',
          storageId: 'test-id',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'No Auth Contract',
          fileName: 'test.pdf',
          fileType: 'pdf',
          storageId: 'test-id',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /contracts', () => {
    beforeEach(async () => {
      // Create test contracts
      for (let i = 0; i < 15; i++) {
        await createTestContract(testEnterprise.id, {
          title: `Contract ${i}`,
          status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'expired' : 'draft',
          category: i % 2 === 0 ? 'professional_services' : 'software',
          value: (i + 1) * 10000,
          created_by: adminUser.id,
        });
      }
    });

    it('should list contracts with default pagination', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts).toBeDefined();
      expect(data.contracts.length).toBeLessThanOrEqual(10); // Default limit
      expect(data.totalCount).toBe(15);
      expect(data.hasMore).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?limit=5&offset=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts).toHaveLength(5);
      expect(data.contracts[0].title).toContain('Contract'); // Should skip first 5
    });

    it('should support status filtering', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?status=active`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts.every((c: { status: string }) => c.status === 'active')).toBe(true);
      expect(data.totalCount).toBe(5); // 15 contracts, every 3rd is active
    });

    it('should support category filtering', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?category=software`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts.every((c: { category: string }) => c.category === 'software')).toBe(true);
    });

    it('should support search by title', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?search=Contract%201`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts.some((c: { title: string }) => c.title.includes('Contract 1'))).toBe(true);
    });

    it('should support value range filtering', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?minValue=50000&maxValue=100000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts.every((c: { value: number }) => c.value >= 50000 && c.value <= 100000)).toBe(true);
    });

    it('should support date range filtering', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await fetch(`${FUNCTION_URL}/contracts?startDate=${yesterday.toISOString().split('T')[0]}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts).toBeDefined();
      // All test contracts should be created today
      expect(data.totalCount).toBe(15);
    });

    it('should include related data', async () => {
      // Create contract with vendor
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Test Vendor',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
        })
        .select()
        .single();

      const contract = await createTestContract(testEnterprise.id, {
        title: 'Contract with Vendor',
        created_by: adminUser.id,
      });

      await supabase
        .from('contract_vendors')
        .insert({
          contract_id: contract.id,
          vendor_id: vendor!.id,
        });

      const response = await fetch(`${FUNCTION_URL}/contracts?search=Contract%20with%20Vendor`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts[0].vendors).toBeDefined();
      expect(data.contracts[0].vendors).toHaveLength(1);
      expect(data.contracts[0].vendors[0].name).toBe('Test Vendor');
    });

    it('should allow viewers to list contracts', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${viewerUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contracts).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should validate pagination parameters', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts?limit=1000`, { // Exceeds max
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });
  });

  describe('GET /contracts/:id', () => {
    it('should get contract by id', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        title: 'Detailed Contract',
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(contract.id);
      expect(data.title).toBe('Detailed Contract');
      expect(data.created_by_user).toBeDefined();
      expect(data.owner).toBeDefined();
    });

    it('should include all related data', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      // Add assignment
      await supabase
        .from('contract_assignments')
        .insert({
          contract_id: contract.id,
          user_id: regularUser.id,
          assigned_by: adminUser.id,
          assignment_type: 'reviewer',
        });

      // Add status history
      await supabase
        .from('contract_status_history')
        .insert({
          contract_id: contract.id,
          previous_status: 'draft',
          new_status: 'active',
          changed_by: adminUser.id,
        });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assignments).toHaveLength(1);
      expect(data.assignments[0].user).toBeDefined();
      expect(data.status_history).toHaveLength(1);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should not allow access to contracts from other enterprises', async () => {
      const otherEnterprise = await createTestEnterprise();
      const otherContract = await createTestContract(otherEnterprise.id, {
        created_by: adminUser.id, // This would fail in real scenario due to RLS
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${otherContract.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404); // Contract not found due to RLS
    });

    it('should require authentication', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /contracts/:id', () => {
    it('should update contract', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        title: 'Original Title',
        created_by: adminUser.id,
      });

      const updates = {
        title: 'Updated Title',
        value: 75000,
        description: 'Updated description',
        tags: ['updated', 'test'],
        category: 'software',
      };

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe(updates.title);
      expect(data.value).toBe(updates.value);
      expect(data.description).toBe(updates.description);
      expect(data.tags).toEqual(updates.tags);
      expect(data.category).toBe(updates.category);
    });

    it('should handle status updates with history', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        status: 'draft',
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
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
      const data = await response.json();
      expect(data.status).toBe('active');

      // Verify status history was created
      const { data: history } = await supabase
        .from('contract_status_history')
        .select('*')
        .eq('contract_id', contract.id);

      expect(history).toHaveLength(1);
      expect(history![0].previous_status).toBe('draft');
      expect(history![0].new_status).toBe('active');
    });

    it('should update vendor associations', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      // Create vendors
      const { data: vendor1 } = await supabase
        .from('vendors')
        .insert({
          name: 'Vendor 1',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
        })
        .select()
        .single();

      const { data: vendor2 } = await supabase
        .from('vendors')
        .insert({
          name: 'Vendor 2',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendors: [vendor1!.id, vendor2!.id],
        }),
      });

      expect(response.status).toBe(200);

      // Verify associations
      const { data: associations } = await supabase
        .from('contract_vendors')
        .select('vendor_id')
        .eq('contract_id', contract.id);

      expect(associations).toHaveLength(2);
      expect(associations!.map(a => a.vendor_id)).toContain(vendor1!.id);
      expect(associations!.map(a => a.vendor_id)).toContain(vendor2!.id);
    });

    it('should update user assignments', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedUsers: [regularUser.id, viewerUser.id],
        }),
      });

      expect(response.status).toBe(200);

      // Verify assignments
      const { data: assignments } = await supabase
        .from('contract_assignments')
        .select('user_id')
        .eq('contract_id', contract.id);

      expect(assignments).toHaveLength(2);
      expect(assignments!.map(a => a.user_id)).toContain(regularUser.id);
      expect(assignments!.map(a => a.user_id)).toContain(viewerUser.id);
    });

    it('should validate update data', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'invalid_status', // Invalid enum value
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should prevent viewers from updating', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${viewerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Viewer Update Attempt',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts/00000000-0000-0000-0000-000000000000`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Update Non-existent',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /contracts/:id', () => {
    it('should soft delete contract', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Verify soft delete
      const { data } = await supabase
        .from('contracts')
        .select('is_deleted, deleted_at')
        .eq('id', contract.id)
        .single();

      expect(data!.is_deleted).toBe(true);
      expect(data!.deleted_at).toBeDefined();
    });

    it('should only allow admin/owner to delete', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /contracts/:id/analyze', () => {
    it('should queue contract for AI analysis', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      // Mock secretary agent
      await supabase
        .from('agents')
        .insert({
          name: 'Secretary Agent',
          type: 'secretary',
          is_active: true,
        });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data.message).toContain('queued');
      expect(data.taskId).toBeDefined();

      // Verify task was created
      const { data: task } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('id', data.taskId)
        .single();

      expect(task).toBeDefined();
      expect(task!.task_type).toBe('analyze_contract');
      expect(task!.contract_id).toBe(contract.id);
      expect(task!.status).toBe('pending');
    });

    it('should not requeue if analysis is in progress', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        status: 'pending_analysis',
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already');
    });

    it('should require user permission to analyze', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${viewerUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /contracts/:id/approve', () => {
    it('should approve contract with proper permissions', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        status: 'pending_approval',
        created_by: regularUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: 'Approved for execution',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('active');

      // Verify approval record
      const { data: approval } = await supabase
        .from('contract_approvals')
        .select('*')
        .eq('contract_id', contract.id)
        .single();

      expect(approval).toBeDefined();
      expect(approval!.approver_id).toBe(adminUser.id);
      expect(approval!.status).toBe('approved');
      expect(approval!.comments).toBe('Approved for execution');
    });

    it('should reject contract with reason', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        status: 'pending_approval',
        created_by: regularUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Terms need revision',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('draft');

      // Verify rejection record
      const { data: approval } = await supabase
        .from('contract_approvals')
        .select('*')
        .eq('contract_id', contract.id)
        .single();

      expect(approval!.status).toBe('rejected');
      expect(approval!.comments).toBe('Terms need revision');
    });

    it('should enforce approval hierarchy', async () => {
      const contract = await createTestContract(testEnterprise.id, {
        status: 'pending_approval',
        created_by: regularUser.id,
        value: 100000, // High value contract
      });

      // Regular user cannot approve high value contracts
      const response = await fetch(`${FUNCTION_URL}/contracts/${contract.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: 'Approved',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient');
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts/unknown/route`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/contracts`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });
});