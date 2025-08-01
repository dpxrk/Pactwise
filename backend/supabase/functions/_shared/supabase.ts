/// <reference path="../../types/global.d.ts" />

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

export interface AuthUser {
  id: string;
  email?: string;
  app_metadata?: {
    provider?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    full_name?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    [key: string]: unknown;
  };
}

export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  enterprise_id: string;
  department?: string;
  title?: string;
  is_active: boolean;
  subscription_tier?: 'free' | 'professional' | 'enterprise';
}

export interface AuthenticatedUser {
  auth: AuthUser;
  profile: UserProfile;
  // Convenience accessors for common properties
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  enterprise_id: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  title?: string;
  is_active: boolean;
}

// Create Supabase admin client with service role key
export const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Create Supabase client with user JWT for RLS
export const createUserClient = (jwt: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
};

// Extract JWT from Authorization header
export const extractJWT = (authHeader: string): string => {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new Error('Invalid authorization header format');
  }

  return parts[1];
};

// Verify JWT and get authenticated user
export const verifyAndGetUser = async (jwt: string): Promise<AuthenticatedUser> => {
  const adminClient = createAdminClient();

  // Verify the JWT
  const { data: authUser, error: authError } = await adminClient.auth.getUser(jwt);

  if (authError || !authUser?.user) {
    console.error('Auth error:', authError);
    throw new Error('Invalid or expired token');
  }

  // Get user profile from database
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('*')
    .eq('auth_id', authUser.user.id)
    .eq('is_active', true)
    .single();

  if (profileError || !profile) {
    console.error('Profile error:', profileError);
    // Check if this is a new user that needs provisioning
    if (profileError?.code === 'PGRST116') {
      throw new Error('User not provisioned. Please complete registration.');
    }
    throw new Error('User profile not found');
  }

  const userProfile = profile as UserProfile;
  return {
    auth: authUser.user,
    profile: userProfile,
    // Convenience accessors
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    enterprise_id: userProfile.enterprise_id,
    is_active: userProfile.is_active,
  };
};

// Get authenticated user from authorization header
export const getUserFromAuth = async (authHeader: string): Promise<AuthenticatedUser> => {
  const jwt = extractJWT(authHeader);
  return verifyAndGetUser(jwt);
};

// Create client with proper auth context
export const createSupabaseClient = (authHeader?: string): SupabaseClient<Database> => {
  if (authHeader) {
    const jwt = extractJWT(authHeader);
    return createUserClient(jwt);
  }
  return createAdminClient();
};

// Check if user has required role
export const hasRole = (user: UserProfile, requiredRoles: string[]): boolean => {
  const roleHierarchy: Record<string, number> = {
    owner: 5,
    admin: 4,
    manager: 3,
    user: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role] || 0));

  return userLevel >= requiredLevel;
};

interface AuthEventMetadata {
  email?: string;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
}

// Log authentication event
export const logAuthEvent = async (
  client: SupabaseClient<Database>,
  userId: string,
  event: 'login' | 'logout' | 'token_refresh' | 'permission_denied',
  success: boolean,
  metadata?: AuthEventMetadata,
) => {
  const { error } = await client
    .from('login_attempts')
    .insert({
      user_id: userId,
      event_type: event,
      email: metadata?.email || '',
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
      success,
      failure_reason: metadata?.failure_reason,
    });

  if (error) {
    console.error('Failed to log auth event:', error);
  }
};