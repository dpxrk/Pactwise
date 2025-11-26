/// <reference path="../../types/global.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest, z } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';
import { getAuditLogger, extractAuditContext } from '../_shared/audit-logger.ts';
import { getLogger } from '../_shared/logger.ts';
import { getWebhookCircuitBreaker } from '../_shared/circuit-breaker.ts';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.enum([
    'contract.created',
    'contract.updated',
    'contract.deleted',
    'contract.approved',
    'contract.rejected',
    'contract.expiring',
    'vendor.created',
    'vendor.updated',
    'vendor.deleted',
    'vendor.compliance_changed',
    'approval.requested',
    'approval.completed',
    'budget.threshold_reached',
    'budget.exceeded',
    'user.invited',
    'user.role_changed',
    'analysis.completed',
    'alert.triggered',
  ])).min(1),
  headers: z.record(z.string()).optional(),
  secret: z.string().min(16).max(256).optional(),
  is_active: z.boolean().default(true),
  retry_config: z.object({
    max_retries: z.number().min(0).max(10).default(3),
    retry_delay_ms: z.number().min(1000).max(60000).default(5000),
  }).optional(),
});

const UpdateWebhookSchema = CreateWebhookSchema.partial();

const TestWebhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.unknown()).optional(),
});

// ============================================================================
// WEBHOOK SIGNATURE
// ============================================================================

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

interface WebhookDeliveryResult {
  success: boolean;
  status_code?: number;
  response_body?: string;
  error?: string;
  duration_ms: number;
}

async function deliverWebhook(
  url: string,
  event: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
  secret?: string
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const body = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
    delivery_id: crypto.randomUUID(),
  });

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Pactwise-Webhooks/1.0',
    'X-Webhook-Event': event,
    ...headers,
  };

  if (secret) {
    requestHeaders['X-Webhook-Signature'] = `sha256=${await generateSignature(body, secret)}`;
  }

  try {
    const circuitBreaker = getWebhookCircuitBreaker(url);

    const response = await circuitBreaker.execute(async () => {
      return await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
      });
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text();

    return {
      success: response.ok,
      status_code: response.status,
      response_body: responseBody.substring(0, 1000), // Limit stored response
      duration_ms: duration,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const logger = getLogger({ contextDefaults: { function_name: 'webhooks' } });

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;
  const auditLogger = getAuditLogger();
  const auditContext = extractAuditContext(req);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponseSync('Authorization required', 401, req);
    }

    const user = await getUserFromAuth(authHeader);
    if (!user) {
      return createErrorResponseSync('Invalid or expired token', 401, req);
    }

    // Only admin+ can manage webhooks
    const ROLE_HIERARCHY: Record<string, number> = {
      owner: 5, admin: 4, manager: 3, user: 2, viewer: 1,
    };

    if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY['admin']) {
      return createErrorResponseSync('Insufficient permissions. Admin role required.', 403, req);
    }

    const supabase = createAdminClient();

    // ========================================================================
    // GET /webhooks - List all webhooks
    // ========================================================================
    if (method === 'GET' && pathname === '/webhooks') {
      const { data, error } = await supabase.rpc('list_webhooks', {
        p_enterprise_id: user.enterprise_id,
      });

      if (error) throw error;

      return createSuccessResponse({ webhooks: data || [] }, undefined, 200, req);
    }

    // ========================================================================
    // POST /webhooks - Create new webhook
    // ========================================================================
    if (method === 'POST' && pathname === '/webhooks') {
      const body = await req.json();
      const validatedData = validateRequest(CreateWebhookSchema, body);

      // Generate secret if not provided
      const secret = validatedData.secret || crypto.randomUUID() + crypto.randomUUID();

      const { data, error } = await supabase.rpc('register_webhook', {
        p_enterprise_id: user.enterprise_id,
        p_name: validatedData.name,
        p_url: validatedData.url,
        p_events: validatedData.events,
        p_headers: validatedData.headers || {},
      });

      if (error) throw error;

      // Store secret separately (encrypted in DB)
      await supabase
        .from('webhook_secrets')
        .insert({
          webhook_id: data.id,
          secret_hash: await generateSignature(secret, 'pactwise-salt'),
          created_by: user.id,
        });

      // Audit log
      await auditLogger.logCreate(
        'webhook',
        data.id,
        user.id,
        user.enterprise_id,
        { name: validatedData.name, url: validatedData.url, events: validatedData.events },
        { ...auditContext, description: `Webhook "${validatedData.name}" created` }
      );

      return createSuccessResponse({
        webhook: data,
        secret: secret, // Only returned once at creation
        message: 'Webhook created. Save the secret - it will not be shown again.',
      }, undefined, 201, req);
    }

    // ========================================================================
    // GET /webhooks/:id - Get webhook details
    // ========================================================================
    if (method === 'GET' && pathname.match(/^\/webhooks\/[a-f0-9-]+$/)) {
      const webhookId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('webhooks')
        .select(`
          *,
          recent_deliveries:webhook_deliveries(
            id, event, status_code, success, created_at, duration_ms
          )
        `)
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (error || !data) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      return createSuccessResponse(data, undefined, 200, req);
    }

    // ========================================================================
    // PATCH /webhooks/:id - Update webhook
    // ========================================================================
    if (method === 'PATCH' && pathname.match(/^\/webhooks\/[a-f0-9-]+$/)) {
      const webhookId = pathname.split('/')[2];
      const body = await req.json();
      const validatedData = validateRequest(UpdateWebhookSchema, body);

      // Get existing webhook
      const { data: existing } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!existing) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.url) updateData.url = validatedData.url;
      if (validatedData.events) updateData.events = validatedData.events;
      if (validatedData.headers !== undefined) updateData.headers = validatedData.headers;
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;
      if (validatedData.retry_config) updateData.retry_config = validatedData.retry_config;

      const { data, error } = await supabase
        .from('webhooks')
        .update(updateData)
        .eq('id', webhookId)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await auditLogger.logUpdate(
        'webhook',
        webhookId,
        user.id,
        user.enterprise_id,
        existing,
        data,
        { ...auditContext, description: `Webhook "${data.name}" updated` }
      );

      return createSuccessResponse(data, undefined, 200, req);
    }

    // ========================================================================
    // DELETE /webhooks/:id - Delete webhook
    // ========================================================================
    if (method === 'DELETE' && pathname.match(/^\/webhooks\/[a-f0-9-]+$/)) {
      const webhookId = pathname.split('/')[2];

      const { data: webhook } = await supabase
        .from('webhooks')
        .select('name')
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!webhook) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      // Audit log
      await auditLogger.logDelete(
        'webhook',
        webhookId,
        user.id,
        user.enterprise_id,
        { name: webhook.name },
        { ...auditContext, description: `Webhook "${webhook.name}" deleted` }
      );

      return createSuccessResponse({ message: 'Webhook deleted' }, undefined, 200, req);
    }

    // ========================================================================
    // POST /webhooks/:id/test - Test webhook
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/webhooks\/[a-f0-9-]+\/test$/)) {
      const webhookId = pathname.split('/')[2];
      const body = await req.json();
      const { event, payload } = validateRequest(TestWebhookSchema, body);

      // Get webhook
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!webhook) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      // Get secret
      const { data: secretData } = await supabase
        .from('webhook_secrets')
        .select('secret_hash')
        .eq('webhook_id', webhookId)
        .single();

      // Deliver test webhook
      const testPayload = payload || {
        test: true,
        message: 'This is a test webhook delivery from Pactwise',
        enterprise_id: user.enterprise_id,
        triggered_by: user.id,
      };

      logger.info('Testing webhook', { webhook_id: webhookId, event });

      const result = await deliverWebhook(
        webhook.url,
        event || 'test.ping',
        testPayload,
        webhook.headers || {},
        secretData?.secret_hash
      );

      // Record delivery attempt
      await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_id: webhookId,
          event: event || 'test.ping',
          payload: testPayload,
          success: result.success,
          status_code: result.status_code,
          response_body: result.response_body,
          error_message: result.error,
          duration_ms: result.duration_ms,
          is_test: true,
        });

      return createSuccessResponse({
        success: result.success,
        status_code: result.status_code,
        duration_ms: result.duration_ms,
        error: result.error,
      }, undefined, result.success ? 200 : 502, req);
    }

    // ========================================================================
    // POST /webhooks/:id/rotate-secret - Rotate webhook secret
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/webhooks\/[a-f0-9-]+\/rotate-secret$/)) {
      const webhookId = pathname.split('/')[2];

      // Verify webhook exists
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('name')
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!webhook) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      // Generate new secret
      const newSecret = crypto.randomUUID() + crypto.randomUUID();

      // Update secret
      await supabase
        .from('webhook_secrets')
        .upsert({
          webhook_id: webhookId,
          secret_hash: await generateSignature(newSecret, 'pactwise-salt'),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        });

      // Audit log
      await auditLogger.logSecurityEvent(
        'update',
        user.id,
        user.enterprise_id,
        `Webhook secret rotated for "${webhook.name}"`,
        { webhook_id: webhookId },
        'info'
      );

      return createSuccessResponse({
        secret: newSecret,
        message: 'Secret rotated. Save the new secret - it will not be shown again.',
      }, undefined, 200, req);
    }

    // ========================================================================
    // GET /webhooks/:id/deliveries - Get delivery history
    // ========================================================================
    if (method === 'GET' && pathname.match(/^\/webhooks\/[a-f0-9-]+\/deliveries$/)) {
      const webhookId = pathname.split('/')[2];
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      // Verify webhook exists
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('id')
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .single();

      if (!webhook) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(Math.min(limit, 100));

      if (error) throw error;

      // Calculate success rate
      const successCount = (data || []).filter(d => d.success).length;
      const successRate = data?.length ? (successCount / data.length) * 100 : 0;

      return createSuccessResponse({
        deliveries: data || [],
        stats: {
          total: data?.length || 0,
          successful: successCount,
          failed: (data?.length || 0) - successCount,
          success_rate: Math.round(successRate * 10) / 10,
        },
      }, undefined, 200, req);
    }

    // ========================================================================
    // POST /webhooks/:id/enable - Enable webhook
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/webhooks\/[a-f0-9-]+\/enable$/)) {
      const webhookId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('webhooks')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .select()
        .single();

      if (error || !data) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      return createSuccessResponse(data, 'Webhook enabled', 200, req);
    }

    // ========================================================================
    // POST /webhooks/:id/disable - Disable webhook
    // ========================================================================
    if (method === 'POST' && pathname.match(/^\/webhooks\/[a-f0-9-]+\/disable$/)) {
      const webhookId = pathname.split('/')[2];

      const { data, error } = await supabase
        .from('webhooks')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', webhookId)
        .eq('enterprise_id', user.enterprise_id)
        .select()
        .single();

      if (error || !data) {
        return createErrorResponseSync('Webhook not found', 404, req);
      }

      return createSuccessResponse(data, 'Webhook disabled', 200, req);
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    logger.error('Webhooks error', error);
    return createErrorResponseSync(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      req
    );
  }
});
