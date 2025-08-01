import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { provisionUser, updateLastLogin, getUserPermissions } from '../supabase/functions/_shared/auth';

describe('Authentication System', () => {
  let supabase: any;
  let testUser: any;
  let testEnterprise: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test enterprise
    const { data: enterprise } = await supabase
      .from('enterprises')
      .insert({
        name: 'Test Enterprise',
        domain: 'test.com',
        industry: 'technology'
      })
      .select()
      .single();
    
    testEnterprise = enterprise;
  });

  afterEach(async () => {
    // Cleanup
    if (testUser) {
      await supabase.from('users').delete().eq('id', testUser.id);
    }
    if (testEnterprise) {
      await supabase.from('enterprises').delete().eq('id', testEnterprise.id);
    }
  });

  describe('User Provisioning', () => {
    it('should provision new user successfully', async () => {
      const authUser = {
        id: 'test-auth-id',
        email: 'test@test.com',
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        }
      };

      const result = await provisionUser({
        auth_user: authUser,
        enterprise_domain: 'test.com'
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('test@test.com');
      expect(result.enterprise_id).toBe(testEnterprise.id);
      testUser = result;
    });

    it('should handle invitation code correctly', async () => {
      // Create invitation
      const { } = await supabase
        .from('invitations')
        .insert({
          email: 'invited@test.com',
          enterprise_id: testEnterprise.id,
          role: 'user',
          code: 'TEST123',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      const authUser = {
        id: 'test-invited-id',
        email: 'invited@test.com'
      };

      const result = await provisionUser({
        auth_user: authUser,
        invitation_code: 'TEST123'
      });

      expect(result.role).toBe('user');
      expect(result.enterprise_id).toBe(testEnterprise.id);
      testUser = result;
    });

    it('should reject invalid invitation codes', async () => {
      const authUser = {
        id: 'test-invalid-id',
        email: 'invalid@test.com'
      };

      await expect(provisionUser({
        auth_user: authUser,
        invitation_code: 'INVALID'
      })).rejects.toThrow('Invalid or expired invitation code');
    });
  });

  describe('User Permissions', () => {
    beforeEach(async () => {
      const { data: user } = await supabase
        .from('users')
        .insert({
          auth_id: 'test-user-id',
          email: 'perm@test.com',
          enterprise_id: testEnterprise.id,
          role: 'manager'
        })
        .select()
        .single();
      
      testUser = user;
    });

    it('should return correct permissions for manager role', async () => {
      const permissions = await getUserPermissions(supabase, testUser, 'contracts');

      expect(permissions.canView).toBe(true);
      expect(permissions.canCreate).toBe(true);
      expect(permissions.canUpdate).toBe(true);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canManage).toBe(false);
    });

    it('should return correct permissions for different resources', async () => {
      const contractPerms = await getUserPermissions(supabase, testUser, 'contracts');
      const settingsPerms = await getUserPermissions(supabase, testUser, 'settings');

      expect(contractPerms.canCreate).toBe(true);
      expect(settingsPerms.canCreate).toBe(false);
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      const { data: user } = await supabase
        .from('users')
        .insert({
          auth_id: 'test-session-id',
          email: 'session@test.com',
          enterprise_id: testEnterprise.id,
          role: 'user'
        })
        .select()
        .single();
      
      testUser = user;
    });

    it('should update last login timestamp', async () => {
      const beforeLogin = new Date(testUser.last_login_at || 0);
      
      await updateLastLogin(supabase, testUser.id, {
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser'
      });

      const { data: updatedUser } = await supabase
        .from('users')
        .select('last_login_at')
        .eq('id', testUser.id)
        .single();

      const afterLogin = new Date(updatedUser.last_login_at);
      expect(afterLogin > beforeLogin).toBe(true);
    });

    it('should create session record', async () => {
      await updateLastLogin(supabase, testUser.id, {
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser'
      });

      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', testUser.id);

      expect(sessions).toBeDefined();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].ip_address).toBe('192.168.1.1');
    });
  });
});