import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { AuthUser, UserProfile, createAdminClient } from './supabase.ts';

interface UserMetadata {
  department?: string | undefined;
  title?: string | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
  enterprise_metadata?: Record<string, unknown> | undefined;
  settings?: Record<string, unknown> | undefined;
}

interface ProvisionUserOptions {
  auth_user: AuthUser;
  invitation_code?: string | undefined;
  enterprise_domain?: string | undefined;
  role?: 'owner' | 'admin' | 'manager' | 'user' | 'viewer' | undefined;
  metadata?: UserMetadata | undefined;
}

// Provision a new user in the system
export async function provisionUser(options: ProvisionUserOptions): Promise<UserProfile> {
  const adminClient = createAdminClient();
  const { auth_user, invitation_code, enterprise_domain, role = 'user', metadata = {} } = options;

  // Check if user already exists
  const { data: existingUser } = await adminClient
    .from('users')
    .select('*')
    .eq('auth_id', auth_user.id)
    .single();

  if (existingUser) {
    return existingUser as UserProfile;
  }

  let enterpriseId: string | null = null;
  let userRole = role;

  // Process invitation if provided
  if (invitation_code) {
    const { data: invitation, error: inviteError } = await adminClient
      .from('invitations')
      .select('*, enterprise:enterprises(*)')
      .eq('code', invitation_code)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation code');
    }

    if (invitation.email !== auth_user.email) {
      throw new Error('Invitation email does not match');
    }

    enterpriseId = invitation.enterprise_id;
    userRole = invitation.role || role;

    // Mark invitation as used
    await adminClient
      .from('invitations')
      .update({
        is_used: true,
        used_by: auth_user.id,
      })
      .eq('id', invitation.id);
  }

  // Auto-associate by domain if no invitation
  if (!enterpriseId && enterprise_domain) {
    const { data: enterprise } = await adminClient
      .from('enterprises')
      .select('id')
      .eq('domain', enterprise_domain)
      .single();

    if (enterprise) {
      enterpriseId = enterprise.id;
    }
  }

  // Create new enterprise if needed (first user becomes owner)
  if (!enterpriseId) {
    const domain = auth_user.email?.split('@')[1];
    const { data: newEnterprise, error: enterpriseError } = await adminClient
      .from('enterprises')
      .insert({
        name: `${domain} Organization`,
        domain,
        metadata: {
          created_from_signup: true,
          ...metadata.enterprise_metadata,
        },
      })
      .select()
      .single();

    if (enterpriseError || !newEnterprise) {
      throw new Error('Failed to create enterprise');
    }

    enterpriseId = newEnterprise.id;
    userRole = 'owner'; // First user becomes owner
  }

  // Extract name from auth metadata or email
  const fullName = auth_user.user_metadata?.full_name ||
                   auth_user.user_metadata?.name ||
                   auth_user.email?.split('@')[0] || '';
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ');

  // Create user profile
  const { data: newUser, error: userError } = await adminClient
    .from('users')
    .insert({
      auth_id: auth_user.id,
      email: auth_user.email!,
      first_name: firstName || auth_user.user_metadata?.first_name,
      last_name: lastName || auth_user.user_metadata?.last_name,
      role: userRole,
      enterprise_id: enterpriseId,
      department: metadata.department,
      title: metadata.title,
      phone_number: auth_user.user_metadata?.phone,
      is_active: true,
      last_login_at: new Date().toISOString(),
      settings: {
        theme: 'light',
        notifications: {
          email: true,
          push: false,
        },
        ...metadata.settings,
      },
    })
    .select()
    .single();

  if (userError || !newUser) {
    console.error('User creation error:', userError);
    throw new Error('Failed to create user profile');
  }

  // Log successful provisioning
  await adminClient
    .from('user_sessions')
    .insert({
      user_id: newUser.id,
      enterprise_id: enterpriseId,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });

  return newUser as UserProfile;
}

// Update user's last login
interface SessionMetadata {
  ip_address?: string | undefined;
  user_agent?: string | undefined;
}

export async function updateLastLogin(
  client: SupabaseClient<Database>,
  userId: string,
  metadata?: SessionMetadata,
): Promise<void> {
  // Update user's last login timestamp
  await client
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  // Create or update session
  if (metadata) {
    await client
      .from('user_sessions')
      .insert({
        user_id: userId,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
      });
  }
}

// Validate user has access to enterprise
export async function validateEnterpriseAccess(
  client: SupabaseClient<Database>,
  userId: string,
  enterpriseId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('users')
    .select('enterprise_id')
    .eq('id', userId)
    .eq('enterprise_id', enterpriseId)
    .single();

  return !error && Boolean(data);
}

// Check if email domain is allowed for enterprise
export async function isDomainAllowed(
  client: SupabaseClient<Database>,
  email: string,
  enterpriseId: string,
): Promise<boolean> {
  const domain = email.split('@')[1];

  const { data: enterprise } = await client
    .from('enterprises')
    .select('domain, settings')
    .eq('id', enterpriseId)
    .single();

  if (!enterprise) {return false;}

  // Check primary domain
  if (enterprise.domain === domain) {return true;}

  // Check allowed domains in settings
  const allowedDomains = enterprise.settings?.allowed_domains || [];
  return allowedDomains.includes(domain);
}

// Get user's permissions for a resource
export async function getUserPermissions(
  _client: SupabaseClient<Database>,
  user: UserProfile,
  resource: 'contracts' | 'vendors' | 'budgets' | 'users' | 'settings',
): Promise<{
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManage: boolean;
}> {
  const rolePermissions = {
    owner: {
      contracts: { view: true, create: true, update: true, delete: true, manage: true },
      vendors: { view: true, create: true, update: true, delete: true, manage: true },
      budgets: { view: true, create: true, update: true, delete: true, manage: true },
      users: { view: true, create: true, update: true, delete: true, manage: true },
      settings: { view: true, create: true, update: true, delete: true, manage: true },
    },
    admin: {
      contracts: { view: true, create: true, update: true, delete: true, manage: true },
      vendors: { view: true, create: true, update: true, delete: true, manage: true },
      budgets: { view: true, create: true, update: true, delete: true, manage: true },
      users: { view: true, create: true, update: true, delete: false, manage: true },
      settings: { view: true, create: true, update: true, delete: false, manage: false },
    },
    manager: {
      contracts: { view: true, create: true, update: true, delete: false, manage: false },
      vendors: { view: true, create: true, update: true, delete: false, manage: false },
      budgets: { view: true, create: true, update: true, delete: false, manage: false },
      users: { view: true, create: false, update: false, delete: false, manage: false },
      settings: { view: true, create: false, update: false, delete: false, manage: false },
    },
    user: {
      contracts: { view: true, create: true, update: true, delete: false, manage: false },
      vendors: { view: true, create: true, update: true, delete: false, manage: false },
      budgets: { view: true, create: false, update: false, delete: false, manage: false },
      users: { view: true, create: false, update: false, delete: false, manage: false },
      settings: { view: false, create: false, update: false, delete: false, manage: false },
    },
    viewer: {
      contracts: { view: true, create: false, update: false, delete: false, manage: false },
      vendors: { view: true, create: false, update: false, delete: false, manage: false },
      budgets: { view: true, create: false, update: false, delete: false, manage: false },
      users: { view: true, create: false, update: false, delete: false, manage: false },
      settings: { view: false, create: false, update: false, delete: false, manage: false },
    },
  };

  const perms = rolePermissions[user.role][resource];

  return {
    canView: perms.view,
    canCreate: perms.create,
    canUpdate: perms.update,
    canDelete: perms.delete,
    canManage: perms.manage,
  };
}

// Refresh user token
export async function refreshUserToken(
  client: SupabaseClient<Database>,
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const { data, error } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new Error('Failed to refresh token');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

// Rate limit check
export async function checkRateLimit(
  client: SupabaseClient<Database>,
  userId: string,
  action: string,
  limit: number = 100,
  window: string = '1 hour',
): Promise<{ allowed: boolean; remaining: number }> {
  const { count } = await client
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', `now() - interval '${window}'`);

  const used = count || 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    remaining,
  };
}