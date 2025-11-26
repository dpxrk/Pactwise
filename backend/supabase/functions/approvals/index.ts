/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

type ApprovalType = 'initial_review' | 'legal_review' | 'finance_review' | 'final_approval' | 'renewal_approval';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

interface ApprovalRecord {
  id: string;
  contract_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  approver_id: string;
  comments: string | null;
  conditions: Record<string, unknown>[];
  approved_at: string | null;
  rejected_at: string | null;
  enterprise_id: string;
  created_at: string;
  updated_at: string;
  contract?: {
    id: string;
    title: string;
    status: string;
    value: number | null;
    owner_id: string;
  };
  approver?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const approvalTypeSchema = z.enum([
  'initial_review',
  'legal_review',
  'finance_review',
  'final_approval',
  'renewal_approval',
]);

const approvalDecisionSchema = z.enum(['approved', 'rejected', 'escalated']);

const submitForApprovalSchema = z.object({
  contract_id: z.string().uuid(),
  approval_type: approvalTypeSchema.optional().default('initial_review'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  notes: z.string().max(2000).optional(),
  requested_approvers: z.array(z.string().uuid()).optional(),
});

const processApprovalSchema = z.object({
  decision: approvalDecisionSchema,
  comments: z.string().max(2000).optional(),
  conditions: z.array(z.object({
    type: z.string(),
    description: z.string(),
    required: z.boolean().optional(),
  })).optional().default([]),
});

const bulkApprovalSchema = z.object({
  approval_ids: z.array(z.string().uuid()).min(1).max(50),
  decision: approvalDecisionSchema,
  comments: z.string().max(2000).optional(),
});

const reassignApprovalSchema = z.object({
  new_approver_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ========================================================================
    // GET /approvals/pending - List all pending approvals for the current user
    // ========================================================================
    if (method === 'GET' && pathname === '/approvals/pending') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('contract_approvals')
        .select(`
          *,
          contract:contracts(id, title, status, value, owner_id, vendor_id),
          approver:users!approver_id(id, full_name, email)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'pending')
        .eq('approver_id', profile.id)
        .range(offset, offset + limit - 1);

      // Apply sorting
      const orderColumn = sortBy || 'created_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /approvals/all - List all pending approvals in enterprise (managers+)
    // ========================================================================
    if (method === 'GET' && pathname === '/approvals/all') {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to view all approvals', 403, req);
      }

      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      const status = params.status || 'pending';
      const approvalType = params.approval_type as ApprovalType | undefined;

      let query = supabase
        .from('contract_approvals')
        .select(`
          *,
          contract:contracts(id, title, status, value, owner_id, vendor_id),
          approver:users!approver_id(id, full_name, email)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', status)
        .range(offset, offset + limit - 1);

      if (approvalType) {
        query = query.eq('approval_type', approvalType);
      }

      // Apply sorting
      const orderColumn = sortBy || 'created_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /approvals/stats - Get approval statistics
    // ========================================================================
    if (method === 'GET' && pathname === '/approvals/stats') {
      const { data, error } = await supabase
        .from('contract_approvals')
        .select('status, approval_type')
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        by_status: {
          pending: data?.filter(a => a.status === 'pending').length || 0,
          approved: data?.filter(a => a.status === 'approved').length || 0,
          rejected: data?.filter(a => a.status === 'rejected').length || 0,
          escalated: data?.filter(a => a.status === 'escalated').length || 0,
        },
        by_type: {
          initial_review: data?.filter(a => a.approval_type === 'initial_review').length || 0,
          legal_review: data?.filter(a => a.approval_type === 'legal_review').length || 0,
          finance_review: data?.filter(a => a.approval_type === 'finance_review').length || 0,
          final_approval: data?.filter(a => a.approval_type === 'final_approval').length || 0,
          renewal_approval: data?.filter(a => a.approval_type === 'renewal_approval').length || 0,
        },
        my_pending: data?.filter(a => a.status === 'pending').length || 0,
      };

      // Get my pending count separately
      const { count: myPending } = await supabase
        .from('contract_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'pending')
        .eq('approver_id', profile.id);

      stats.my_pending = myPending || 0;

      return createSuccessResponse(stats, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/submit - Submit contract for approval
    // ========================================================================
    if (method === 'POST' && pathname === '/approvals/submit') {
      const body = await req.json();
      const { contract_id, approval_type, priority, notes, requested_approvers } = validateRequest(submitForApprovalSchema, body);

      // Check if user can submit (must be owner or have update permission)
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, title, owner_id, created_by, status, enterprise_id, value')
        .eq('id', contract_id)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (contractError || !contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      const isOwner = contract.owner_id === profile.id || contract.created_by === profile.id;
      if (!isOwner && !permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to submit contract for approval', 403, req);
      }

      // Check if there's already a pending approval of this type
      const { data: existingApproval } = await supabase
        .from('contract_approvals')
        .select('id')
        .eq('contract_id', contract_id)
        .eq('approval_type', approval_type)
        .eq('status', 'pending')
        .single();

      if (existingApproval) {
        return createErrorResponseSync('Contract already has a pending approval of this type', 400, req);
      }

      // Determine approvers (either requested or auto-assigned)
      let approverIds: string[] = [];

      if (requested_approvers && requested_approvers.length > 0) {
        // Validate requested approvers exist and have permission
        const { data: validApprovers } = await supabase
          .from('users')
          .select('id')
          .in('id', requested_approvers)
          .eq('enterprise_id', profile.enterprise_id)
          .in('role', ['manager', 'admin', 'owner']);

        approverIds = validApprovers?.map(a => a.id) || [];
      }

      // If no valid approvers, auto-assign based on approval type
      if (approverIds.length === 0) {
        const department = approval_type === 'legal_review' ? 'Legal'
          : approval_type === 'finance_review' ? 'Finance'
          : null;

        let approverQuery = supabase
          .from('users')
          .select('id')
          .eq('enterprise_id', profile.enterprise_id)
          .in('role', ['manager', 'admin', 'owner'])
          .neq('id', profile.id) // Don't self-assign
          .limit(3);

        if (department) {
          approverQuery = approverQuery.eq('department', department);
        }

        const { data: autoApprovers } = await approverQuery;
        approverIds = autoApprovers?.map(a => a.id) || [];

        // Fallback to any manager if no department-specific approver found
        if (approverIds.length === 0) {
          const { data: anyApprovers } = await supabase
            .from('users')
            .select('id')
            .eq('enterprise_id', profile.enterprise_id)
            .in('role', ['manager', 'admin', 'owner'])
            .neq('id', profile.id)
            .limit(1);

          approverIds = anyApprovers?.map(a => a.id) || [];
        }
      }

      if (approverIds.length === 0) {
        return createErrorResponseSync('No eligible approvers found', 400, req);
      }

      // Create approval records for each approver
      const approvalRecords = approverIds.map(approverId => ({
        contract_id,
        approval_type,
        status: 'pending' as const,
        approver_id: approverId,
        comments: notes || null,
        conditions: [],
        enterprise_id: profile.enterprise_id,
      }));

      const { data: approvals, error: insertError } = await supabase
        .from('contract_approvals')
        .insert(approvalRecords)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Update contract status to pending_review
      await supabase
        .from('contracts')
        .update({
          status: 'pending_review',
          updated_at: new Date().toISOString(),
          last_modified_by: profile.id,
        })
        .eq('id', contract_id);

      // Create notifications for approvers
      const notifications = approverIds.map(approverId => ({
        user_id: approverId,
        type: 'approval_request',
        title: 'Approval Request',
        message: `Contract "${contract.title}" requires your ${approval_type.replace('_', ' ')}`,
        severity: priority === 'urgent' ? 'critical' : priority === 'high' ? 'high' : 'medium',
        data: {
          contract_id,
          approval_type,
          priority,
          requester_id: profile.id,
        },
        enterprise_id: profile.enterprise_id,
      }));

      await supabase.from('notifications').insert(notifications);

      // Log to status history
      await supabase.from('contract_status_history').insert({
        contract_id,
        previous_status: contract.status,
        new_status: 'pending_review',
        changed_by: profile.id,
        reason: `Submitted for ${approval_type.replace('_', ' ')}`,
        metadata: { approval_type, priority, approver_count: approverIds.length },
      });

      return createSuccessResponse({
        message: 'Contract submitted for approval',
        contract_id,
        approval_type,
        approvals: approvals?.map(a => ({
          id: a.id,
          approver_id: a.approver_id,
          status: a.status,
        })),
        submitted_at: new Date().toISOString(),
      }, undefined, 201, req);
    }

    // ========================================================================
    // GET /approvals/:id - Get single approval details
    // ========================================================================
    const singleApprovalMatch = pathname.match(/^\/approvals\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleApprovalMatch) {
      const approvalId = sanitizeInput.uuid(singleApprovalMatch[1]);

      const { data: approval, error } = await supabase
        .from('contract_approvals')
        .select(`
          *,
          contract:contracts(
            id, title, status, value, owner_id, vendor_id,
            owner:users!owner_id(id, full_name, email),
            vendor:vendors(id, name)
          ),
          approver:users!approver_id(id, full_name, email, department)
        `)
        .eq('id', approvalId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !approval) {
        return createErrorResponseSync('Approval not found', 404, req);
      }

      return createSuccessResponse(approval, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/:id/approve - Approve a contract
    // ========================================================================
    const approveMatch = pathname.match(/^\/approvals\/([a-f0-9-]+)\/approve$/);
    if (method === 'POST' && approveMatch) {
      const approvalId = sanitizeInput.uuid(approveMatch[1]);
      const body = await req.json();
      const { comments, conditions } = validateRequest(processApprovalSchema.omit({ decision: true }), body);

      // Get approval and verify user is the approver
      const { data: approval, error: findError } = await supabase
        .from('contract_approvals')
        .select('*, contract:contracts(id, title, owner_id, status, enterprise_id)')
        .eq('id', approvalId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !approval) {
        return createErrorResponseSync('Approval not found', 404, req);
      }

      if (approval.approver_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('You are not authorized to process this approval', 403, req);
      }

      if (approval.status !== 'pending') {
        return createErrorResponseSync(`Approval is already ${approval.status}`, 400, req);
      }

      // Use database function to process approval
      const { data: result, error: processError } = await supabase.rpc('process_contract_approval', {
        p_contract_id: approval.contract_id,
        p_approval_type: approval.approval_type,
        p_approver_id: profile.id,
        p_decision: 'approved',
        p_comments: comments || null,
        p_conditions: conditions || [],
      });

      if (processError) {
        throw processError;
      }

      return createSuccessResponse({
        message: 'Contract approved successfully',
        approval_id: approvalId,
        contract_id: approval.contract_id,
        decision: 'approved',
        result,
        processed_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/:id/reject - Reject a contract
    // ========================================================================
    const rejectMatch = pathname.match(/^\/approvals\/([a-f0-9-]+)\/reject$/);
    if (method === 'POST' && rejectMatch) {
      const approvalId = sanitizeInput.uuid(rejectMatch[1]);
      const body = await req.json();
      const { comments } = validateRequest(processApprovalSchema.pick({ comments: true }), body);

      if (!comments) {
        return createErrorResponseSync('Comments are required when rejecting', 400, req);
      }

      // Get approval and verify user is the approver
      const { data: approval, error: findError } = await supabase
        .from('contract_approvals')
        .select('*, contract:contracts(id, title, owner_id)')
        .eq('id', approvalId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !approval) {
        return createErrorResponseSync('Approval not found', 404, req);
      }

      if (approval.approver_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('You are not authorized to process this approval', 403, req);
      }

      if (approval.status !== 'pending') {
        return createErrorResponseSync(`Approval is already ${approval.status}`, 400, req);
      }

      // Use database function to process rejection
      const { data: result, error: processError } = await supabase.rpc('process_contract_approval', {
        p_contract_id: approval.contract_id,
        p_approval_type: approval.approval_type,
        p_approver_id: profile.id,
        p_decision: 'rejected',
        p_comments: comments,
        p_conditions: [],
      });

      if (processError) {
        throw processError;
      }

      return createSuccessResponse({
        message: 'Contract rejected',
        approval_id: approvalId,
        contract_id: approval.contract_id,
        decision: 'rejected',
        result,
        processed_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/:id/escalate - Escalate an approval
    // ========================================================================
    const escalateMatch = pathname.match(/^\/approvals\/([a-f0-9-]+)\/escalate$/);
    if (method === 'POST' && escalateMatch) {
      const approvalId = sanitizeInput.uuid(escalateMatch[1]);
      const body = await req.json();
      const { comments } = validateRequest(processApprovalSchema.pick({ comments: true }), body);

      // Get approval
      const { data: approval, error: findError } = await supabase
        .from('contract_approvals')
        .select('*, contract:contracts(id, title, owner_id)')
        .eq('id', approvalId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !approval) {
        return createErrorResponseSync('Approval not found', 404, req);
      }

      if (approval.approver_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('You are not authorized to escalate this approval', 403, req);
      }

      if (approval.status !== 'pending') {
        return createErrorResponseSync(`Approval is already ${approval.status}`, 400, req);
      }

      // Use database function to process escalation
      const { data: result, error: processError } = await supabase.rpc('process_contract_approval', {
        p_contract_id: approval.contract_id,
        p_approval_type: approval.approval_type,
        p_approver_id: profile.id,
        p_decision: 'escalated',
        p_comments: comments || 'Escalated for higher review',
        p_conditions: [],
      });

      if (processError) {
        throw processError;
      }

      // Find admin/owner to escalate to
      const { data: escalateToUsers } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('enterprise_id', profile.enterprise_id)
        .in('role', ['admin', 'owner'])
        .neq('id', profile.id)
        .limit(1);

      if (escalateToUsers && escalateToUsers.length > 0) {
        // Create new approval for escalated user
        await supabase.from('contract_approvals').insert({
          contract_id: approval.contract_id,
          approval_type: approval.approval_type,
          status: 'pending',
          approver_id: escalateToUsers[0].id,
          comments: `Escalated from ${profile.full_name || profile.email}: ${comments || 'No reason provided'}`,
          conditions: [],
          enterprise_id: profile.enterprise_id,
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: escalateToUsers[0].id,
          type: 'approval_escalated',
          title: 'Escalated Approval',
          message: `Contract approval has been escalated to you`,
          severity: 'high',
          data: {
            contract_id: approval.contract_id,
            approval_type: approval.approval_type,
            escalated_by: profile.id,
          },
          enterprise_id: profile.enterprise_id,
        });
      }

      return createSuccessResponse({
        message: 'Approval escalated successfully',
        approval_id: approvalId,
        contract_id: approval.contract_id,
        decision: 'escalated',
        escalated_to: escalateToUsers?.[0]?.id || null,
        result,
        processed_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/:id/reassign - Reassign an approval to another user
    // ========================================================================
    const reassignMatch = pathname.match(/^\/approvals\/([a-f0-9-]+)\/reassign$/);
    if (method === 'POST' && reassignMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to reassign approvals', 403, req);
      }

      const approvalId = sanitizeInput.uuid(reassignMatch[1]);
      const body = await req.json();
      const { new_approver_id, reason } = validateRequest(reassignApprovalSchema, body);

      // Get approval
      const { data: approval, error: findError } = await supabase
        .from('contract_approvals')
        .select('*')
        .eq('id', approvalId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !approval) {
        return createErrorResponseSync('Approval not found', 404, req);
      }

      if (approval.status !== 'pending') {
        return createErrorResponseSync('Can only reassign pending approvals', 400, req);
      }

      // Verify new approver exists and has permission
      const { data: newApprover, error: approverError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('id', new_approver_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (approverError || !newApprover) {
        return createErrorResponseSync('New approver not found', 404, req);
      }

      if (!['manager', 'admin', 'owner'].includes(newApprover.role)) {
        return createErrorResponseSync('New approver does not have approval permissions', 400, req);
      }

      // Update approval
      const { data: updatedApproval, error: updateError } = await supabase
        .from('contract_approvals')
        .update({
          approver_id: new_approver_id,
          comments: reason ? `Reassigned: ${reason}` : approval.comments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Notify new approver
      await supabase.from('notifications').insert({
        user_id: new_approver_id,
        type: 'approval_reassigned',
        title: 'Approval Reassigned',
        message: `You have been assigned an approval request`,
        severity: 'medium',
        data: {
          contract_id: approval.contract_id,
          approval_type: approval.approval_type,
          reassigned_by: profile.id,
          reason,
        },
        enterprise_id: profile.enterprise_id,
      });

      return createSuccessResponse({
        message: 'Approval reassigned successfully',
        approval_id: approvalId,
        previous_approver_id: approval.approver_id,
        new_approver_id,
        new_approver_name: newApprover.full_name,
        reassigned_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /approvals/bulk - Process multiple approvals at once
    // ========================================================================
    if (method === 'POST' && pathname === '/approvals/bulk') {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions for bulk operations', 403, req);
      }

      const body = await req.json();
      const { approval_ids, decision, comments } = validateRequest(bulkApprovalSchema, body);

      const results: Array<{
        approval_id: string;
        success: boolean;
        error?: string;
      }> = [];

      for (const approvalId of approval_ids) {
        try {
          // Get approval
          const { data: approval, error: findError } = await supabase
            .from('contract_approvals')
            .select('contract_id, approval_type, status, approver_id')
            .eq('id', approvalId)
            .eq('enterprise_id', profile.enterprise_id)
            .single();

          if (findError || !approval) {
            results.push({ approval_id: approvalId, success: false, error: 'Not found' });
            continue;
          }

          if (approval.status !== 'pending') {
            results.push({ approval_id: approvalId, success: false, error: `Already ${approval.status}` });
            continue;
          }

          // Process using database function
          const { error: processError } = await supabase.rpc('process_contract_approval', {
            p_contract_id: approval.contract_id,
            p_approval_type: approval.approval_type,
            p_approver_id: profile.id,
            p_decision: decision,
            p_comments: comments || null,
            p_conditions: [],
          });

          if (processError) {
            results.push({ approval_id: approvalId, success: false, error: processError.message });
          } else {
            results.push({ approval_id: approvalId, success: true });
          }
        } catch (err) {
          results.push({
            approval_id: approvalId,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return createSuccessResponse({
        message: `Processed ${successCount} approvals, ${failureCount} failed`,
        decision,
        results,
        processed_at: new Date().toISOString(),
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /contracts/:id/approval-history - Get approval history for a contract
    // ========================================================================
    const historyMatch = pathname.match(/^\/contracts\/([a-f0-9-]+)\/approval-history$/);
    if (method === 'GET' && historyMatch) {
      const contractId = sanitizeInput.uuid(historyMatch[1]);

      const { data: approvals, error } = await supabase
        .from('contract_approvals')
        .select(`
          *,
          approver:users!approver_id(id, full_name, email, department)
        `)
        .eq('contract_id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Also get status history
      const { data: statusHistory } = await supabase
        .from('contract_status_history')
        .select(`
          *,
          changed_by_user:users!changed_by(id, full_name, email)
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      return createSuccessResponse({
        contract_id: contractId,
        approvals: approvals || [],
        status_history: statusHistory || [],
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'approvals', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'SOC2' },
  },
  'approvals',
);
