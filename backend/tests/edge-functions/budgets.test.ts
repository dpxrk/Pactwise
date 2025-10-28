import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, createTestContract, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Budgets Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  let managerUser: { id: string; email: string; authToken: string };
  let regularUser: { id: string; email: string; authToken: string };
  // let viewerUser: { id: string; email: string; authToken: string };

  const createTestBudget = async (overrides = {}) => {
    const { data } = await supabase
      .from('budgets')
      .insert({
        name: 'Test Budget',
        budget_type: 'annual',
        total_budget: 100000,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        enterprise_id: testEnterprise.id,
        created_by: adminUser.id,
        owner_id: adminUser.id,
        ...overrides,
      })
      .select()
      .single();
    return data!;
  };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create test enterprise and users
    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
    managerUser = await createTestUser(testEnterprise.id, 'manager');
    regularUser = await createTestUser(testEnterprise.id, 'user');
    // viewerUser = await createTestUser(testEnterprise.id, 'viewer');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /budgets', () => {
    beforeEach(async () => {
      // Create test budgets
      for (let i = 0; i < 15; i++) {
        await createTestBudget({
          name: `Budget ${i}`,
          budget_type: i % 2 === 0 ? 'annual' : 'quarterly',
          total_budget: (i + 1) * 10000,
          department: i % 3 === 0 ? 'Engineering' : i % 3 === 1 ? 'Marketing' : 'Sales',
        });
      }
    });

    it('should list budgets with default pagination', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(50); // Default limit
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(15);
    });

    it('should support pagination parameters', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets?page=2&limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(5);
      expect(result.pagination.page).toBe(2);
    });

    it('should filter by budget type', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets?budgetType=annual`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((b: { budget_type: string }) => b.budget_type === 'annual')).toBe(true);
    });

    it('should filter by department', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets?department=Engineering`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((b: { department: string }) => b.department === 'Engineering')).toBe(true);
    });

    it('should search by name', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets?search=Budget%201`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.some((b: { name: string }) => b.name.includes('Budget 1'))).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets?startDate=2024-01-01&endDate=2024-12-31`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toBeDefined();
    });

    it('should calculate utilization correctly', async () => {
      const budget = await createTestBudget({
        name: 'Budget with Allocations',
        total_budget: 50000,
      });

      // Create allocation
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budget.id,
          contract_id: contract.id,
          amount: 20000,
          allocated_by: adminUser.id,
        });

      const response = await fetch(`${FUNCTION_URL}/budgets?search=Budget%20with%20Allocations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      const budgetData = result.data[0];
      expect(budgetData.allocated_amount).toBe(20000);
      expect(budgetData.remaining_budget).toBe(30000);
      expect(budgetData.utilization_percentage).toBe(40);
    });

    it('should include related data', async () => {
      await createTestBudget({
        name: 'Budget with Relations',
      });

      const response = await fetch(`${FUNCTION_URL}/budgets?search=Budget%20with%20Relations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      const budgetData = result.data[0];
      expect(budgetData.owner).toBeDefined();
      expect(budgetData.allocations).toBeDefined();
    });

    it('should exclude soft deleted budgets', async () => {
      const deletedBudget = await createTestBudget({
        name: 'Deleted Budget',
        deleted_at: new Date().toISOString(),
      });

      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((b: { id: string }) => b.id !== deletedBudget.id)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /budgets', () => {
    it('should create a new budget', async () => {
      const budgetData = {
        name: 'New Test Budget',
        budgetType: 'annual',
        totalBudget: 150000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        department: 'Engineering',
        metadata: {
          costCenter: 'CC-001',
          notes: 'Annual engineering budget',
        },
      };

      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(budgetData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe(budgetData.name);
      expect(data.budget_type).toBe(budgetData.budgetType);
      expect(data.total_budget).toBe(budgetData.totalBudget);
      expect(data.enterprise_id).toBe(testEnterprise.id);
      expect(data.created_by).toBe(managerUser.id);
      expect(data.owner_id).toBe(managerUser.id);
    });

    it('should create budget with parent', async () => {
      const parentBudget = await createTestBudget({
        name: 'Parent Budget',
        total_budget: 200000,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Child Budget',
          budgetType: 'quarterly',
          totalBudget: 50000,
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          parentBudgetId: parentBudget.id,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.parent_budget_id).toBe(parentBudget.id);
    });

    it('should validate parent budget has sufficient funds', async () => {
      const parentBudget = await createTestBudget({
        name: 'Limited Parent',
        total_budget: 100000,
      });

      // Create first child using most of the budget
      await createTestBudget({
        name: 'First Child',
        total_budget: 80000,
        parent_budget_id: parentBudget.id,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Second Child',
          budgetType: 'quarterly',
          totalBudget: 30000, // Exceeds remaining parent budget
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          parentBudgetId: parentBudget.id,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Insufficient budget in parent');
      expect(data.available).toBe(20000);
    });

    it('should validate date range', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Invalid Dates',
          budgetType: 'annual',
          totalBudget: 100000,
          startDate: '2024-12-31',
          endDate: '2024-01-01', // End before start
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('End date must be after start date');
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          budgetType: 'annual',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });

    it('should enforce permission requirements', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Budget',
          budgetType: 'annual',
          totalBudget: 100000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Insufficient permissions');
    });

    it('should allow custom owner assignment', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Manager Owned Budget',
          budgetType: 'annual',
          totalBudget: 100000,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          ownerId: managerUser.id,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.owner_id).toBe(managerUser.id);
    });
  });

  describe('GET /budgets/:id', () => {
    it('should get budget with full details', async () => {
      const budget = await createTestBudget({
        name: 'Detailed Budget',
        department: 'Engineering',
      });

      // Create child budget
      await createTestBudget({
        name: 'Child Budget',
        total_budget: 30000,
        parent_budget_id: budget.id,
      });

      // Create allocation
      const contract = await createTestContract(testEnterprise.id, {
        title: 'Test Contract',
        created_by: adminUser.id,
      });

      await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budget.id,
          contract_id: contract.id,
          amount: 25000,
          allocated_by: adminUser.id,
        });

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(budget.id);
      expect(data.name).toBe('Detailed Budget');
      expect(data.owner).toBeDefined();
      expect(data.created_by_user).toBeDefined();
      expect(data.child_budgets).toHaveLength(1);
      expect(data.allocations).toHaveLength(1);
      expect(data.analytics).toBeDefined();
      expect(data.analytics.allocated_amount).toBe(25000);
      expect(data.analytics.child_budgets_total).toBe(30000);
      expect(data.analytics.remaining_budget).toBe(45000);
      expect(data.analytics.utilization_percentage).toBe(55);
    });

    it('should calculate allocations by status', async () => {
      const budget = await createTestBudget();

      // Create contracts with different statuses
      const activeContract = await createTestContract(testEnterprise.id, {
        status: 'active',
        created_by: adminUser.id,
      });
      const expiredContract = await createTestContract(testEnterprise.id, {
        status: 'expired',
        created_by: adminUser.id,
      });

      await supabase
        .from('budget_allocations')
        .insert([
          {
            budget_id: budget.id,
            contract_id: activeContract.id,
            amount: 30000,
            allocated_by: adminUser.id,
          },
          {
            budget_id: budget.id,
            contract_id: expiredContract.id,
            amount: 20000,
            allocated_by: adminUser.id,
          },
        ]);

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.analytics.allocations_by_status).toBeDefined();
      expect(data.analytics.allocations_by_status.active).toEqual({ count: 1, amount: 30000 });
      expect(data.analytics.allocations_by_status.expired).toEqual({ count: 1, amount: 20000 });
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should not allow access to budgets from other enterprises', async () => {
      const otherEnterprise = await createTestEnterprise();
      const { data: otherBudget } = await supabase
        .from('budgets')
        .insert({
          name: 'Other Enterprise Budget',
          budget_type: 'annual',
          total_budget: 100000,
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          enterprise_id: otherEnterprise.id,
          created_by: adminUser.id,
          owner_id: adminUser.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/budgets/${otherBudget!.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /budgets/:id', () => {
    it('should update budget details', async () => {
      const budget = await createTestBudget({
        name: 'Original Name',
        total_budget: 100000,
      });

      const updates = {
        name: 'Updated Name',
        totalBudget: 150000,
        department: 'Marketing',
        metadata: {
          notes: 'Increased budget for Q2',
        },
      };

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe(updates.name);
      expect(data.total_budget).toBe(updates.totalBudget);
      expect(data.department).toBe(updates.department);
      expect(data.metadata.notes).toBe(updates.metadata.notes);
    });

    it('should prevent reducing budget below allocated amount', async () => {
      const budget = await createTestBudget({
        total_budget: 100000,
      });

      // Create allocation
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budget.id,
          contract_id: contract.id,
          amount: 60000,
          allocated_by: adminUser.id,
        });

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalBudget: 50000, // Less than allocated
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot reduce budget below allocated amount');
      expect(data.allocated).toBe(60000);
    });

    it('should update owner', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: managerUser.id,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.owner_id).toBe(managerUser.id);
    });

    it('should enforce permission requirements', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Update',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets/00000000-0000-0000-0000-000000000000`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Update Non-existent',
        }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /budgets/:id/allocate', () => {
    it('should allocate budget to contract', async () => {
      const budget = await createTestBudget({
        total_budget: 100000,
      });

      const contract = await createTestContract(testEnterprise.id, {
        title: 'Contract for Allocation',
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.id,
          amount: 30000,
        }),
      });

      expect(response.status).toBe(201);
      const allocation = await response.json();
      expect(allocation.budget_id).toBe(budget.id);
      expect(allocation.contract_id).toBe(contract.id);
      expect(allocation.amount).toBe(30000);
      expect(allocation.allocated_by).toBe(managerUser.id);
    });

    it('should validate available budget', async () => {
      const budget = await createTestBudget({
        total_budget: 50000,
      });

      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      // First allocation
      await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budget.id,
          contract_id: contract.id,
          amount: 40000,
          allocated_by: adminUser.id,
        });

      // Try to allocate more than remaining
      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.id,
          amount: 20000,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Insufficient budget available');
      expect(data.available).toBe(10000);
    });

    it('should consider child budgets in available calculation', async () => {
      const parentBudget = await createTestBudget({
        total_budget: 100000,
      });

      // Create child budget
      await createTestBudget({
        name: 'Child Budget',
        total_budget: 70000,
        parent_budget_id: parentBudget.id,
      });

      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets/${parentBudget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.id,
          amount: 40000, // More than remaining after child budget
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.available).toBe(30000);
    });

    it('should validate contract exists', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: '00000000-0000-0000-0000-000000000000',
          amount: 10000,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Contract not found');
    });

    it('should validate required fields', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing contractId
          amount: 10000,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('contract ID and positive amount required');
    });

    it('should validate positive amount', async () => {
      const budget = await createTestBudget();
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}/allocate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: contract.id,
          amount: -1000,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /budgets/:id', () => {
    it('should soft delete budget', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${(budget as { id: string }).id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Verify soft delete
      const { data } = await supabase
        .from('budgets')
        .select('deleted_at, deleted_by')
        .eq('id', (budget as { id: string }).id)
        .single();

      expect(data!.deleted_at).toBeDefined();
      expect(data!.deleted_by).toBe(adminUser.id);
    });

    it('should prevent deletion with allocations', async () => {
      const budget = await createTestBudget();
      const contract = await createTestContract(testEnterprise.id, {
        created_by: adminUser.id,
      });

      await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budget.id,
          contract_id: contract.id,
          amount: 10000,
          allocated_by: adminUser.id,
        });

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot delete budget with allocations');
      expect(data.allocations).toBe(1);
    });

    it('should prevent deletion with child budgets', async () => {
      const parentBudget = await createTestBudget();
      await createTestBudget({
        name: 'Child Budget',
        parent_budget_id: parentBudget.id,
      });

      const response = await fetch(`${FUNCTION_URL}/budgets/${parentBudget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot delete budget with allocations or child budgets');
      expect(data.childBudgets).toBe(1);
    });

    it('should enforce permission requirements', async () => {
      const budget = await createTestBudget();

      const response = await fetch(`${FUNCTION_URL}/budgets/${budget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${managerUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent budget', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'PATCH',
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
      const response = await fetch(`${FUNCTION_URL}/budgets`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });
});