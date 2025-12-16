/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { withMiddleware, type RequestContext } from '../_shared/middleware.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync, createPaginatedResponse } from '../_shared/responses.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const providerEnum = z.enum([
  'docusign', 'adobe_sign', 'hellosign', 'pandadoc', 'signrequest', 'manual'
]);

const signatoryTypeEnum = z.enum([
  'signer', 'approver', 'cc', 'witness', 'notary'
]);

const signatorySchema = z.object({
  signatory_type: signatoryTypeEnum.optional().default('signer'),
  role_name: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  signing_order: z.number().int().positive().optional().default(1),
  user_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
});

const createRequestSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  message: z.string().max(5000).optional().nullable(),
  email_subject: z.string().max(500).optional().nullable(),
  email_body: z.string().max(5000).optional().nullable(),
  signing_order: z.enum(['parallel', 'sequential']).optional().default('parallel'),
  expires_days: z.number().int().positive().max(365).optional().default(30),
  reminder_frequency_days: z.number().int().positive().max(30).optional().default(3),
  require_id_verification: z.boolean().optional().default(false),
  require_sms_auth: z.boolean().optional().default(false),
  signatories: z.array(signatorySchema).min(1),
  document_version_ids: z.array(z.string().uuid()).optional().default([]),
});

const providerConfigSchema = z.object({
  provider: providerEnum,
  display_name: z.string().min(1).max(255),
  is_default: z.boolean().optional().default(false),
  api_endpoint: z.string().url().optional().nullable(),
  api_version: z.string().optional().nullable(),
  account_id: z.string().optional().nullable(),
  integration_key: z.string().optional().nullable(),
  api_key: z.string().optional().nullable(),
  webhook_events: z.array(z.string()).optional().default([]),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
  branding_config: z.record(z.string(), z.unknown()).optional().default({}),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

// ============================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================

async function verifyDocuSignWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payload)
    );
  } catch {
    return false;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

async function handleEsignature(context: RequestContext): Promise<Response> {
  const { req, user: profile } = context;
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // ============================================
  // WEBHOOK ROUTES (No auth required)
  // ============================================

  // POST /esignature/webhooks/docusign - DocuSign webhook receiver
  if (method === 'POST' && pathname === '/esignature/webhooks/docusign') {
    const payload = await req.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(payload);
    } catch {
      return createErrorResponseSync('Invalid JSON payload', 400, req);
    }

    const signature = req.headers.get('x-docusign-signature-1') || '';
    const envelopeId = body.envelopeId as string || body.data?.envelopeId as string;

    if (!envelopeId) {
      return createErrorResponseSync('Missing envelope ID', 400, req);
    }

    // Find the signature request by envelope ID
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, enterprise_id, provider_config_id')
      .eq('external_envelope_id', envelopeId)
      .single();

    if (!request) {
      // Log unknown webhook
      console.log('Unknown envelope ID:', envelopeId);
      return createSuccessResponse({ received: true, matched: false }, undefined, 200, req);
    }

    // Get provider config for webhook verification
    if (request.provider_config_id) {
      const { data: config } = await supabase
        .from('signature_provider_configs')
        .select('webhook_secret_encrypted')
        .eq('id', request.provider_config_id)
        .single();

      // Verify signature if secret is configured
      if (config?.webhook_secret_encrypted && signature) {
        const isValid = await verifyDocuSignWebhook(
          payload,
          signature,
          config.webhook_secret_encrypted
        );

        if (!isValid) {
          console.error('Invalid webhook signature');
          return createErrorResponseSync('Invalid signature', 401, req);
        }
      }
    }

    // Process the webhook event
    const eventType = body.event as string || body.status as string;
    const recipientEvents = body.recipientEvents as Array<{
      recipientId: string;
      recipientIdGuid: string;
      status: string;
      email: string;
      signedDateTime?: string;
      declinedDateTime?: string;
      declinedReason?: string;
    }> || [];

    // Map DocuSign status to our status
    const statusMap: Record<string, string> = {
      'sent': 'sent',
      'delivered': 'delivered',
      'completed': 'completed',
      'declined': 'declined',
      'voided': 'voided',
      'signed': 'signed',
    };

    // Update request status
    if (statusMap[eventType]) {
      await supabase
        .from('signature_requests')
        .update({
          status: statusMap[eventType],
          provider_metadata: body,
        })
        .eq('id', request.id);
    }

    // Update individual signatories
    for (const recipientEvent of recipientEvents) {
      const signatoryStatus = statusMap[recipientEvent.status] || recipientEvent.status;

      await supabase
        .from('signature_signatories')
        .update({
          status: signatoryStatus,
          external_recipient_id: recipientEvent.recipientIdGuid,
          signed_at: recipientEvent.signedDateTime || null,
          declined_at: recipientEvent.declinedDateTime || null,
          decline_reason: recipientEvent.declinedReason || null,
        })
        .eq('signature_request_id', request.id)
        .eq('email', recipientEvent.email);
    }

    // Log the webhook event
    await supabase.rpc('log_signature_event', {
      p_request_id: request.id,
      p_signatory_id: null,
      p_event_type: 'webhook_received',
      p_event_message: `DocuSign webhook: ${eventType}`,
      p_actor_type: 'webhook',
      p_actor_id: null,
      p_raw_data: body,
    });

    return createSuccessResponse({ received: true, processed: true }, undefined, 200, req);
  }

  // POST /esignature/webhooks/hellosign - HelloSign webhook receiver
  if (method === 'POST' && pathname === '/esignature/webhooks/hellosign') {
    const formData = await req.formData();
    const jsonString = formData.get('json') as string;

    if (!jsonString) {
      return createErrorResponseSync('Missing JSON payload', 400, req);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(jsonString);
    } catch {
      return createErrorResponseSync('Invalid JSON payload', 400, req);
    }

    const event = body.event as { event_type: string; event_time: string; event_hash: string };
    const signatureRequest = body.signature_request as { signature_request_id: string; signatures: Array<{ signer_email_address: string; status_code: string }> };

    if (!signatureRequest?.signature_request_id) {
      return createSuccessResponse({ received: true }, undefined, 200, req);
    }

    // Find the signature request
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, enterprise_id')
      .eq('external_request_id', signatureRequest.signature_request_id)
      .single();

    if (!request) {
      return createSuccessResponse({ received: true, matched: false }, undefined, 200, req);
    }

    // Map HelloSign status
    const statusMap: Record<string, string> = {
      'signature_request_sent': 'sent',
      'signature_request_viewed': 'viewed',
      'signature_request_signed': 'partially_signed',
      'signature_request_all_signed': 'completed',
      'signature_request_declined': 'declined',
      'signature_request_canceled': 'voided',
    };

    if (statusMap[event.event_type]) {
      await supabase
        .from('signature_requests')
        .update({
          status: statusMap[event.event_type],
          provider_metadata: body,
        })
        .eq('id', request.id);
    }

    // Log event
    await supabase.rpc('log_signature_event', {
      p_request_id: request.id,
      p_signatory_id: null,
      p_event_type: 'webhook_received',
      p_event_message: `HelloSign webhook: ${event.event_type}`,
      p_actor_type: 'webhook',
      p_actor_id: null,
      p_raw_data: body,
    });

    // HelloSign expects "Hello API Event Received" response
    return new Response('Hello API Event Received', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // ============================================
  // AUTHENTICATED ROUTES
  // ============================================

  // Require auth for all other routes
  if (!profile) {
    return createErrorResponseSync('Authentication required', 401, req);
  }

  const permissions = await getUserPermissions(supabase, profile, 'contracts');

  // ============================================
  // PROVIDER CONFIG ROUTES
  // ============================================

  // GET /esignature/providers - List configured providers
  if (method === 'GET' && pathname === '/esignature/providers') {
    const { data, error } = await supabase
      .from('signature_provider_configs')
      .select('id, provider, display_name, is_default, is_active, verification_status, created_at')
      .eq('enterprise_id', profile.enterprise_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // GET /esignature/providers/:id - Get provider details
  if (method === 'GET' && pathname.match(/^\/esignature\/providers\/[a-f0-9-]+$/)) {
    const providerId = pathname.split('/')[3];

    const { data, error } = await supabase
      .from('signature_provider_configs')
      .select('*')
      .eq('id', providerId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Provider not found', 404, req);
    }

    // Mask sensitive fields
    const maskedData = {
      ...data,
      api_key_encrypted: data.api_key_encrypted ? '********' : null,
      webhook_secret_encrypted: data.webhook_secret_encrypted ? '********' : null,
    };

    return createSuccessResponse(maskedData, undefined, 200, req);
  }

  // POST /esignature/providers - Configure new provider
  if (method === 'POST' && pathname === '/esignature/providers') {
    if (!permissions.canManage) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const body = await req.json();
    const validatedData = validateRequest(providerConfigSchema, body);

    // Generate webhook URL
    const webhookUrl = `${url.origin}/esignature/webhooks/${validatedData.provider}`;

    const { data, error } = await supabase
      .from('signature_provider_configs')
      .insert({
        enterprise_id: profile.enterprise_id,
        provider: validatedData.provider,
        display_name: validatedData.display_name,
        is_default: validatedData.is_default,
        api_endpoint: validatedData.api_endpoint,
        api_version: validatedData.api_version,
        account_id: validatedData.account_id,
        integration_key: validatedData.integration_key,
        api_key_encrypted: validatedData.api_key, // Should be encrypted in production
        webhook_url: webhookUrl,
        webhook_events: validatedData.webhook_events,
        settings: validatedData.settings,
        branding_config: validatedData.branding_config,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    return createSuccessResponse(data, 'Provider configured', 201, req);
  }

  // PUT /esignature/providers/:id - Update provider
  if (method === 'PUT' && pathname.match(/^\/esignature\/providers\/[a-f0-9-]+$/)) {
    if (!permissions.canManage) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const providerId = pathname.split('/')[3];
    const body = await req.json();
    const validatedData = validateRequest(providerConfigSchema.partial(), body);

    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.api_key) {
      updateData.api_key_encrypted = validatedData.api_key;
      delete updateData.api_key;
    }

    const { data, error } = await supabase
      .from('signature_provider_configs')
      .update(updateData)
      .eq('id', providerId)
      .eq('enterprise_id', profile.enterprise_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Provider not found', 404, req);
    }

    return createSuccessResponse(data, undefined, 200, req);
  }

  // DELETE /esignature/providers/:id - Delete provider
  if (method === 'DELETE' && pathname.match(/^\/esignature\/providers\/[a-f0-9-]+$/)) {
    if (!permissions.canManage) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const providerId = pathname.split('/')[3];

    const { error } = await supabase
      .from('signature_provider_configs')
      .delete()
      .eq('id', providerId)
      .eq('enterprise_id', profile.enterprise_id);

    if (error) throw error;

    return createSuccessResponse({ deleted: true }, 'Provider deleted', 200, req);
  }

  // ============================================
  // SIGNATURE REQUEST ROUTES
  // ============================================

  // GET /esignature/requests - List signature requests
  if (method === 'GET' && pathname === '/esignature/requests') {
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = validateRequest(paginationSchema, params);
    const offset = (page - 1) * limit;
    const status = params.status;
    const contractId = params.contract_id;

    let query = supabase
      .from('signature_requests')
      .select(`
        *,
        contract:contracts(id, title),
        signatories:signature_signatories(id, name, email, status, signatory_type)
      `, { count: 'exact' })
      .eq('enterprise_id', profile.enterprise_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (contractId) {
      query = query.eq('contract_id', contractId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return createPaginatedResponse(data || [], {
      page,
      limit,
      total: count || 0,
    }, req);
  }

  // GET /esignature/requests/:id - Get signature request details
  if (method === 'GET' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+$/)) {
    const requestId = pathname.split('/')[3];

    // Use database function
    const { data, error } = await supabase.rpc('get_signature_request_summary', {
      p_request_id: requestId,
    });

    if (error) throw error;
    if (!data) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    return createSuccessResponse(data, undefined, 200, req);
  }

  // POST /esignature/requests - Create signature request
  if (method === 'POST' && pathname === '/esignature/requests') {
    if (!permissions.canUpdate) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const body = await req.json();
    const validatedData = validateRequest(createRequestSchema, body);

    // Verify contract belongs to enterprise
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, enterprise_id, title')
      .eq('id', validatedData.contract_id)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!contract) {
      return createErrorResponseSync('Contract not found', 404, req);
    }

    // Create request using database function
    const { data: requestId, error } = await supabase.rpc('create_signature_request', {
      p_contract_id: validatedData.contract_id,
      p_title: validatedData.title,
      p_message: validatedData.message || null,
      p_signatories: validatedData.signatories,
      p_expires_days: validatedData.expires_days,
      p_signing_order: validatedData.signing_order,
      p_created_by: profile.id,
    });

    if (error) throw error;

    // Update additional fields
    await supabase
      .from('signature_requests')
      .update({
        email_subject: validatedData.email_subject || `Signature Required: ${validatedData.title}`,
        email_body: validatedData.email_body,
        reminder_frequency_days: validatedData.reminder_frequency_days,
        require_id_verification: validatedData.require_id_verification,
        require_sms_auth: validatedData.require_sms_auth,
      })
      .eq('id', requestId);

    // Add documents if provided
    if (validatedData.document_version_ids.length > 0) {
      const documents = validatedData.document_version_ids.map((versionId, index) => ({
        signature_request_id: requestId,
        name: `Document ${index + 1}`,
        document_version_id: versionId,
        document_order: index + 1,
        source_type: 'contract',
      }));

      await supabase
        .from('signature_documents')
        .insert(documents);
    }

    // Get created request
    const { data: request } = await supabase.rpc('get_signature_request_summary', {
      p_request_id: requestId,
    });

    return createSuccessResponse(request, 'Signature request created', 201, req);
  }

  // POST /esignature/requests/:id/send - Send signature request
  if (method === 'POST' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/send$/)) {
    if (!permissions.canUpdate) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const requestId = pathname.split('/')[3];

    // Get request
    const { data: request } = await supabase
      .from('signature_requests')
      .select('*, provider_config:signature_provider_configs(*)')
      .eq('id', requestId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    if (request.status !== 'draft') {
      return createErrorResponseSync('Request already sent', 400, req);
    }

    // In production, this would integrate with the actual e-signature provider API
    // For now, we simulate sending by updating status

    await supabase
      .from('signature_requests')
      .update({
        status: 'sent',
        sent_by: profile.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Update signatories to sent
    await supabase
      .from('signature_signatories')
      .update({ status: 'sent' })
      .eq('signature_request_id', requestId)
      .eq('status', 'pending');

    // Log event
    await supabase.rpc('log_signature_event', {
      p_request_id: requestId,
      p_signatory_id: null,
      p_event_type: 'sent',
      p_event_message: 'Signature request sent to signatories',
      p_actor_type: 'user',
      p_actor_id: profile.id,
      p_raw_data: {},
    });

    return createSuccessResponse({ sent: true }, 'Signature request sent', 200, req);
  }

  // POST /esignature/requests/:id/void - Void signature request
  if (method === 'POST' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/void$/)) {
    if (!permissions.canManage) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const requestId = pathname.split('/')[3];
    const body = await req.json();
    const reason = body.reason || 'Voided by user';

    const { data, error } = await supabase.rpc('void_signature_request', {
      p_request_id: requestId,
      p_reason: reason,
      p_voided_by: profile.id,
    });

    if (error) throw error;

    if (!data) {
      return createErrorResponseSync('Request cannot be voided', 400, req);
    }

    return createSuccessResponse({ voided: true }, 'Signature request voided', 200, req);
  }

  // POST /esignature/requests/:id/remind - Send reminder
  if (method === 'POST' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/remind$/)) {
    if (!permissions.canUpdate) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const requestId = pathname.split('/')[3];
    const body = await req.json();
    const signatoryIds = body.signatory_ids || [];

    // Get request
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    if (!['sent', 'delivered', 'viewed', 'partially_signed'].includes(request.status)) {
      return createErrorResponseSync('Request not in valid state for reminders', 400, req);
    }

    // Update reminder count
    await supabase
      .from('signature_requests')
      .update({
        last_reminder_sent_at: new Date().toISOString(),
        reminders_sent: supabase.rpc('increment_reminders', { request_id: requestId }),
      })
      .eq('id', requestId);

    // Log event
    await supabase.rpc('log_signature_event', {
      p_request_id: requestId,
      p_signatory_id: null,
      p_event_type: 'reminder_sent',
      p_event_message: 'Reminder sent to pending signatories',
      p_actor_type: 'user',
      p_actor_id: profile.id,
      p_raw_data: { signatory_ids: signatoryIds },
    });

    return createSuccessResponse({ reminded: true }, 'Reminder sent', 200, req);
  }

  // ============================================
  // SIGNATORY ROUTES
  // ============================================

  // POST /esignature/requests/:id/signatories - Add signatory
  if (method === 'POST' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/signatories$/)) {
    if (!permissions.canUpdate) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const requestId = pathname.split('/')[3];
    const body = await req.json();
    const validatedData = validateRequest(signatorySchema, body);

    // Verify request is in draft status
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    if (request.status !== 'draft') {
      return createErrorResponseSync('Cannot add signatories after request is sent', 400, req);
    }

    const { data, error } = await supabase
      .from('signature_signatories')
      .insert({
        signature_request_id: requestId,
        ...validatedData,
      })
      .select()
      .single();

    if (error) throw error;

    return createSuccessResponse(data, 'Signatory added', 201, req);
  }

  // DELETE /esignature/requests/:requestId/signatories/:signatoryId - Remove signatory
  if (method === 'DELETE' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/signatories\/[a-f0-9-]+$/)) {
    if (!permissions.canUpdate) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    const parts = pathname.split('/');
    const requestId = parts[3];
    const signatoryId = parts[5];

    // Verify request is in draft status
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id, status')
      .eq('id', requestId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    if (request.status !== 'draft') {
      return createErrorResponseSync('Cannot remove signatories after request is sent', 400, req);
    }

    const { error } = await supabase
      .from('signature_signatories')
      .delete()
      .eq('id', signatoryId)
      .eq('signature_request_id', requestId);

    if (error) throw error;

    return createSuccessResponse({ deleted: true }, 'Signatory removed', 200, req);
  }

  // ============================================
  // EVENT LOG ROUTES
  // ============================================

  // GET /esignature/requests/:id/events - Get event log
  if (method === 'GET' && pathname.match(/^\/esignature\/requests\/[a-f0-9-]+\/events$/)) {
    const requestId = pathname.split('/')[3];

    // Verify request belongs to enterprise
    const { data: request } = await supabase
      .from('signature_requests')
      .select('id')
      .eq('id', requestId)
      .eq('enterprise_id', profile.enterprise_id)
      .single();

    if (!request) {
      return createErrorResponseSync('Request not found', 404, req);
    }

    const { data, error } = await supabase
      .from('signature_events')
      .select(`
        *,
        signatory:signature_signatories(id, name, email)
      `)
      .eq('signature_request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // ============================================
  // PENDING SIGNATURES ROUTE
  // ============================================

  // GET /esignature/pending - Get pending signatures for current user
  if (method === 'GET' && pathname === '/esignature/pending') {
    const { data, error } = await supabase.rpc('get_pending_signatures_for_user', {
      p_user_email: profile.email,
      p_limit: 50,
    });

    if (error) throw error;

    return createSuccessResponse(data || [], undefined, 200, req);
  }

  // ============================================
  // STATS ROUTE
  // ============================================

  // GET /esignature/stats - Get signature statistics
  if (method === 'GET' && pathname === '/esignature/stats') {
    const { data: requests } = await supabase
      .from('signature_requests')
      .select('status')
      .eq('enterprise_id', profile.enterprise_id);

    const stats = {
      total: requests?.length || 0,
      draft: requests?.filter(r => r.status === 'draft').length || 0,
      sent: requests?.filter(r => r.status === 'sent').length || 0,
      pending: requests?.filter(r => ['sent', 'delivered', 'viewed', 'partially_signed'].includes(r.status)).length || 0,
      completed: requests?.filter(r => r.status === 'completed').length || 0,
      declined: requests?.filter(r => r.status === 'declined').length || 0,
      voided: requests?.filter(r => r.status === 'voided').length || 0,
      expired: requests?.filter(r => r.status === 'expired').length || 0,
    };

    return createSuccessResponse(stats, undefined, 200, req);
  }

  // Method not allowed
  return createErrorResponseSync('Method not allowed', 405, req);
}

// Serve with conditional auth (webhooks don't require auth)
serve(
  withMiddleware(handleEsignature, {
    requireAuth: false, // We handle auth manually due to webhook routes
    rateLimit: true,
    securityMonitoring: true,
  }, 'esignature')
);
