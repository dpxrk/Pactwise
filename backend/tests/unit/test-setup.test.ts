import { describe, it, expect } from 'vitest';
import {
  getTestClient,
  createTestEnterprise,
  createTestUser,
  createTestContract,
  createTestVendor,
  createTestBudget,
} from '../setup';

describe('Test Setup', () => {
  describe('getTestClient', () => {
    it('should return a client (real or mock)', () => {
      const client = getTestClient();
      expect(client).toBeDefined();
      expect(client.from).toBeDefined();
      expect(typeof client.from).toBe('function');
    });
  });

  describe('Test Helpers', () => {
    it('should create test enterprise', async () => {
      const enterprise = await createTestEnterprise();
      expect(enterprise).toBeDefined();
      expect(enterprise.id).toBeDefined();
      expect(enterprise.name).toBeDefined();
    });

    it('should create test enterprise with overrides', async () => {
      const enterprise = await createTestEnterprise({
        name: 'Custom Test Enterprise',
      });
      expect(enterprise).toBeDefined();
      expect(enterprise.id).toBeDefined();
      expect(enterprise.name).toContain('Custom Test Enterprise');
    });

    it('should create test user', async () => {
      const enterprise = await createTestEnterprise();
      const user = await createTestUser(enterprise.id, 'admin');

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.authToken).toBeDefined();
      expect(user.email).toContain('@');
    });

    it('should create test contract', async () => {
      const enterprise = await createTestEnterprise();
      const contract = await createTestContract(enterprise.id);

      expect(contract).toBeDefined();
      expect(contract.id).toBeDefined();
      expect(contract.title).toBeDefined();
    });

    it('should create test vendor', async () => {
      const enterprise = await createTestEnterprise();
      const vendor = await createTestVendor(enterprise.id);

      expect(vendor).toBeDefined();
      expect(vendor.id).toBeDefined();
      expect(vendor.name).toBeDefined();
    });

    it('should create test budget', async () => {
      const enterprise = await createTestEnterprise();
      const budget = await createTestBudget(enterprise.id);

      expect(budget).toBeDefined();
      expect(budget.id).toBeDefined();
      expect(budget.name).toBeDefined();
    });
  });

  describe('Test Data Relationships', () => {
    it('should create related test data', async () => {
      const enterprise = await createTestEnterprise();
      const user = await createTestUser(enterprise.id, 'manager');
      const vendor = await createTestVendor(enterprise.id);
      const contract = await createTestContract(enterprise.id, {
        created_by: user.id,
        vendor_id: vendor.id,
      });
      const budget = await createTestBudget(enterprise.id, {
        created_by: user.id,
        owner_id: user.id,
      });

      expect(enterprise.id).toBeDefined();
      expect(user.id).toBeDefined();
      expect(vendor.id).toBeDefined();
      expect(contract.id).toBeDefined();
      expect(budget.id).toBeDefined();
    });
  });
});