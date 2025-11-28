/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync, createPaginatedResponse } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const obligationTypeEnum = z.enum([
  'delivery', 'payment', 'reporting', 'compliance',
  'renewal', 'notice', 'audit', 'insurance',
  'certification', 'milestone', 'sla', 'data_protection',
  'confidentiality', 'performance', 'other'
]);

const partyResponsibleEnum = z.enum(['us', 'them', 'both']);

const frequencyEnum = z.enum([
  'one_time', 'daily', 'weekly', 'bi_weekly',
  'monthly', 'quarterly', 'semi_annually', 'annually',
  'on_demand', 'as_needed', 'custom'
]);

const obligationStatusEnum = z.enum([
  'pending', 'active', 'in_progress', 'completed',
  'overdue', 'waived', 'cancelled'
]);

const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

const obligationSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  obligation_type: obligationTypeEnum,
  party_responsible: partyResponsibleEnum,
  frequency: frequencyEnum,
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  next_due_date: z.string().datetime().optional().nullable(),
  recurring_day: z.number().int().min(1).max(31).optional().nullable(),
  recurring_config: z.record(z.string(), z.unknown()).optional().default({}),
  reminder_days: z.array(z.number().int().positive()).optional().default([7, 3, 1]),
  escalation_days: z.array(z.number().int().positive()).optional().default([1, 3, 7]),
  extracted_by: z.enum(['ai', 'manual']).optional().nullable(),
  extraction_confidence: z.number().int().min(0).max(100).optional().nullable(),
  source_text: z.string().max(10000).optional().nullable(),
  source_page: z.number().int().positive().optional().nullable(),
  source_section: z.string().max(255).optional().nullable(),
  status: obligationStatusEnum.optional().default('pending'),
  priority: priorityEnum.optional().default('medium'),
  risk_if_missed: z.string().max(2000).optional().nullable(),
  financial_impact: z.number().optional().nullable(),
  risk_score: z.number().int().min(0).max(100).optional().default(50),
  depends_on_obligation_id: z.string().uuid().optional().nullable(),
  triggers_obligation_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const obligationUpdateSchema = obligationSchema.partial().omit({ contract_id: true });

const assignmentRoleEnum = z.enum(['primary', 'backup', 'reviewer', 'approver']);

const assignmentSchema = z.object({
  user_id: z.string().uuid(),
  team_id: z.string().uuid().optional().nullable(),
  role: assignmentRoleEnum,
  notifications_enabled: z.boolean().optional().default(true),
});

const evidenceTypeEnum = z.enum([
  'document', 'email', 'screenshot', 'attestation',
  'external_link', 'system_generated', 'report', 'other'
]);

const completionSchema = z.object({
  completion_date: z.string().datetime(),
  period_start: z.string().datetime().optional().nullable(),
  period_end: z.string().datetime().optional().nullable(),
  evidence_type: evidenceTypeEnum.optional().nullable(),
  evidence_url: z.string().url().optional().nullable(),
  evidence_file_id: z.string().uuid().optional().nullable(),
  evidence_description: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  requires_verification: z.boolean().optional().default(false),
});

const verificationSchema = z.object({
  verified: z.boolean(),
  verification_notes: z.string().max(2000).optional().nullable(),
  rejection_reason: z.string().max(2000).optional().nullable(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const calendarQuerySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  user_id: z.string().uuid().optional(),
  contract_id: z.string().uuid().optional(),
});

// ============================================
// MAIN HANDLER
// ============================================

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ============================================
    // STATS & CALENDAR ROUTES
    // ============================================

    // GET /contract-obligations/stats - Get obligation statistics
    if (method === 'GET' && pathname === '/contract-obligations/stats') {
      const userId = url.searchParams.get('user_id');

      const { data, error } = await supabase.rpc('get_obligation_stats', {
        p_enterprise_id: profile.enterprise_id,
        p_user_id: userId || null,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /contract-obligations/calendar - Get obligations for calendar view
    if (method === 'GET' && pathname === '/contract-obligations/calendar') {
      const params = Object.fromEntries(url.searchParams);
      const { start_date, end_date, user_id, contract_id } = validateRequest(calendarQuerySchema, params);

      const { data, error } = await supabase.rpc('get_obligations_calendar', {
        p_enterprise_id: profile.enterprise_id,
        p_start_date: start_date.split('T')[0],
        p_end_date: end_date.split('T')[0],
        p_user_id: user_id || null,
        p_contract_id: contract_id || null,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /contract-obligations/overdue - Get overdue obligations
    if (method === 'GET' && pathname === '/contract-obligations/overdue') {
      const userId = url.searchParams.get('user_id');

      const { data, error } = await supabase.rpc('get_overdue_obligations', {
        p_enterprise_id: profile.enterprise_id,
        p_user_id: userId || null,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /contract-obligations/my-assignments - Get current user's assigned obligations
    if (method === 'GET' && pathname === '/contract-obligations/my-assignments') {
      const params = Object.fromEntries(url.searchParams);
      const { page, limit } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('contract_obligations')
        .select(`
          *,
          contract:contracts(id, title, vendor:vendors(id, name)),
          assignments:obligation_assignments!inner(*)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .eq('assignments.user_id', profile.id)
        .in('status', ['pending', 'active', 'in_progress', 'overdue'])
        .order('next_due_date', { ascending: true, nullsFirst: false })
        .order('due_date', { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return createPaginatedResponse(data || [], {
        page,
        limit,
        total: count || 0,
      }, req);
    }

    // ============================================
    // OBLIGATION CRUD ROUTES
    // ============================================

    // GET /contract-obligations - List obligations with filters
    if (method === 'GET' && pathname === '/contract-obligations') {
      const params = Object.fromEntries(url.searchParams);
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('contract_obligations')
        .select(`
          *,
          contract:contracts(id, title, vendor:vendors(id, name)),
          assignments:obligation_assignments(
            id, user_id, role,
            user:users(id, full_name, email)
          )
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (params.contract_id) {
        query = query.eq('contract_id', params.contract_id);
      }
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.obligation_type) {
        query = query.eq('obligation_type', params.obligation_type);
      }
      if (params.party_responsible) {
        query = query.eq('party_responsible', params.party_responsible);
      }
      if (params.priority) {
        query = query.eq('priority', params.priority);
      }

      // Apply sorting
      const orderColumn = sortBy || 'next_due_date';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc', nullsFirst: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return createPaginatedResponse(data || [], {
        page,
        limit,
        total: count || 0,
      }, req);
    }

    // GET /contract-obligations/:id - Get single obligation with full details
    if (method === 'GET' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+$/) &&
        !pathname.includes('stats') && !pathname.includes('calendar') &&
        !pathname.includes('overdue') && !pathname.includes('my-assignments')) {
      const obligationId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('contract_obligations')
        .select(`
          *,
          contract:contracts(id, title, status, vendor:vendors(id, name)),
          assignments:obligation_assignments(
            id, user_id, role, accepted, accepted_at, notifications_enabled,
            user:users(id, full_name, email),
            assigned_by_user:users!assigned_by(id, full_name)
          ),
          completions:obligation_completions(
            id, completion_date, evidence_type, evidence_url, notes,
            was_on_time, days_early_late, requires_verification, verified,
            completed_by_user:users!completed_by(id, full_name),
            verified_by_user:users!verified_by(id, full_name)
          ),
          reminders:obligation_reminders(
            id, reminder_type, days_offset, scheduled_for, sent_at, acknowledged_at
          ),
          depends_on:contract_obligations!depends_on_obligation_id(id, title, status),
          triggers:contract_obligations!triggers_obligation_id(id, title, status),
          created_by_user:users!created_by(id, full_name, email)
        `)
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-obligations - Create new obligation
    if (method === 'POST' && pathname === '/contract-obligations') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(obligationSchema, body);

      // Verify contract belongs to enterprise
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', validatedData.contract_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Set initial next_due_date for recurring obligations
      let nextDueDate = validatedData.next_due_date;
      if (!nextDueDate && validatedData.frequency !== 'one_time' && validatedData.due_date) {
        nextDueDate = validatedData.due_date;
      }

      const { data, error } = await supabase
        .from('contract_obligations')
        .insert({
          ...validatedData,
          next_due_date: nextDueDate,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select(`
          *,
          contract:contracts(id, title)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Obligation created', 201, req);
    }

    // PUT /contract-obligations/:id - Update obligation
    if (method === 'PUT' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+$/) &&
        !pathname.includes('assignments') && !pathname.includes('completions')) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];
      const body = await req.json();
      const validatedData = validateRequest(obligationUpdateSchema, body);

      const { data, error } = await supabase
        .from('contract_obligations')
        .update(validatedData)
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .select(`
          *,
          contract:contracts(id, title)
        `)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-obligations/:id - Delete obligation
    if (method === 'DELETE' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+$/) &&
        !pathname.includes('assignments') && !pathname.includes('completions')) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];

      // Check if obligation has completions
      const { data: completions } = await supabase
        .from('obligation_completions')
        .select('id')
        .eq('obligation_id', obligationId)
        .limit(1);

      if (completions && completions.length > 0) {
        // If has completions, cancel instead of delete
        const { data, error } = await supabase
          .from('contract_obligations')
          .update({ status: 'cancelled' })
          .eq('id', obligationId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error) throw error;

        return createSuccessResponse(
          { cancelled: true, obligation: data },
          'Obligation cancelled (has completion history)',
          200,
          req
        );
      }

      const { error } = await supabase
        .from('contract_obligations')
        .delete()
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Obligation deleted', 200, req);
    }

    // ============================================
    // STATUS CHANGE ROUTES
    // ============================================

    // POST /contract-obligations/:id/activate - Activate obligation
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/activate$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('contract_obligations')
        .update({ status: 'active' })
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Obligation not found or not pending', 404, req);
      }

      // Create reminders for the obligation
      await supabase.rpc('create_obligation_reminders', {
        p_obligation_id: obligationId,
      });

      return createSuccessResponse(data, 'Obligation activated', 200, req);
    }

    // POST /contract-obligations/:id/waive - Waive obligation
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/waive$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to waive', 403, req);
      }

      const obligationId = pathname.split('/')[2];
      const body = await req.json().catch(() => ({}));
      const reason = body.reason || null;

      const { data, error } = await supabase
        .from('contract_obligations')
        .update({
          status: 'waived',
          metadata: {
            waived_by: profile.id,
            waived_at: new Date().toISOString(),
            waiver_reason: reason,
          },
        })
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      return createSuccessResponse(data, 'Obligation waived', 200, req);
    }

    // ============================================
    // ASSIGNMENT ROUTES
    // ============================================

    // GET /contract-obligations/:id/assignments - Get assignments
    if (method === 'GET' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments$/)) {
      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const { data, error } = await supabase
        .from('obligation_assignments')
        .select(`
          *,
          user:users(id, full_name, email),
          assigned_by_user:users!assigned_by(id, full_name)
        `)
        .eq('obligation_id', obligationId)
        .order('role');

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-obligations/:id/assignments - Add assignment
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(assignmentSchema, body);

      const { data, error } = await supabase
        .from('obligation_assignments')
        .insert({
          ...validatedData,
          obligation_id: obligationId,
          assigned_by: profile.id,
        })
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      // Refresh reminders with new assignee
      await supabase.rpc('create_obligation_reminders', {
        p_obligation_id: obligationId,
      });

      return createSuccessResponse(data, 'Assignment added', 201, req);
    }

    // PUT /contract-obligations/:obligationId/assignments/:assignmentId - Update assignment
    if (method === 'PUT' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const obligationId = parts[2];
      const assignmentId = parts[4];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(assignmentSchema.partial(), body);

      const { data, error } = await supabase
        .from('obligation_assignments')
        .update(validatedData)
        .eq('id', assignmentId)
        .eq('obligation_id', obligationId)
        .select(`
          *,
          user:users(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Assignment not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-obligations/:obligationId/assignments/:assignmentId - Remove assignment
    if (method === 'DELETE' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const obligationId = parts[2];
      const assignmentId = parts[4];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const { error } = await supabase
        .from('obligation_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('obligation_id', obligationId);

      if (error) throw error;

      // Refresh reminders without removed assignee
      await supabase.rpc('create_obligation_reminders', {
        p_obligation_id: obligationId,
      });

      return createSuccessResponse({ deleted: true }, 'Assignment removed', 200, req);
    }

    // POST /contract-obligations/:obligationId/assignments/:assignmentId/accept - Accept assignment
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments\/[a-f0-9-]+\/accept$/)) {
      const parts = pathname.split('/');
      const obligationId = parts[2];
      const assignmentId = parts[4];

      const { data, error } = await supabase
        .from('obligation_assignments')
        .update({
          accepted: true,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .eq('obligation_id', obligationId)
        .eq('user_id', profile.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Assignment not found or not yours', 404, req);
      }

      return createSuccessResponse(data, 'Assignment accepted', 200, req);
    }

    // POST /contract-obligations/:obligationId/assignments/:assignmentId/decline - Decline assignment
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/assignments\/[a-f0-9-]+\/decline$/)) {
      const parts = pathname.split('/');
      const obligationId = parts[2];
      const assignmentId = parts[4];
      const body = await req.json().catch(() => ({}));

      const { data, error } = await supabase
        .from('obligation_assignments')
        .update({
          accepted: false,
          declined_reason: body.reason || null,
        })
        .eq('id', assignmentId)
        .eq('obligation_id', obligationId)
        .eq('user_id', profile.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Assignment not found or not yours', 404, req);
      }

      return createSuccessResponse(data, 'Assignment declined', 200, req);
    }

    // ============================================
    // COMPLETION ROUTES
    // ============================================

    // GET /contract-obligations/:id/completions - Get completion history
    if (method === 'GET' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/completions$/)) {
      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const { data, error } = await supabase
        .from('obligation_completions')
        .select(`
          *,
          completed_by_user:users!completed_by(id, full_name, email),
          verified_by_user:users!verified_by(id, full_name, email)
        `)
        .eq('obligation_id', obligationId)
        .order('completion_date', { ascending: false });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-obligations/:id/completions - Record completion
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/completions$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise and is active
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id, status')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      if (!['active', 'in_progress', 'overdue'].includes(obligation.status)) {
        return createErrorResponseSync('Obligation is not in a completable state', 400, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(completionSchema, body);

      const { data, error } = await supabase
        .from('obligation_completions')
        .insert({
          ...validatedData,
          obligation_id: obligationId,
          completed_by: profile.id,
        })
        .select(`
          *,
          completed_by_user:users!completed_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Completion recorded', 201, req);
    }

    // POST /contract-obligations/:obligationId/completions/:completionId/verify - Verify completion
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/completions\/[a-f0-9-]+\/verify$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to verify', 403, req);
      }

      const parts = pathname.split('/');
      const obligationId = parts[2];
      const completionId = parts[4];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(verificationSchema, body);

      const updateData: Record<string, unknown> = {
        verified: validatedData.verified,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
      };

      if (validatedData.verification_notes) {
        updateData.verification_notes = validatedData.verification_notes;
      }
      if (!validatedData.verified && validatedData.rejection_reason) {
        updateData.rejection_reason = validatedData.rejection_reason;
      }

      const { data, error } = await supabase
        .from('obligation_completions')
        .update(updateData)
        .eq('id', completionId)
        .eq('obligation_id', obligationId)
        .select(`
          *,
          completed_by_user:users!completed_by(id, full_name),
          verified_by_user:users!verified_by(id, full_name)
        `)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Completion record not found', 404, req);
      }

      return createSuccessResponse(
        data,
        validatedData.verified ? 'Completion verified' : 'Completion rejected',
        200,
        req
      );
    }

    // ============================================
    // REMINDER ROUTES
    // ============================================

    // GET /contract-obligations/:id/reminders - Get reminders
    if (method === 'GET' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/reminders$/)) {
      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const { data, error } = await supabase
        .from('obligation_reminders')
        .select('*')
        .eq('obligation_id', obligationId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-obligations/:id/reminders/refresh - Refresh reminders
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/[a-f0-9-]+\/reminders\/refresh$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const obligationId = pathname.split('/')[2];

      // Verify obligation belongs to enterprise
      const { data: obligation } = await supabase
        .from('contract_obligations')
        .select('id')
        .eq('id', obligationId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!obligation) {
        return createErrorResponseSync('Obligation not found', 404, req);
      }

      const { data, error } = await supabase.rpc('create_obligation_reminders', {
        p_obligation_id: obligationId,
      });

      if (error) throw error;

      return createSuccessResponse(
        { reminders_created: data },
        'Reminders refreshed',
        200,
        req
      );
    }

    // POST /contract-obligations/reminders/:reminderId/acknowledge - Acknowledge reminder
    if (method === 'POST' && pathname.match(/^\/contract-obligations\/reminders\/[a-f0-9-]+\/acknowledge$/)) {
      const reminderId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('obligation_reminders')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile.id,
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Reminder not found', 404, req);
      }

      return createSuccessResponse(data, 'Reminder acknowledged', 200, req);
    }

    // ============================================
    // BULK OPERATIONS
    // ============================================

    // POST /contract-obligations/bulk-create - Create multiple obligations (e.g., from AI extraction)
    if (method === 'POST' && pathname === '/contract-obligations/bulk-create') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const { contract_id, obligations } = body;

      if (!contract_id || !Array.isArray(obligations) || obligations.length === 0) {
        return createErrorResponseSync('contract_id and obligations array required', 400, req);
      }

      if (obligations.length > 50) {
        return createErrorResponseSync('Maximum 50 obligations per bulk create', 400, req);
      }

      // Verify contract belongs to enterprise
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contract_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Validate and prepare obligations
      const preparedObligations = obligations.map((obl: unknown) => {
        const validated = validateRequest(obligationSchema.omit({ contract_id: true }), obl);
        return {
          ...validated,
          contract_id,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        };
      });

      const { data, error } = await supabase
        .from('contract_obligations')
        .insert(preparedObligations)
        .select();

      if (error) throw error;

      return createSuccessResponse(
        { created_count: data?.length || 0, obligations: data },
        'Obligations created',
        201,
        req
      );
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'contracts', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'contract-obligations',
);
