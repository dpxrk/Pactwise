/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync, createPaginatedResponse } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createSessionSchema = z.object({
  document_version_id: z.string().uuid(),
  session_type: z.enum(['edit', 'review', 'redline', 'readonly']).optional().default('edit'),
  session_name: z.string().max(255).optional(),
  initial_content: z.string().optional(),
  contract_id: z.string().uuid().optional(),
  redline_session_id: z.string().uuid().optional(),
  allow_external_participants: z.boolean().optional().default(false),
});

const joinSessionSchema = z.object({
  session_id: z.string().uuid(),
  client_id: z.string().max(100).optional(),
  user_name: z.string().max(255).optional(),
});

const updateCursorSchema = z.object({
  anchor: z.number().int().nonnegative(),
  head: z.number().int().nonnegative(),
  selection_type: z.enum(['cursor', 'text', 'node', 'all']).optional().default('cursor'),
  current_action: z.string().max(50).optional(),
});

const syncOperationSchema = z.object({
  session_id: z.string().uuid(),
  operation_type: z.enum(['update', 'awareness', 'undo', 'redo']),
  operation_data: z.string(), // Base64 encoded Yjs update
  client_id: z.string().max(100),
  change_summary: z.string().max(500).optional(),
});

const snapshotSchema = z.object({
  session_id: z.string().uuid(),
  yjs_state: z.string(), // Base64 encoded
  yjs_state_vector: z.string(), // Base64 encoded
  document_html: z.string().optional(),
  snapshot_type: z.enum(['auto', 'manual', 'milestone', 'recovery']).optional().default('auto'),
  snapshot_name: z.string().max(255).optional(),
});

const addCommentSchema = z.object({
  session_id: z.string().uuid(),
  anchor_start: z.number().int().nonnegative(),
  anchor_end: z.number().int().nonnegative(),
  anchor_text: z.string().max(1000).optional(),
  comment_text: z.string().min(1).max(10000),
  parent_comment_id: z.string().uuid().optional(),
  suggestion_id: z.string().uuid().optional(),
});

const addSuggestionSchema = z.object({
  session_id: z.string().uuid(),
  suggestion_type: z.enum(['insert', 'delete', 'replace', 'format', 'move']),
  start_position: z.number().int().nonnegative(),
  end_position: z.number().int().nonnegative().optional(),
  original_content: z.string().optional(),
  suggested_content: z.string().optional(),
  format_changes: z.record(z.boolean()).optional(),
});

const resolveSuggestionSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'modified']),
  resolution_note: z.string().max(500).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ============================================
// MAIN HANDLER
// ============================================

async function handleCollaborativeEdit(context: RequestContext): Promise<Response> {
  const { req, user: profile } = context;
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  if (!profile) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  // GET /collaborative-edit/sessions - List sessions
  if (method === 'GET' && pathname === '/collaborative-edit/sessions') {
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;
    const status = params.status || 'active';

    const { data, error, count } = await supabase
      .from('collaborative_sessions')
      .select(`
        id, session_name, session_type, status, version_number, operation_count,
        active_user_ids, external_participant_emails, created_at, updated_at,
        document:document_versions(id, version_number),
        contract:contracts(id, title)
      `, { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return createPaginatedResponse(data || [], {
      page,
      limit,
      total: count || 0,
    }, req);
  }

  // GET /collaborative-edit/sessions/:id - Get session details
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+$/)) {
    const sessionId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('collaborative_sessions')
      .select(`
        *,
        document:document_versions(id, version_number, contract_id),
        contract:contracts(id, title)
      `)
      .eq('id', sessionId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Session not found', 404, req);
    }

    // Convert Yjs state to base64 for transmission
    const response = {
      ...data,
      yjs_state: data.yjs_state ? btoa(String.fromCharCode(...new Uint8Array(data.yjs_state))) : null,
      yjs_state_vector: data.yjs_state_vector ? btoa(String.fromCharCode(...new Uint8Array(data.yjs_state_vector))) : null,
    };

    return createSuccessResponse(response, undefined, 200, req);
  }

  // POST /collaborative-edit/sessions - Create new session
  if (method === 'POST' && pathname === '/collaborative-edit/sessions') {
    const body = await req.json();
    const validatedData = validateRequest(createSessionSchema, body);

    // Verify document version exists and belongs to enterprise
    const { data: docVersion } = await supabase
      .from('document_versions')
      .select('id, contract_id, contracts!inner(enterprise_id)')
      .eq('id', validatedData.document_version_id)
      .single();

    if (!docVersion || (docVersion.contracts as { enterprise_id: string }).enterprise_id !== profile.enterprise_id) {
      return createErrorResponseSync('Document version not found', 404, req);
    }

    // Create session
    const { data: sessionId, error } = await supabase.rpc('create_collaborative_session', {
      p_enterprise_id: profile.enterprise_id,
      p_document_version_id: validatedData.document_version_id,
      p_session_type: validatedData.session_type,
      p_session_name: validatedData.session_name || null,
      p_initial_content: validatedData.initial_content || null,
      p_contract_id: validatedData.contract_id || docVersion.contract_id,
      p_redline_session_id: validatedData.redline_session_id || null,
      p_allow_external: validatedData.allow_external_participants,
      p_created_by: profile.id,
    });

    if (error) throw error;

    // Get created session
    const { data: session } = await supabase
      .from('collaborative_sessions')
      .select('id, session_name, session_type, status, created_at')
      .eq('id', sessionId)
      .single();

    return createSuccessResponse(session, 'Session created', 201, req);
  }

  // POST /collaborative-edit/sessions/:id/join - Join a session
  if (method === 'POST' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/join$/)) {
    const sessionId = pathname.split('/')[3];
    const body = await req.json();
    const { client_id, user_name } = validateRequest(joinSessionSchema.omit({ session_id: true }), body);

    const { data, error } = await supabase.rpc('join_collaborative_session', {
      p_session_id: sessionId,
      p_user_id: profile.id,
      p_external_email: null,
      p_user_name: user_name || profile.email?.split('@')[0] || 'User',
      p_client_id: client_id || null,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return createErrorResponseSync('Failed to join session', 500, req);
    }

    const result = data[0];

    return createSuccessResponse({
      cursor_id: result.cursor_id,
      color: result.color,
      yjs_state: result.yjs_state ? btoa(String.fromCharCode(...new Uint8Array(result.yjs_state))) : null,
      yjs_state_vector: result.yjs_state_vector ? btoa(String.fromCharCode(...new Uint8Array(result.yjs_state_vector))) : null,
      participant_count: result.participant_count,
    }, 'Joined session', 200, req);
  }

  // POST /collaborative-edit/sessions/:id/leave - Leave a session
  if (method === 'POST' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/leave$/)) {
    const sessionId = pathname.split('/')[3];
    const body = await req.json();
    const cursorId = body.cursor_id;

    if (!cursorId) {
      return createErrorResponseSync('Cursor ID required', 400, req);
    }

    const { data, error } = await supabase.rpc('leave_collaborative_session', {
      p_cursor_id: cursorId,
    });

    if (error) throw error;

    return createSuccessResponse({ left: data }, 'Left session', 200, req);
  }

  // POST /collaborative-edit/sessions/:id/complete - Complete a session
  if (method === 'POST' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/complete$/)) {
    const sessionId = pathname.split('/')[3];
    const body = await req.json();
    const finalHtml = body.final_html;

    const { data, error } = await supabase.rpc('complete_collaborative_session', {
      p_session_id: sessionId,
      p_final_html: finalHtml || null,
      p_create_document_version: body.create_version !== false,
    });

    if (error) throw error;

    return createSuccessResponse({
      completed: true,
      document_version_id: data,
    }, 'Session completed', 200, req);
  }

  // ============================================
  // CURSOR/PRESENCE MANAGEMENT
  // ============================================

  // GET /collaborative-edit/sessions/:id/cursors - Get active cursors
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/cursors$/)) {
    const sessionId = pathname.split('/')[3];

    const { data, error } = await supabase.rpc('get_session_cursors', {
      p_session_id: sessionId,
    });

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // PUT /collaborative-edit/cursors/:id - Update cursor position
  if (method === 'PUT' && pathname.match(/^\/collaborative-edit\/cursors\/[a-f0-9-]+$/)) {
    const cursorId = pathname.split('/')[3];
    const body = await req.json();
    const { anchor, head, selection_type, current_action } = validateRequest(updateCursorSchema, body);

    const { data, error } = await supabase.rpc('update_cursor_position', {
      p_cursor_id: cursorId,
      p_anchor: anchor,
      p_head: head,
      p_selection_type: selection_type,
      p_current_action: current_action || null,
    });

    if (error) throw error;

    return createSuccessResponse({ updated: data }, undefined, 200, req);
  }

  // ============================================
  // OPERATIONS SYNC
  // ============================================

  // POST /collaborative-edit/sync - Receive and persist Yjs update
  if (method === 'POST' && pathname === '/collaborative-edit/sync') {
    const body = await req.json();
    const validatedData = validateRequest(syncOperationSchema, body);

    // Decode base64 operation data
    const operationBytes = Uint8Array.from(
      atob(validatedData.operation_data),
      c => c.charCodeAt(0)
    );

    // Save operation
    const { data: opId, error } = await supabase.rpc('save_document_operation', {
      p_session_id: validatedData.session_id,
      p_operation_type: validatedData.operation_type,
      p_operation_data: operationBytes,
      p_user_id: profile.id,
      p_external_email: null,
      p_client_id: validatedData.client_id,
      p_change_summary: validatedData.change_summary || null,
    });

    if (error) throw error;

    // In production, broadcast via Supabase Realtime
    // For now, just return success

    return createSuccessResponse({
      operation_id: opId,
      synced: true,
    }, undefined, 200, req);
  }

  // GET /collaborative-edit/sessions/:id/operations - Get operations since clock
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/operations$/)) {
    const sessionId = pathname.split('/')[3];
    const sinceClock = parseInt(url.searchParams.get('since') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    const { data, error } = await supabase.rpc('get_operations_since', {
      p_session_id: sessionId,
      p_since_clock: sinceClock,
      p_limit: limit,
    });

    if (error) throw error;

    // Convert operation_data to base64
    const operations = (data || []).map((op: {
      operation_id: string;
      operation_type: string;
      operation_data: Uint8Array;
      user_id: string;
      client_id: string;
      clock: number;
      created_at: string;
    }) => ({
      ...op,
      operation_data: btoa(String.fromCharCode(...new Uint8Array(op.operation_data))),
    }));

    return createSuccessResponse(operations, undefined, 200, req);
  }

  // ============================================
  // SNAPSHOTS
  // ============================================

  // POST /collaborative-edit/snapshot - Save periodic snapshot
  if (method === 'POST' && pathname === '/collaborative-edit/snapshot') {
    const body = await req.json();
    const validatedData = validateRequest(snapshotSchema, body);

    // Decode base64 state
    const yjsState = Uint8Array.from(atob(validatedData.yjs_state), c => c.charCodeAt(0));
    const yjsStateVector = Uint8Array.from(atob(validatedData.yjs_state_vector), c => c.charCodeAt(0));

    const { data: snapshotId, error } = await supabase.rpc('save_session_snapshot', {
      p_session_id: validatedData.session_id,
      p_yjs_state: yjsState,
      p_yjs_state_vector: yjsStateVector,
      p_snapshot_type: validatedData.snapshot_type,
      p_snapshot_name: validatedData.snapshot_name || null,
      p_document_html: validatedData.document_html || null,
      p_created_by: profile.id,
    });

    if (error) throw error;

    return createSuccessResponse({
      snapshot_id: snapshotId,
      saved: true,
    }, 'Snapshot saved', 200, req);
  }

  // GET /collaborative-edit/sessions/:id/snapshots - List snapshots
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/snapshots$/)) {
    const sessionId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('session_snapshots')
      .select('id, version_number, snapshot_type, snapshot_name, content_size, created_at')
      .eq('session_id', sessionId)
      .order('version_number', { ascending: false })
      .limit(50);

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // GET /collaborative-edit/snapshots/:id - Get specific snapshot
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/snapshots\/[a-f0-9-]+$/)) {
    const snapshotId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('session_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Snapshot not found', 404, req);
    }

    // Convert to base64
    const response = {
      ...data,
      yjs_state: data.yjs_state ? btoa(String.fromCharCode(...new Uint8Array(data.yjs_state))) : null,
      yjs_state_vector: data.yjs_state_vector ? btoa(String.fromCharCode(...new Uint8Array(data.yjs_state_vector))) : null,
    };

    return createSuccessResponse(response, undefined, 200, req);
  }

  // ============================================
  // COMMENTS
  // ============================================

  // GET /collaborative-edit/sessions/:id/comments - List comments
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/comments$/)) {
    const sessionId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('inline_comments')
      .select(`
        id, thread_id, parent_comment_id, anchor_start, anchor_end, anchor_text,
        comment_text, author_name, status, is_resolved, created_at
      `)
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .order('anchor_start', { ascending: true });

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // POST /collaborative-edit/comments - Add comment
  if (method === 'POST' && pathname === '/collaborative-edit/comments') {
    const body = await req.json();
    const validatedData = validateRequest(addCommentSchema, body);

    const { data, error } = await supabase
      .from('inline_comments')
      .insert({
        session_id: validatedData.session_id,
        anchor_start: validatedData.anchor_start,
        anchor_end: validatedData.anchor_end,
        anchor_text: validatedData.anchor_text,
        comment_text: validatedData.comment_text,
        parent_comment_id: validatedData.parent_comment_id,
        suggestion_id: validatedData.suggestion_id,
        author_user_id: profile.id,
        author_name: profile.email?.split('@')[0] || 'User',
        status: 'active',
      })
      .select('id, thread_id, created_at')
      .single();

    if (error) throw error;

    return createSuccessResponse(data, 'Comment added', 201, req);
  }

  // PUT /collaborative-edit/comments/:id/resolve - Resolve comment thread
  if (method === 'PUT' && pathname.match(/^\/collaborative-edit\/comments\/[a-f0-9-]+\/resolve$/)) {
    const commentId = pathname.split('/')[3];

    const { error } = await supabase
      .from('inline_comments')
      .update({
        is_resolved: true,
        status: 'resolved',
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) throw error;

    return createSuccessResponse({ resolved: true }, 'Comment resolved', 200, req);
  }

  // DELETE /collaborative-edit/comments/:id - Delete comment
  if (method === 'DELETE' && pathname.match(/^\/collaborative-edit\/comments\/[a-f0-9-]+$/)) {
    const commentId = pathname.split('/')[3];

    const { error } = await supabase
      .from('inline_comments')
      .update({ status: 'deleted' })
      .eq('id', commentId)
      .eq('author_user_id', profile.id);

    if (error) throw error;

    return createSuccessResponse({ deleted: true }, 'Comment deleted', 200, req);
  }

  // ============================================
  // SUGGESTIONS (Track Changes)
  // ============================================

  // GET /collaborative-edit/sessions/:id/suggestions - List suggestions
  if (method === 'GET' && pathname.match(/^\/collaborative-edit\/sessions\/[a-f0-9-]+\/suggestions$/)) {
    const sessionId = pathname.split('/')[3];
    const status = url.searchParams.get('status') || 'pending';

    const { data, error } = await supabase
      .from('document_suggestions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', status)
      .order('start_position', { ascending: true });

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // POST /collaborative-edit/suggestions - Add suggestion
  if (method === 'POST' && pathname === '/collaborative-edit/suggestions') {
    const body = await req.json();
    const validatedData = validateRequest(addSuggestionSchema, body);

    const { data, error } = await supabase
      .from('document_suggestions')
      .insert({
        session_id: validatedData.session_id,
        suggestion_type: validatedData.suggestion_type,
        start_position: validatedData.start_position,
        end_position: validatedData.end_position,
        original_content: validatedData.original_content,
        suggested_content: validatedData.suggested_content,
        format_changes: validatedData.format_changes,
        suggested_by_user_id: profile.id,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (error) throw error;

    return createSuccessResponse(data, 'Suggestion added', 201, req);
  }

  // PUT /collaborative-edit/suggestions/:id - Resolve suggestion
  if (method === 'PUT' && pathname.match(/^\/collaborative-edit\/suggestions\/[a-f0-9-]+$/)) {
    const suggestionId = pathname.split('/')[3];
    const body = await req.json();
    const { status, resolution_note } = validateRequest(resolveSuggestionSchema, body);

    const { error } = await supabase
      .from('document_suggestions')
      .update({
        status,
        resolution_note,
        resolved_by_user_id: profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) throw error;

    return createSuccessResponse({ resolved: true, status }, 'Suggestion resolved', 200, req);
  }

  // ============================================
  // STATS
  // ============================================

  // GET /collaborative-edit/stats - Get collaboration statistics
  if (method === 'GET' && pathname === '/collaborative-edit/stats') {
    const [sessionsResult, opsResult] = await Promise.all([
      supabase
        .from('collaborative_sessions')
        .select('status', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id),
      supabase
        .from('document_operations')
        .select('id', { count: 'exact', head: true })
        .in('session_id',
          supabase
            .from('collaborative_sessions')
            .select('id')
            .eq('enterprise_id', profile.enterprise_id)
        ),
    ]);

    const sessions = sessionsResult.data || [];

    const stats = {
      sessions: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'active').length,
        completed: sessions.filter(s => s.status === 'completed').length,
      },
      operations: {
        total: opsResult.count || 0,
      },
    };

    return createSuccessResponse(stats, undefined, 200, req);
  }

  return createErrorResponseSync('Method not allowed', 405, req);
}

serve(
  withMiddleware(handleCollaborativeEdit, {
    requireAuth: true,
    rateLimit: true,
    securityMonitoring: true,
  }, 'collaborative-edit')
);
