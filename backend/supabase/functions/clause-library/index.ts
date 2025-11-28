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

const riskLevelEnum = z.enum(['low', 'medium', 'high', 'critical']);
const clauseStatusEnum = z.enum(['draft', 'pending_approval', 'active', 'deprecated', 'archived']);

const clauseSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  clause_type: clauseTypeEnum,
  category_id: z.string().uuid().optional().nullable(),
  content: z.string().min(1),
  content_html: z.string().optional().nullable(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    default_value: z.string().optional(),
  })).optional().default([]),
  risk_level: riskLevelEnum.optional().default('medium'),
  jurisdictions: z.array(z.string()).optional().default([]),
  languages: z.array(z.string()).optional().default(['en']),
  status: clauseStatusEnum.optional().default('draft'),
  is_standard: z.boolean().optional().default(false),
  requires_approval_if_modified: z.boolean().optional().default(true),
  effective_date: z.string().datetime().optional().nullable(),
  expiration_date: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const clauseUpdateSchema = clauseSchema.partial();

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().optional().default(0),
});

const alternativeSchema = z.object({
  clause_id: z.string().uuid(),
  position_order: z.number().int().min(1),
  position_label: z.string().min(1).max(100),
  content: z.string().min(1),
  content_html: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  risk_delta: z.number().int().optional().default(0),
  requires_approval: z.boolean().optional().default(true),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const searchSchema = z.object({
  query: z.string().optional(),
  clause_type: clauseTypeEnum.optional(),
  risk_level: riskLevelEnum.optional(),
  status: clauseStatusEnum.optional(),
  category_id: z.string().uuid().optional(),
  is_standard: z.coerce.boolean().optional(),
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

    // Get user's permissions for clause library (using contracts as base)
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ============================================
    // CLAUSE CATEGORIES ROUTES
    // ============================================

    // GET /clause-library/categories - List all categories
    if (method === 'GET' && pathname === '/clause-library/categories') {
      const { data, error } = await supabase
        .from('clause_categories')
        .select('*')
        .eq('enterprise_id', profile.enterprise_id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /clause-library/categories - Create category
    if (method === 'POST' && pathname === '/clause-library/categories') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(categorySchema, body);

      const { data, error } = await supabase
        .from('clause_categories')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Category created', 201, req);
    }

    // PUT /clause-library/categories/:id - Update category
    if (method === 'PUT' && pathname.match(/^\/clause-library\/categories\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const categoryId = pathname.split('/')[3];
      const body = await req.json();
      const validatedData = validateRequest(categorySchema.partial(), body);

      const { data, error } = await supabase
        .from('clause_categories')
        .update(validatedData)
        .eq('id', categoryId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Category not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /clause-library/categories/:id - Delete category
    if (method === 'DELETE' && pathname.match(/^\/clause-library\/categories\/[a-f0-9-]+$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const categoryId = pathname.split('/')[3];

      const { error } = await supabase
        .from('clause_categories')
        .delete()
        .eq('id', categoryId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Category deleted', 200, req);
    }

    // ============================================
    // CLAUSE LIBRARY ROUTES
    // ============================================

    // GET /clause-library - List clauses with search and pagination
    if (method === 'GET' && pathname === '/clause-library') {
      const params = Object.fromEntries(url.searchParams);
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const searchParams = validateRequest(searchSchema, params);
      const offset = (page - 1) * limit;

      // Use database search function if query provided
      if (searchParams.query) {
        const { data, error } = await supabase.rpc('search_clauses', {
          p_enterprise_id: profile.enterprise_id,
          p_search_query: searchParams.query,
          p_clause_type: searchParams.clause_type || null,
          p_risk_level: searchParams.risk_level || null,
          p_status: searchParams.status || null,
          p_category_id: searchParams.category_id || null,
          p_limit: limit,
          p_offset: offset,
        });

        if (error) throw error;

        // Get total count for pagination
        const { count } = await supabase
          .from('clause_library')
          .select('*', { count: 'exact', head: true })
          .eq('enterprise_id', profile.enterprise_id);

        return createPaginatedResponse(data || [], {
          page,
          limit,
          total: count || 0,
        }, req);
      }

      // Standard query without full-text search
      let query = supabase
        .from('clause_library')
        .select(`
          *,
          category:clause_categories(id, name)
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (searchParams.clause_type) {
        query = query.eq('clause_type', searchParams.clause_type);
      }
      if (searchParams.risk_level) {
        query = query.eq('risk_level', searchParams.risk_level);
      }
      if (searchParams.status) {
        query = query.eq('status', searchParams.status);
      }
      if (searchParams.category_id) {
        query = query.eq('category_id', searchParams.category_id);
      }
      if (searchParams.is_standard !== undefined) {
        query = query.eq('is_standard', searchParams.is_standard);
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

    // GET /clause-library/:id - Get single clause with versions and alternatives
    if (method === 'GET' && pathname.match(/^\/clause-library\/[a-f0-9-]+$/) && !pathname.includes('categories')) {
      const clauseId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('clause_library')
        .select(`
          *,
          category:clause_categories(id, name, description),
          versions:clause_versions(
            id, version_number, version_label, content,
            change_summary, change_type, is_current, created_at
          ),
          alternatives:clause_alternatives(
            id, position_order, position_label, content,
            description, risk_delta, requires_approval
          ),
          created_by_user:users!created_by(id, full_name, email),
          approved_by_user:users!approved_by(id, full_name, email)
        `)
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /clause-library - Create new clause
    if (method === 'POST' && pathname === '/clause-library') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(clauseSchema, body);

      const { data, error } = await supabase
        .from('clause_library')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select(`
          *,
          category:clause_categories(id, name)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Clause created', 201, req);
    }

    // PUT /clause-library/:id - Update clause
    if (method === 'PUT' && pathname.match(/^\/clause-library\/[a-f0-9-]+$/) && !pathname.includes('categories')) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const clauseId = pathname.split('/')[2];
      const body = await req.json();
      const validatedData = validateRequest(clauseUpdateSchema, body);

      // Check if clause exists and belongs to enterprise
      const { data: existing } = await supabase
        .from('clause_library')
        .select('id, status, requires_approval_if_modified')
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!existing) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      // If clause requires approval and content changed, set to pending_approval
      const updateData = { ...validatedData };
      if (existing.requires_approval_if_modified && validatedData.content && existing.status === 'active') {
        updateData.status = 'pending_approval';
      }

      const { data, error } = await supabase
        .from('clause_library')
        .update(updateData)
        .eq('id', clauseId)
        .select(`
          *,
          category:clause_categories(id, name)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /clause-library/:id - Delete clause (soft delete via status)
    if (method === 'DELETE' && pathname.match(/^\/clause-library\/[a-f0-9-]+$/) && !pathname.includes('categories')) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const clauseId = pathname.split('/')[2];

      // Check if clause is used in any playbook rules
      const { data: usageCheck } = await supabase
        .from('playbook_rules')
        .select('id')
        .eq('standard_clause_id', clauseId)
        .limit(1);

      if (usageCheck && usageCheck.length > 0) {
        // If in use, archive instead of delete
        const { data, error } = await supabase
          .from('clause_library')
          .update({ status: 'archived' })
          .eq('id', clauseId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error) throw error;

        return createSuccessResponse(
          { archived: true, clause: data },
          'Clause archived (in use by playbooks)',
          200,
          req
        );
      }

      // If not in use, delete
      const { error } = await supabase
        .from('clause_library')
        .delete()
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Clause deleted', 200, req);
    }

    // ============================================
    // CLAUSE APPROVAL ROUTES
    // ============================================

    // POST /clause-library/:id/approve - Approve a clause
    if (method === 'POST' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/approve$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to approve', 403, req);
      }

      const clauseId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('clause_library')
        .update({
          status: 'active',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'pending_approval')
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Clause not found or not pending approval', 404, req);
      }

      return createSuccessResponse(data, 'Clause approved', 200, req);
    }

    // POST /clause-library/:id/deprecate - Deprecate a clause
    if (method === 'POST' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/deprecate$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const clauseId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('clause_library')
        .update({ status: 'deprecated' })
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      return createSuccessResponse(data, 'Clause deprecated', 200, req);
    }

    // ============================================
    // CLAUSE ALTERNATIVES ROUTES
    // ============================================

    // GET /clause-library/:id/alternatives - Get alternatives for a clause
    if (method === 'GET' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/alternatives$/)) {
      const clauseId = pathname.split('/')[2];

      // Verify clause belongs to enterprise
      const { data: clause } = await supabase
        .from('clause_library')
        .select('id')
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      const { data, error } = await supabase
        .from('clause_alternatives')
        .select('*')
        .eq('clause_id', clauseId)
        .order('position_order', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /clause-library/:id/alternatives - Add alternative to clause
    if (method === 'POST' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/alternatives$/)) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const clauseId = pathname.split('/')[2];

      // Verify clause belongs to enterprise
      const { data: clause } = await supabase
        .from('clause_library')
        .select('id')
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(alternativeSchema.omit({ clause_id: true }), body);

      const { data, error } = await supabase
        .from('clause_alternatives')
        .insert({
          ...validatedData,
          clause_id: clauseId,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Alternative added', 201, req);
    }

    // DELETE /clause-library/:clauseId/alternatives/:altId - Remove alternative
    if (method === 'DELETE' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/alternatives\/[a-f0-9-]+$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const clauseId = parts[2];
      const alternativeId = parts[4];

      // Verify clause belongs to enterprise
      const { data: clause } = await supabase
        .from('clause_library')
        .select('id')
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      const { error } = await supabase
        .from('clause_alternatives')
        .delete()
        .eq('id', alternativeId)
        .eq('clause_id', clauseId);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Alternative deleted', 200, req);
    }

    // ============================================
    // CLAUSE VERSIONS ROUTES
    // ============================================

    // GET /clause-library/:id/versions - Get version history
    if (method === 'GET' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/versions$/)) {
      const clauseId = pathname.split('/')[2];

      // Verify clause belongs to enterprise
      const { data: clause } = await supabase
        .from('clause_library')
        .select('id')
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      const { data, error } = await supabase
        .from('clause_versions')
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email)
        `)
        .eq('clause_id', clauseId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /clause-library/:id/versions/:versionId/restore - Restore a version
    if (method === 'POST' && pathname.match(/^\/clause-library\/[a-f0-9-]+\/versions\/[a-f0-9-]+\/restore$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const clauseId = parts[2];
      const versionId = parts[4];

      // Get the version to restore
      const { data: version } = await supabase
        .from('clause_versions')
        .select('content, content_html, variables')
        .eq('id', versionId)
        .eq('clause_id', clauseId)
        .single();

      if (!version) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      // Update clause with version content (this will trigger version creation)
      const { data, error } = await supabase
        .from('clause_library')
        .update({
          content: version.content,
          content_html: version.content_html,
          variables: version.variables,
          status: 'pending_approval', // Require re-approval after restoration
        })
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Version restored', 200, req);
    }

    // ============================================
    // STANDARD CLAUSES ROUTES
    // ============================================

    // GET /clause-library/standard - Get all standard clauses
    if (method === 'GET' && pathname === '/clause-library/standard') {
      const params = Object.fromEntries(url.searchParams);
      const { clause_type } = validateRequest(searchSchema, params);

      let query = supabase
        .from('clause_library')
        .select(`
          *,
          category:clause_categories(id, name)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_standard', true)
        .eq('status', 'active');

      if (clause_type) {
        query = query.eq('clause_type', clause_type);
      }

      const { data, error } = await query.order('clause_type');

      if (error) throw error;

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
  'clause-library',
);
