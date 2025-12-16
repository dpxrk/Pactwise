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

const templateTypeEnum = z.enum([
  'master_services_agreement', 'statement_of_work', 'nda', 'non_disclosure',
  'employment', 'contractor', 'lease', 'license', 'purchase_order',
  'sales', 'partnership', 'joint_venture', 'distribution', 'franchise',
  'consulting', 'maintenance', 'support', 'subscription', 'saas',
  'data_processing', 'vendor', 'supplier', 'amendment', 'addendum', 'other'
]);

const templateStatusEnum = z.enum([
  'draft', 'pending_review', 'pending_approval', 'approved', 'active', 'deprecated', 'archived'
]);

const variableTypeEnum = z.enum([
  'text', 'number', 'currency', 'date', 'datetime', 'boolean',
  'select', 'multi_select', 'party', 'address', 'email', 'phone',
  'percentage', 'duration', 'user', 'vendor', 'custom'
]);

const numberingStyleEnum = z.enum(['decimal', 'roman', 'alpha', 'none']);

// Template schema
const templateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  template_type: templateTypeEnum,
  category: z.string().max(255).optional().nullable(),
  jurisdictions: z.array(z.string()).optional().default([]),
  governing_law: z.string().max(255).optional().nullable(),
  regulatory_requirements: z.array(z.string()).optional().default([]),
  status: templateStatusEnum.optional().default('draft'),
  is_default: z.boolean().optional().default(false),
  requires_legal_review: z.boolean().optional().default(true),
  header_content: z.string().optional().nullable(),
  header_content_html: z.string().optional().nullable(),
  footer_content: z.string().optional().nullable(),
  footer_content_html: z.string().optional().nullable(),
  signature_block_template: z.string().optional().nullable(),
  max_contract_value: z.number().positive().optional().nullable(),
  min_contract_value: z.number().positive().optional().nullable(),
  allowed_contract_types: z.array(z.string()).optional().default([]),
  effective_date: z.string().datetime().optional().nullable(),
  expiration_date: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const templateUpdateSchema = templateSchema.partial();

// Section schema
const sectionSchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  section_number: z.string().max(50).optional().nullable(),
  sort_order: z.number().int().min(0),
  parent_section_id: z.string().uuid().optional().nullable(),
  depth: z.number().int().min(0).optional().default(0),
  intro_content: z.string().optional().nullable(),
  intro_content_html: z.string().optional().nullable(),
  outro_content: z.string().optional().nullable(),
  outro_content_html: z.string().optional().nullable(),
  is_required: z.boolean().optional().default(true),
  is_editable: z.boolean().optional().default(true),
  is_conditional: z.boolean().optional().default(false),
  condition_expression: z.record(z.string(), z.unknown()).optional().nullable(),
  page_break_before: z.boolean().optional().default(false),
  numbering_style: numberingStyleEnum.optional().default('decimal'),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Clause mapping schema
const clauseMappingSchema = z.object({
  section_id: z.string().uuid(),
  clause_id: z.string().uuid(),
  sort_order: z.number().int().min(0),
  is_required: z.boolean().optional().default(true),
  is_editable: z.boolean().optional().default(true),
  allow_alternatives: z.boolean().optional().default(true),
  default_alternative_id: z.string().uuid().optional().nullable(),
  override_content: z.string().optional().nullable(),
  override_content_html: z.string().optional().nullable(),
  is_conditional: z.boolean().optional().default(false),
  condition_expression: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Variable schema
const variableSchema = z.object({
  variable_name: z.string().min(1).max(100).regex(/^[A-Z][A-Z0-9_]*$/, 'Variable name must be UPPERCASE_WITH_UNDERSCORES'),
  display_name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  variable_type: variableTypeEnum,
  validation_rules: z.record(z.string(), z.unknown()).optional().default({}),
  format_pattern: z.string().max(255).optional().nullable(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional().default([]),
  default_value: z.string().optional().nullable(),
  default_expression: z.string().optional().nullable(),
  is_required: z.boolean().optional().default(true),
  is_system: z.boolean().optional().default(false),
  group_name: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
  placeholder: z.string().max(255).optional().nullable(),
  help_text: z.string().max(500).optional().nullable(),
  display_format: z.string().max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Pagination and search schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const searchSchema = z.object({
  query: z.string().optional(),
  template_type: templateTypeEnum.optional(),
  status: templateStatusEnum.optional(),
  is_default: z.coerce.boolean().optional(),
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

    // Get user permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ============================================
    // TEMPLATE CRUD ROUTES
    // ============================================

    // GET /contract-templates - List templates with search and pagination
    if (method === 'GET' && pathname === '/contract-templates') {
      const params = Object.fromEntries(url.searchParams);
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const searchParams = validateRequest(searchSchema, params);
      const offset = (page - 1) * limit;

      // Use database search function if query provided
      if (searchParams.query) {
        const { data, error } = await supabase.rpc('search_templates', {
          p_enterprise_id: profile.enterprise_id,
          p_search_query: searchParams.query,
          p_template_type: searchParams.template_type || null,
          p_status: searchParams.status || null,
          p_limit: limit,
          p_offset: offset,
        });

        if (error) throw error;

        // Get total count
        const { count } = await supabase
          .from('contract_templates')
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
        .from('contract_templates')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (searchParams.template_type) {
        query = query.eq('template_type', searchParams.template_type);
      }
      if (searchParams.status) {
        query = query.eq('status', searchParams.status);
      }
      if (searchParams.is_default !== undefined) {
        query = query.eq('is_default', searchParams.is_default);
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

    // GET /contract-templates/:id - Get single template with full details
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+$/) && !pathname.includes('/sections') && !pathname.includes('/variables') && !pathname.includes('/versions')) {
      const templateId = pathname.split('/')[2];

      // Use database function to get full template
      const { data, error } = await supabase.rpc('get_template_full', {
        p_template_id: templateId,
      });

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-templates - Create new template
    if (method === 'POST' && pathname === '/contract-templates') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(templateSchema, body);

      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Template created', 201, req);
    }

    // PUT /contract-templates/:id - Update template
    if (method === 'PUT' && pathname.match(/^\/contract-templates\/[a-f0-9-]+$/) && !pathname.includes('/sections') && !pathname.includes('/variables')) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];
      const body = await req.json();
      const validatedData = validateRequest(templateUpdateSchema, body);

      const { data, error } = await supabase
        .from('contract_templates')
        .update(validatedData)
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-templates/:id - Delete template
    if (method === 'DELETE' && pathname.match(/^\/contract-templates\/[a-f0-9-]+$/) && !pathname.includes('/sections') && !pathname.includes('/variables')) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      // Check if template is in use (has contracts using it)
      const { data: usageCheck } = await supabase
        .from('contracts')
        .select('id')
        .eq('template_id', templateId)
        .limit(1);

      if (usageCheck && usageCheck.length > 0) {
        // Archive instead of delete
        const { data, error } = await supabase
          .from('contract_templates')
          .update({ status: 'archived' })
          .eq('id', templateId)
          .eq('enterprise_id', profile.enterprise_id)
          .select()
          .single();

        if (error) throw error;

        return createSuccessResponse(
          { archived: true, template: data },
          'Template archived (in use by contracts)',
          200,
          req
        );
      }

      // Delete if not in use
      const { error } = await supabase
        .from('contract_templates')
        .delete()
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Template deleted', 200, req);
    }

    // ============================================
    // TEMPLATE SECTIONS ROUTES
    // ============================================

    // GET /contract-templates/:id/sections - Get all sections for a template
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/sections$/)) {
      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_sections')
        .select(`
          *,
          clause_mappings:template_clause_mappings(
            id, clause_id, sort_order, is_required, is_editable,
            clause:clause_library(id, title, clause_type, risk_level, content)
          )
        `)
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-templates/:id/sections - Add section to template
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/sections$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(sectionSchema, body);

      const { data, error } = await supabase
        .from('template_sections')
        .insert({
          ...validatedData,
          template_id: templateId,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Section added', 201, req);
    }

    // PUT /contract-templates/:templateId/sections/:sectionId - Update section
    if (method === 'PUT' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/sections\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const sectionId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(sectionSchema.partial(), body);

      const { data, error } = await supabase
        .from('template_sections')
        .update(validatedData)
        .eq('id', sectionId)
        .eq('template_id', templateId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Section not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-templates/:templateId/sections/:sectionId - Delete section
    if (method === 'DELETE' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/sections\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const sectionId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { error } = await supabase
        .from('template_sections')
        .delete()
        .eq('id', sectionId)
        .eq('template_id', templateId);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Section deleted', 200, req);
    }

    // ============================================
    // CLAUSE MAPPING ROUTES
    // ============================================

    // POST /contract-templates/:id/clauses - Add clause to template section
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/clauses$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(clauseMappingSchema, body);

      // Verify section belongs to template
      const { data: section } = await supabase
        .from('template_sections')
        .select('id')
        .eq('id', validatedData.section_id)
        .eq('template_id', templateId)
        .single();

      if (!section) {
        return createErrorResponseSync('Section not found', 404, req);
      }

      // Verify clause belongs to enterprise
      const { data: clause } = await supabase
        .from('clause_library')
        .select('id')
        .eq('id', validatedData.clause_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_clause_mappings')
        .insert({
          ...validatedData,
          template_id: templateId,
        })
        .select(`
          *,
          clause:clause_library(id, title, clause_type, risk_level)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Clause added to template', 201, req);
    }

    // PUT /contract-templates/:templateId/clauses/:mappingId - Update clause mapping
    if (method === 'PUT' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/clauses\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const mappingId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(clauseMappingSchema.partial().omit({ section_id: true, clause_id: true }), body);

      const { data, error } = await supabase
        .from('template_clause_mappings')
        .update(validatedData)
        .eq('id', mappingId)
        .eq('template_id', templateId)
        .select(`
          *,
          clause:clause_library(id, title, clause_type, risk_level)
        `)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Clause mapping not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-templates/:templateId/clauses/:mappingId - Remove clause from template
    if (method === 'DELETE' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/clauses\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const mappingId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { error } = await supabase
        .from('template_clause_mappings')
        .delete()
        .eq('id', mappingId)
        .eq('template_id', templateId);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Clause removed from template', 200, req);
    }

    // ============================================
    // TEMPLATE VARIABLES ROUTES
    // ============================================

    // GET /contract-templates/:id/variables - Get all variables for a template
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/variables$/)) {
      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_variables')
        .select('*')
        .eq('template_id', templateId)
        .order('group_name', { nullsFirst: false })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-templates/:id/variables - Add variable to template
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/variables$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(variableSchema, body);

      const { data, error } = await supabase
        .from('template_variables')
        .insert({
          ...validatedData,
          template_id: templateId,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Variable added', 201, req);
    }

    // PUT /contract-templates/:templateId/variables/:variableId - Update variable
    if (method === 'PUT' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/variables\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const variableId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(variableSchema.partial(), body);

      const { data, error } = await supabase
        .from('template_variables')
        .update(validatedData)
        .eq('id', variableId)
        .eq('template_id', templateId)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Variable not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /contract-templates/:templateId/variables/:variableId - Delete variable
    if (method === 'DELETE' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/variables\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const parts = pathname.split('/');
      const templateId = parts[2];
      const variableId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { error } = await supabase
        .from('template_variables')
        .delete()
        .eq('id', variableId)
        .eq('template_id', templateId);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Variable deleted', 200, req);
    }

    // ============================================
    // TEMPLATE VERSIONS ROUTES
    // ============================================

    // GET /contract-templates/:id/versions - Get version history
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/versions$/)) {
      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          id, version_number, version_label, name, description,
          change_summary, change_type, is_current, created_at,
          created_by_user:users!created_by(id, full_name, email),
          approved_by_user:users!approved_by(id, full_name, email)
        `)
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /contract-templates/:id/versions - Create new version
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/versions$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];
      const body = await req.json();
      const { change_summary, change_type } = body;

      // Create version using database function
      const { data, error } = await supabase.rpc('create_template_version', {
        p_template_id: templateId,
        p_change_summary: change_summary || 'Version update',
        p_change_type: change_type || 'minor',
        p_created_by: profile.id,
      });

      if (error) throw error;

      return createSuccessResponse({ version_id: data }, 'Version created', 201, req);
    }

    // GET /contract-templates/:id/versions/:versionId - Get specific version
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/versions\/[a-f0-9-]+$/)) {
      const parts = pathname.split('/');
      const templateId = parts[2];
      const versionId = parts[4];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_versions')
        .select('*')
        .eq('id', versionId)
        .eq('template_id', templateId)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // ============================================
    // TEMPLATE RENDER & PREVIEW ROUTES
    // ============================================

    // POST /contract-templates/:id/render - Render template with variables
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/render$/)) {
      const templateId = pathname.split('/')[2];

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const body = await req.json();
      const variableValues = body.variables || {};

      // Render using database function
      const { data, error } = await supabase.rpc('render_template_content', {
        p_template_id: templateId,
        p_variable_values: variableValues,
      });

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // ============================================
    // TEMPLATE WORKFLOW ROUTES
    // ============================================

    // POST /contract-templates/:id/submit-for-review - Submit for review
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/submit-for-review$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('contract_templates')
        .update({ status: 'pending_review' })
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Template not found or not in draft status', 404, req);
      }

      return createSuccessResponse(data, 'Template submitted for review', 200, req);
    }

    // POST /contract-templates/:id/approve - Approve template
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/approve$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to approve', 403, req);
      }

      const templateId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('contract_templates')
        .update({
          status: 'active',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .in('status', ['pending_review', 'pending_approval'])
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Template not found or not pending approval', 404, req);
      }

      return createSuccessResponse(data, 'Template approved', 200, req);
    }

    // POST /contract-templates/:id/deprecate - Deprecate template
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/deprecate$/)) {
      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('contract_templates')
        .update({ status: 'deprecated' })
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      return createSuccessResponse(data, 'Template deprecated', 200, req);
    }

    // ============================================
    // TEMPLATE COPY ROUTE
    // ============================================

    // POST /contract-templates/:id/copy - Duplicate a template
    if (method === 'POST' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/copy$/)) {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const templateId = pathname.split('/')[2];
      const body = await req.json();
      const newName = body.name || 'Copy of template';

      // Get original template
      const { data: original } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!original) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      // Create copy
      const { id: _, created_at: __, updated_at: ___, approved_at: ____, approved_by: _____, ...copyData } = original;

      const { data: newTemplate, error: createError } = await supabase
        .from('contract_templates')
        .insert({
          ...copyData,
          name: newName,
          slug: null, // Let trigger generate new slug
          status: 'draft',
          is_default: false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy sections
      const { data: sections } = await supabase
        .from('template_sections')
        .select('*')
        .eq('template_id', templateId);

      if (sections && sections.length > 0) {
        const sectionMapping: Record<string, string> = {};

        for (const section of sections) {
          const { id: sectionId, created_at: sca, updated_at: sua, ...sectionData } = section;
          const { data: newSection } = await supabase
            .from('template_sections')
            .insert({
              ...sectionData,
              template_id: newTemplate.id,
              parent_section_id: section.parent_section_id ? sectionMapping[section.parent_section_id] : null,
            })
            .select()
            .single();

          if (newSection) {
            sectionMapping[sectionId] = newSection.id;
          }
        }

        // Copy clause mappings
        const { data: mappings } = await supabase
          .from('template_clause_mappings')
          .select('*')
          .eq('template_id', templateId);

        if (mappings && mappings.length > 0) {
          const newMappings = mappings.map(({ id, created_at, ...mappingData }) => ({
            ...mappingData,
            template_id: newTemplate.id,
            section_id: sectionMapping[mappingData.section_id],
          })).filter(m => m.section_id);

          if (newMappings.length > 0) {
            await supabase
              .from('template_clause_mappings')
              .insert(newMappings);
          }
        }
      }

      // Copy variables
      const { data: variables } = await supabase
        .from('template_variables')
        .select('*')
        .eq('template_id', templateId);

      if (variables && variables.length > 0) {
        const newVariables = variables.map(({ id, created_at, ...varData }) => ({
          ...varData,
          template_id: newTemplate.id,
        }));

        await supabase
          .from('template_variables')
          .insert(newVariables);
      }

      return createSuccessResponse(newTemplate, 'Template copied', 201, req);
    }

    // ============================================
    // TEMPLATE ANALYTICS ROUTES
    // ============================================

    // GET /contract-templates/:id/analytics - Get usage analytics
    if (method === 'GET' && pathname.match(/^\/contract-templates\/[a-f0-9-]+\/analytics$/)) {
      const templateId = pathname.split('/')[2];
      const params = Object.fromEntries(url.searchParams);
      const periodType = params.period || 'monthly';

      // Verify template belongs to enterprise
      const { data: template } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('id', templateId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!template) {
        return createErrorResponseSync('Template not found', 404, req);
      }

      const { data, error } = await supabase
        .from('template_usage_analytics')
        .select('*')
        .eq('template_id', templateId)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(12);

      if (error) throw error;

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /contract-templates/types - Get available template types
    if (method === 'GET' && pathname === '/contract-templates/types') {
      const types = [
        { value: 'master_services_agreement', label: 'Master Services Agreement' },
        { value: 'statement_of_work', label: 'Statement of Work' },
        { value: 'nda', label: 'NDA' },
        { value: 'non_disclosure', label: 'Non-Disclosure Agreement' },
        { value: 'employment', label: 'Employment Agreement' },
        { value: 'contractor', label: 'Contractor Agreement' },
        { value: 'lease', label: 'Lease Agreement' },
        { value: 'license', label: 'License Agreement' },
        { value: 'purchase_order', label: 'Purchase Order' },
        { value: 'sales', label: 'Sales Agreement' },
        { value: 'partnership', label: 'Partnership Agreement' },
        { value: 'joint_venture', label: 'Joint Venture Agreement' },
        { value: 'distribution', label: 'Distribution Agreement' },
        { value: 'franchise', label: 'Franchise Agreement' },
        { value: 'consulting', label: 'Consulting Agreement' },
        { value: 'maintenance', label: 'Maintenance Agreement' },
        { value: 'support', label: 'Support Agreement' },
        { value: 'subscription', label: 'Subscription Agreement' },
        { value: 'saas', label: 'SaaS Agreement' },
        { value: 'data_processing', label: 'Data Processing Agreement' },
        { value: 'vendor', label: 'Vendor Agreement' },
        { value: 'supplier', label: 'Supplier Agreement' },
        { value: 'amendment', label: 'Amendment' },
        { value: 'addendum', label: 'Addendum' },
        { value: 'other', label: 'Other' },
      ];

      return createSuccessResponse(types, undefined, 200, req);
    }

    // GET /contract-templates/defaults - Get default templates by type
    if (method === 'GET' && pathname === '/contract-templates/defaults') {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('id, name, template_type, status')
        .eq('enterprise_id', profile.enterprise_id)
        .eq('is_default', true)
        .eq('status', 'active');

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
  'contract-templates',
);
