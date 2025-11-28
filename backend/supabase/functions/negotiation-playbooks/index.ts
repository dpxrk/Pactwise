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

const playbookStatusEnum = z.enum(['draft', 'pending_approval', 'active', 'deprecated']);

const contractTypeArray = z.array(z.enum([
  'nda', 'msa', 'sow', 'saas', 'lease', 'employment',
  'partnership', 'procurement', 'license', 'service', 'other'
]));

const playbookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  contract_types: contractTypeArray,
  status: playbookStatusEnum.optional().default('draft'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const playbookUpdateSchema = playbookSchema.partial();

const clauseTypeEnum = z.enum([
  'indemnification', 'liability', 'limitation_of_liability',
  'ip_ownership', 'confidentiality', 'data_protection',
  'termination', 'termination_for_convenience', 'force_majeure',
  'payment', 'pricing', 'warranty', 'insurance',
  'dispute_resolution', 'governing_law', 'assignment',
  'notice', 'audit_rights', 'compliance', 'sla',
  'non_compete', 'non_solicitation', 'entire_agreement',
  'amendment', 'severability', 'waiver', 'definitions', 'other'
]);

const fallbackPositionSchema = z.object({
  order: z.number().int().min(1),
  text: z.string().min(1),
  clause_id: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
});

const redLineSchema = z.object({
  term: z.string().min(1),
  description: z.string().optional(),
  consequence: z.string().optional(),
});

const escalationTriggerSchema = z.object({
  trigger: z.string().min(1),
  action: z.string().min(1),
});

const pushbackSchema = z.object({
  pushback: z.string().min(1),
  response: z.string().min(1),
});

const playbookRuleSchema = z.object({
  clause_type: clauseTypeEnum,
  priority: z.number().int().min(1).max(10).optional().default(5),
  standard_clause_id: z.string().uuid().optional().nullable(),
  standard_position_text: z.string().optional().nullable(),
  fallback_positions: z.array(fallbackPositionSchema).optional().default([]),
  red_lines: z.array(redLineSchema).optional().default([]),
  guidance_notes: z.string().max(5000).optional().nullable(),
  talking_points: z.array(z.string()).optional().default([]),
  common_pushback: z.array(pushbackSchema).optional().default([]),
  escalation_triggers: z.array(escalationTriggerSchema).optional().default([]),
  authority_level: z.string().max(100).optional().nullable(),
});

const playbookRuleUpdateSchema = playbookRuleSchema.partial();

const usageOutcomeEnum = z.enum(['won', 'compromised', 'lost']);
const overallOutcomeEnum = z.enum(['favorable', 'neutral', 'unfavorable']);

const playbookUsageSchema = z.object({
  contract_id: z.string().uuid(),
  deviations: z.array(z.object({
    clause_type: z.string(),
    rule_id: z.string().uuid().optional(),
    deviation_type: z.enum(['used_fallback', 'custom', 'accepted_theirs']),
    position_used: z.number().int().optional(),
    custom_text: z.string().optional(),
    reason: z.string().optional(),
  })).optional().default([]),
  escalations: z.array(z.object({
    clause_type: z.string(),
    escalated_to: z.string(),
    escalated_at: z.string().datetime(),
    outcome: z.enum(['approved', 'rejected', 'modified']).optional(),
    notes: z.string().optional(),
  })).optional().default([]),
  outcomes: z.record(z.string(), usageOutcomeEnum).optional().default({}),
  overall_outcome: overallOutcomeEnum.optional(),
  lessons_learned: z.string().max(5000).optional().nullable(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
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
    // PLAYBOOK ROUTES
    // ============================================

    // GET /negotiation-playbooks - List all playbooks
    if (method === 'GET' && pathname === '/negotiation-playbooks') {
      const params = Object.fromEntries(url.searchParams);
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('negotiation_playbooks')
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email),
          approved_by_user:users!approved_by(id, full_name, email),
          rules_count:playbook_rules(count)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (params.status) {
        query = query.eq('status', params.status);
      }
      if (params.contract_type) {
        query = query.contains('contract_types', [params.contract_type]);
      }

      // Apply sorting
      const orderColumn = sortBy || 'updated_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) throw error;

      return createPaginatedResponse(data || [], {
        page,
        limit,
        total: count || 0,
      }, req);
    }

    // GET /negotiation-playbooks/suggest - Get suggested playbook for contract type
    if (method === 'GET' && pathname === '/negotiation-playbooks/suggest') {
      const contractType = url.searchParams.get('contract_type');

      if (!contractType) {
        return createErrorResponseSync('contract_type parameter is required', 400, req);
      }

      const { data, error } = await supabase.rpc('suggest_playbook_for_contract', {
        p_enterprise_id: profile.enterprise_id,
        p_contract_type: contractType,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /negotiation-playbooks/:id - Get playbook with all rules
    if (method === 'GET' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+$/) && !pathname.includes('rules')) {
      const playbookId = pathname.split('/')[2];

      // Use database function for comprehensive data
      const { data, error } = await supabase.rpc('get_playbook_with_rules', {
        p_playbook_id: playbookId,
      });

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /negotiation-playbooks/:id/effectiveness - Get effectiveness report
    if (method === 'GET' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/effectiveness$/)) {
      const playbookId = pathname.split('/')[2];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const { data, error } = await supabase.rpc('get_playbook_effectiveness', {
        p_playbook_id: playbookId,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /negotiation-playbooks - Create new playbook
    if (method === 'POST' && pathname === '/negotiation-playbooks') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(playbookSchema, body);

      const { data, error } = await supabase
        .from('negotiation_playbooks')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Playbook created', 201, req);
    }

    // PUT /negotiation-playbooks/:id - Update playbook
    if (method === 'PUT' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+$/) && !pathname.includes('rules')) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const playbookId = pathname.split('/')[2];
      const body = await req.json();
      const validatedData = validateRequest(playbookUpdateSchema, body);

      const { data, error } = await supabase
        .from('negotiation_playbooks')
        .update(validatedData)
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /negotiation-playbooks/:id - Delete playbook
    if (method === 'DELETE' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+$/) && !pathname.includes('rules')) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const playbookId = pathname.split('/')[2];

      // Check if playbook has usage records
      const { data: usageCheck } = await supabase
        .from('playbook_usage')
        .select('id')
        .eq('playbook_id', playbookId)
        .limit(1);

      if (usageCheck && usageCheck.length > 0) {
        // If has usage, deprecate instead
        const { data, error } = await supabase
          .from('negotiation_playbooks')
          .update({ status: 'deprecated' })
          .eq('id', playbookId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error) throw error;

        return createSuccessResponse(
          { deprecated: true, playbook: data },
          'Playbook deprecated (has usage history)',
          200,
          req
        );
      }

      const { error } = await supabase
        .from('negotiation_playbooks')
        .delete()
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Playbook deleted', 200, req);
    }

    // ============================================
    // PLAYBOOK APPROVAL ROUTES
    // ============================================

    // POST /negotiation-playbooks/:id/approve - Approve playbook
    if (method === 'POST' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/approve$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to approve', 403, req);
      }

      const playbookId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('negotiation_playbooks')
        .update({
          status: 'active',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .in('status', ['draft', 'pending_approval'])
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Playbook not found or already active', 404, req);
      }

      return createSuccessResponse(data, 'Playbook approved', 200, req);
    }

    // POST /negotiation-playbooks/:id/clone - Clone a playbook
    if (method === 'POST' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/clone$/)) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const playbookId = pathname.split('/')[2];
      const body = await req.json().catch(() => ({}));
      const newName = body.name || null;

      // Get original playbook
      const { data: original } = await supabase
        .from('negotiation_playbooks')
        .select('*')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!original) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      // Create clone
      const { data: cloned, error: cloneError } = await supabase
        .from('negotiation_playbooks')
        .insert({
          name: newName || `${original.name} (Copy)`,
          description: original.description,
          contract_types: original.contract_types,
          status: 'draft',
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
          metadata: original.metadata,
        })
        .select()
        .single();

      if (cloneError) throw cloneError;

      // Clone rules
      const { data: rules } = await supabase
        .from('playbook_rules')
        .select('*')
        .eq('playbook_id', playbookId);

      if (rules && rules.length > 0) {
        const clonedRules = rules.map(rule => ({
          playbook_id: cloned.id,
          clause_type: rule.clause_type,
          priority: rule.priority,
          standard_clause_id: rule.standard_clause_id,
          standard_position_text: rule.standard_position_text,
          fallback_positions: rule.fallback_positions,
          red_lines: rule.red_lines,
          guidance_notes: rule.guidance_notes,
          talking_points: rule.talking_points,
          common_pushback: rule.common_pushback,
          escalation_triggers: rule.escalation_triggers,
          authority_level: rule.authority_level,
        }));

        await supabase.from('playbook_rules').insert(clonedRules);
      }

      return createSuccessResponse(cloned, 'Playbook cloned', 201, req);
    }

    // ============================================
    // PLAYBOOK RULES ROUTES
    // ============================================

    // GET /negotiation-playbooks/:id/rules - Get all rules for a playbook
    if (method === 'GET' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/rules$/)) {
      const playbookId = pathname.split('/')[2];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const { data, error } = await supabase
        .from('playbook_rules')
        .select(`
          *,
          standard_clause:clause_library(id, title, content, risk_level)
        `)
        .eq('playbook_id', playbookId)
        .order('priority', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /negotiation-playbooks/:id/rules - Add rule to playbook
    if (method === 'POST' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/rules$/)) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const playbookId = pathname.split('/')[2];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(playbookRuleSchema, body);

      const { data, error } = await supabase
        .from('playbook_rules')
        .insert({
          ...validatedData,
          playbook_id: playbookId,
        })
        .select(`
          *,
          standard_clause:clause_library(id, title, content, risk_level)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Rule added', 201, req);
    }

    // PUT /negotiation-playbooks/:playbookId/rules/:ruleId - Update rule
    if (method === 'PUT' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/rules\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const playbookId = parts[2];
      const ruleId = parts[4];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(playbookRuleUpdateSchema, body);

      const { data, error } = await supabase
        .from('playbook_rules')
        .update(validatedData)
        .eq('id', ruleId)
        .eq('playbook_id', playbookId)
        .select(`
          *,
          standard_clause:clause_library(id, title, content, risk_level)
        `)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Rule not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /negotiation-playbooks/:playbookId/rules/:ruleId - Delete rule
    if (method === 'DELETE' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/rules\/[a-f0-9-]+$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const playbookId = parts[2];
      const ruleId = parts[4];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const { error } = await supabase
        .from('playbook_rules')
        .delete()
        .eq('id', ruleId)
        .eq('playbook_id', playbookId);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Rule deleted', 200, req);
    }

    // ============================================
    // PLAYBOOK USAGE ROUTES
    // ============================================

    // GET /negotiation-playbooks/:id/usage - Get usage history
    if (method === 'GET' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/usage$/)) {
      const playbookId = pathname.split('/')[2];
      const params = Object.fromEntries(url.searchParams);
      const { page, limit } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const { data, error, count } = await supabase
        .from('playbook_usage')
        .select(`
          *,
          contract:contracts(id, title, status, vendor:vendors(id, name))
        `, { count: 'exact' })
        .eq('playbook_id', playbookId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return createPaginatedResponse(data || [], {
        page,
        limit,
        total: count || 0,
      }, req);
    }

    // POST /negotiation-playbooks/:id/usage - Record playbook usage
    if (method === 'POST' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/usage$/)) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const playbookId = pathname.split('/')[2];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(playbookUsageSchema, body);

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

      const { data, error } = await supabase
        .from('playbook_usage')
        .insert({
          ...validatedData,
          playbook_id: playbookId,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Usage recorded', 201, req);
    }

    // PUT /negotiation-playbooks/:playbookId/usage/:usageId - Update usage record
    if (method === 'PUT' && pathname.match(/^\/negotiation-playbooks\/[a-f0-9-]+\/usage\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const playbookId = parts[2];
      const usageId = parts[4];

      // Verify enterprise access
      const { data: playbook } = await supabase
        .from('negotiation_playbooks')
        .select('id')
        .eq('id', playbookId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!playbook) {
        return createErrorResponseSync('Playbook not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(playbookUsageSchema.partial().omit({ contract_id: true }), body);

      // If marking as complete, set completed_at
      const updateData: Record<string, unknown> = { ...validatedData };
      if (validatedData.overall_outcome && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('playbook_usage')
        .update(updateData)
        .eq('id', usageId)
        .eq('playbook_id', playbookId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Usage record not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
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
  'negotiation-playbooks',
);
