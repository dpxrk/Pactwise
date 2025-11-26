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

const createDocumentSchema = z.object({
  document_type: z.string().min(1).max(50),
  document_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string().optional().default(''),
  content_type: z.enum(['text', 'html', 'markdown', 'json']).optional().default('text'),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  content_type: z.enum(['text', 'html', 'markdown', 'json']).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  selection_start: z.number().int().min(0).optional(),
  selection_end: z.number().int().min(0).optional(),
  parent_comment_id: z.string().uuid().optional(),
});

const createSuggestionSchema = z.object({
  suggestion_type: z.enum(['addition', 'deletion', 'modification']),
  original_text: z.string().optional(),
  suggested_text: z.string(),
  selection_start: z.number().int().min(0),
  selection_end: z.number().int().min(0),
  reason: z.string().max(1000).optional(),
});

const reviewSuggestionSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
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
    const permissions = await getUserPermissions(supabase, profile, 'documents');

    // ========================================================================
    // GET /documents - List collaborative documents
    // ========================================================================
    if (method === 'GET' && pathname === '/documents') {
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('collaborative_documents')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .range(offset, offset + limit - 1);

      // Filter by document type
      if (params.document_type) {
        query = query.eq('document_type', params.document_type);
      }

      // Filter by document_id (parent entity)
      if (params.document_id) {
        query = query.eq('document_id', params.document_id);
      }

      // Apply sorting
      const orderColumn = sortBy || 'updated_at';
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
    // POST /documents - Create a collaborative document
    // ========================================================================
    if (method === 'POST' && pathname === '/documents') {
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions to create documents', 403, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(createDocumentSchema, body);

      // Check if document already exists for this entity
      const { data: existing } = await supabase
        .from('collaborative_documents')
        .select('id')
        .eq('document_type', validatedData.document_type)
        .eq('document_id', validatedData.document_id)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (existing) {
        return createErrorResponseSync('Document already exists for this entity', 400, req);
      }

      const { data: document, error } = await supabase
        .from('collaborative_documents')
        .insert({
          ...validatedData,
          version: 1,
          enterprise_id: profile.enterprise_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create initial snapshot
      await supabase.from('document_snapshots').insert({
        document_id: document.id,
        version: 1,
        content: validatedData.content || '',
        created_by: profile.id,
        change_summary: 'Initial version',
      });

      return createSuccessResponse(document, undefined, 201, req);
    }

    // ========================================================================
    // GET /documents/:id - Get a single document
    // ========================================================================
    const singleDocMatch = pathname.match(/^\/documents\/([a-f0-9-]+)$/);
    if (method === 'GET' && singleDocMatch) {
      const documentId = sanitizeInput.uuid(singleDocMatch[1]);

      const { data: document, error } = await supabase
        .from('collaborative_documents')
        .select(`
          *,
          comments:document_comments(
            id, content, selection_start, selection_end, is_resolved,
            created_at, user:users!user_id(id, full_name, email)
          ),
          suggestions:document_suggestions(
            id, suggestion_type, original_text, suggested_text,
            selection_start, selection_end, status, reason,
            created_at, user:users!user_id(id, full_name, email)
          )
        `)
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !document) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      return createSuccessResponse(document, undefined, 200, req);
    }

    // ========================================================================
    // PUT /documents/:id - Update document content
    // ========================================================================
    if (method === 'PUT' && singleDocMatch) {
      const documentId = sanitizeInput.uuid(singleDocMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to update documents', 403, req);
      }

      // Get current document
      const { data: current, error: findError } = await supabase
        .from('collaborative_documents')
        .select('*')
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !current) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      // Check if locked by another user
      if (current.is_locked && current.locked_by !== profile.id) {
        return createErrorResponseSync('Document is locked by another user', 423, req);
      }

      const body = await req.json();
      const validatedData = validateRequest(updateDocumentSchema, body);

      const newVersion = current.version + 1;

      // Update document
      const { data: document, error: updateError } = await supabase
        .from('collaborative_documents')
        .update({
          ...validatedData,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Create snapshot
      await supabase.from('document_snapshots').insert({
        document_id: documentId,
        version: newVersion,
        content: validatedData.content || current.content,
        created_by: profile.id,
        change_summary: body.change_summary || 'Content updated',
      });

      return createSuccessResponse(document, undefined, 200, req);
    }

    // ========================================================================
    // POST /documents/:id/lock - Lock a document for editing
    // ========================================================================
    const lockMatch = pathname.match(/^\/documents\/([a-f0-9-]+)\/lock$/);
    if (method === 'POST' && lockMatch) {
      const documentId = sanitizeInput.uuid(lockMatch[1]);

      const { data: current, error: findError } = await supabase
        .from('collaborative_documents')
        .select('is_locked, locked_by, locked_at')
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (findError || !current) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      // Check if already locked by someone else
      if (current.is_locked && current.locked_by !== profile.id) {
        // Check if lock is stale (> 15 minutes)
        const lockTime = new Date(current.locked_at).getTime();
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;

        if (now - lockTime < fifteenMinutes) {
          return createErrorResponseSync('Document is locked by another user', 423, req);
        }
      }

      const { data: document, error } = await supabase
        .from('collaborative_documents')
        .update({
          is_locked: true,
          locked_by: profile.id,
          locked_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Document locked',
        locked_by: profile.id,
        locked_at: document.locked_at,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /documents/:id/unlock - Unlock a document
    // ========================================================================
    const unlockMatch = pathname.match(/^\/documents\/([a-f0-9-]+)\/unlock$/);
    if (method === 'POST' && unlockMatch) {
      const documentId = sanitizeInput.uuid(unlockMatch[1]);

      const { data: current } = await supabase
        .from('collaborative_documents')
        .select('is_locked, locked_by')
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!current) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      // Only the locker or a manager can unlock
      if (current.locked_by !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('You cannot unlock this document', 403, req);
      }

      const { error } = await supabase
        .from('collaborative_documents')
        .update({
          is_locked: false,
          locked_by: null,
          locked_at: null,
        })
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Document unlocked',
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /documents/:id/versions - Get document version history
    // ========================================================================
    const versionsMatch = pathname.match(/^\/documents\/([a-f0-9-]+)\/versions$/);
    if (method === 'GET' && versionsMatch) {
      const documentId = sanitizeInput.uuid(versionsMatch[1]);

      const { data: snapshots, error } = await supabase
        .from('document_snapshots')
        .select(`
          *,
          created_by_user:users!created_by(id, full_name, email)
        `)
        .eq('document_id', documentId)
        .order('version', { ascending: false });

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        document_id: documentId,
        versions: snapshots,
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /documents/:id/comments - Add a comment to a document
    // ========================================================================
    const commentsMatch = pathname.match(/^\/documents\/([a-f0-9-]+)\/comments$/);
    if (method === 'POST' && commentsMatch) {
      const documentId = sanitizeInput.uuid(commentsMatch[1]);

      const body = await req.json();
      const validatedData = validateRequest(createCommentSchema, body);

      // Verify document exists
      const { data: document } = await supabase
        .from('collaborative_documents')
        .select('id')
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!document) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      const { data: comment, error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: profile.id,
          content: validatedData.content,
          selection_start: validatedData.selection_start,
          selection_end: validatedData.selection_end,
          parent_comment_id: validatedData.parent_comment_id || null,
          enterprise_id: profile.enterprise_id,
        })
        .select(`
          *,
          user:users!user_id(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(comment, undefined, 201, req);
    }

    // ========================================================================
    // POST /documents/:id/suggestions - Add a suggestion
    // ========================================================================
    const suggestionsMatch = pathname.match(/^\/documents\/([a-f0-9-]+)\/suggestions$/);
    if (method === 'POST' && suggestionsMatch) {
      const documentId = sanitizeInput.uuid(suggestionsMatch[1]);

      const body = await req.json();
      const validatedData = validateRequest(createSuggestionSchema, body);

      // Verify document exists
      const { data: document } = await supabase
        .from('collaborative_documents')
        .select('id')
        .eq('id', documentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!document) {
        return createErrorResponseSync('Document not found', 404, req);
      }

      const { data: suggestion, error } = await supabase
        .from('document_suggestions')
        .insert({
          document_id: documentId,
          user_id: profile.id,
          suggestion_type: validatedData.suggestion_type,
          original_text: validatedData.original_text,
          suggested_text: validatedData.suggested_text,
          selection_start: validatedData.selection_start,
          selection_end: validatedData.selection_end,
          reason: validatedData.reason,
          enterprise_id: profile.enterprise_id,
        })
        .select(`
          *,
          user:users!user_id(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      return createSuccessResponse(suggestion, undefined, 201, req);
    }

    // ========================================================================
    // PATCH /documents/suggestions/:id - Review a suggestion
    // ========================================================================
    const reviewSuggestionMatch = pathname.match(/^\/documents\/suggestions\/([a-f0-9-]+)$/);
    if (method === 'PATCH' && reviewSuggestionMatch) {
      const suggestionId = sanitizeInput.uuid(reviewSuggestionMatch[1]);

      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions to review suggestions', 403, req);
      }

      const body = await req.json();
      const { status } = validateRequest(reviewSuggestionSchema, body);

      const { data: suggestion, error } = await supabase
        .from('document_suggestions')
        .update({
          status,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!suggestion) {
        return createErrorResponseSync('Suggestion not found', 404, req);
      }

      return createSuccessResponse(suggestion, undefined, 200, req);
    }

    // ========================================================================
    // POST /documents/comments/:id/resolve - Resolve/unresolve a comment
    // ========================================================================
    const resolveCommentMatch = pathname.match(/^\/documents\/comments\/([a-f0-9-]+)\/resolve$/);
    if (method === 'POST' && resolveCommentMatch) {
      const commentId = sanitizeInput.uuid(resolveCommentMatch[1]);
      const body = await req.json();
      const resolved = body.resolved !== false; // Default to true

      const { data: comment, error } = await supabase
        .from('document_comments')
        .update({
          is_resolved: resolved,
          resolved_by: resolved ? profile.id : null,
          resolved_at: resolved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      return createSuccessResponse(comment, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /documents/comments/:id - Delete a comment
    // ========================================================================
    const deleteCommentMatch = pathname.match(/^\/documents\/comments\/([a-f0-9-]+)$/);
    if (method === 'DELETE' && deleteCommentMatch) {
      const commentId = sanitizeInput.uuid(deleteCommentMatch[1]);

      const { data: comment } = await supabase
        .from('document_comments')
        .select('user_id')
        .eq('id', commentId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!comment) {
        return createErrorResponseSync('Comment not found', 404, req);
      }

      // Only author or manager can delete
      if (comment.user_id !== profile.id && !permissions.canManage) {
        return createErrorResponseSync('Insufficient permissions to delete this comment', 403, req);
      }

      const { error } = await supabase
        .from('document_comments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) {
        throw error;
      }

      return createSuccessResponse({
        message: 'Comment deleted',
        id: commentId,
      }, undefined, 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
    zeroTrust: { resource: 'documents', action: 'access' },
    detectThreats: true,
    compliance: { framework: 'GDPR' },
  },
  'documents',
);
