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

const createClauseSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  clause_type: z.enum(['standard', 'custom', 'regulatory', 'negotiable']).optional().default('custom'),
  category: z.string().max(100).optional(),
  is_required: z.boolean().optional().default(false),
  position: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateClauseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  clause_type: z.enum(['standard', 'custom', 'regulatory', 'negotiable']).optional(),
  category: z.string().max(100).optional(),
  is_required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const reorderClausesSchema = z.object({
  clause_ids: z.array(z.string().uuid()).min(1),
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
    // GET /contracts/:id/clauses - List clauses for a contract
    // ========================================================================
    const listClausesMatch = pathname.match(/^\/contracts\/([a-f0-9-]+)\/clauses$/);
    if (method === 'GET' && listClausesMatch) {
      const contractId = sanitizeInput.uuid(listClausesMatch[1]);

      // Verify contract access
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      const { data: clauses, error } = await supabase
        .from('contract_clauses')
        .select('*')
        .eq('contract_id', contractId)
        .is('deleted_at', null)
        .order('position', { ascending: true });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        contract_id: contractId,
        clauses: clauses || [],
        total: clauses?.length || 0,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /contracts/:id/clauses - Add a clause to a contract
    // ========================================================================
    if (method === 'POST' && listClausesMatch) {
      const contractId = sanitizeInput.uuid(listClausesMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to add clauses', 403, req);
      }

      // Verify contract access
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createClauseSchema, body);

      // Get max position if not provided
      if (validatedData.position === undefined) {
        const { data: maxPositionClause } = await supabase
          .from('contract_clauses')
          .select('position')
          .eq('contract_id', contractId)
          .is('deleted_at', null)
          .order('position', { ascending: false })
          .limit(1)
          .single();

        validatedData.position = (maxPositionClause?.position || -1) + 1;
      }

      const { data: clause, error } = await supabase
        .from('contract_clauses')
        .insert({
          contract_id: contractId,
          ...validatedData,
          created_by: profile.id,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(clause, undefined, 201, req);
    }

    // ========================================================================
    // GET /clauses/:id - Get a single clause
    // ========================================================================
    const singleClauseMatch = pathname.match(/^\/clauses\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleClauseMatch) {
      const clauseId = sanitizeInput.uuid(singleClauseMatch[1]);

      const { data: clause, error } = await supabase
        .from('contract_clauses')
        .select(`
          *,
          contract:contracts(id, title, status)
        `)
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .single();

      if (error || !clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      return createSuccessResponse(clause, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /clauses/:id - Update a clause
    // ========================================================================
    if (method === 'PATCH' && singleClauseMatch) {
      const clauseId = sanitizeInput.uuid(singleClauseMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update clauses', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateClauseSchema, body);

      const { data: clause, error } = await supabase
        .from('contract_clauses')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
          last_modified_by: profile.id,
        })
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      return createSuccessResponse(clause, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /clauses/:id - Delete a clause
    // ========================================================================
    if (method === 'DELETE' && singleClauseMatch) {
      const clauseId = sanitizeInput.uuid(singleClauseMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to delete clauses', 403, req);
      }

      const { data: clause, error } = await supabase
        .from('contract_clauses')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', clauseId)
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!clause) {
        return createErrorResponseSync('Clause not found', 404, req);
      }

      return createSuccessResponse({
        message: 'Clause deleted',
        id: clauseId,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /contracts/:id/clauses/reorder - Reorder clauses
    // ========================================================================
    const reorderMatch = pathname.match(/^\/contracts\/([a-f0-9-]+)\/clauses\/reorder$/);
    if (method === 'POST' && reorderMatch) {
      const contractId = sanitizeInput.uuid(reorderMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to reorder clauses', 403, req);
      }

      const body = await req.json();
      const { clause_ids } = validateRequest(reorderClausesSchema, body);

      // Update positions
      const updates = clause_ids.map((id, index) =>
        supabase
          .from('contract_clauses')
          .update({ position: index, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('contract_id', contractId)
          .eq('enterprise_id', profile.enterprise_id)
      );

      await Promise.all(updates);

      return createSuccessResponse({
        message: 'Clauses reordered',
        contract_id: contractId,
        new_order: clause_ids,
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /clauses/templates - Get clause templates
    // ========================================================================
    if (method === 'GET' && pathname === '/clauses/templates') {
      // Return standard clause templates
      const templates = [
        {
          id: 'confidentiality',
          title: 'Confidentiality Clause',
          content: 'Both parties agree to keep confidential all information exchanged during the term of this agreement...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'termination',
          title: 'Termination Clause',
          content: 'Either party may terminate this agreement with [X] days written notice...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'indemnification',
          title: 'Indemnification Clause',
          content: 'Each party shall indemnify and hold harmless the other party from any claims...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'limitation_of_liability',
          title: 'Limitation of Liability',
          content: 'Neither party shall be liable for any indirect, incidental, or consequential damages...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'force_majeure',
          title: 'Force Majeure',
          content: 'Neither party shall be liable for any failure to perform due to causes beyond reasonable control...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'governing_law',
          title: 'Governing Law',
          content: 'This agreement shall be governed by and construed in accordance with the laws of [Jurisdiction]...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'payment_terms',
          title: 'Payment Terms',
          content: 'Payment is due within [X] days of invoice date. Late payments shall incur interest at [X]% per annum...',
          clause_type: 'standard',
          category: 'Financial',
        },
        {
          id: 'intellectual_property',
          title: 'Intellectual Property',
          content: 'All intellectual property rights in deliverables shall remain with [Party] unless otherwise agreed...',
          clause_type: 'standard',
          category: 'Legal',
        },
        {
          id: 'data_protection',
          title: 'Data Protection',
          content: 'The parties shall comply with all applicable data protection laws including GDPR...',
          clause_type: 'regulatory',
          category: 'Compliance',
        },
        {
          id: 'sla',
          title: 'Service Level Agreement',
          content: 'Provider commits to [X]% uptime with response times of [X] hours for critical issues...',
          clause_type: 'standard',
          category: 'Service',
        },
      ];

      return createSuccessResponse({ templates }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'clauses', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'clauses',
);
