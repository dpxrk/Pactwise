import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser, createTestEnterprise, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Auth Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create test enterprise
    testEnterprise = await createTestEnterprise();

    // Create admin user
    adminUser = await createTestUser(testEnterprise.id, 'admin');
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user with existing enterprise', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          enterpriseId: testEnterprise.id,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.session).toBeDefined();
      expect(data.enterpriseId).toBe(testEnterprise.id);
      expect(data.role).toBe('viewer');

      // Verify user was created in users table
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'newuser@test.com')
        .single();

      expect(userData).toBeDefined();
      expect(userData.first_name).toBe('New');
      expect(userData.last_name).toBe('User');
      expect(userData.role).toBe('viewer');
      expect(userData.enterprise_id).toBe(testEnterprise.id);
    });

    it('should create new enterprise for first user', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'owner@newcompany.com',
          password: 'password123',
          firstName: 'Company',
          lastName: 'Owner',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.enterpriseId).toBeDefined();
      expect(data.role).toBe('owner');

      // Verify enterprise was created
      const { data: enterprise } = await supabase
        .from('enterprises')
        .select('*')
        .eq('id', data.enterpriseId)
        .single();

      expect(enterprise).toBeDefined();
      expect(enterprise.name).toBe("Company Owner's Organization");
      expect(enterprise.domain).toBe('newcompany.com');
    });

    it('should handle domain-based enterprise association', async () => {
      // Create enterprise with domain
      await supabase
        .from('enterprises')
        .update({ domain: 'testdomain.com' })
        .eq('id', testEnterprise.id);

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@testdomain.com',
          password: 'password123',
          firstName: 'Domain',
          lastName: 'User',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.enterpriseId).toBe(testEnterprise.id);
    });

    it('should handle invitation code', async () => {
      // Create invitation
      const { } = await supabase
        .from('invitations')
        .insert({
          enterprise_id: testEnterprise.id,
          email: 'invited@test.com',
          role: 'manager',
          code: 'TESTCODE',
          invited_by: adminUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invited@test.com',
          password: 'password123',
          firstName: 'Invited',
          lastName: 'User',
          inviteCode: 'TESTCODE',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.enterpriseId).toBe(testEnterprise.id);
      expect(data.role).toBe('manager');

      // Verify invitation was marked as used
      const { data: usedInvitation } = await supabase
        .from('invitations')
        .select('is_used')
        .eq('code', 'TESTCODE')
        .single();

      expect(usedInvitation?.is_used).toBe(true);
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'short',
          firstName: '',
          lastName: '',
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle duplicate email', async () => {
      // First signup
      await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'First',
          lastName: 'User',
          enterpriseId: testEnterprise.id,
        }),
      });

      // Second signup with same email
      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'duplicate@test.com',
          password: 'password123',
          firstName: 'Second',
          lastName: 'User',
          enterpriseId: testEnterprise.id,
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with enterprise info', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.email).toBe(adminUser.email);
      expect(profile.enterprise).toBeDefined();
      expect(profile.enterprise.id).toBe(testEnterprise.id);
      expect(profile.role).toBe('admin');
    });

    it('should update last login time', async () => {
      // Get initial last login
      const { data: userBefore } = await supabase
        .from('users')
        .select('last_login_at')
        .eq('id', adminUser.id)
        .single();

      // Make profile request
      await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      // Check updated last login
      const { data: userAfter } = await supabase
        .from('users')
        .select('last_login_at')
        .eq('id', adminUser.id)
        .single();

      expect(new Date(userAfter!.last_login_at) > new Date(userBefore!.last_login_at || 0)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('No authorization header');
    });

    it('should handle invalid token', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'Engineering',
        title: 'Senior Developer',
        phoneNumber: '+1234567890',
      };

      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.first_name).toBe('Updated');
      expect(data.last_name).toBe('Name');
      expect(data.department).toBe('Engineering');
      expect(data.title).toBe('Senior Developer');
      expect(data.phone_number).toBe('+1234567890');
    });

    it('should validate profile updates', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: '', // Invalid - empty string
          department: 'A'.repeat(101), // Invalid - too long
        }),
      });

      expect(response.status).toBe(500);
    });

    it('should require authentication for updates', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Updated',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/verify-pin', () => {
    it('should verify valid enterprise PIN', async () => {
      // Set PIN for test enterprise
      const pin = '123456';
      await supabase
        .from('enterprises')
        .update({ access_pin: pin })
        .eq('id', testEnterprise.id);

      const response = await fetch(`${FUNCTION_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enterpriseId: testEnterprise.id,
          pin,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.verified).toBe(true);
      expect(data.enterprise.id).toBe(testEnterprise.id);
      expect(data.enterprise.name).toBe(testEnterprise.name);
    });

    it('should reject invalid PIN', async () => {
      // Set PIN for test enterprise
      await supabase
        .from('enterprises')
        .update({ access_pin: '123456' })
        .eq('id', testEnterprise.id);

      const response = await fetch(`${FUNCTION_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enterpriseId: testEnterprise.id,
          pin: 'wrong-pin',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid PIN');
    });
  });

  describe('POST /auth/invite', () => {
    it('should create invitation as admin', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newmember@test.com',
          role: 'user',
          expiresIn: 7,
        }),
      });

      expect(response.status).toBe(201);
      const invitation = await response.json();
      expect(invitation.email).toBe('newmember@test.com');
      expect(invitation.role).toBe('user');
      expect(invitation.enterprise_id).toBe(testEnterprise.id);
      expect(invitation.invited_by).toBe(adminUser.id);
      expect(invitation.code).toBeDefined();
      expect(invitation.code.length).toBe(8);

      // Verify expiration date
      const expiresAt = new Date(invitation.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      expect(expiresAt.getDate()).toBe(expectedExpiry.getDate());
    });

    it('should create invitation as owner', async () => {
      const owner = await createTestUser(testEnterprise.id, 'owner');

      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${owner.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'vip@test.com',
          role: 'admin',
        }),
      });

      expect(response.status).toBe(201);
      const invitation = await response.json();
      expect(invitation.role).toBe('admin');
    });

    it('should use default values when not provided', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'minimal@test.com',
        }),
      });

      expect(response.status).toBe(201);
      const invitation = await response.json();
      expect(invitation.role).toBe('user'); // Default role

      // Default expiry is 7 days
      const expiresAt = new Date(invitation.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);
      expect(expiresAt.getDate()).toBe(expectedExpiry.getDate());
    });

    it('should deny invitation creation for non-admin users', async () => {
      const regularUser = await createTestUser(testEnterprise.id, 'user');

      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'denied@test.com',
          role: 'user',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'noauth@test.com',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('No authorization header');
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/unknown`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Not found');
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });
});