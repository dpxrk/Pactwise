import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from './setup';

describe('Contracts API', () => {
  let supabase: SupabaseClient;
  let testUser: User;
  let testEnterprise: string;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    testEnterprise = await testHelpers.createTestEnterprise(supabase);
    const userResult = await testHelpers.createTestUser(supabase, {
      enterprise_id: testEnterprise,
      role: 'manager',
    });
    testUser = userResult.user;
  });

  describe('Contract CRUD Operations', () => {
    it('should create a new contract', async () => {
      const contractData = {
        title: 'Test Service Agreement',
        fileName: 'service-agreement.pdf',
        fileType: 'pdf',
        storageId: 'test-storage-id',
        status: 'draft',
        enterprise_id: testEnterprise,
        created_by: testUser.id,
        owner_id: testUser.id,
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.title).toBe(contractData.title);
      expect(data.status).toBe('draft');
    });

    it('should update contract status', async () => {
      const contract = await testHelpers.createTestContract(supabase, testEnterprise, {
        created_by: testUser.id,
      });

      const { data, error } = await supabase
        .from('contracts')
        .update({ status: 'active' })
        .eq('id', contract.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('active');
    });

    it('should list contracts with pagination', async () => {
      // Create multiple contracts
      for (let i = 0; i < 5; i++) {
        await testHelpers.createTestContract(supabase, testEnterprise, {
          created_by: testUser.id,
          title: `Contract ${i}`,
        });
      }

      const { data, error, count } = await supabase
        .from('contracts')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', testEnterprise)
        .range(0, 2);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should enforce RLS policies', async () => {
      const otherEnterprise = await testHelpers.createTestEnterprise(supabase);
      const otherContract = await testHelpers.createTestContract(supabase, otherEnterprise);

      // Create authenticated client
      const authClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${testUser.auth_id}`,
            },
          },
        },
      );

      const { data, error } = await authClient
        .from('contracts')
        .select('*')
        .eq('id', otherContract.id)
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe('Contract Analysis', () => {
    it('should queue contract for analysis', async () => {
      const contract = await testHelpers.createTestContract(supabase, testEnterprise, {
        created_by: testUser.id,
      });

      // Mock agent
      const { data: agent } = await supabase
        .from('agents')
        .insert({
          name: 'Test Secretary Agent',
          type: 'secretary',
          is_active: true,
        })
        .select()
        .single();

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert({
          agent_id: agent.id,
          task_type: 'analyze_contract',
          priority: 8,
          payload: { contract_id: contract.id },
          contract_id: contract.id,
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeDefined();
      expect(task.status).toBe('pending');
    });

    it('should update contract with analysis results', async () => {
      const contract = await testHelpers.createTestContract(supabase, testEnterprise, {
        created_by: testUser.id,
      });

      const analysisResults = {
        extracted_parties: ['Company A', 'Company B'],
        extracted_start_date: '2024-01-01',
        extracted_end_date: '2024-12-31',
        extracted_pricing: { total: 100000, currency: 'USD' },
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('contracts')
        .update(analysisResults)
        .eq('id', contract.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.extracted_parties).toEqual(analysisResults.extracted_parties);
      expect(data.analysis_status).toBe('completed');
    });
  });

  describe('Contract Assignments', () => {
    it('should assign users to contracts', async () => {
      const contract = await testHelpers.createTestContract(supabase, testEnterprise, {
        created_by: testUser.id,
      });

      const { data, error } = await supabase
        .from('contract_assignments')
        .insert({
          contract_id: contract.id,
          user_id: testUser.id,
          assigned_by: testUser.id,
          assignment_type: 'reviewer',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.assignment_type).toBe('reviewer');
    });
  });

  describe('Contract Status History', () => {
    it('should track contract status changes', async () => {
      const contract = await testHelpers.createTestContract(supabase, testEnterprise, {
        created_by: testUser.id,
      });

      const { error } = await supabase
        .from('contract_status_history')
        .insert({
          contract_id: contract.id,
          previous_status: 'draft',
          new_status: 'active',
          changed_by: testUser.id,
          reason: 'Analysis completed',
        });

      expect(error).toBeNull();

      const { data: history } = await supabase
        .from('contract_status_history')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: false });

      expect(history).toHaveLength(1);
      expect(history[0].new_status).toBe('active');
    });
  });
});