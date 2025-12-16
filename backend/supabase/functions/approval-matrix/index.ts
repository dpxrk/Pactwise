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

type MatrixStatus = 'draft' | 'active' | 'archived';
type RuleAction = 'require_approval' | 'auto_approve' | 'escalate' | 'notify_only';
type ApproverType = 'user' | 'role' | 'department' | 'manager_of' | 'dynamic';
type RoutingStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'skipped';

interface ApprovalMatrix {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  applies_to: string;
  priority: number;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ApprovalRule {
  id: string;
  matrix_id: string;
  name: string;
  conditions: Record<string, unknown>;
  action: RuleAction;
  approvers: Approver[];
  approval_mode: string;
  escalation_config: Record<string, unknown> | null;
  sequence_order: number;
  is_active: boolean;
}

interface Approver {
  approver_type: ApproverType;
  approver_value: string;
  is_required: boolean;
  sequence: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum([
    'equals', 'not_equals', 'greater_than', 'less_than',
    'greater_than_or_equal', 'less_than_or_equal',
    'contains', 'not_contains', 'in', 'not_in',
    'is_null', 'is_not_null', 'between',
  ]),
  value: z.unknown(),
  value_type: z.enum(['static', 'field_reference', 'calculated']).optional(),
});

const approverSchema = z.object({
  approver_type: z.enum(['user', 'role', 'department', 'manager_of', 'dynamic']),
  approver_value: z.string(),
  is_required: z.boolean().optional(),
  sequence: z.number().optional(),
});

const createMatrixSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  applies_to: z.enum([
    'contracts', 'intake_submissions', 'purchase_orders',
    'vendor_onboarding', 'amendments', 'renewals', 'all',
  ]),
  priority: z.number().min(0).max(1000).optional(),
});

const updateMatrixSchema = createMatrixSchema.partial();

const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  conditions: z.object({
    logic: z.enum(['and', 'or']).optional(),
    rules: z.array(conditionSchema),
  }),
  action: z.enum(['require_approval', 'auto_approve', 'escalate', 'notify_only']),
  approvers: z.array(approverSchema).min(1).max(10),
  approval_mode: z.enum(['any', 'all', 'sequential', 'percentage']).optional(),
  approval_percentage: z.number().min(1).max(100).optional(),
  escalation_config: z.object({
    escalate_after_hours: z.number().optional(),
    escalate_to: z.array(approverSchema).optional(),
    max_escalations: z.number().optional(),
  }).optional(),
  sequence_order: z.number().optional(),
  is_active: z.boolean().optional(),
});

const updateRuleSchema = createRuleSchema.partial();

const delegationSchema = z.object({
  delegate_to_user_id: z.string().uuid(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime(),
  reason: z.string().max(500).optional(),
  scope: z.enum(['all', 'specific_matrices', 'specific_contracts']).optional(),
  scope_ids: z.array(z.string().uuid()).optional(),
});

const routingDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'escalate']),
  comments: z.string().max(2000).optional(),
  conditions: z.array(z.string()).optional(),
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
    // APPROVAL MATRICES ENDPOINTS
    // ========================================================================

    // GET /approval-matrix/matrices - List all matrices
    if (method === 'GET' && pathname === '/approval-matrix/matrices') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20 } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      const appliesTo = params.applies_to;
      const activeOnly = params.active_only === 'true';

      let query = supabase
        .from('approval_matrices')
        .select('*, rules:approval_matrix_rules(count)', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (appliesTo) {
        query = query.eq('applies_to', appliesTo);
      }

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

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

    // GET /approval-matrix/matrices/:id - Get single matrix with rules
    const getMatrixMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)$/);
    if (method === 'GET' && getMatrixMatch) {
      const matrixId = sanitizeInput.uuid(getMatrixMatch[1]);

      const { data: matrix, error: matrixError } = await supabase
        .from('approval_matrices')
        .select('*')
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (matrixError || !matrix) {
        return createErrorResponseSync('Matrix not found', 404, req);
      }

      // Get rules
      const { data: rules } = await supabase
        .from('approval_matrix_rules')
        .select('*')
        .eq('matrix_id', matrixId)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true });

      return createSuccessResponse({
        ...matrix,
        rules: rules || [],
      }, undefined, 200, req);
    }

    // POST /approval-matrix/matrices - Create new matrix
    if (method === 'POST' && pathname === '/approval-matrix/matrices') {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to create approval matrices', 403, req);
      }

      const body = await req.json();
      const validated = validateRequest(createMatrixSchema, body);

      const { data: matrix, error } = await supabase
        .from('approval_matrices')
        .insert({
          enterprise_id: profile.enterprise_id,
          name: validated.name,
          description: validated.description || null,
          applies_to: validated.applies_to,
          priority: validated.priority || 100,
          is_active: false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(matrix, undefined, 201, req);
    }

    // PUT /approval-matrix/matrices/:id - Update matrix
    const updateMatrixMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)$/);
    if (method === 'PUT' && updateMatrixMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(updateMatrixMatch[1]);
      const body = await req.json();
      const validated = validateRequest(updateMatrixSchema, body);

      const { data: matrix, error } = await supabase
        .from('approval_matrices')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(matrix, undefined, 200, req);
    }

    // POST /approval-matrix/matrices/:id/activate - Activate matrix
    const activateMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)\/activate$/);
    if (method === 'POST' && activateMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(activateMatch[1]);

      // Check matrix has at least one rule
      const { count: ruleCount } = await supabase
        .from('approval_matrix_rules')
        .select('id', { count: 'exact', head: true })
        .eq('matrix_id', matrixId)
        .eq('is_active', true);

      if (!ruleCount || ruleCount === 0) {
        return createErrorResponseSync('Matrix must have at least one active rule before activation', 400, req);
      }

      const { data: matrix, error } = await supabase
        .from('approval_matrices')
        .update({
          is_active: true,
          version: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        // Fallback
        const { data: matrix2, error: error2 } = await supabase
          .from('approval_matrices')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matrixId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error2) throw error2;
        return createSuccessResponse(matrix2, undefined, 200, req);
      }

      return createSuccessResponse(matrix, undefined, 200, req);
    }

    // POST /approval-matrix/matrices/:id/deactivate - Deactivate matrix
    const deactivateMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)\/deactivate$/);
    if (method === 'POST' && deactivateMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(deactivateMatch[1]);

      const { data: matrix, error } = await supabase
        .from('approval_matrices')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(matrix, undefined, 200, req);
    }

    // DELETE /approval-matrix/matrices/:id - Delete matrix
    const deleteMatrixMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && deleteMatrixMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(deleteMatrixMatch[1]);

      // Check if matrix has any active routings
      const { count: routingCount } = await supabase
        .from('approval_routing_history')
        .select('id', { count: 'exact', head: true })
        .eq('matrix_id', matrixId)
        .eq('status', 'pending');

      if (routingCount && routingCount > 0) {
        return createErrorResponseSync('Cannot delete matrix with pending approvals', 400, req);
      }

      const { error } = await supabase
        .from('approval_matrices')
        .delete()
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({ message: 'Matrix deleted' }, undefined, 200, req);
    }

    // ========================================================================
    // RULES ENDPOINTS
    // ========================================================================

    // POST /approval-matrix/matrices/:id/rules - Add rule to matrix
    const addRuleMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)\/rules$/);
    if (method === 'POST' && addRuleMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(addRuleMatch[1]);
      const body = await req.json();
      const validated = validateRequest(createRuleSchema, body);

      // Verify matrix exists
      const { data: matrix } = await supabase
        .from('approval_matrices')
        .select('id')
        .eq('id', matrixId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!matrix) {
        return createErrorResponseSync('Matrix not found', 404, req);
      }

      // Get max sequence order
      const { data: maxOrder } = await supabase
        .from('approval_matrix_rules')
        .select('sequence_order')
        .eq('matrix_id', matrixId)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .single();

      const { data: rule, error } = await supabase
        .from('approval_matrix_rules')
        .insert({
          matrix_id: matrixId,
          name: validated.name,
          conditions: validated.conditions,
          action: validated.action,
          approvers: validated.approvers,
          approval_mode: validated.approval_mode || 'all',
          approval_percentage: validated.approval_percentage,
          escalation_config: validated.escalation_config || null,
          sequence_order: validated.sequence_order ?? ((maxOrder?.sequence_order || 0) + 1),
          is_active: validated.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(rule, undefined, 201, req);
    }

    // GET /approval-matrix/rules/:id - Get single rule
    const getRuleMatch = pathname.match(/^\/approval-matrix\/rules\/([a-f0-9-]+)$/);
    if (method === 'GET' && getRuleMatch) {
      const ruleId = sanitizeInput.uuid(getRuleMatch[1]);

      const { data: rule, error } = await supabase
        .from('approval_matrix_rules')
        .select('*, matrix:approval_matrices!inner(enterprise_id, name)')
        .eq('id', ruleId)
        .single();

      if (error || !rule || (rule.matrix as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Rule not found', 404, req);
      }

      return createSuccessResponse(rule, undefined, 200, req);
    }

    // PUT /approval-matrix/rules/:id - Update rule
    const updateRuleMatch = pathname.match(/^\/approval-matrix\/rules\/([a-f0-9-]+)$/);
    if (method === 'PUT' && updateRuleMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const ruleId = sanitizeInput.uuid(updateRuleMatch[1]);
      const body = await req.json();
      const validated = validateRequest(updateRuleSchema, body);

      // Verify rule belongs to enterprise
      const { data: existingRule } = await supabase
        .from('approval_matrix_rules')
        .select('id, matrix:approval_matrices!inner(enterprise_id)')
        .eq('id', ruleId)
        .single();

      if (!existingRule || (existingRule.matrix as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Rule not found', 404, req);
      }

      const { data: rule, error } = await supabase
        .from('approval_matrix_rules')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(rule, undefined, 200, req);
    }

    // DELETE /approval-matrix/rules/:id - Delete rule
    const deleteRuleMatch = pathname.match(/^\/approval-matrix\/rules\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && deleteRuleMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const ruleId = sanitizeInput.uuid(deleteRuleMatch[1]);

      // Verify rule belongs to enterprise
      const { data: existingRule } = await supabase
        .from('approval_matrix_rules')
        .select('id, matrix:approval_matrices!inner(enterprise_id)')
        .eq('id', ruleId)
        .single();

      if (!existingRule || (existingRule.matrix as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Rule not found', 404, req);
      }

      const { error } = await supabase
        .from('approval_matrix_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        throw error;
      }

      return createSuccessResponse({ message: 'Rule deleted' }, undefined, 200, req);
    }

    // POST /approval-matrix/matrices/:id/rules/reorder - Reorder rules
    const reorderRulesMatch = pathname.match(/^\/approval-matrix\/matrices\/([a-f0-9-]+)\/rules\/reorder$/);
    if (method === 'POST' && reorderRulesMatch) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const matrixId = sanitizeInput.uuid(reorderRulesMatch[1]);
      const body = await req.json();

      const reorderSchema = z.object({
        rule_order: z.array(z.object({
          rule_id: z.string().uuid(),
          sequence_order: z.number(),
        })),
      });

      const { rule_order } = validateRequest(reorderSchema, body);

      for (const item of rule_order) {
        await supabase
          .from('approval_matrix_rules')
          .update({ sequence_order: item.sequence_order })
          .eq('id', item.rule_id)
          .eq('matrix_id', matrixId);
      }

      return createSuccessResponse({ message: 'Rules reordered' }, undefined, 200, req);
    }

    // ========================================================================
    // DELEGATION ENDPOINTS
    // ========================================================================

    // GET /approval-matrix/delegations - List my delegations
    if (method === 'GET' && pathname === '/approval-matrix/delegations') {
      const { data: delegations, error } = await supabase
        .from('approval_delegations')
        .select(`
          *,
          delegate_to:users!delegate_to_user_id(id, full_name, email),
          delegated_by:users!delegated_by_user_id(id, full_name, email)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .or(`delegated_by_user_id.eq.${profile.id},delegate_to_user_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data: delegations }, undefined, 200, req);
    }

    // POST /approval-matrix/delegations - Create delegation
    if (method === 'POST' && pathname === '/approval-matrix/delegations') {
      const body = await req.json();
      const validated = validateRequest(delegationSchema, body);

      // Verify delegate user exists
      const { data: delegateUser } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('id', validated.delegate_to_user_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!delegateUser) {
        return createErrorResponseSync('Delegate user not found', 404, req);
      }

      if (!['manager', 'admin', 'owner'].includes(delegateUser.role)) {
        return createErrorResponseSync('Delegate must have approval permissions', 400, req);
      }

      const { data: delegation, error } = await supabase
        .from('approval_delegations')
        .insert({
          enterprise_id: profile.enterprise_id,
          delegated_by_user_id: profile.id,
          delegate_to_user_id: validated.delegate_to_user_id,
          valid_from: validated.valid_from,
          valid_until: validated.valid_until,
          reason: validated.reason || null,
          scope: validated.scope || 'all',
          scope_ids: validated.scope_ids || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Notify delegate
      await supabase.from('notifications').insert({
        user_id: validated.delegate_to_user_id,
        type: 'delegation_assigned',
        title: 'Approval Delegation',
        message: `${profile.full_name || profile.email} has delegated their approval authority to you`,
        severity: 'medium',
        data: {
          delegation_id: delegation.id,
          delegator_id: profile.id,
          valid_until: validated.valid_until,
        },
        enterprise_id: profile.enterprise_id,
      });

      return createSuccessResponse(delegation, undefined, 201, req);
    }

    // DELETE /approval-matrix/delegations/:id - Revoke delegation
    const revokeDelegationMatch = pathname.match(/^\/approval-matrix\/delegations\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && revokeDelegationMatch) {
      const delegationId = sanitizeInput.uuid(revokeDelegationMatch[1]);

      const { data: delegation, error: findError } = await supabase
        .from('approval_delegations')
        .select('*')
        .eq('id', delegationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !delegation) {
        return createErrorResponseSync('Delegation not found', 404, req);
      }

      // Only delegator or admin can revoke
      if (delegation.delegated_by_user_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const { error } = await supabase
        .from('approval_delegations')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delegationId);

      if (error) {
        throw error;
      }

      return createSuccessResponse({ message: 'Delegation revoked' }, undefined, 200, req);
    }

    // ========================================================================
    // ROUTING ENDPOINTS
    // ========================================================================

    // POST /approval-matrix/evaluate - Evaluate what approvals are needed
    if (method === 'POST' && pathname === '/approval-matrix/evaluate') {
      const body = await req.json();

      const evaluateSchema = z.object({
        entity_type: z.enum(['contract', 'intake_submission', 'purchase_order']),
        entity_id: z.string().uuid(),
        context: z.record(z.unknown()).optional(),
      });

      const { entity_type, entity_id, context } = validateRequest(evaluateSchema, body);

      // Call database function
      const { data: result, error } = await supabase.rpc('evaluate_approval_matrix', {
        p_enterprise_id: profile.enterprise_id,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_context: context || {},
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse(result, undefined, 200, req);
    }

    // POST /approval-matrix/route - Route entity for approval
    if (method === 'POST' && pathname === '/approval-matrix/route') {
      const body = await req.json();

      const routeSchema = z.object({
        entity_type: z.enum(['contract', 'intake_submission', 'purchase_order']),
        entity_id: z.string().uuid(),
        notes: z.string().max(2000).optional(),
      });

      const { entity_type, entity_id, notes } = validateRequest(routeSchema, body);

      // Call database function
      const { data: routingId, error } = await supabase.rpc('route_for_approval', {
        p_enterprise_id: profile.enterprise_id,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_initiated_by: profile.id,
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Entity routed for approval',
        routing_id: routingId,
        entity_type,
        entity_id,
      }, undefined, 201, req);
    }

    // GET /approval-matrix/routing/:id - Get routing details
    const getRoutingMatch = pathname.match(/^\/approval-matrix\/routing\/([a-f0-9-]+)$/);
    if (method === 'GET' && getRoutingMatch) {
      const routingId = sanitizeInput.uuid(getRoutingMatch[1]);

      const { data: routing, error } = await supabase
        .from('approval_routing_history')
        .select(`
          *,
          matrix:approval_matrices(id, name),
          rule:approval_matrix_rules(id, name),
          approver:users!approver_id(id, full_name, email),
          decided_by:users!decided_by(id, full_name, email)
        `)
        .eq('id', routingId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !routing) {
        return createErrorResponseSync('Routing not found', 404, req);
      }

      return createSuccessResponse(routing, undefined, 200, req);
    }

    // POST /approval-matrix/routing/:id/decide - Make routing decision
    const decideMatch = pathname.match(/^\/approval-matrix\/routing\/([a-f0-9-]+)\/decide$/);
    if (method === 'POST' && decideMatch) {
      const routingId = sanitizeInput.uuid(decideMatch[1]);
      const body = await req.json();
      const { decision, comments, conditions } = validateRequest(routingDecisionSchema, body);

      // Get routing
      const { data: routing, error: findError } = await supabase
        .from('approval_routing_history')
        .select('*')
        .eq('id', routingId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !routing) {
        return createErrorResponseSync('Routing not found', 404, req);
      }

      if (routing.status !== 'pending') {
        return createErrorResponseSync(`Routing is already ${routing.status}`, 400, req);
      }

      // Check if user is the approver or delegate
      const isApprover = routing.approver_id === profile.id;
      let isDelegate = false;

      if (!isApprover) {
        // Check for active delegation
        const { data: delegation } = await supabase
          .from('approval_delegations')
          .select('id')
          .eq('delegated_by_user_id', routing.approver_id)
          .eq('delegate_to_user_id', profile.id)
          .eq('status', 'active')
          .lte('valid_from', new Date().toISOString())
          .gte('valid_until', new Date().toISOString())
          .single();

        isDelegate = !!delegation;
      }

      if (!isApprover && !isDelegate && !permissions.canManage) {
        return createErrorResponseSync('You are not authorized to make this decision', 403, req);
      }

      // Call database function
      const { data: result, error } = await supabase.rpc('process_approval_decision', {
        p_routing_id: routingId,
        p_decision: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'escalated',
        p_decided_by: profile.id,
        p_comments: comments || null,
        p_conditions: conditions || [],
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: `Approval ${decision}d`,
        routing_id: routingId,
        decision,
        result,
      }, undefined, 200, req);
    }

    // GET /approval-matrix/pending - Get pending approvals for current user
    if (method === 'GET' && pathname === '/approval-matrix/pending') {
      // Call database function
      const { data: pending, error } = await supabase.rpc('get_pending_approvals', {
        p_user_id: profile.id,
        p_enterprise_id: profile.enterprise_id,
      });

      if (error) {
        throw error;
      }

      return createSuccessResponse({ data: pending }, undefined, 200, req);
    }

    // ========================================================================
    // STATS ENDPOINT
    // ========================================================================

    // GET /approval-matrix/stats - Get approval statistics
    if (method === 'GET' && pathname === '/approval-matrix/stats') {
      // Get matrix stats
      const { data: matrices } = await supabase
        .from('approval_matrices')
        .select('id, is_active')
        .eq('enterprise_id', profile.enterprise_id);

      // Get routing stats
      const { data: routings } = await supabase
        .from('approval_routing_history')
        .select('status, created_at, decided_at')
        .eq('enterprise_id', profile.enterprise_id);

      // Get my pending count
      const { data: myPending } = await supabase.rpc('get_pending_approvals', {
        p_user_id: profile.id,
        p_enterprise_id: profile.enterprise_id,
      });

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate average approval time
      const completedRoutings = routings?.filter(r =>
        r.status === 'approved' && r.decided_at && r.created_at
      ) || [];

      let avgApprovalTimeHours = 0;
      if (completedRoutings.length > 0) {
        const totalTime = completedRoutings.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime();
          const decided = new Date(r.decided_at).getTime();
          return sum + (decided - created);
        }, 0);
        avgApprovalTimeHours = Math.round(totalTime / completedRoutings.length / (1000 * 60 * 60));
      }

      const stats = {
        matrices: {
          total: matrices?.length || 0,
          active: matrices?.filter(m => m.is_active).length || 0,
        },
        routings: {
          total: routings?.length || 0,
          by_status: {
            pending: routings?.filter(r => r.status === 'pending').length || 0,
            approved: routings?.filter(r => r.status === 'approved').length || 0,
            rejected: routings?.filter(r => r.status === 'rejected').length || 0,
            escalated: routings?.filter(r => r.status === 'escalated').length || 0,
            skipped: routings?.filter(r => r.status === 'skipped').length || 0,
          },
          last_30_days: routings?.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length || 0,
          avg_approval_time_hours: avgApprovalTimeHours,
        },
        my_pending: myPending?.length || 0,
      };

      return createSuccessResponse(stats, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'approval-matrix', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'SOC2' },
  },
  'approval-matrix',
);
