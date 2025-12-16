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

const versionTypeEnum = z.enum([
  'draft', 'internal_review', 'external_review', 'negotiation',
  'redline', 'final', 'executed', 'amendment'
]);

const versionStatusEnum = z.enum([
  'draft', 'pending_review', 'reviewed', 'approved', 'rejected', 'superseded'
]);

const changeTypeEnum = z.enum([
  'addition', 'deletion', 'modification', 'move', 'format_change'
]);

const changeCategoryEnum = z.enum([
  'legal_term', 'financial', 'date', 'party_name', 'obligation',
  'liability', 'termination', 'warranty', 'indemnification',
  'formatting', 'typo', 'clarification', 'other'
]);

const severityEnum = z.enum(['info', 'low', 'medium', 'high', 'critical']);

const commentTypeEnum = z.enum([
  'note', 'question', 'suggestion', 'approval', 'rejection',
  'legal_concern', 'financial_concern', 'compliance_issue'
]);

const visibilityEnum = z.enum(['private', 'enterprise', 'external']);

// Version schema
const versionSchema = z.object({
  version_type: versionTypeEnum,
  content_text: z.string().optional().nullable(),
  content_html: z.string().optional().nullable(),
  content_markdown: z.string().optional().nullable(),
  file_path: z.string().optional().nullable(),
  file_name: z.string().optional().nullable(),
  source: z.enum(['manual', 'upload', 'ocr', 'template', 'external', 'ai_generated']).optional().default('manual'),
  source_reference: z.string().optional().nullable(),
  change_summary: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Comment schema
const commentSchema = z.object({
  version_id: z.string().uuid(),
  change_id: z.string().uuid().optional().nullable(),
  section_id: z.string().optional().nullable(),
  paragraph_number: z.number().int().optional().nullable(),
  start_position: z.number().int().optional().nullable(),
  end_position: z.number().int().optional().nullable(),
  selected_text: z.string().optional().nullable(),
  comment_type: commentTypeEnum,
  content: z.string().min(1).max(5000),
  parent_comment_id: z.string().uuid().optional().nullable(),
  is_internal: z.boolean().optional().default(true),
  visibility: visibilityEnum.optional().default('enterprise'),
});

// Redline session schema
const redlineSessionSchema = z.object({
  contract_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  base_version_id: z.string().uuid(),
  deadline: z.string().datetime().optional().nullable(),
  allow_external_edits: z.boolean().optional().default(false),
  require_approval_for_changes: z.boolean().optional().default(true),
  auto_accept_minor_changes: z.boolean().optional().default(false),
  participants: z.array(z.string().uuid()).optional().default([]),
  external_participants: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.string().optional(),
  })).optional().default([]),
});

// Pagination
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ============================================
// DIFF ALGORITHM (Simple implementation)
// ============================================

interface DiffChange {
  type: 'addition' | 'deletion' | 'modification';
  originalText?: string;
  modifiedText?: string;
  position: number;
}

function computeSimpleDiff(original: string, modified: string): DiffChange[] {
  const changes: DiffChange[] = [];
  const originalWords = original.split(/\s+/).filter(w => w);
  const modifiedWords = modified.split(/\s+/).filter(w => w);

  let i = 0, j = 0;
  let position = 0;

  while (i < originalWords.length || j < modifiedWords.length) {
    if (i >= originalWords.length) {
      // Remaining words in modified are additions
      changes.push({
        type: 'addition',
        modifiedText: modifiedWords.slice(j).join(' '),
        position,
      });
      break;
    }
    if (j >= modifiedWords.length) {
      // Remaining words in original are deletions
      changes.push({
        type: 'deletion',
        originalText: originalWords.slice(i).join(' '),
        position,
      });
      break;
    }

    if (originalWords[i] === modifiedWords[j]) {
      i++;
      j++;
      position++;
    } else {
      // Find next matching word
      let foundInOriginal = -1;
      let foundInModified = -1;

      for (let k = i + 1; k < Math.min(i + 10, originalWords.length); k++) {
        if (originalWords[k] === modifiedWords[j]) {
          foundInOriginal = k;
          break;
        }
      }

      for (let k = j + 1; k < Math.min(j + 10, modifiedWords.length); k++) {
        if (modifiedWords[k] === originalWords[i]) {
          foundInModified = k;
          break;
        }
      }

      if (foundInOriginal !== -1 && (foundInModified === -1 || foundInOriginal - i <= foundInModified - j)) {
        // Deletion in original
        changes.push({
          type: 'deletion',
          originalText: originalWords.slice(i, foundInOriginal).join(' '),
          position,
        });
        i = foundInOriginal;
      } else if (foundInModified !== -1) {
        // Addition in modified
        changes.push({
          type: 'addition',
          modifiedText: modifiedWords.slice(j, foundInModified).join(' '),
          position,
        });
        j = foundInModified;
      } else {
        // Single word modification
        changes.push({
          type: 'modification',
          originalText: originalWords[i],
          modifiedText: modifiedWords[j],
          position,
        });
        i++;
        j++;
        position++;
      }
    }
  }

  return changes;
}

function generateDiffHtml(original: string, modified: string, changes: DiffChange[]): string {
  // Simple HTML diff visualization
  let html = '<div class="diff-container">';

  for (const change of changes) {
    switch (change.type) {
      case 'addition':
        html += `<span class="diff-addition" style="background-color: #d4edda; color: #155724;">+ ${change.modifiedText}</span> `;
        break;
      case 'deletion':
        html += `<span class="diff-deletion" style="background-color: #f8d7da; color: #721c24; text-decoration: line-through;">- ${change.originalText}</span> `;
        break;
      case 'modification':
        html += `<span class="diff-deletion" style="background-color: #f8d7da; color: #721c24; text-decoration: line-through;">${change.originalText}</span>`;
        html += `<span class="diff-addition" style="background-color: #d4edda; color: #155724;">${change.modifiedText}</span> `;
        break;
    }
  }

  html += '</div>';
  return html;
}

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
    // VERSION ROUTES
    // ============================================

    // GET /document-diff/contracts/:contractId/versions - Get version history
    if (method === 'GET' && pathname.match(/^\/document-diff\/contracts\/[a-f0-9-]+\/versions$/)) {
      const contractId = pathname.split('/')[3];
      const params = Object.fromEntries(url.searchParams);
      const { page, limit } = validateRequest(paginationSchema, params);

      // Get version history using database function
      const { data, error } = await supabase.rpc('get_contract_version_history', {
        p_contract_id: contractId,
        p_limit: limit,
      });

      if (error) throw error;

      return createSuccessResponse(data || [], undefined, 200, req);
    }

    // GET /document-diff/versions/:versionId - Get single version
    if (method === 'GET' && pathname.match(/^\/document-diff\/versions\/[a-f0-9-]+$/)) {
      const versionId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email),
          reviewed_by_user:users!reviewed_by(id, full_name, email)
        `)
        .eq('id', versionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /document-diff/contracts/:contractId/versions - Create new version
    if (method === 'POST' && pathname.match(/^\/document-diff\/contracts\/[a-f0-9-]+\/versions$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const contractId = pathname.split('/')[3];
      const body = await req.json();
      const validatedData = validateRequest(versionSchema, body);

      // Create version using database function
      const { data, error } = await supabase.rpc('create_document_version', {
        p_contract_id: contractId,
        p_version_type: validatedData.version_type,
        p_content_text: validatedData.content_text || null,
        p_content_html: validatedData.content_html || null,
        p_source: validatedData.source,
        p_change_summary: validatedData.change_summary || null,
        p_created_by: profile.id,
      });

      if (error) throw error;

      // Fetch the created version
      const { data: version } = await supabase
        .from('document_versions')
        .select('*')
        .eq('id', data)
        .single();

      return createSuccessResponse(version, 'Version created', 201, req);
    }

    // PUT /document-diff/versions/:versionId - Update version
    if (method === 'PUT' && pathname.match(/^\/document-diff\/versions\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const versionId = pathname.split('/')[3];
      const body = await req.json();
      const validatedData = validateRequest(versionSchema.partial(), body);

      const { data, error } = await supabase
        .from('document_versions')
        .update(validatedData)
        .eq('id', versionId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // ============================================
    // COMPARISON ROUTES
    // ============================================

    // POST /document-diff/compare - Create comparison between two versions
    if (method === 'POST' && pathname === '/document-diff/compare') {
      const body = await req.json();
      const { base_version_id, compare_version_id } = body;

      if (!base_version_id || !compare_version_id) {
        return createErrorResponseSync('base_version_id and compare_version_id required', 400, req);
      }

      // Get both versions
      const { data: versions, error: versionsError } = await supabase
        .from('document_versions')
        .select('*')
        .in('id', [base_version_id, compare_version_id])
        .eq('enterprise_id', profile.enterprise_id);

      if (versionsError) throw versionsError;
      if (!versions || versions.length !== 2) {
        return createErrorResponseSync('One or both versions not found', 404, req);
      }

      const baseVersion = versions.find(v => v.id === base_version_id);
      const compareVersion = versions.find(v => v.id === compare_version_id);

      if (!baseVersion || !compareVersion) {
        return createErrorResponseSync('Versions not found', 404, req);
      }

      // Create comparison record
      const { data: comparisonId, error: createError } = await supabase.rpc('create_document_comparison', {
        p_base_version_id: base_version_id,
        p_compare_version_id: compare_version_id,
        p_created_by: profile.id,
      });

      if (createError) throw createError;

      // Compute diff if both have content
      const baseText = baseVersion.content_text || baseVersion.extracted_text || '';
      const compareText = compareVersion.content_text || compareVersion.extracted_text || '';

      if (baseText && compareText) {
        const changes = computeSimpleDiff(baseText, compareText);
        const diffHtml = generateDiffHtml(baseText, compareText, changes);

        // Calculate statistics
        const additions = changes.filter(c => c.type === 'addition').length;
        const deletions = changes.filter(c => c.type === 'deletion').length;
        const modifications = changes.filter(c => c.type === 'modification').length;

        // Calculate similarity
        const totalWords = baseText.split(/\s+/).length + compareText.split(/\s+/).length;
        const changedWords = changes.reduce((sum, c) => {
          return sum + ((c.originalText?.split(/\s+/).length || 0) + (c.modifiedText?.split(/\s+/).length || 0));
        }, 0);
        const similarity = totalWords > 0 ? 1 - (changedWords / totalWords) : 1;

        // Update comparison with results
        await supabase
          .from('document_comparisons')
          .update({
            comparison_status: 'completed',
            total_changes: changes.length,
            additions_count: additions,
            deletions_count: deletions,
            modifications_count: modifications,
            similarity_score: similarity,
            diff_html: diffHtml,
            diff_json: changes,
          })
          .eq('id', comparisonId);

        // Insert individual changes
        if (changes.length > 0) {
          const changeRecords = changes.map((change, index) => ({
            comparison_id: comparisonId,
            change_type: change.type,
            change_order: index,
            original_text: change.originalText || null,
            modified_text: change.modifiedText || null,
            word_position: change.position,
            action: 'pending',
          }));

          await supabase
            .from('document_changes')
            .insert(changeRecords);
        }
      }

      // Get comparison summary
      const { data: summary } = await supabase.rpc('get_comparison_summary', {
        p_comparison_id: comparisonId,
      });

      return createSuccessResponse(summary, 'Comparison created', 201, req);
    }

    // GET /document-diff/comparisons/:comparisonId - Get comparison details
    if (method === 'GET' && pathname.match(/^\/document-diff\/comparisons\/[a-f0-9-]+$/)) {
      const comparisonId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('document_comparisons')
        .select(`
          *,
          base_version:document_versions!base_version_id(id, version_number, version_label, version_type),
          compare_version:document_versions!compare_version_id(id, version_number, version_label, version_type)
        `)
        .eq('id', comparisonId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Comparison not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // GET /document-diff/comparisons/:comparisonId/changes - Get changes for comparison
    if (method === 'GET' && pathname.match(/^\/document-diff\/comparisons\/[a-f0-9-]+\/changes$/)) {
      const comparisonId = pathname.split('/')[3];
      const params = Object.fromEntries(url.searchParams);
      const { page, limit } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      // Verify comparison belongs to enterprise
      const { data: comparison } = await supabase
        .from('document_comparisons')
        .select('id')
        .eq('id', comparisonId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!comparison) {
        return createErrorResponseSync('Comparison not found', 404, req);
      }

      const { data, error, count } = await supabase
        .from('document_changes')
        .select('*', { count: 'exact' })
        .eq('comparison_id', comparisonId)
        .order('change_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return createPaginatedResponse(data || [], {
        page,
        limit,
        total: count || 0,
      }, req);
    }

    // POST /document-diff/changes/:changeId/action - Accept/reject a change
    if (method === 'POST' && pathname.match(/^\/document-diff\/changes\/[a-f0-9-]+\/action$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const changeId = pathname.split('/')[3];
      const body = await req.json();
      const { action, notes } = body;

      if (!['accept', 'reject'].includes(action)) {
        return createErrorResponseSync('Action must be accept or reject', 400, req);
      }

      const { data, error } = await supabase.rpc('process_document_change', {
        p_change_id: changeId,
        p_action: action,
        p_user_id: profile.id,
        p_notes: notes || null,
      });

      if (error) throw error;

      if (!data) {
        return createErrorResponseSync('Change not found', 404, req);
      }

      return createSuccessResponse({ success: true, action }, `Change ${action}ed`, 200, req);
    }

    // POST /document-diff/changes/bulk-action - Bulk accept/reject changes
    if (method === 'POST' && pathname === '/document-diff/changes/bulk-action') {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const { change_ids, action, notes } = body;

      if (!Array.isArray(change_ids) || change_ids.length === 0) {
        return createErrorResponseSync('change_ids array required', 400, req);
      }

      if (!['accept', 'reject'].includes(action)) {
        return createErrorResponseSync('Action must be accept or reject', 400, req);
      }

      let processed = 0;
      for (const changeId of change_ids) {
        const { data } = await supabase.rpc('process_document_change', {
          p_change_id: changeId,
          p_action: action,
          p_user_id: profile.id,
          p_notes: notes || null,
        });
        if (data) processed++;
      }

      return createSuccessResponse({ processed, total: change_ids.length }, `${processed} changes ${action}ed`, 200, req);
    }

    // ============================================
    // COMMENT ROUTES
    // ============================================

    // GET /document-diff/versions/:versionId/comments - Get comments for version
    if (method === 'GET' && pathname.match(/^\/document-diff\/versions\/[a-f0-9-]+\/comments$/)) {
      const versionId = pathname.split('/')[3];

      // Verify version belongs to enterprise
      const { data: version } = await supabase
        .from('document_versions')
        .select('id')
        .eq('id', versionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!version) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email),
          resolved_by_user:users!resolved_by(id, full_name, email)
        `)
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return createSuccessResponse(data || [], undefined, 200, req);
    }

    // POST /document-diff/comments - Create comment
    if (method === 'POST' && pathname === '/document-diff/comments') {
      const body = await req.json();
      const validatedData = validateRequest(commentSchema, body);

      // Verify version belongs to enterprise
      const { data: version } = await supabase
        .from('document_versions')
        .select('id, enterprise_id')
        .eq('id', validatedData.version_id)
        .single();

      if (!version || version.enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Version not found', 404, req);
      }

      const { data, error } = await supabase
        .from('document_comments')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Comment added', 201, req);
    }

    // PUT /document-diff/comments/:commentId - Update comment
    if (method === 'PUT' && pathname.match(/^\/document-diff\/comments\/[a-f0-9-]+$/)) {
      const commentId = pathname.split('/')[3];
      const body = await req.json();
      const { content, is_resolved, resolution_note } = body;

      const updateData: Record<string, unknown> = {};
      if (content !== undefined) updateData.content = content;
      if (is_resolved !== undefined) {
        updateData.is_resolved = is_resolved;
        if (is_resolved) {
          updateData.resolved_at = new Date().toISOString();
          updateData.resolved_by = profile.id;
          if (resolution_note) updateData.resolution_note = resolution_note;
        }
      }

      const { data, error } = await supabase
        .from('document_comments')
        .update(updateData)
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // DELETE /document-diff/comments/:commentId - Delete comment
    if (method === 'DELETE' && pathname.match(/^\/document-diff\/comments\/[a-f0-9-]+$/)) {
      const commentId = pathname.split('/')[3];

      // Only allow deleting own comments
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId)
        .eq('created_by', profile.id);

      if (error) throw error;

      return createSuccessResponse({ deleted: true }, 'Comment deleted', 200, req);
    }

    // ============================================
    // REDLINE SESSION ROUTES
    // ============================================

    // GET /document-diff/sessions - List active redline sessions
    if (method === 'GET' && pathname === '/document-diff/sessions') {
      const params = Object.fromEntries(url.searchParams);
      const status = params.status || 'active';

      const { data, error } = await supabase
        .from('redline_sessions')
        .select(`
          *,
          contract:contracts(id, title),
          base_version:document_versions!base_version_id(id, version_number, version_label),
          created_by_user:users!created_by(id, full_name, email)
        `)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return createSuccessResponse(data || [], undefined, 200, req);
    }

    // GET /document-diff/sessions/:sessionId - Get session details
    if (method === 'GET' && pathname.match(/^\/document-diff\/sessions\/[a-f0-9-]+$/)) {
      const sessionId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('redline_sessions')
        .select(`
          *,
          contract:contracts(id, title, status),
          base_version:document_versions!base_version_id(*),
          working_version:document_versions!working_version_id(*),
          created_by_user:users!created_by(id, full_name, email)
        `)
        .eq('id', sessionId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Session not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /document-diff/sessions - Create redline session
    if (method === 'POST' && pathname === '/document-diff/sessions') {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(redlineSessionSchema, body);

      // Verify contract belongs to enterprise
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, enterprise_id')
        .eq('id', validatedData.contract_id)
        .single();

      if (!contract || contract.enterprise_id !== profile.enterprise_id) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Verify base version
      const { data: version } = await supabase
        .from('document_versions')
        .select('id')
        .eq('id', validatedData.base_version_id)
        .eq('contract_id', validatedData.contract_id)
        .single();

      if (!version) {
        return createErrorResponseSync('Base version not found', 404, req);
      }

      const { data, error } = await supabase
        .from('redline_sessions')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data, 'Redline session created', 201, req);
    }

    // PUT /document-diff/sessions/:sessionId - Update session
    if (method === 'PUT' && pathname.match(/^\/document-diff\/sessions\/[a-f0-9-]+$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const sessionId = pathname.split('/')[3];
      const body = await req.json();

      const { data, error } = await supabase
        .from('redline_sessions')
        .update(body)
        .eq('id', sessionId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Session not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // POST /document-diff/sessions/:sessionId/complete - Complete session
    if (method === 'POST' && pathname.match(/^\/document-diff\/sessions\/[a-f0-9-]+\/complete$/)) {
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const sessionId = pathname.split('/')[3];

      const { data, error } = await supabase
        .from('redline_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('enterprise_id', profile.enterprise_id)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        return createErrorResponseSync('Session not found or already completed', 404, req);
      }

      return createSuccessResponse(data, 'Session completed', 200, req);
    }

    // ============================================
    // ANALYTICS ROUTES
    // ============================================

    // GET /document-diff/comparisons/:comparisonId/analytics - Get change analytics
    if (method === 'GET' && pathname.match(/^\/document-diff\/comparisons\/[a-f0-9-]+\/analytics$/)) {
      const comparisonId = pathname.split('/')[3];

      // Get changes by category
      const { data: categories, error } = await supabase.rpc('get_changes_by_category', {
        p_comparison_id: comparisonId,
      });

      if (error) throw error;

      // Get comparison summary
      const { data: summary } = await supabase.rpc('get_comparison_summary', {
        p_comparison_id: comparisonId,
      });

      return createSuccessResponse({
        summary,
        changesByCategory: categories || [],
      }, undefined, 200, req);
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
  'document-diff',
);
