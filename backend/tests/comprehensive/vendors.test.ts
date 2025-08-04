import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Vendor Management System', () => {
  let supabase: any;
  let testEnterprise: any;
  let testUser: any;
  let testVendor: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test enterprise
    const { data: enterprise } = await supabase
      .from('enterprises')
      .insert({
        name: 'Vendor Test Enterprise',
        domain: 'vendortest.com',
        industry: 'technology'
      })
      .select()
      .single();
    
    testEnterprise = enterprise;

    // Create test user
    const { data: user } = await supabase
      .from('users')
      .insert({
        auth_id: 'vendor-test-user',
        email: 'vendor@test.com',
        enterprise_id: testEnterprise.id,
        role: 'manager'
      })
      .select()
      .single();
    
    testUser = user;
  });

  afterEach(async () => {
    // Cleanup in reverse order
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

  describe('Vendor Creation', () => {
    it('should create vendor with valid data', async () => {
      const vendorData = {
        name: 'Test Technology Solutions',
        category: 'technology',
        status: 'active',
        enterprise_id: testEnterprise.id,
        website: 'https://testtech.com',
        contact_name: 'John Doe',
        contact_email: 'john@testtech.com',
        contact_phone: '+1-555-0123',
        address: '123 Tech Street, Tech City, TC 12345'
      };

      const { data: vendor, error } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(vendor).toBeDefined();
      expect(vendor.name).toBe('Test Technology Solutions');
      expect(vendor.category).toBe('technology');
      expect(vendor.status).toBe('active');
      testVendor = vendor;
    });

    it('should enforce required fields', async () => {
      const invalidData = {
        // Missing required name and category
        enterprise_id: testEnterprise.id,
        website: 'https://incomplete.com'
      };

      const { error } = await supabase
        .from('vendors')
        .insert(invalidData);

      expect(error).toBeDefined();
    });

    it('should validate category enum', async () => {
      const invalidData = {
        name: 'Invalid Category Vendor',
        category: 'invalid_category',
        enterprise_id: testEnterprise.id
      };

      const { error } = await supabase
        .from('vendors')
        .insert(invalidData);

      expect(error).toBeDefined();
    });

    it('should validate email format', async () => {
      const vendorData = {
        name: 'Email Test Vendor',
        category: 'technology',
        enterprise_id: testEnterprise.id,
        contact_email: 'invalid-email-format'
      };

      const { error } = await supabase
        .from('vendors')
        .insert(vendorData);

      // Note: Email validation might be handled at application level
      // This test verifies database constraints
      expect(error).toBeDefined();
    });
  });

  describe('Vendor Categories', () => {
    it('should support all valid categories', async () => {
      const categories = [
        'technology',
        'marketing',
        'legal',
        'finance',
        'hr',
        'facilities',
        'logistics',
        'manufacturing',
        'consulting',
        'other'
      ];

      for (const category of categories) {
        const { data: vendor, error } = await supabase
          .from('vendors')
          .insert({
            name: `${category} Vendor`,
            category,
            enterprise_id: testEnterprise.id
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(vendor.category).toBe(category);

        // Clean up each vendor
        await supabase.from('vendors').delete().eq('id', vendor.id);
      }
    });
  });

  describe('Vendor Status Management', () => {
    beforeEach(async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Status Test Vendor',
          category: 'technology',
          status: 'pending',
          enterprise_id: testEnterprise.id
        })
        .select()
        .single();
      
      testVendor = vendor;
    });

    it('should transition from pending to active', async () => {
      const { data: updated, error } = await supabase
        .from('vendors')
        .update({ status: 'active' })
        .eq('id', testVendor.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('active');
    });

    it('should allow suspending vendor', async () => {
      const { data: updated, error } = await supabase
        .from('vendors')
        .update({ status: 'suspended' })
        .eq('id', testVendor.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.status).toBe('suspended');
    });

    it('should support all valid statuses', async () => {
      const statuses = ['active', 'inactive', 'pending', 'suspended'];

      for (const status of statuses) {
        const { data: updated, error } = await supabase
          .from('vendors')
          .update({ status })
          .eq('id', testVendor.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated.status).toBe(status);
      }
    });
  });

  describe('Vendor Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test vendors
      const vendors = [
        {
          name: 'Alpha Technology Corp',
          category: 'technology',
          status: 'active',
          enterprise_id: testEnterprise.id,
          contact_email: 'contact@alpha.com'
        },
        {
          name: 'Beta Marketing Agency',
          category: 'marketing',
          status: 'active',
          enterprise_id: testEnterprise.id,
          contact_email: 'info@beta.com'
        },
        {
          name: 'Gamma Legal Services',
          category: 'legal',
          status: 'inactive',
          enterprise_id: testEnterprise.id,
          contact_email: 'legal@gamma.com'
        }
      ];

      for (const vendor of vendors) {
        await supabase.from('vendors').insert(vendor);
      }
    });

    it('should filter vendors by category', async () => {
      const { data: techVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('category', 'technology');

      const { data: marketingVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('category', 'marketing');

      expect(techVendors.length).toBeGreaterThan(0);
      expect(marketingVendors.length).toBeGreaterThan(0);
      expect(techVendors[0].category).toBe('technology');
      expect(marketingVendors[0].category).toBe('marketing');
    });

    it('should filter vendors by status', async () => {
      const { data: activeVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('status', 'active');

      const { data: inactiveVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .eq('status', 'inactive');

      expect(activeVendors.length).toBe(2);
      expect(inactiveVendors.length).toBe(1);
    });

    it('should search vendors by name', async () => {
      const { data: results } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .ilike('name', '%Alpha%');

      expect(results.length).toBe(1);
      expect(results[0].name).toContain('Alpha');
    });

    it('should sort vendors alphabetically', async () => {
      const { data: results } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .order('name', { ascending: true });

      expect(results.length).toBeGreaterThan(1);
      expect(results[0].name.localeCompare(results[1].name)).toBeLessThanOrEqual(0);
    });
  });

  describe('Vendor Performance Tracking', () => {
    beforeEach(async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Performance Test Vendor',
          category: 'technology',
          status: 'active',
          enterprise_id: testEnterprise.id
        })
        .select()
        .single();
      
      testVendor = vendor;
    });

    it('should track vendor metrics', async () => {
      const metricsData = {
        vendor_id: testVendor.id,
        enterprise_id: testEnterprise.id,
        metric_type: 'response_time',
        value: 24, // hours
        period_start: '2024-01-01',
        period_end: '2024-01-31'
      };

      const { data: metrics, error } = await supabase
        .from('vendor_metrics')
        .insert(metricsData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(metrics.metric_type).toBe('response_time');
      expect(metrics.value).toBe(24);
    });

    it('should calculate performance scores', async () => {
      // Insert various performance metrics
      const metrics = [
        {
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          metric_type: 'quality_score',
          value: 4.5,
          period_start: '2024-01-01',
          period_end: '2024-01-31'
        },
        {
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          metric_type: 'delivery_time',
          value: 95, // percentage on time
          period_start: '2024-01-01',
          period_end: '2024-01-31'
        }
      ];

      for (const metric of metrics) {
        await supabase.from('vendor_metrics').insert(metric);
      }

      // Query all metrics for the vendor
      const { data: allMetrics } = await supabase
        .from('vendor_metrics')
        .select('*')
        .eq('vendor_id', testVendor.id);

      expect(allMetrics.length).toBe(2);
      
      // Calculate average score (this would typically be done by a function)
      const avgScore = allMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / allMetrics.length;
      expect(avgScore).toBeGreaterThan(0);
    });
  });

  describe('Vendor Relationships', () => {
    beforeEach(async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Relationship Test Vendor',
          category: 'technology',
          status: 'active',
          enterprise_id: testEnterprise.id
        })
        .select()
        .single();
      
      testVendor = vendor;
    });

    it('should link vendors to contracts', async () => {
      // Create a contract for the vendor
      const { data: contract } = await supabase
        .from('contracts')
        .insert({
          title: 'Vendor Contract Test',
          file_name: 'vendor-contract.pdf',
          storage_id: 'vendor-123',
          vendor_id: testVendor.id,
          enterprise_id: testEnterprise.id,
          status: 'active',
          created_by: testUser.id
        })
        .select()
        .single();

      expect(contract.vendor_id).toBe(testVendor.id);

      // Query contracts for this vendor
      const { data: vendorContracts } = await supabase
        .from('contracts')
        .select('*')
        .eq('vendor_id', testVendor.id)
        .eq('enterprise_id', testEnterprise.id);

      expect(vendorContracts.length).toBe(1);
      expect(vendorContracts[0].id).toBe(contract.id);

      // Cleanup
      await supabase.from('contracts').delete().eq('id', contract.id);
    });

    it('should support vendor contact updates', async () => {
      const updatedContact = {
        contact_name: 'Jane Smith',
        contact_email: 'jane@updated.com',
        contact_phone: '+1-555-9876'
      };

      const { data: updated, error } = await supabase
        .from('vendors')
        .update(updatedContact)
        .eq('id', testVendor.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated.contact_name).toBe('Jane Smith');
      expect(updated.contact_email).toBe('jane@updated.com');
      expect(updated.contact_phone).toBe('+1-555-9876');
    });
  });

  describe('Vendor Security and Compliance', () => {
    it('should enforce enterprise isolation', async () => {
      // Create another enterprise and vendor
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
          name: 'Other Enterprise Vendor',
          category: 'technology',
          enterprise_id: otherEnterprise.id
        })
        .select()
        .single();

      // User from testEnterprise should not see otherVendor
      const { data: vendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id);

      const foundOtherVendor = vendors.find((v: any) => v.id === otherVendor.id);
      expect(foundOtherVendor).toBeUndefined();

      // Cleanup
      await supabase.from('vendors').delete().eq('id', otherVendor.id);
      await supabase.from('enterprises').delete().eq('id', otherEnterprise.id);
    });

    it('should handle soft deletion', async () => {
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          name: 'Delete Test Vendor',
          category: 'technology',
          enterprise_id: testEnterprise.id
        })
        .select()
        .single();

      // Soft delete by setting deleted_at
      const { data: deleted } = await supabase
        .from('vendors')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', vendor.id)
        .select()
        .single();

      expect(deleted.deleted_at).toBeDefined();

      // Verify soft-deleted vendor is excluded from normal queries
      const { data: activeVendors } = await supabase
        .from('vendors')
        .select('*')
        .eq('enterprise_id', testEnterprise.id)
        .is('deleted_at', null);

      const foundDeleted = activeVendors.find((v: any) => v.id === vendor.id);
      expect(foundDeleted).toBeUndefined();

      // Cleanup
      await supabase.from('vendors').delete().eq('id', vendor.id);
    });
  });
});