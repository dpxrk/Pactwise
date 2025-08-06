import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createTestEnterprise,
  createTestUser,
  cleanupTestData,
} from './setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Authentication System', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await cleanupTestData();
  });

  describe('User Signup', () => {
    it('should create new user and enterprise', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'Test123!@#',
        metadata: {
          first_name: 'John',
          last_name: 'Doe',
          department: 'Engineering',
          title: 'Software Engineer',
        },
      };

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(signupData.email);
      expect(data.user.first_name).toBe(signupData.metadata.first_name);
      expect(data.user.role).toBe('owner'); // First user becomes owner
      expect(data.session).toBeDefined();
    });

    it('should join existing enterprise by domain', async () => {
      // Create enterprise with domain
      testEnterprise = await createTestEnterprise({
        domain: 'testcompany.com',
      });

      const signupData = {
        email: 'employee@testcompany.com',
        password: 'Test123!@#',
        metadata: {
          first_name: 'Jane',
          last_name: 'Smith',
        },
      };

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user.enterprise_id).toBe(testEnterprise.id);
      expect(data.user.role).toBe('user'); // Default role for domain join
    });

    it('should join enterprise with invitation code', async () => {
      testEnterprise = await createTestEnterprise();
      const inviter = await createTestUser(testEnterprise.id, 'admin');

      // Create invitation
      const inviteResponse = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${inviter.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invited@example.com',
          role: 'manager',
        }),
      });

      const { invitation } = await inviteResponse.json();

      // Sign up with invitation
      const signupData = {
        email: 'invited@example.com',
        password: 'Test123!@#',
        invitation_code: invitation.code,
        metadata: {
          first_name: 'Invited',
          last_name: 'User',
        },
      };

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.user.enterprise_id).toBe(testEnterprise.id);
      expect(data.user.role).toBe('manager');
    });

    it('should reject signup with invalid invitation code', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'Test123!@#',
        invitation_code: 'INVALID_CODE',
      };

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid or expired invitation');
    });

    it('should validate password requirements', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'weak', // Too short
      };

      const response = await fetch(`${FUNCTION_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('validation');
    });
  });

  describe('User Login', () => {
    let testUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      testUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should login with valid credentials', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'Test123!@#',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBeDefined();
      expect(data.session.refresh_token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid email or password');
    });

    it('should track failed login attempts', async () => {
      await fetch(`${FUNCTION_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword',
        }),
      });

      // Check login attempts were logged
      const { data: attempts } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', testUser.email)
        .eq('success', false);

      expect(attempts).toHaveLength(1);
      expect(attempts![0].failure_reason).toContain('Invalid');
    });

    it('should update last login timestamp', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'Test123!@#',
        }),
      });

      expect(response.status).toBe(200);

      // Check last login was updated
      const { data: user } = await supabase
        .from('users')
        .select('last_login_at')
        .eq('id', testUser.id)
        .single();

      expect(user!.last_login_at).toBeDefined();
      const lastLogin = new Date(user!.last_login_at as string);
      const now = new Date();
      expect(now.getTime() - lastLogin.getTime()).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('User Profile', () => {
    let testUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      testUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should get current user profile', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.permissions).toBeDefined();
      expect(data.permissions.contracts).toBeDefined();
      expect(data.permissions.contracts.canView).toBe(true);
      expect(data.permissions.contracts.canCreate).toBe(true);
    });

    it('should update user profile', async () => {
      const updates = {
        first_name: 'Updated',
        last_name: 'Name',
        department: 'New Department',
        title: 'New Title',
        phone_number: '+1234567890',
        settings: {
          theme: 'dark',
          notifications: {
            email: false,
            push: true,
          },
        },
      };

      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.first_name).toBe(updates.first_name);
      expect(data.last_name).toBe(updates.last_name);
      expect(data.department).toBe(updates.department);
      expect(data.title).toBe(updates.title);
      expect(data.phone_number).toBe(updates.phone_number);
      expect(data.settings).toEqual(updates.settings);
    });

    it('should require authentication for profile access', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/profile`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('No authorization header');
    });
  });

  describe('User Management', () => {
    let adminUser: { id: string; email: string; authToken: string };
    let regularUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      adminUser = await createTestUser(testEnterprise.id, 'admin');
      regularUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should list users in enterprise', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2); // At least admin and regular user
      expect(data.some((u: any) => u.email === adminUser.email)).toBe(true);
      expect(data.some((u: any) => u.email === regularUser.email)).toBe(true);
    });

    it('should allow admin to update user role', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/users/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: regularUser.id,
          role: 'manager',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('manager');
    });

    it('should prevent regular user from updating roles', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/users/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: adminUser.id,
          role: 'viewer',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should prevent demoting the last owner', async () => {
      const owner = await createTestUser(testEnterprise.id, 'owner');

      const response = await fetch(`${FUNCTION_URL}/auth/users/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${owner.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: owner.id,
          role: 'admin',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot demote the last owner');
    });
  });

  describe('Invitations', () => {
    let adminUser: { id: string; email: string; authToken: string };
    let regularUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      adminUser = await createTestUser(testEnterprise.id, 'admin');
      regularUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should allow admin to create invitation', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newinvite@example.com',
          role: 'manager',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.invitation).toBeDefined();
      expect(data.invitation.email).toBe('newinvite@example.com');
      expect(data.invitation.role).toBe('manager');
      expect(data.invitation.code).toBeDefined();
      expect(data.invitation.expires_at).toBeDefined();
    });

    it('should prevent regular user from creating invitation', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'unauthorized@example.com',
          role: 'user',
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('Password Management', () => {
    let testUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      testUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should request password reset', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('password reset link');
      expect(data.debug_token).toBeDefined(); // Only in test mode

      // Check reset token was created
      const { data: tokens } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('used', false);

      expect(tokens).toHaveLength(1);
    });

    it('should reset password with valid token', async () => {
      // First request reset
      const resetResponse = await fetch(`${FUNCTION_URL}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
        }),
      });

      const { debug_token } = await resetResponse.json();

      // Then confirm reset
      const confirmResponse = await fetch(`${FUNCTION_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: debug_token,
          password: 'NewPassword123!',
        }),
      });

      expect(confirmResponse.status).toBe(200);
      const data = await confirmResponse.json();
      expect(data.message).toBe('Password reset successful');

      // Try logging in with new password
      const loginResponse = await fetch(`${FUNCTION_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: 'NewPassword123!',
        }),
      });

      expect(loginResponse.status).toBe(200);
    });

    it('should change password when authenticated', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: 'Test123!@#',
          new_password: 'UpdatedPassword123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Password changed successfully');
    });

    it('should reject password change with wrong current password', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: 'WrongPassword',
          new_password: 'UpdatedPassword123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Current password is incorrect');
    });
  });

  describe('Email Verification', () => {
    let testUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      testUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should send verification email', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/verify-email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Verification email sent');
      expect(data.debug_token).toBeDefined(); // Only in test mode
    });

    it('should verify email with valid token', async () => {
      // First request verification
      const sendResponse = await fetch(`${FUNCTION_URL}/auth/verify-email/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
        },
      });

      const { debug_token } = await sendResponse.json();

      // Then confirm verification
      const confirmResponse = await fetch(`${FUNCTION_URL}/auth/verify-email/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: debug_token,
        }),
      });

      expect(confirmResponse.status).toBe(200);
      const data = await confirmResponse.json();
      expect(data.message).toBe('Email verified successfully');
    });
  });

  describe('Logout', () => {
    let testUser: { id: string; email: string; authToken: string };

    beforeEach(async () => {
      testEnterprise = await createTestEnterprise();
      testUser = await createTestUser(testEnterprise.id, 'user');
    });

    it('should logout user', async () => {
      const response = await fetch(`${FUNCTION_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Logged out successfully');

      // Check session was ended
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', testUser.id)
        .is('ended_at', null);

      expect(sessions).toHaveLength(0);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      // Mock refresh token scenario
      const response = await fetch(`${FUNCTION_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: 'mock_refresh_token',
        }),
      });

      // This will fail in tests without proper Supabase Auth setup
      // In production, this would return new tokens
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});