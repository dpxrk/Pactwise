import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type UserRole = 'owner' | 'admin' | 'manager' | 'user' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  enterprise_id: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Verifies that the current user is authenticated and has admin/owner role
 * Redirects to sign-in page if not authenticated or unauthorized
 */
export async function requireAdminAuth(): Promise<AdminUser> {
  const supabase = await createServerSupabaseClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    redirect('/auth/sign-in');
  }
  
  // Get user profile with role
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role, enterprise_id, first_name, last_name')
    .eq('auth_id', session.user.id)
    .single();
  
  if (profileError || !userProfile) {
    console.error('Failed to fetch user profile:', profileError);
    redirect('/auth/sign-in');
  }
  
  // Check if user has admin or owner role
  if (!['admin', 'owner'].includes(userProfile.role)) {
    redirect('/unauthorized');
  }
  
  return userProfile as AdminUser;
}

/**
 * Checks if current user is authenticated (for public pages)
 */
export async function getAuthUser(): Promise<AdminUser | null> {
  const supabase = await createServerSupabaseClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, email, role, enterprise_id, first_name, last_name')
    .eq('auth_id', session.user.id)
    .single();
  
  return userProfile as AdminUser | null;
}