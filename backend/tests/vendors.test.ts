import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from './setup';

describe('Vendors API', () => {
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
      role: 'user',
    });
    testUser = userResult.user;
  });

  describe('Vendor CRUD Operations', () => {
    it('should create a new vendor', async () => {
      const vendorData = {
        name: 'Acme Corporation',
        category: 'technology',
        status: 'active',
        website: 'https://acme.com',
        contact_email: 'contact@acme.com',
        enterprise_id: testEnterprise,
        created_by: testUser.id,
      };

      const { data, error } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(vendorData.name);
      expect(data.category).toBe('technology');
    });

    it('should detect duplicate vendors', async () => {
      const vendorName = 'Duplicate Test Corp';

      // Create first vendor
      await supabase
        .from('vendors')
        .insert({
          name: vendorName,
          category: 'consulting',
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        });

      // Check for duplicates
      const { data: duplicates } = await supabase.rpc('find_duplicate_vendors', {
        p_name: vendorName,
        p_enterprise_id: testEnterprise,
      });

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].match_type).toBe('exact');
      expect(duplicates[0].similarity).toBe(1);
    });

    it('should update vendor performance metrics', async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Performance Test Vendor',
          category: 'services',
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        })
        .select()
        .single();

      // Create contracts for the vendor
      for (let i = 0; i < 3; i++) {
        await supabase
          .from('contracts')
          .insert({
            title: `Contract ${i}`,
            vendor_id: vendor.id,
            status: 'active',
            value: 10000,
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          });
      }

      // Update metrics
      await supabase.rpc('update_vendor_performance_metrics', {
        p_vendor_id: vendor.id,
      });

      // Check updated vendor
      const { data: updatedVendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendor.id)
        .single();

      expect(updatedVendor.active_contracts).toBe(3);
      expect(updatedVendor.total_contract_value).toBe(30000);
    });

    it('should merge vendors', async () => {
      // Create two vendors
      const { data: vendor1 } = await supabase
        .from('vendors')
        .insert({
          name: 'Vendor One',
          category: 'technology',
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        })
        .select()
        .single();

      const { data: vendor2 } = await supabase
        .from('vendors')
        .insert({
          name: 'Vendor Two',
          category: 'technology',
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        })
        .select()
        .single();

      // Create contract for vendor1
      await supabase
        .from('contracts')
        .insert({
          title: 'Test Contract',
          vendor_id: vendor1.id,
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        });

      // Merge vendor1 into vendor2
      await supabase
        .from('contracts')
        .update({ vendor_id: vendor2.id })
        .eq('vendor_id', vendor1.id);

      await supabase
        .from('vendors')
        .update({
          deleted_at: new Date().toISOString(),
          metadata: {
            merged_into: vendor2.id,
            merged_by: testUser.id,
          },
        })
        .eq('id', vendor1.id);

      // Check contracts moved
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('vendor_id', vendor2.id);

      expect(contracts).toHaveLength(1);
    });
  });

  describe('Vendor Search and Filtering', () => {
    it('should search vendors by name', async () => {
      await supabase
        .from('vendors')
        .insert([
          {
            name: 'Search Test Alpha',
            category: 'technology',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
          {
            name: 'Search Test Beta',
            category: 'marketing',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
          {
            name: 'Different Name',
            category: 'legal',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
        ]);

      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise)
        .ilike('name', '%Search Test%');

      expect(data).toHaveLength(2);
    });

    it('should filter vendors by category', async () => {
      await supabase
        .from('vendors')
        .insert([
          {
            name: 'Tech Vendor 1',
            category: 'technology',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
          {
            name: 'Tech Vendor 2',
            category: 'technology',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
          {
            name: 'Legal Vendor',
            category: 'legal',
            enterprise_id: testEnterprise,
            created_by: testUser.id,
          },
        ]);

      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise)
        .eq('category', 'technology');

      expect(data).toHaveLength(2);
    });
  });

  describe('Vendor Compliance', () => {
    it('should create compliance checks', async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Compliance Test Vendor',
          category: 'finance',
          enterprise_id: testEnterprise,
          created_by: testUser.id,
        })
        .select()
        .single();

      const { data: check, error } = await supabase
        .from('compliance_checks')
        .insert({
          vendor_id: vendor.id,
          check_type: 'financial',
          status: 'completed',
          passed: true,
          performed_by: testUser.id,
          performed_at: new Date().toISOString(),
          enterprise_id: testEnterprise,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(check).toBeDefined();
      expect(check.passed).toBe(true);
    });
  });
});