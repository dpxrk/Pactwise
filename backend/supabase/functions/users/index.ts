/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { getAuditLogger, extractAuditContext } from '../_shared/audit-logger.ts';
import {
  parsePaginationParams,
  parseSortParams,
  parseFilterParams,
  calculatePaginationMeta,
} from '../_shared/pagination.ts';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const UpdateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'user', 'viewer']),
});

const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).default('user'),
  department: z.string().optional(),
  title: z.string().optional(),
  send_invitation: z.boolean().default(true),
});

const UpdateUserProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  timezone: z.string().max(50).optional(),
  notification_preferences: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    slack: z.boolean().optional(),
  }).optional(),
});

const BulkUserActionSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(['activate', 'deactivate', 'update_role']),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
});

// ============================================================================
// ROLE HIERARCHY
// ============================================================================

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

function canManageRole(actorRole: string, targetRole: string): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;
  const auditLogger = getAuditLogger();
  const auditContext = extractAuditContext(req);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponseSync('Authorization required', 401, req);
    }

    const user = await getUserFromAuth(authHeader);
    if (!user) {
      return createErrorResponseSync('Invalid or expired token', 401, req);
    }

    const supabase = createAdminClient();

    // ========================================================================
    // GET /users - List enterprise users
    // ========================================================================
    if (method === 'GET' && pathname === '/users') {
      const pagination = parsePaginationParams(url);
      const sort = parseSortParams(url, ['created_at', 'full_name', 'email', 'role', 'last_login'], 'created_at');
      const filters = parseFilterParams(url, ['role', 'status', 'department', 'search']);

      // Use database function for optimized query
      const { data, error } = await supabase.rpc('get_enterprise_users', {
        p_enterprise_id: user.enterprise_id,
        p_page: pagination.page,
        p_limit: pagination.limit,
        p_role: filters.role as string || null,
        p_status: filters.status as string || null,
      });

      if (error) throw error;

      // Get total count
      let countQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', user.enterprise_id);

      if (filters.role) {
        countQuery = countQuery.eq('role', filters.role);
      }
      if (filters.status === 'active') {
        countQuery = countQuery.eq('is_active', true);
      } else if (filters.status === 'inactive') {
        countQuery = countQuery.eq('is_active', false);
      }

      const { count } = await countQuery;

      return createSuccessResponse({
        data: data || [],
        pagination: calculatePaginationMeta(pagination.page, pagination.limit, count || 0),
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /users/me - Get current user profile
    // ========================================================================
    if (method === 'GET' && pathname === '/users/me') {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          *,
          enterprise:enterprises(id, name, logo_url, subscription_tier)
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return createSuccessResponse(profile, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /users/me - Update current user profile
    // ========================================================================
    if (method === 'PATCH' && pathname === '/users/me') {
      const body = await req.json();
      const validatedData = validateRequest(UpdateUserProfileSchema, body);

      const { data: oldProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data, error } = await supabase
        .from('users')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await auditLogger.logUpdate(
        'user',
        user.id,
        user.id,
        user.enterprise_id,
        oldProfile || {},
        data,
        { ...auditContext, description: 'User updated their profile' }
      );

      return createSuccessResponse(data, 'Profile updated successfully', 200, req);
    }

    // ========================================================================
    // GET /users/:id - Get specific user
    // ========================================================================
    if (method === 'GET' && pathname.match(/^\/users\/[a-f0-9-]+$/)) {
      const userId = pathname.split('/')[2];

      // Only admin+ can view other users' details
      if (userId !== user.id && ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id, auth_id, email, first_name, last_name, full_name,
          role, department, title, phone, timezone, is_active,
          last_login, created_at, updated_at,
          notification_preferences
        `)
        .eq('id', userId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (error || !profile) {
        return createErrorResponseSync('User not found', 404, req);
      }

      return createSuccessResponse(profile, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /users/:id/role - Update user role
    // ========================================================================
    if (method === 'PATCH' && pathname.match(/^\/users\/[a-f0-9-]+\/role$/)) {
      const userId = pathname.split('/')[2];

      // Only admin+ can change roles
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Cannot change own role
      if (userId === user.id) {
        return createErrorResponseSync('Cannot change your own role', 400, req);
      }

      const body = await req.json();
      const { role: newRole } = validateRequest(UpdateUserRoleSchema, body);

      // Get target user
      const { data: targetUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!targetUser) {
        return createErrorResponseSync('User not found', 404, req);
      }

      // Check if actor can manage target's current and new role
      if (!canManageRole(user.role, targetUser.role) || !canManageRole(user.role, newRole)) {
        return createErrorResponseSync('Cannot assign role higher than or equal to your own', 403, req);
      }

      // Use database function for role update
      const { data, error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_new_role: newRole,
        p_enterprise_id: user.enterprise_id,
        p_updated_by: user.id,
      });

      if (error) throw error;

      // Audit log
      await auditLogger.logUpdate(
        'user',
        userId,
        user.id,
        user.enterprise_id,
        { role: targetUser.role },
        { role: newRole },
        { ...auditContext, description: `Role changed from ${targetUser.role} to ${newRole}` }
      );

      return createSuccessResponse(data, 'User role updated successfully', 200, req);
    }

    // ========================================================================
    // POST /users/:id/deactivate - Deactivate user
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/users\/[a-f0-9-]+\/deactivate$/)) {
      const userId = pathname.split('/')[2];

      // Only admin+ can deactivate users
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Cannot deactivate self
      if (userId === user.id) {
        return createErrorResponseSync('Cannot deactivate yourself', 400, req);
      }

      // Get target user
      const { data: targetUser } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', userId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!targetUser) {
        return createErrorResponseSync('User not found', 404, req);
      }

      if (!canManageRole(user.role, targetUser.role)) {
        return createErrorResponseSync('Cannot deactivate user with higher or equal role', 403, req);
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id,
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await auditLogger.logSecurityEvent(
        'update',
        user.id,
        user.enterprise_id,
        `User ${userId} deactivated`,
        { target_user_id: userId },
        'warning'
      );

      return createSuccessResponse(data, 'User deactivated successfully', 200, req);
    }

    // ========================================================================
    // POST /users/:id/activate - Reactivate user
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/users\/[a-f0-9-]+\/activate$/)) {
      const userId = pathname.split('/')[2];

      // Only admin+ can activate users
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('enterprise_id', user.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('User not found', 404, req);
      }

      // Audit log
      await auditLogger.logSecurityEvent(
        'update',
        user.id,
        user.enterprise_id,
        `User ${userId} reactivated`,
        { target_user_id: userId }
      );

      return createSuccessResponse(data, 'User activated successfully', 200, req);
    }

    // ========================================================================
    // POST /users/invite - Invite new user
    // ========================================================================
    if (method === 'POST' && pathname === '/users/invite') {
      // Only admin+ can invite users
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(InviteUserSchema, body);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', validatedData.email)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (existingUser) {
        return createErrorResponseSync('User with this email already exists in your organization', 409, req);
      }

      // Use database function to create invitation
      const { data, error } = await supabase.rpc('invite_user_to_enterprise', {
        p_email: validatedData.email,
        p_role: validatedData.role,
        p_enterprise_id: user.enterprise_id,
        p_invited_by: user.id,
      });

      if (error) throw error;

      // Audit log
      await auditLogger.logCreate(
        'user',
        data?.invitation_id || 'pending',
        user.id,
        user.enterprise_id,
        {
          email: validatedData.email,
          role: validatedData.role,
          invited_by: user.id,
        },
        { ...auditContext, description: `User invitation sent to ${validatedData.email}` }
      );

      return createSuccessResponse(data, 'Invitation sent successfully', 201, req);
    }

    // ========================================================================
    // GET /users/pending-invitations - List pending invitations
    // ========================================================================
    if (method === 'GET' && pathname === '/users/pending-invitations') {
      // Only admin+ can view invitations
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data, error } = await supabase
        .from('user_invitations')
        .select(`
          *,
          invited_by_user:users!invited_by(id, full_name, email)
        `)
        .eq('enterprise_id', user.enterprise_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return createSuccessResponse(data || [], undefined, 200, req);
    }

    // ========================================================================
    // DELETE /users/invitations/:id - Cancel invitation
    // ========================================================================
    if (method === 'DELETE' && pathname.match(/^\/users\/invitations\/[a-f0-9-]+$/)) {
      const invitationId = pathname.split('/')[3];

      // Only admin+ can cancel invitations
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        })
        .eq('id', invitationId)
        .eq('enterprise_id', user.enterprise_id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Invitation not found or already processed', 404, req);
      }

      return createSuccessResponse({ message: 'Invitation cancelled' }, undefined, 200, req);
    }

    // ========================================================================
    // POST /users/bulk - Bulk user actions
    // ========================================================================
    if (method === 'POST' && pathname === '/users/bulk') {
      // Only admin+ can perform bulk actions
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const { user_ids, action, role } = validateRequest(BulkUserActionSchema, body);

      // Verify all users exist and belong to enterprise
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, role')
        .in('id', user_ids)
        .eq('enterprise_id', user.enterprise_id);

      if (fetchError) throw fetchError;
      if (!users || users.length !== user_ids.length) {
        return createErrorResponseSync('Some users not found', 404, req);
      }

      // Check permissions for all target users
      const canManageAll = users.every(u => canManageRole(user.role, u.role));
      if (!canManageAll) {
        return createErrorResponseSync('Cannot perform action on users with higher or equal role', 403, req);
      }

      // Cannot include self
      if (user_ids.includes(user.id)) {
        return createErrorResponseSync('Cannot perform bulk action on yourself', 400, req);
      }

      let updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

      switch (action) {
        case 'activate':
          updateData = { ...updateData, is_active: true, deactivated_at: null };
          break;
        case 'deactivate':
          updateData = { ...updateData, is_active: false, deactivated_at: new Date().toISOString() };
          break;
        case 'update_role':
          if (!role) {
            return createErrorResponseSync('Role required for update_role action', 400, req);
          }
          if (!canManageRole(user.role, role)) {
            return createErrorResponseSync('Cannot assign role higher than or equal to your own', 403, req);
          }
          updateData = { ...updateData, role };
          break;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .in('id', user_ids)
        .eq('enterprise_id', user.enterprise_id)
        .select('id');

      if (error) throw error;

      // Audit log
      await auditLogger.logBulkOperation(
        'bulk_update',
        'user',
        user_ids,
        user.id,
        user.enterprise_id,
        { ...auditContext, description: `Bulk ${action} on ${user_ids.length} users` }
      );

      return createSuccessResponse({
        message: `Bulk ${action} completed`,
        affected_count: data?.length || 0,
        affected_ids: data?.map(u => u.id) || [],
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /users/activity-log - Get user activity log
    // ========================================================================
    if (method === 'GET' && pathname === '/users/activity-log') {
      const pagination = parsePaginationParams(url);
      const targetUserId = url.searchParams.get('user_id');

      // Users can only view their own activity, admins can view all
      if (targetUserId && targetUserId !== user.id && ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', user.enterprise_id)
        .order('created_at', { ascending: false })
        .range(pagination.offset, pagination.offset + pagination.limit - 1);

      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
        query = query.eq('user_id', user.id);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      return createSuccessResponse({
        data: data || [],
        pagination: calculatePaginationMeta(pagination.page, pagination.limit, count || 0),
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('[Users] Error:', error);
    return createErrorResponseSync(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req
    );
  }
});
