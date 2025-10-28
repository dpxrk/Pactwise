// @ts-ignore - Deno imports
import { encode, decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
// @ts-ignore - Deno imports
import { create, verify, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AgentCredentials {
  agentId: string;
  apiKey?: string;
  jwtSecret?: string;
  permissions?: string[];
}

export interface AgentToken {
  agentId: string;
  enterpriseId: string;
  type: 'access' | 'refresh';
  scope: string[];
  expiresAt: Date;
}

export interface AgentAuthContext {
  authenticated: boolean;
  agentId?: string;
  enterpriseId?: string;
  permissions?: string[];
  trustLevel?: string;
}

export class AgentAuthService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate a new API key for an agent
   */
  async generateApiKey(
    agentId: string,
    createdBy: string,
    expiresInDays: number = 365,
  ): Promise<{ apiKey: string; keyId: string; expiresAt: Date }> {
    const { data, error } = await this.supabase.rpc('generate_agent_api_key', {
      p_agent_id: agentId,
      p_created_by: createdBy,
      p_expires_in_days: expiresInDays,
    });

    if (error) {throw new Error(`Failed to generate API key: ${error.message}`);}

    return {
      apiKey: data[0].api_key,
      keyId: data[0].key_id,
      expiresAt: new Date(data[0].expires_at),
    };
  }

  /**
   * Validate an API key and return agent information
   */
  async validateApiKey(apiKey: string): Promise<AgentAuthContext> {
    const { data, error } = await this.supabase.rpc('validate_agent_api_key', {
      p_api_key: apiKey,
    });

    if (error || !data?.[0].is_valid) {
      return {
        authenticated: false,
      };
    }

    // Get agent permissions
    const permissions = await this.getAgentPermissions(data[0].agent_id);

    return {
      authenticated: true,
      agentId: data[0].agent_id,
      enterpriseId: data[0].enterprise_id,
      permissions,
    };
  }

  /**
   * Generate a JWT token for agent-to-agent communication
   */
  async generateJWT(
    agentId: string,
    enterpriseId: string,
    scope: string[] = [],
    expiresIn: number = 3600, // 1 hour default
  ): Promise<string> {
    // Get or create JWT secret for the agent
    const secret = await this.getOrCreateJWTSecret(agentId);

    const payload = {
      sub: agentId,
      iss: 'pactwise-agent-system',
      aud: 'pactwise-agents',
      iat: getNumericDate(0),
      exp: getNumericDate(expiresIn),
      enterpriseId,
      scope,
      type: 'agent',
    };

    const key = new TextEncoder().encode(secret);
    const jwt = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

    // Store token record
    await this.storeAuthToken(agentId, jwt, 'access', scope, expiresIn);

    return jwt;
  }

  /**
   * Verify a JWT token
   */
  async verifyJWT(token: string, expectedAgentId?: string): Promise<AgentAuthContext> {
    try {
      // Extract agent ID from token to get the secret
      const [, payloadBase64] = token.split('.');
      const payloadText = new TextDecoder().decode(decode(payloadBase64));
      const payload = JSON.parse(payloadText);

      if (expectedAgentId && payload.sub !== expectedAgentId) {
        return { authenticated: false };
      }

      // Get JWT secret for verification
      const secret = await this.getJWTSecret(payload.sub);
      if (!secret) {
        return { authenticated: false };
      }

      const key = new TextEncoder().encode(secret);
      const verified = await verify(token, key);

      // Check if token is expired
      if (verified.exp && verified.exp < getNumericDate(0)) {
        return { authenticated: false };
      }

      // Verify token hasn't been revoked
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        return { authenticated: false };
      }

      return {
        authenticated: true,
        agentId: verified.sub as string,
        enterpriseId: verified.enterpriseId as string,
        permissions: verified.scope as string[],
      };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return { authenticated: false };
    }
  }

  /**
   * Check if one agent trusts another for a specific operation
   */
  async checkAgentTrust(
    trustorId: string,
    trusteeId: string,
    operation?: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('check_agent_trust', {
      p_trustor_id: trustorId,
      p_trustee_id: trusteeId,
      p_operation: operation,
    });

    return !error && data === true;
  }

  /**
   * Check if an agent has a specific permission
   */
  async checkPermission(
    agentId: string,
    permissionType: string,
    resourceType?: string,
    resourceId?: string,
    action?: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('check_agent_permission', {
      p_agent_id: agentId,
      p_permission_type: permissionType,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_action: action,
    });

    return !error && data === true;
  }

  /**
   * Establish trust between two agents
   */
  async establishTrust(
    trustorId: string,
    trusteeId: string,
    trustLevel: 'full' | 'limited' | 'read_only',
    allowedOperations: string[] = [],
    establishedBy: string,
    validForDays?: number,
  ): Promise<void> {
    const validUntil = validForDays
      ? new Date(Date.now() + validForDays * 24 * 60 * 60 * 1000)
      : null;

    const { error } = await this.supabase
      .from('agent_trust_relationships')
      .upsert({
        trustor_agent_id: trustorId,
        trustee_agent_id: trusteeId,
        trust_level: trustLevel,
        allowed_operations: allowedOperations,
        established_by: establishedBy,
        valid_until: validUntil?.toISOString(),
        enterprise_id: await this.getAgentEnterpriseId(trustorId),
      });

    if (error) {throw new Error(`Failed to establish trust: ${error.message}`);}
  }

  /**
   * Grant permission to an agent
   */
  async grantPermission(
    agentId: string,
    permissionType: string,
    grantedBy: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      allowedActions?: string[];
      conditions?: Record<string, unknown>;
      validForDays?: number;
    } = {},
  ): Promise<void> {
    const validUntil = options.validForDays
      ? new Date(Date.now() + options.validForDays * 24 * 60 * 60 * 1000)
      : null;

    const { error } = await this.supabase
      .from('agent_permissions')
      .insert({
        agent_id: agentId,
        permission_type: permissionType,
        resource_type: options.resourceType,
        resource_id: options.resourceId,
        allowed_actions: options.allowedActions || [],
        conditions: options.conditions || {},
        granted_by: grantedBy,
        valid_until: validUntil?.toISOString(),
        enterprise_id: await this.getAgentEnterpriseId(agentId),
      });

    if (error) {throw new Error(`Failed to grant permission: ${error.message}`);}
  }

  /**
   * Revoke an agent's credentials
   */
  async revokeCredentials(
    agentId: string,
    credentialType: 'api_key' | 'jwt_secret',
    revokedBy: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('agent_credentials')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        revoke_reason: reason,
      })
      .eq('agent_id', agentId)
      .eq('credential_type', credentialType)
      .eq('is_active', true);

    if (error) {throw new Error(`Failed to revoke credentials: ${error.message}`);}

    // Also revoke all active tokens
    await this.revokeAllTokens(agentId, reason);
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    agentId: string,
    eventType: string,
    success: boolean,
    metadata: Record<string, unknown> = {},
    failureReason?: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('agent_auth_logs')
      .insert({
        agent_id: agentId,
        event_type: eventType,
        success,
        failure_reason: failureReason,
        metadata,
        enterprise_id: await this.getAgentEnterpriseId(agentId),
      });

    if (error) {console.error('Failed to log auth event:', error);}
  }

  // Private helper methods

  private async getOrCreateJWTSecret(agentId: string): Promise<string> {
    // Check for existing active secret
    const { data: existing } = await this.supabase
      .from('agent_credentials')
      .select('credential_value')
      .eq('agent_id', agentId)
      .eq('credential_type', 'jwt_secret')
      .eq('is_active', true)
      .single();

    if (existing) {
      return existing.credential_value;
    }

    // Generate new secret
    const secret = this.generateSecureSecret();
    const secretHash = await this.hashValue(secret);

    const { error } = await this.supabase
      .from('agent_credentials')
      .insert({
        agent_id: agentId,
        credential_type: 'jwt_secret',
        credential_value: secret, // In production, encrypt this
        credential_hash: secretHash,
        enterprise_id: await this.getAgentEnterpriseId(agentId),
      });

    if (error) {throw new Error(`Failed to create JWT secret: ${error.message}`);}

    return secret;
  }

  private async getJWTSecret(agentId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('agent_credentials')
      .select('credential_value')
      .eq('agent_id', agentId)
      .eq('credential_type', 'jwt_secret')
      .eq('is_active', true)
      .single();

    return data?.credential_value || null;
  }

  private async storeAuthToken(
    agentId: string,
    token: string,
    tokenType: 'access' | 'refresh',
    scope: string[],
    expiresIn: number,
  ): Promise<void> {
    const tokenHash = await this.hashValue(token);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const { error } = await this.supabase
      .from('agent_auth_tokens')
      .insert({
        agent_id: agentId,
        token_hash: tokenHash,
        token_type: tokenType,
        expires_at: expiresAt.toISOString(),
        scope,
        enterprise_id: await this.getAgentEnterpriseId(agentId),
      });

    if (error) {console.error('Failed to store auth token:', error);}
  }

  private async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = await this.hashValue(token);

    const { data } = await this.supabase
      .from('agent_auth_tokens')
      .select('is_revoked')
      .eq('token_hash', tokenHash)
      .single();

    return data?.is_revoked === true;
  }

  private async revokeAllTokens(agentId: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_auth_tokens')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
      })
      .eq('agent_id', agentId)
      .eq('is_revoked', false);

    if (error) {console.error('Failed to revoke tokens:', error);}
  }

  private async getAgentPermissions(agentId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('agent_permissions')
      .select('permission_type, allowed_actions')
      .eq('agent_id', agentId)
      .or('valid_until.is.null,valid_until.gt.now()');

    if (!data) {return [];}

    // Flatten permissions
    const permissions: string[] = [];
    for (const perm of data) {
      permissions.push(perm.permission_type);
      if (perm.allowed_actions) {
        permissions.push(...perm.allowed_actions.map((a: string) => `${perm.permission_type}:${a}`));
      }
    }

    return permissions;
  }

  private async getAgentEnterpriseId(agentId: string): Promise<string> {
    const { data } = await this.supabase
      .from('agents')
      .select('enterprise_id')
      .eq('id', agentId)
      .single();

    if (!data) {throw new Error('Agent not found');}
    return data.enterprise_id;
  }

  private generateSecureSecret(length: number = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return encode(bytes);
  }

  private async hashValue(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Authentication middleware for agent requests
 */
export async function authenticateAgent(
  req: Request,
  supabase: SupabaseClient,
): Promise<AgentAuthContext> {
  const authService = new AgentAuthService(supabase);

  // Check for API key in header
  const apiKey = req.headers.get('X-Agent-API-Key');
  if (apiKey) {
    return authService.validateApiKey(apiKey);
  }

  // Check for JWT token in Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return authService.verifyJWT(token);
  }

  return { authenticated: false };
}

/**
 * Decorator for requiring authentication on agent methods
 */
export function requireAuth(
  _target: unknown,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    const context = (this as { authContext?: AuthContext }).authContext;

    if (!context?.authenticated) {
      throw new Error('Authentication required');
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * Decorator for requiring specific permissions
 */
export function requirePermission(permission: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const context = (this as { authContext?: AuthContext }).authContext;

      if (!context?.authenticated) {
        throw new Error('Authentication required');
      }

      if (!context.permissions?.includes(permission)) {
        throw new Error(`Permission denied: ${permission} required`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}