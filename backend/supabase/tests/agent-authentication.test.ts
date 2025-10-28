import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, createTestEnterprise, createTestUser } from '../../tests/setup';
import { SupabaseClient } from '@supabase/supabase-js';
import { AgentAuthService } from '../functions/local-agents/utils/auth';
import { SecureAgentChannel, AgentProtocol } from '../functions/local-agents/utils/secure-communication';

describe('Agent Authentication System', () => {
  let supabase: SupabaseClient;
  let enterpriseId: string;
  let userId: string;
  let authService: AgentAuthService;
  let agent1Id: string;
  let agent2Id: string;

  beforeEach(async () => {
    supabase = await setupTestDatabase();
    authService = new AgentAuthService(supabase);

    // First create enterprise
    const enterprise = await createTestEnterprise();
    enterpriseId = enterprise.id;
    
    // Then create user with that enterprise
    const user = await createTestUser(enterpriseId, 'admin');
    userId = user.id;

    // Create test agents
    const { data: agent1 } = await supabase
      .from('agents')
      .insert({
        name: 'Test Secretary Agent',
        type: 'secretary',
        enterprise_id: enterpriseId,
      })
      .select()
      .single();
    agent1Id = agent1.id;

    const { data: agent2 } = await supabase
      .from('agents')
      .insert({
        name: 'Test Financial Agent',
        type: 'financial',
        enterprise_id: enterpriseId,
      })
      .select()
      .single();
    agent2Id = agent2.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase(supabase);
  });

  describe('API Key Management', () => {
    it('should generate unique API keys for agents', async () => {
      const credentials1 = await authService.generateApiKey(agent1Id, userId);
      const credentials2 = await authService.generateApiKey(agent2Id, userId);

      expect(credentials1.apiKey).toBeDefined();
      expect(credentials2.apiKey).toBeDefined();
      expect(credentials1.apiKey).not.toBe(credentials2.apiKey);
      expect(credentials1.apiKey).toMatch(/^pak_[A-Za-z0-9]+$/);
      expect(credentials1.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should validate correct API keys', async () => {
      const { apiKey } = await authService.generateApiKey(agent1Id, userId);

      const authContext = await authService.validateApiKey(apiKey);

      expect(authContext.authenticated).toBe(true);
      expect(authContext.agentId).toBe(agent1Id);
      expect(authContext.enterpriseId).toBe(enterpriseId);
    });

    it('should reject invalid API keys', async () => {
      const authContext = await authService.validateApiKey('pak_invalid_key_12345');

      expect(authContext.authenticated).toBe(false);
      expect(authContext.agentId).toBeUndefined();
    });

    it('should handle expired API keys', async () => {
      // Generate key with short expiration
      const { apiKey, keyId } = await authService.generateApiKey(agent1Id, userId, 0);

      // Manually expire the key
      await supabase
        .from('agent_credentials')
        .update({
          expires_at: new Date(Date.now() - 1000).toISOString(),
        })
        .eq('id', keyId);

      const authContext = await authService.validateApiKey(apiKey);

      expect(authContext.authenticated).toBe(false);
    });

    it('should revoke API keys', async () => {
      const { apiKey } = await authService.generateApiKey(agent1Id, userId);

      // Verify key works
      let authContext = await authService.validateApiKey(apiKey);
      expect(authContext.authenticated).toBe(true);

      // Revoke the key
      await authService.revokeCredentials(agent1Id, 'api_key', userId, 'Security update');

      // Verify key no longer works
      authContext = await authService.validateApiKey(apiKey);
      expect(authContext.authenticated).toBe(false);
    });

    it('should rotate API keys', async () => {
      const { apiKey: oldKey } = await authService.generateApiKey(agent1Id, userId);

      // Generate new key (automatically deactivates old one)
      const { apiKey: newKey } = await authService.generateApiKey(agent1Id, userId);

      // Old key should not work
      const oldAuth = await authService.validateApiKey(oldKey);
      expect(oldAuth.authenticated).toBe(false);

      // New key should work
      const newAuth = await authService.validateApiKey(newKey);
      expect(newAuth.authenticated).toBe(true);
    });
  });

  describe('JWT Token Management', () => {
    it('should generate and verify JWT tokens', async () => {
      const scope = ['read_contracts', 'create_insights'];
      const token = await authService.generateJWT(agent1Id, enterpriseId, scope);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT format

      const authContext = await authService.verifyJWT(token);

      expect(authContext.authenticated).toBe(true);
      expect(authContext.agentId).toBe(agent1Id);
      expect(authContext.enterpriseId).toBe(enterpriseId);
      expect(authContext.permissions).toEqual(scope);
    });

    it('should reject tampered JWT tokens', async () => {
      const token = await authService.generateJWT(agent1Id, enterpriseId);

      // Tamper with the token
      const parts = token.split('.');
      parts[1] = `${parts[1].substring(0, parts[1].length - 2)}XX`; // Modify payload
      const tamperedToken = parts.join('.');

      const authContext = await authService.verifyJWT(tamperedToken);

      expect(authContext.authenticated).toBe(false);
    });

    it('should handle JWT token expiration', async () => {
      // Generate token with 1 second expiration
      const token = await authService.generateJWT(agent1Id, enterpriseId, [], 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const authContext = await authService.verifyJWT(token);

      expect(authContext.authenticated).toBe(false);
    });

    it('should track token usage', async () => {
      const token = await authService.generateJWT(agent1Id, enterpriseId);
      const tokenHash = await hashValue(token);

      // Check token was stored
      const { data: storedToken } = await supabase
        .from('agent_auth_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();

      expect(storedToken).toBeDefined();
      expect(storedToken.agent_id).toBe(agent1Id);
      expect(storedToken.token_type).toBe('access');
    });
  });

  describe('Agent Permissions', () => {
    it('should grant and check permissions', async () => {
      await authService.grantPermission(
        agent1Id,
        'read_financial_data',
        userId,
        {
          resourceType: 'financial_reports',
          allowedActions: ['read', 'list'],
        },
      );

      const hasPermission = await authService.checkPermission(
        agent1Id,
        'read_financial_data',
        'financial_reports',
        undefined,
        'read',
      );

      expect(hasPermission).toBe(true);

      // Check non-granted permission
      const hasOtherPermission = await authService.checkPermission(
        agent1Id,
        'write_financial_data',
        'financial_reports',
      );

      expect(hasOtherPermission).toBe(false);
    });

    it('should handle permission expiration', async () => {
      await authService.grantPermission(
        agent1Id,
        'temporary_access',
        userId,
        {
          validForDays: 0, // Expires immediately
        },
      );

      // Update to expired
      await supabase
        .from('agent_permissions')
        .update({
          valid_until: new Date(Date.now() - 1000).toISOString(),
        })
        .eq('agent_id', agent1Id)
        .eq('permission_type', 'temporary_access');

      const hasPermission = await authService.checkPermission(
        agent1Id,
        'temporary_access',
      );

      expect(hasPermission).toBe(false);
    });

    it('should support wildcard permissions', async () => {
      await authService.grantPermission(
        agent1Id,
        'admin_access',
        userId,
        {
          // No resourceType or resourceId = wildcard
          allowedActions: ['read', 'write', 'delete'],
        },
      );

      // Should match any resource
      const hasPermission1 = await authService.checkPermission(
        agent1Id,
        'admin_access',
        'contracts',
        'some-id',
        'write',
      );

      const hasPermission2 = await authService.checkPermission(
        agent1Id,
        'admin_access',
        'vendors',
        undefined,
        'read',
      );

      expect(hasPermission1).toBe(true);
      expect(hasPermission2).toBe(true);
    });
  });

  describe('Agent Trust Relationships', () => {
    it('should establish bidirectional trust', async () => {
      const channel = new SecureAgentChannel(supabase, agent1Id, enterpriseId);

      await channel.establishBidirectionalTrust(
        agent2Id,
        'limited',
        ['share_insights', 'request_data'],
        userId,
        30,
      );

      // Check trust in both directions
      const trust1to2 = await authService.checkAgentTrust(
        agent2Id,
        agent1Id,
        'share_insights',
      );
      const trust2to1 = await authService.checkAgentTrust(
        agent1Id,
        agent2Id,
        'request_data',
      );

      expect(trust1to2).toBe(true);
      expect(trust2to1).toBe(true);

      // Check non-allowed operation
      const trustOther = await authService.checkAgentTrust(
        agent1Id,
        agent2Id,
        'delete_data',
      );

      expect(trustOther).toBe(false);
    });

    it('should track trust interactions', async () => {
      await authService.establishTrust(
        agent1Id,
        agent2Id,
        'full',
        [],
        userId,
      );

      // Perform multiple trust checks (simulating interactions)
      for (let i = 0; i < 3; i++) {
        await authService.checkAgentTrust(agent1Id, agent2Id);
      }

      // Check interaction count
      const { data: trust } = await supabase
        .from('agent_trust_relationships')
        .select('interaction_count, last_interaction_at')
        .eq('trustor_agent_id', agent1Id)
        .eq('trustee_agent_id', agent2Id)
        .single();

      expect(trust?.interaction_count).toBe(3);
      expect(trust ? new Date(trust.last_interaction_at).getTime() : 0).toBeGreaterThan(
        Date.now() - 5000,
      );
    });
  });

  describe('Secure Agent Communication', () => {
    it('should send and receive secure messages', async () => {
      // Set up trust
      const channel1 = new SecureAgentChannel(supabase, agent1Id, enterpriseId);
      // const channel2 = new SecureAgentChannel(supabase, agent2Id, enterpriseId);

      await channel1.establishBidirectionalTrust(
        agent2Id,
        'full',
        [AgentProtocol.Operations.SHARE_INSIGHTS],
        userId,
      );

      // Create a mock for message transmission
      vi.spyOn(channel1 as unknown as SecureChannel, 'transmitMessage').mockResolvedValue({
        success: true,
        data: { received: true },
      });

      // Send message from agent1 to agent2
      const payload = {
        insights: [
          { type: 'risk', severity: 'high', description: 'Test insight' },
        ],
      };

      const response = await channel1.sendMessage(
        agent2Id,
        AgentProtocol.Operations.SHARE_INSIGHTS,
        payload,
        { requireSignature: true },
      );

      expect(response.success).toBe(true);
      expect(response.data.received).toBe(true);
    });

    it('should encrypt sensitive messages', async () => {
      const channel = new SecureAgentChannel(supabase, agent1Id, enterpriseId);

      // Mock trust and transmission
      vi.spyOn(authService, 'checkAgentTrust').mockResolvedValue(true);
      let capturedMessage: unknown;
      vi.spyOn(channel as unknown as SecureChannel, 'transmitMessage').mockImplementation(
        async (_targetId: string, _op: string, message: unknown) => {
          capturedMessage = message;
          return { success: true };
        },
      );

      await channel.sendMessage(
        agent2Id,
        'share_secrets',
        { secret: 'confidential-data' },
        { encryptPayload: true },
      );

      expect(capturedMessage.payload).toMatch(/^ENCRYPTED:/);
      expect(capturedMessage.payload).not.toContain('confidential-data');
    });

    it('should validate message signatures', async () => {
      const channel = new SecureAgentChannel(supabase, agent2Id, enterpriseId);

      // Create a message with valid signature
      const message: Record<string, unknown> = {
        id: 'test-123',
        from: agent1Id,
        to: agent2Id,
        timestamp: new Date().toISOString(),
        payload: { test: true },
      };

      // Generate valid signature
      const signature = await (channel as unknown as SecureChannel).signMessage(message);
      message.signature = signature;

      // Generate valid token
      vi.spyOn(authService, 'verifyJWT').mockResolvedValue({
        authenticated: true,
        agentId: agent1Id,
        enterpriseId,
      });
      vi.spyOn(authService, 'checkAgentTrust').mockResolvedValue(true);

      const result = await channel.receiveMessage(message, 'valid-token');

      expect(result.authenticated).toBe(true);
      expect(result.payload).toEqual({ test: true });

      // Tamper with message
      message.payload = { test: false };

      const tamperedResult = await channel.receiveMessage(message, 'valid-token');

      expect(tamperedResult.authenticated).toBe(false);
    });
  });

  describe('Authentication Logs', () => {
    it('should log authentication events', async () => {
      const { apiKey } = await authService.generateApiKey(agent1Id, userId);

      // Successful auth
      await authService.validateApiKey(apiKey);

      // Failed auth
      await authService.validateApiKey('invalid_key');

      // Check logs
      const { data: logs } = await supabase
        .from('agent_auth_logs')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('created_at', { ascending: false });

      expect(logs?.length || 0).toBeGreaterThanOrEqual(3); // create, success, failure

      const successLog = logs?.find((l: { event_type: string; success: boolean }) => l.event_type === 'api_key_auth' && l.success);
      const failureLog = logs?.find((l: { event_type: string }) => l.event_type === 'auth_failure');

      expect(successLog).toBeDefined();
      expect(successLog.agent_id).toBe(agent1Id);
      expect(failureLog).toBeDefined();
      expect(failureLog.failure_reason).toContain('Invalid');
    });

    it('should log permission checks', async () => {
      await authService.grantPermission(agent1Id, 'test_permission', userId);

      // Check permission (success)
      await authService.checkPermission(agent1Id, 'test_permission');

      // Check permission (failure)
      await authService.checkPermission(agent1Id, 'non_existent_permission');

      const { data: logs } = await supabase
        .from('agent_auth_logs')
        .select('*')
        .eq('agent_id', agent1Id)
        .eq('event_type', 'permission_check');

      expect(logs?.length || 0).toBe(2);
      expect(logs?.filter((l: { success: boolean }) => l.success).length || 0).toBe(1);
      expect(logs?.filter((l: { success: boolean }) => !l.success).length || 0).toBe(1);
    });
  });

  describe('Security Features', () => {
    it('should handle concurrent authentication attempts', async () => {
      const { apiKey } = await authService.generateApiKey(agent1Id, userId);

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() =>
        authService.validateApiKey(apiKey),
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.authenticated).toBe(true);
        expect(result.agentId).toBe(agent1Id);
      });
    });

    it('should prevent privilege escalation', async () => {
      // Agent1 tries to grant permissions it doesn't have
      await expect(
        authService.grantPermission(
          agent2Id,
          'super_admin',
          agent1Id, // agent1 as granter (should fail)
          { allowedActions: ['*'] },
        ),
      ).rejects.toThrow(); // Would fail at database level due to RLS
    });

    it('should clean up expired tokens', async () => {
      // Create expired tokens
      const expiredTokens = [];
      for (let i = 0; i < 5; i++) {
        expiredTokens.push({
          agent_id: agent1Id,
          token_hash: `expired_${i}`,
          token_type: 'access',
          expires_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
          enterprise_id: enterpriseId,
        });
      }

      await supabase.from('agent_auth_tokens').insert(expiredTokens);

      // Run cleanup
      const { data: deletedCount } = await supabase
        .rpc('cleanup_expired_auth_tokens');

      expect(deletedCount).toBeGreaterThanOrEqual(5);

      // Verify tokens were deleted
      const { data: remaining } = await supabase
        .from('agent_auth_tokens')
        .select('*')
        .in('token_hash', expiredTokens.map(t => t.token_hash));

      expect(remaining).toHaveLength(0);
    });
  });
});

// Helper function
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}