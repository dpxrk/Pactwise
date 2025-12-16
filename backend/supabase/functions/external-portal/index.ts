/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { validateRequest } from '../_shared/validation.ts';
import { z } from 'zod';

// ============================================
// CORS HEADERS FOR PORTAL
// ============================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Portal-Token, X-Session-Token',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const validateTokenSchema = z.object({
  token: z.string().min(32),
  access_code: z.string().min(4).max(20).optional(),
});

const submitSignatureSchema = z.object({
  signature_type: z.enum(['drawn', 'typed', 'uploaded']),
  signature_data: z.string().min(1),
  consent_text: z.string().min(10),
  font_family: z.string().optional(),
  canvas_width: z.number().int().positive().optional(),
  canvas_height: z.number().int().positive().optional(),
});

const submitRedlineSchema = z.object({
  redline_type: z.enum(['insert', 'delete', 'replace', 'comment']),
  start_position: z.number().int().nonnegative(),
  end_position: z.number().int().nonnegative().optional(),
  original_text: z.string().optional(),
  new_text: z.string().optional(),
  comment: z.string().max(5000).optional(),
});

const sendMessageSchema = z.object({
  message_text: z.string().min(1).max(10000),
  subject: z.string().max(500).optional(),
  parent_message_id: z.string().uuid().optional(),
  is_important: z.boolean().optional().default(false),
});

// ============================================
// SESSION VALIDATION
// ============================================

interface SessionData {
  session_id: string;
  token_id: string;
  token_type: string;
  enterprise_id: string;
  party_email: string;
  party_name: string;
  party_role: string;
  contract_id: string | null;
  signature_request_id: string | null;
  redline_session_id: string | null;
  document_version_id: string | null;
}

async function validateSession(
  supabase: ReturnType<typeof createAdminClient>,
  sessionToken: string,
  ip: string
): Promise<{ valid: boolean; session?: SessionData; error?: string }> {
  const sessionHash = await hashToken(sessionToken);

  // Get session with token data
  const { data: session } = await supabase
    .from('external_party_sessions')
    .select(`
      id, status, expires_at,
      token:external_access_tokens(
        id, token_type, enterprise_id, party_email, party_name, party_role,
        contract_id, signature_request_id, redline_session_id, document_version_id,
        status, expires_at
      )
    `)
    .eq('session_token_hash', sessionHash)
    .single();

  if (!session) {
    return { valid: false, error: 'Invalid session' };
  }

  if (session.status !== 'active') {
    return { valid: false, error: 'Session expired or terminated' };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, error: 'Session expired' };
  }

  const token = session.token;
  if (!token || token.status !== 'active' || new Date(token.expires_at) < new Date()) {
    return { valid: false, error: 'Access token expired' };
  }

  // Update session activity
  await supabase
    .from('external_party_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', session.id);

  return {
    valid: true,
    session: {
      session_id: session.id,
      token_id: token.id,
      token_type: token.token_type,
      enterprise_id: token.enterprise_id,
      party_email: token.party_email,
      party_name: token.party_name,
      party_role: token.party_role,
      contract_id: token.contract_id,
      signature_request_id: token.signature_request_id,
      redline_session_id: token.redline_session_id,
      document_version_id: token.document_version_id,
    },
  };
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // Get client info
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('cf-connecting-ip') ||
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  try {
    // ============================================
    // TOKEN VALIDATION (No session required)
    // ============================================

    // POST /external-portal/validate - Validate token and create session
    if (method === 'POST' && pathname === '/external-portal/validate') {
      const body = await req.json();
      const { token, access_code } = validateRequest(validateTokenSchema, body);

      // Validate the token
      const { data: validation } = await supabase.rpc('validate_external_access_token', {
        p_raw_token: token,
        p_ip_address: ip,
        p_user_agent: userAgent,
      });

      if (!validation || validation.length === 0) {
        return errorResponse('Invalid token', 401);
      }

      const tokenData = validation[0];

      if (!tokenData.is_valid) {
        return errorResponse(tokenData.error_message || 'Invalid token', 401);
      }

      // Check access code if required
      if (tokenData.requires_pin) {
        if (!access_code) {
          return jsonResponse({
            success: false,
            requires_pin: true,
            message: 'Access code required',
          });
        }

        // Verify access code (in production, compare hashes)
        const { data: tokenRecord } = await supabase
          .from('external_access_tokens')
          .select('access_code_hash')
          .eq('id', tokenData.token_id)
          .single();

        if (tokenRecord?.access_code_hash) {
          const codeHash = await hashToken(access_code);
          if (codeHash !== tokenRecord.access_code_hash) {
            // Log failed attempt
            await supabase.rpc('log_external_party_action', {
              p_session_id: null,
              p_action_type: 'invalid_pin',
              p_action_description: 'Invalid access code provided',
            });

            return errorResponse('Invalid access code', 401);
          }
        }
      }

      // Check email verification if required
      if (tokenData.requires_email_verification) {
        return jsonResponse({
          success: false,
          requires_email_verification: true,
          party_email: tokenData.party_email,
          message: 'Email verification required',
        });
      }

      // Create session
      const { data: sessionData } = await supabase.rpc('create_external_party_session', {
        p_token_id: tokenData.token_id,
        p_ip_address: ip,
        p_user_agent: userAgent,
        p_device_fingerprint: body.device_fingerprint || null,
        p_geo_location: body.geo_location || {},
      });

      if (!sessionData || sessionData.length === 0) {
        return errorResponse('Failed to create session', 500);
      }

      const session = sessionData[0];

      return jsonResponse({
        success: true,
        session_token: session.session_token,
        expires_at: session.expires_at,
        token_type: tokenData.token_type,
        party_name: tokenData.party_name,
        party_email: tokenData.party_email,
        contract_id: tokenData.contract_id,
        signature_request_id: tokenData.signature_request_id,
        redline_session_id: tokenData.redline_session_id,
      });
    }

    // ============================================
    // SESSION REQUIRED ROUTES
    // ============================================

    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return errorResponse('Session token required', 401);
    }

    const { valid, session, error } = await validateSession(supabase, sessionToken, ip);
    if (!valid || !session) {
      return errorResponse(error || 'Invalid session', 401);
    }

    // ============================================
    // GET SESSION STATE
    // ============================================

    // GET /external-portal/session - Get current session state
    if (method === 'GET' && pathname === '/external-portal/session') {
      return jsonResponse({
        success: true,
        session_id: session.session_id,
        token_type: session.token_type,
        party_name: session.party_name,
        party_email: session.party_email,
        party_role: session.party_role,
        contract_id: session.contract_id,
        signature_request_id: session.signature_request_id,
        redline_session_id: session.redline_session_id,
      });
    }

    // ============================================
    // DOCUMENT VIEWING
    // ============================================

    // GET /external-portal/document - Get document for viewing
    if (method === 'GET' && pathname === '/external-portal/document') {
      // Log view action
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'view_document',
        p_action_description: 'External party viewed document',
        p_target_type: session.contract_id ? 'contract' : 'document',
        p_target_id: session.contract_id || session.document_version_id,
      });

      // Get document data based on what's linked
      let documentData = null;

      if (session.signature_request_id) {
        // Get signature request documents
        const { data } = await supabase
          .from('signature_documents')
          .select('id, name, file_path, file_type, document_order')
          .eq('signature_request_id', session.signature_request_id)
          .order('document_order');

        documentData = data;
      } else if (session.contract_id) {
        // Get contract details (limited)
        const { data } = await supabase
          .from('contracts')
          .select('id, title, status')
          .eq('id', session.contract_id)
          .single();

        documentData = data;
      } else if (session.document_version_id) {
        const { data } = await supabase
          .from('document_versions')
          .select('id, version_number, content, created_at')
          .eq('id', session.document_version_id)
          .single();

        documentData = data;
      }

      return jsonResponse({
        success: true,
        document: documentData,
      });
    }

    // ============================================
    // SIGNATURE ROUTES
    // ============================================

    // GET /external-portal/signature-request - Get signature request details
    if (method === 'GET' && pathname === '/external-portal/signature-request') {
      if (!session.signature_request_id) {
        return errorResponse('No signature request associated with this token', 400);
      }

      if (!['sign', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for signing', 403);
      }

      // Get signature request summary
      const { data: request } = await supabase.rpc('get_signature_request_summary', {
        p_request_id: session.signature_request_id,
      });

      // Log view
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'view_signature_request',
        p_target_type: 'signature_request',
        p_target_id: session.signature_request_id,
      });

      return jsonResponse({
        success: true,
        signature_request: request,
      });
    }

    // POST /external-portal/sign - Submit signature
    if (method === 'POST' && pathname === '/external-portal/sign') {
      if (!session.signature_request_id) {
        return errorResponse('No signature request associated with this token', 400);
      }

      if (!['sign', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for signing', 403);
      }

      const body = await req.json();
      const signatureData = validateRequest(submitSignatureSchema, body);

      // Get signatory for this party
      const { data: signatory } = await supabase
        .from('signature_signatories')
        .select('id, status')
        .eq('signature_request_id', session.signature_request_id)
        .eq('email', session.party_email)
        .single();

      if (!signatory) {
        return errorResponse('Signatory not found', 404);
      }

      if (signatory.status !== 'pending' && signatory.status !== 'sent') {
        return errorResponse('Signature already submitted or declined', 400);
      }

      // Store drawn signature
      const signatureHash = await hashToken(signatureData.signature_data);

      const { data: drawnSig, error: sigError } = await supabase
        .from('external_party_drawn_signatures')
        .insert({
          token_id: session.token_id,
          session_id: session.session_id,
          signature_type: signatureData.signature_type,
          signature_data: signatureData.signature_data,
          signature_hash: signatureHash,
          font_family: signatureData.font_family,
          canvas_width: signatureData.canvas_width,
          canvas_height: signatureData.canvas_height,
          consent_text: signatureData.consent_text,
          consent_timestamp: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
        })
        .select('id')
        .single();

      if (sigError) throw sigError;

      // Update signatory status
      await supabase
        .from('signature_signatories')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
          signature_image_url: drawnSig?.id, // Reference to drawn signature
        })
        .eq('id', signatory.id);

      // Log signature event
      await supabase.rpc('log_signature_event', {
        p_request_id: session.signature_request_id,
        p_signatory_id: signatory.id,
        p_event_type: 'signed',
        p_event_message: 'External party signed via portal',
        p_actor_type: 'signatory',
        p_actor_id: null,
        p_raw_data: {
          signature_type: signatureData.signature_type,
          ip_address: ip,
          consent_timestamp: new Date().toISOString(),
        },
      });

      // Log external party action
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'apply_signature',
        p_action_description: 'External party applied signature',
        p_target_type: 'signature_request',
        p_target_id: session.signature_request_id,
        p_new_state: { status: 'signed' },
      });

      return jsonResponse({
        success: true,
        message: 'Signature submitted successfully',
        signed_at: new Date().toISOString(),
      });
    }

    // POST /external-portal/decline - Decline to sign
    if (method === 'POST' && pathname === '/external-portal/decline') {
      if (!session.signature_request_id) {
        return errorResponse('No signature request associated with this token', 400);
      }

      const body = await req.json();
      const reason = body.reason || 'Declined by signatory';

      const { data: signatory } = await supabase
        .from('signature_signatories')
        .select('id, status')
        .eq('signature_request_id', session.signature_request_id)
        .eq('email', session.party_email)
        .single();

      if (!signatory) {
        return errorResponse('Signatory not found', 404);
      }

      await supabase
        .from('signature_signatories')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason,
        })
        .eq('id', signatory.id);

      // Log events
      await supabase.rpc('log_signature_event', {
        p_request_id: session.signature_request_id,
        p_signatory_id: signatory.id,
        p_event_type: 'declined',
        p_event_message: 'External party declined to sign',
        p_actor_type: 'signatory',
        p_raw_data: { reason },
      });

      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'decline_signature',
        p_target_type: 'signature_request',
        p_target_id: session.signature_request_id,
        p_new_state: { status: 'declined', reason },
      });

      return jsonResponse({
        success: true,
        message: 'Signature declined',
      });
    }

    // ============================================
    // REDLINE ROUTES
    // ============================================

    // GET /external-portal/redlines - Get redlines for session
    if (method === 'GET' && pathname === '/external-portal/redlines') {
      if (!session.redline_session_id && !['redline', 'negotiate', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for redlines', 403);
      }

      // Log view
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'view_redline',
      });

      // Get redlines for the contract or session
      const { data: changes } = await supabase
        .from('document_changes')
        .select('*')
        .eq('redline_session_id', session.redline_session_id)
        .order('created_at', { ascending: true });

      return jsonResponse({
        success: true,
        redlines: changes || [],
      });
    }

    // POST /external-portal/redline - Submit a redline change
    if (method === 'POST' && pathname === '/external-portal/redline') {
      if (!['redline', 'negotiate', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for redlines', 403);
      }

      const body = await req.json();
      const redlineData = validateRequest(submitRedlineSchema, body);

      // Create the change
      const { data: change, error } = await supabase
        .from('document_changes')
        .insert({
          redline_session_id: session.redline_session_id,
          change_type: redlineData.redline_type,
          original_text: redlineData.original_text,
          new_text: redlineData.new_text,
          position_start: redlineData.start_position,
          position_end: redlineData.end_position,
          suggested_by_external: session.party_email,
          status: 'pending',
          comment: redlineData.comment,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log action
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'add_redline',
        p_target_type: 'redline',
        p_target_id: change?.id,
        p_new_state: redlineData,
      });

      return jsonResponse({
        success: true,
        redline_id: change?.id,
        message: 'Redline submitted',
      });
    }

    // ============================================
    // MESSAGING ROUTES
    // ============================================

    // GET /external-portal/messages - Get negotiation messages
    if (method === 'GET' && pathname === '/external-portal/messages') {
      if (!['negotiate', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for messages', 403);
      }

      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data: messages } = await supabase.rpc('get_negotiation_messages', {
        p_contract_id: session.contract_id,
        p_limit: limit,
        p_offset: offset,
      });

      // Log view
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'view_messages',
      });

      return jsonResponse({
        success: true,
        messages: messages || [],
      });
    }

    // POST /external-portal/message - Send a message
    if (method === 'POST' && pathname === '/external-portal/message') {
      if (!['negotiate', 'full'].includes(session.token_type)) {
        return errorResponse('Insufficient permissions for messages', 403);
      }

      const body = await req.json();
      const messageData = validateRequest(sendMessageSchema, body);

      // Send message
      const { data: messageId, error } = await supabase.rpc('send_negotiation_message', {
        p_enterprise_id: session.enterprise_id,
        p_contract_id: session.contract_id,
        p_sender_type: 'external',
        p_sender_token_id: session.token_id,
        p_message_text: messageData.message_text,
        p_parent_message_id: messageData.parent_message_id || null,
        p_subject: messageData.subject || null,
        p_is_important: messageData.is_important,
      });

      if (error) throw error;

      // Log action
      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'send_message',
        p_target_type: 'message',
        p_target_id: messageId,
      });

      return jsonResponse({
        success: true,
        message_id: messageId,
        sent_at: new Date().toISOString(),
      });
    }

    // ============================================
    // LOGOUT
    // ============================================

    // POST /external-portal/logout - End session
    if (method === 'POST' && pathname === '/external-portal/logout') {
      await supabase
        .from('external_party_sessions')
        .update({
          status: 'terminated',
          terminated_reason: 'User logout',
        })
        .eq('id', session.session_id);

      await supabase.rpc('log_external_party_action', {
        p_session_id: session.session_id,
        p_action_type: 'logout',
      });

      return jsonResponse({
        success: true,
        message: 'Logged out successfully',
      });
    }

    return errorResponse('Not found', 404);

  } catch (err) {
    console.error('External portal error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});
