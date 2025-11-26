/// <reference path="../../types/global.d.ts" />

import { withMiddleware } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { paginationSchema, validateRequest, sanitizeInput } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const complianceItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  framework: z.enum(['SOC2', 'GDPR', 'HIPAA', 'ISO27001', 'PCI_DSS', 'CCPA', 'custom']),
  category: z.string().max(100).optional(),
  requirement_id: z.string().max(100).optional(),
  status: z.enum(['compliant', 'non_compliant', 'partial', 'not_applicable', 'under_review']).default('under_review'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  due_date: z.string().datetime().optional(),
  evidence_required: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

const updateComplianceItemSchema = complianceItemSchema.partial();

const complianceCheckSchema = z.object({
  compliance_item_id: z.string().uuid(),
  check_type: z.enum(['manual', 'automated', 'audit', 'self_assessment']),
  status: z.enum(['passed', 'failed', 'warning', 'skipped']),
  notes: z.string().optional(),
  evidence_urls: z.array(z.string().url()).optional(),
  findings: z.string().optional(),
  remediation_plan: z.string().optional(),
});

const complianceReportSchema = z.object({
  framework: z.enum(['SOC2', 'GDPR', 'HIPAA', 'ISO27001', 'PCI_DSS', 'CCPA', 'custom', 'all']).default('all'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  include_evidence: z.boolean().default(false),
});

const linkEntitySchema = z.object({
  entity_type: z.enum(['contracts', 'vendors', 'documents']),
  entity_id: z.string().uuid(),
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
    const permissions = await getUserPermissions(supabase, profile, 'compliance');

    // ========================================================================
    // GET /compliance - List compliance items
    // ========================================================================
    if (method === 'GET' && pathname === '/compliance') {
      const params = Object.fromEntries(url.searchParams);
      const framework = params.framework;
      const status = params.status;
      const priority = params.priority;
      const search = params.search ? sanitizeInput.searchQuery(params.search) : undefined;

      let query = supabase
        .from('compliance_items')
        .select(`
          *,
          latest_check:compliance_checks(
            id,
            status,
            check_type,
            checked_at,
            checked_by
          )
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (framework && framework !== 'all') {
        query = query.eq('framework', framework);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: items, error } = await query;

      if (error) {
        throw error;
      }

      // Get the latest check for each item
      const formattedItems = items?.map(item => ({
        ...item,
        latest_check: item.latest_check?.[0] || null,
      })) || [];

      return createSuccessResponse({
        items: formattedItems,
        total: formattedItems.length,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /compliance - Create compliance item
    // ========================================================================
    if (method === 'POST' && pathname === '/compliance') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create compliance items', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(complianceItemSchema, body);

      const { data: item, error } = await supabase
        .from('compliance_items')
        .insert({
          ...validatedData,
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(item, undefined, 201, req);
    }

    // ========================================================================
    // GET /compliance/dashboard - Compliance dashboard overview
    // ========================================================================
    if (method === 'GET' && pathname === '/compliance/dashboard') {
      // Get compliance stats by framework
      const { data: items } = await supabase
        .from('compliance_items')
        .select('id, framework, status, priority')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      const stats = {
        total: items?.length || 0,
        by_status: {
          compliant: 0,
          non_compliant: 0,
          partial: 0,
          not_applicable: 0,
          under_review: 0,
        },
        by_framework: {} as Record<string, { total: number; compliant: number; percentage: number }>,
        by_priority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        compliance_score: 0,
      };

      items?.forEach(item => {
        // Count by status
        stats.by_status[item.status as keyof typeof stats.by_status]++;

        // Count by priority
        stats.by_priority[item.priority as keyof typeof stats.by_priority]++;

        // Count by framework
        if (!stats.by_framework[item.framework]) {
          stats.by_framework[item.framework] = { total: 0, compliant: 0, percentage: 0 };
        }
        stats.by_framework[item.framework].total++;
        if (item.status === 'compliant') {
          stats.by_framework[item.framework].compliant++;
        }
      });

      // Calculate percentages
      Object.keys(stats.by_framework).forEach(framework => {
        const fw = stats.by_framework[framework];
        fw.percentage = fw.total > 0 ? Math.round((fw.compliant / fw.total) * 100) : 0;
      });

      // Calculate overall compliance score (excluding not_applicable)
      const applicable = stats.total - stats.by_status.not_applicable;
      stats.compliance_score = applicable > 0
        ? Math.round((stats.by_status.compliant / applicable) * 100)
        : 100;

      // Get upcoming due items
      const { data: upcomingItems } = await supabase
        .from('compliance_items')
        .select('id, title, framework, due_date, status')
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      // Get recent checks
      const { data: recentChecks } = await supabase
        .from('compliance_checks')
        .select(`
          id,
          status,
          check_type,
          checked_at,
          compliance_item:compliance_items(id, title, framework)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .order('checked_at', { ascending: false })
        .limit(10);

      return createSuccessResponse({
        stats,
        upcoming_items: upcomingItems || [],
        recent_checks: recentChecks || [],
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /compliance/:id - Get single compliance item
    // ========================================================================
    const singleItemMatch = pathname.match(/^\/compliance\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleItemMatch) {
      const itemId = sanitizeInput.uuid(singleItemMatch[1]);

      const { data: item, error } = await supabase
        .from('compliance_items')
        .select(`
          *,
          checks:compliance_checks(
            id,
            check_type,
            status,
            notes,
            findings,
            remediation_plan,
            evidence_urls,
            checked_at,
            checked_by
          ),
          linked_entities:compliance_entity_links(
            entity_type,
            entity_id
          )
        `)
        .eq('id', itemId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !item) {
        return createErrorResponseSync('Compliance item not found', 404, req);
      }

      return createSuccessResponse(item, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /compliance/:id - Update compliance item
    // ========================================================================
    if (method === 'PATCH' && singleItemMatch) {
      const itemId = sanitizeInput.uuid(singleItemMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update compliance items', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateComplianceItemSchema, body);

      const { data: item, error } = await supabase
        .from('compliance_items')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!item) {
        return createErrorResponseSync('Compliance item not found', 404, req);
      }

      return createSuccessResponse(item, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /compliance/:id - Delete compliance item
    // ========================================================================
    if (method === 'DELETE' && singleItemMatch) {
      const itemId = sanitizeInput.uuid(singleItemMatch[1]);

      if (!permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete compliance items', 403, req);
      }

      const { error } = await supabase
        .from('compliance_items')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', itemId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Compliance item deleted',
        id: itemId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /compliance/:id/checks - Record a compliance check
    // ========================================================================
    const checksMatch = pathname.match(/^\/compliance\/([a-f0-9-]+)\/checks$/);
    if (method === 'POST' && checksMatch) {
      const itemId = sanitizeInput.uuid(checksMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to record compliance checks', 403, req);
      }

      // Verify item exists
      const { data: item } = await supabase
        .from('compliance_items')
        .select('id, status')
        .eq('id', itemId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!item) {
        return createErrorResponseSync('Compliance item not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(complianceCheckSchema.omit({ compliance_item_id: true }), body);

      // Create check record
      const { data: check, error } = await supabase
        .from('compliance_checks')
        .insert({
          compliance_item_id: itemId,
          ...validatedData,
          checked_by: profile.id,
          checked_at: new Date().toISOString(),
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update item status based on check result
      const newStatus = validatedData.status === 'passed'
        ? 'compliant'
        : validatedData.status === 'failed'
          ? 'non_compliant'
          : validatedData.status === 'warning'
            ? 'partial'
            : item.status;

      await supabase
        .from('compliance_items')
        .update({
          status: newStatus,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      return createSuccessResponse(check, undefined, 201, req);
    }

    // ========================================================================
    // GET /compliance/:id/checks - Get compliance checks history
    // ========================================================================
    if (method === 'GET' && checksMatch) {
      const itemId = sanitizeInput.uuid(checksMatch[1]);

      const { data: checks, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('compliance_item_id', itemId)
        .eq('enterprise_id', profile.enterprise_id)
        .order('checked_at', { ascending: false });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        compliance_item_id: itemId,
        checks: checks || [],
        total: checks?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /compliance/:id/link - Link entity to compliance item
    // ========================================================================
    const linkMatch = pathname.match(/^\/compliance\/([a-f0-9-]+)\/link$/);
    if (method === 'POST' && linkMatch) {
      const itemId = sanitizeInput.uuid(linkMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to link entities', 403, req);
      }

      const body = await req.json();
      const { entity_type, entity_id } = validateRequest(linkEntitySchema, body);

      // Verify item exists
      const { data: item } = await supabase
        .from('compliance_items')
        .select('id')
        .eq('id', itemId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!item) {
        return createErrorResponseSync('Compliance item not found', 404, req);
      }

      // Create link
      const { error } = await supabase
        .from('compliance_entity_links')
        .upsert({
          compliance_item_id: itemId,
          entity_type,
          entity_id,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        }, { onConflict: 'compliance_item_id,entity_type,entity_id' });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Entity linked',
        compliance_item_id: itemId,
        entity_type,
        entity_id,
      }, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /compliance/:id/link/:entityType/:entityId - Unlink entity
    // ========================================================================
    const unlinkMatch = pathname.match(/^\/compliance\/([a-f0-9-]+)\/link\/(contracts|vendors|documents)\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && unlinkMatch) {
      const itemId = sanitizeInput.uuid(unlinkMatch[1]);
      const entityType = unlinkMatch[2];
      const entityId = sanitizeInput.uuid(unlinkMatch[3]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to unlink entities', 403, req);
      }

      const { error } = await supabase
        .from('compliance_entity_links')
        .delete()
        .eq('compliance_item_id', itemId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Entity unlinked',
        compliance_item_id: itemId,
        entity_type: entityType,
        entity_id: entityId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /compliance/report - Generate compliance report
    // ========================================================================
    if (method === 'POST' && pathname === '/compliance/report') {
      const body = await req.json();
      const { framework, start_date, end_date, include_evidence } = validateRequest(complianceReportSchema, body);

      let query = supabase
        .from('compliance_items')
        .select(`
          *,
          checks:compliance_checks(
            id,
            check_type,
            status,
            notes,
            findings,
            remediation_plan,
            ${include_evidence ? 'evidence_urls,' : ''}
            checked_at
          )
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null);

      if (framework && framework !== 'all') {
        query = query.eq('framework', framework);
      }

      const { data: items, error } = await query;

      if (error) {
        throw error;
      }

      // Filter checks by date range if specified
      const filteredItems = items?.map(item => {
        let checks = item.checks || [];
        if (start_date) {
          checks = checks.filter((c: { checked_at: string }) => c.checked_at >= start_date);
        }
        if (end_date) {
          checks = checks.filter((c: { checked_at: string }) => c.checked_at <= end_date);
        }
        return { ...item, checks };
      }) || [];

      // Calculate report statistics
      const stats = {
        total_items: filteredItems.length,
        compliant: filteredItems.filter(i => i.status === 'compliant').length,
        non_compliant: filteredItems.filter(i => i.status === 'non_compliant').length,
        partial: filteredItems.filter(i => i.status === 'partial').length,
        under_review: filteredItems.filter(i => i.status === 'under_review').length,
        not_applicable: filteredItems.filter(i => i.status === 'not_applicable').length,
        total_checks: filteredItems.reduce((sum, i) => sum + (i.checks?.length || 0), 0),
      };

      const applicable = stats.total_items - stats.not_applicable;
      const compliance_percentage = applicable > 0
        ? Math.round((stats.compliant / applicable) * 100)
        : 100;

      return createSuccessResponse({
        report: {
          generated_at: new Date().toISOString(),
          generated_by: profile.id,
          framework: framework || 'all',
          date_range: {
            start: start_date || null,
            end: end_date || null,
          },
          stats,
          compliance_percentage,
          items: filteredItems,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /compliance/frameworks - List available frameworks
    // ========================================================================
    if (method === 'GET' && pathname === '/compliance/frameworks') {
      const frameworks = [
        {
          id: 'SOC2',
          name: 'SOC 2',
          description: 'Service Organization Control 2 - Trust Services Criteria',
          categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
        },
        {
          id: 'GDPR',
          name: 'GDPR',
          description: 'General Data Protection Regulation - EU data privacy law',
          categories: ['Data Subject Rights', 'Data Processing', 'Security', 'Breach Notification', 'Governance'],
        },
        {
          id: 'HIPAA',
          name: 'HIPAA',
          description: 'Health Insurance Portability and Accountability Act',
          categories: ['Privacy Rule', 'Security Rule', 'Breach Notification', 'Administrative', 'Technical'],
        },
        {
          id: 'ISO27001',
          name: 'ISO 27001',
          description: 'Information Security Management System standard',
          categories: ['Security Policy', 'Asset Management', 'Access Control', 'Cryptography', 'Operations Security'],
        },
        {
          id: 'PCI_DSS',
          name: 'PCI DSS',
          description: 'Payment Card Industry Data Security Standard',
          categories: ['Network Security', 'Data Protection', 'Vulnerability Management', 'Access Control', 'Monitoring'],
        },
        {
          id: 'CCPA',
          name: 'CCPA',
          description: 'California Consumer Privacy Act',
          categories: ['Consumer Rights', 'Data Collection', 'Data Sale', 'Security', 'Non-Discrimination'],
        },
        {
          id: 'custom',
          name: 'Custom Framework',
          description: 'Custom compliance requirements specific to your organization',
          categories: ['Custom'],
        },
      ];

      return createSuccessResponse({ frameworks }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'compliance', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'compliance',
);
