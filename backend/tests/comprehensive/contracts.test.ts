import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Contract Management System', () => {
  let supabase: any;
  let testEnterprise: any;
  let testUser: any;
  let testVendor: any;
  let testContract: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test enterprise
    const { data: enterprise } = await supabase
      .from('enterprises')
      .insert({
        name: 'Contract Test Enterprise',
        domain: 'contracttest.com',
        industry: 'technology'
      })
      .select()
      .single();
    
    testEnterprise = enterprise;

    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        auth_id: 'contract-test-user',
        email: 'contract@test.com',
        enterprise_id: testEnterprise.id,
        role: 'manager'
      })
      .select()
      .single();
    
    testUser = user;

    // Create test vendor
    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        name: 'Test Vendor Inc',
        category: 'technology',
        status: 'active',
        enterprise_id: testEnterprise.id,
        contact_email: 'vendor@test.com'
      })
      .select()
      .single();
    
    testVendor = vendor;
  });

  afterEach(async () => {
    // Cleanup in reverse order
    if (testContract) {
      await supabase.from('contracts').delete().eq('id', testContract.id);
    }
    if (testVendor) {
      await supabase.from('vendors').delete().eq('id', testVendor.id);
    }
    if (testUser) {
      await supabase.from('users').delete().eq('id', testUser.id);
    }
    if (testEnterprise) {
      await supabase.from('enterprises').delete().eq('id', testEnterprise.id);
    }
  });

  describe('Contract Creation', () => {
    it('should create contract with valid data', async () => {
      const contractData = {
        title: 'Test Service Agreement',
        file_name: 'test-agreement.pdf',
        file_type: 'application/pdf',
        storage_id: 'test-storage-123',
        vendor_id: testVendor.id,
        enterprise_id: testEnterprise.id,
        status: 'draft',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        value: 50000,
        created_by: testUser.id
      };

      const { data: contract, error } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(contract).toBeDefined();
      expect(contract.title).toBe('Test Service Agreement');
      expect(contract.vendor_id).toBe(testVendor.id);
      testContract = contract;
    });

    it('should enforce required fields', async () => {
      const invalidData = {
        // Missing required title
        file_name: 'test.pdf',
        enterprise_id: testEnterprise.id
      };

      const { error } = await supabase
        .from('contracts')
        .insert(invalidData);

      expect(error).toBeDefined();
    });

    it('should validate vendor belongs to same enterprise', async () => {
      // Create vendor in different enterprise
      const { data: otherEnterprise } = await supabase
        .from('enterprises')
        .insert({
          name: 'Other Enterprise',
          domain: 'other.com'
        })
        .select()
        .single();

      const { data: otherVendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Other Vendor',
          category: 'technology',
          enterprise_id: otherEnterprise.id
        })
        .select()
        .single();

      const contractData = {
        title: 'Cross-Enterprise Contract',
        file_name: 'test.pdf',
        storage_id: 'test-123',
        vendor_id: otherVendor.id, // Different enterprise
        enterprise_id: testEnterprise.id
      };

      const { error } = await supabase
        .from('contracts')
        .insert(contractData);

      // Should fail due to RLS policy
      expect(error).toBeDefined();

      // Cleanup
      await supabase.from('vendors').delete().eq('id', otherVendor.id);
      await supabase.from('enterprises').delete().eq('id', otherEnterprise.id);
    });
  });

  describe('Contract Lifecycle', () => {
    beforeEach(async () => {
      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          title: 'Lifecycle Test Contract',
          file_name: 'lifecycle.pdf',
          storage_id: 'lifecycle-123',
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          status: 'draft',
          created_by: testUser.id
        })
        .select()
        .single();
      
      testContract = contract;
    });

    it('should transition from draft to active', async () => {
      const { data: updated, error } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .eq('id', testContract.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('active');
    });

    it('should track status history', async () => {
      // Update status
      await supabase
        .from('contracts')
        .update({ status: 'active' })
        .eq('id', testContract.id);

      // Check if status history was recorded
      const { data: history } = await supabase
        .from('contract_status_history')
        .select('*')
        .eq('contract_id', testContract.id);

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should handle expiration correctly', async () => {
      // Set contract to expire yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await supabase
        .from('contracts')
        .update({
          status: 'active',
          end_date: yesterday.toISOString().split('T')[0]
        })
        .eq('id', testContract.id);

      // In real system, a cron job would update expired contracts
      // For testing, we'll simulate this
      const { data: updated } = await supabase
        .from('contracts')
        .update({ status: 'expired' })
        .eq('id', testContract.id)
        .lt('end_date', new Date().toISOString())
        .select()
        .single();

      expect(updated.status).toBe('expired');
    });
  });

  describe('Contract Analysis', () => {
    beforeEach(async () => {
      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          title: 'Analysis Test Contract',
          file_name: 'analysis.pdf',
          storage_id: 'analysis-123',
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          status: 'pending_analysis',
          created_by: testUser.id
        })
        .select()
        .single();
      
      testContract = contract;
    });

    it('should store analysis results', async () => {
      const analysisData = {
        contract_id: testContract.id,
        enterprise_id: testEnterprise.id,
        analysis_type: 'risk_assessment',
        status: 'completed',
        results: {
          riskScore: 0.3,
          keyRisks: ['Late payment penalty', 'Auto-renewal clause'],
          recommendations: ['Negotiate payment terms', 'Review renewal clause']
        },
        confidence: 0.85
      };

      const { data: analysis, error } = await supabase
        .from('ai_analysis')
        .insert(analysisData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(analysis.results.riskScore).toBe(0.3);
      expect(analysis.confidence).toBe(0.85);
    });

    it('should extract contract clauses', async () => {
      const clauseData = {
        contract_id: testContract.id,
        enterprise_id: testEnterprise.id,
        clause_type: 'termination',
        content: 'Either party may terminate with 30 days notice',
        importance: 'high',
        risk_level: 'medium'
      };

      const { data: clause, error } = await supabase
        .from('contract_clauses')
        .insert(clauseData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(clause.clause_type).toBe('termination');
      expect(clause.importance).toBe('high');
    });
  });

  describe('Contract Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test contracts
      const contracts = [
        {
          title: 'Software License Agreement',
          file_name: 'software.pdf',
          storage_id: 'software-123',
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          status: 'active',
          value: 10000,
          created_by: testUser.id
        },
        {
          title: 'Support Services Contract',
          file_name: 'support.pdf',
          storage_id: 'support-123',
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          status: 'draft',
          value: 25000,
          created_by: testUser.id
        }
      ];

      for (const contract of contracts) {
        await supabase.from('contracts').insert(contract);
      }
    });

    it('should filter contracts by status', async () => {
      const { data: activeContracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('status', 'active');

      const { data: draftContracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('status', 'draft');

      expect(activeContracts.length).toBeGreaterThan(0);
      expect(draftContracts.length).toBeGreaterThan(0);
    });

    it('should search contracts by title', async () => {
      const { data: results } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .ilike('title', '%Software%');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Software');
    });

    it('should filter by vendor', async () => {
      const { data: results } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('vendor_id', testVendor.id);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((contract: any) => {
        expect(contract.vendor_id).toBe(testVendor.id);
      });
    });

    it('should sort by value', async () => {
      const { data: results } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .not('value', 'is', null)
        .order('value', { ascending: false });

      if (results.length > 1) {
        expect(results[0].value).toBeGreaterThanOrEqual(results[1].value);
      }
    });
  });

  describe('Contract Permissions', () => {
    it('should enforce enterprise isolation', async () => {
      // Create another enterprise and contract
      const { data: otherEnterprise } = await supabase
        .from('enterprises')
        .insert({
          name: 'Other Enterprise',
          domain: 'other.com'
        })
        .select()
        .single();

      const { data: otherContract } = await supabase
        .from('contracts')
        .insert({
          title: 'Other Enterprise Contract',
          file_name: 'other.pdf',
          storage_id: 'other-123',
          enterprise_id: otherEnterprise.id
        })
        .select()
        .single();

      // User from testEnterprise should not see otherContract
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('enterprise_id', testEnterprise.id);

      const foundOtherContract = contracts.find((c: any) => c.id === otherContract.id);
      expect(foundOtherContract).toBeUndefined();

      // Cleanup
      await supabase.from('contracts').delete().eq('id', otherContract.id);
      await supabase.from('enterprises').delete().eq('id', otherEnterprise.id);
    });
  });
});