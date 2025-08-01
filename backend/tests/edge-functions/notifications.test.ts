import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

// Mock the fetch function for email sending
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('Notifications Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  let regularUser: { id: string; email: string; authToken: string };

  const createTestNotification = async (overrides = {}) => {
    const { data } = await supabase
      .from('notifications')
      .insert({
        user_id: regularUser.id,
        type: 'contract_expiry',
        title: 'Contract Expiring Soon',
        description: 'Your contract is expiring soon',
        data: {
          contract_id: 'test-contract-id',
          contract_title: 'Test Contract',
          vendor_name: 'Test Vendor',
          expiry_date: '2024-12-31',
          days_until_expiry: 30,
          contract_value: '$50,000',
          action_url: 'https://app.pactwise.com/contracts/test-id',
          email_sent: false,
        },
        is_read: false,
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
    regularUser = await createTestUser(testEnterprise.id, 'user');

    // Mock email sending
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === 'https://api.resend.com/emails') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: `mock-email-id-${Date.now()}` }),
        });
      }
      return Promise.resolve({
        ok: false,
        text: () => Promise.resolve('Not found'),
      });
    });

    // Mock environment variables
    vi.stubEnv('RESEND_API_KEY', 'test-api-key');
    vi.stubEnv('EMAIL_FROM', 'test@pactwise.com');
    vi.stubEnv('APP_URL', 'https://app.pactwise.com');
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  describe('POST /notifications/send-email', () => {
    it('should send email with template', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'user@example.com',
          template: 'contract_expiry',
          data: {
            user_name: 'John Doe',
            contract_title: 'Service Agreement',
            vendor_name: 'ABC Vendor',
            expiry_date: '2024-12-31',
            days_until_expiry: '30',
            contract_value: '$50,000',
            action_url: 'https://app.pactwise.com/contracts/123',
          },
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-email-id');
    });

    it('should send email with custom content', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'user@example.com',
          customSubject: 'Custom Subject',
          customHtml: '<h1>Custom Email</h1><p>This is a custom email.</p>',
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing 'to' field
          template: 'contract_expiry',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Missing required fields');
    });

    it('should handle email service errors', async () => {
      // Mock email service failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Email service error'),
      });

      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'user@example.com',
          template: 'contract_expiry',
          data: {
            user_name: 'John Doe',
          },
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /notifications/send-batch', () => {
    it('should send batch emails', async () => {
      const recipients = [
        {
          email: 'user1@example.com',
          data: { user_name: 'User 1', budget_name: 'Budget A' },
        },
        {
          email: 'user2@example.com',
          data: { user_name: 'User 2', budget_name: 'Budget B' },
        },
      ];

      const response = await fetch(`${FUNCTION_URL}/notifications/send-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          template: 'budget_alert',
          baseData: {
            alert_type: 'Warning',
            alert_color: '#F59E0B',
            total_budget: '$100,000',
            spent_amount: '$80,000',
            remaining_amount: '$20,000',
            utilization_percentage: '80',
            recommendation: 'Consider reviewing upcoming expenses.',
            action_url: 'https://app.pactwise.com/budgets',
          },
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failures in batch', async () => {
      // Mock one success and one failure
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'mock-id-1' }),
          });
        }
        return Promise.reject(new Error('Email service error'));
      });

      const recipients = [
        { email: 'success@example.com', data: { user_name: 'Success User' } },
        { email: 'fail@example.com', data: { user_name: 'Fail User' } },
      ];

      const response = await fetch(`${FUNCTION_URL}/notifications/send-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          template: 'approval_request',
          baseData: {
            item_type: 'Contract',
            item_title: 'Service Agreement',
            approve_url: 'https://app.pactwise.com/approve/123',
            reject_url: 'https://app.pactwise.com/reject/123',
            view_url: 'https://app.pactwise.com/contracts/123',
          },
        }),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });

    it('should validate batch request', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing recipients
          template: 'budget_alert',
        }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Invalid batch request');
    });
  });

  describe('POST /notifications/process-queue', () => {
    it('should process pending email notifications', async () => {
      // Create pending notifications
      await createTestNotification();
      await createTestNotification({
        type: 'budget_alert',
        data: {
          budget_name: 'Q1 Budget',
          alert_type: 'Critical',
          alert_color: '#EF4444',
          total_budget: '$100,000',
          spent_amount: '$95,000',
          remaining_amount: '$5,000',
          utilization_percentage: '95',
          recommendation: 'Budget is nearly exhausted.',
          action_url: 'https://app.pactwise.com/budgets/123',
          email_sent: false,
        },
      });

      const response = await fetch(`${FUNCTION_URL}/notifications/process-queue`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.processed).toBe(2);

      // Verify notifications were marked as sent
      const { data: notifications } = await supabase
        .from('notifications')
        .select('data')
        .eq('user_id', regularUser.id);

      expect(notifications?.every(n => (n.data as any)?.email_sent === true)).toBe(true);
    });

    it('should handle empty queue', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/process-queue`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.processed).toBe(0);
    });

    it('should skip notifications for users without email', async () => {
      // Create notification for user without email
      const { data: userWithoutEmail } = await supabase
        .from('users')
        .insert({
          auth_id: 'test-auth-id',
          enterprise_id: testEnterprise.id,
          first_name: 'No',
          last_name: 'Email',
          role: 'user',
          email: null, // No email
        })
        .select()
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: userWithoutEmail!.id,
          type: 'contract_expiry',
          title: 'Test',
          data: { email_sent: false },
        });

      const response = await fetch(`${FUNCTION_URL}/notifications/process-queue`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.processed).toBe(0);
    });

    it('should limit processing batch size', async () => {
      // Create 60 notifications (more than limit of 50)
      const notifications = [];
      for (let i = 0; i < 60; i++) {
        notifications.push({
          user_id: regularUser.id,
          type: 'contract_expiry',
          title: `Notification ${i}`,
          data: { email_sent: false },
        });
      }
      await supabase.from('notifications').insert(notifications);

      const response = await fetch(`${FUNCTION_URL}/notifications/process-queue`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.processed).toBe(50); // Should process only 50
    });
  });

  describe('POST /notifications/generate-digest', () => {
    beforeEach(async () => {
      // Create test data for digest
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 3);

      // Create recent contracts
      await supabase
        .from('contracts')
        .insert([
          {
            title: 'New Contract 1',
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            status: 'active',
            created_at: new Date().toISOString(),
            file_name: 'contract1.pdf',
            file_type: 'pdf',
            storage_id: 'id1',
          },
          {
            title: 'New Contract 2',
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            status: 'pending_review',
            created_at: new Date().toISOString(),
            file_name: 'contract2.pdf',
            file_type: 'pdf',
            storage_id: 'id2',
          },
          {
            title: 'Expiring Contract',
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            status: 'active',
            end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: weekAgo.toISOString(),
            file_name: 'expiring.pdf',
            file_type: 'pdf',
            storage_id: 'id3',
          },
        ]);

      // Create recent vendors
      await supabase
        .from('vendors')
        .insert({
          name: 'New Vendor',
          enterprise_id: testEnterprise.id,
          created_by: adminUser.id,
          category: 'software',
          created_at: new Date().toISOString(),
        });

      // Create budgets
      await supabase
        .from('budgets')
        .insert([
          {
            name: 'Q1 Budget',
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            budget_type: 'quarterly',
            total_budget: 100000,
            spent_amount: 75000,
            start_date: '2024-01-01',
            end_date: '2024-03-31',
          },
          {
            name: 'At Risk Budget',
            enterprise_id: testEnterprise.id,
            created_by: adminUser.id,
            owner_id: adminUser.id,
            budget_type: 'annual',
            total_budget: 50000,
            spent_amount: 48000,
            status: 'at_risk',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
          },
        ]);
    });

    it('should generate weekly digest for authenticated user', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/generate-digest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.digest).toBeDefined();
      expect(result.digest.new_contracts).toBe(2);
      expect(result.digest.expiring_contracts).toBe(1);
      expect(result.digest.pending_approvals).toBe(1);
      expect(result.digest.new_vendors).toBe(1);
      expect(result.digest.avg_budget_utilization).toBe(87); // (75% + 96%) / 2
      expect(result.digest.at_risk_budgets).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/generate-digest`, {
        method: 'POST',
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('No authorization header');
    });

    it('should handle users with no data', async () => {
      // Create new user with no contracts/vendors/budgets
      const emptyUser = await createTestUser(testEnterprise.id, 'user');

      const response = await fetch(`${FUNCTION_URL}/notifications/generate-digest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emptyUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.digest.new_contracts).toBe(0);
      expect(result.digest.new_vendors).toBe(0);
      expect(result.digest.avg_budget_utilization).toBe(0);
    });
  });

  describe('Template rendering', () => {
    it('should correctly render templates with data', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'test@example.com',
          template: 'vendor_compliance',
          data: {
            user_name: 'Jane Smith',
            vendor_name: 'XYZ Corp',
            issue_type: 'Insurance Expiry',
            issue_description: 'Liability insurance certificate has expired.',
            severity: 'High',
            required_action: 'Request updated insurance certificate',
            action_url: 'https://app.pactwise.com/vendors/456',
          },
        }),
      });

      expect(response.status).toBe(200);

      // Verify the email was sent with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          body: expect.stringContaining('XYZ Corp'),
        }),
      );
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/unknown`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const result = await response.json();
      expect(result.error).toBe('Not found');
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/notifications/send-email`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });
});