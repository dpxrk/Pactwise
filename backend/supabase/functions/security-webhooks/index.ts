import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { logSecurityEvent, SecurityMonitor, type AlertChannel } from '../_shared/security-monitoring.ts';
import { z } from 'zod';

/**
 * Security Webhooks Handler
 * Receives security events from external monitoring tools and services
 */

const webhookEventSchema = z.object({
  source: z.string().min(1).max(100), // e.g., 'cloudflare', 'aws-guardduty', 'custom-monitoring'
  event_type: z.enum([
    'auth_failure',
    'rate_limit_violation',
    'suspicious_activity',
    'data_breach_attempt',
    'privilege_escalation',
    'unauthorized_access',
    'malicious_payload',
    'brute_force_attack',
    'anomalous_behavior',
    'system_intrusion',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  source_ip: z.string().optional(),
  user_agent: z.string().optional(),
  user_id: z.string().uuid().optional(),
  enterprise_id: z.string().uuid().optional(),
  endpoint: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

const bulkWebhookSchema = z.object({
  events: z.array(webhookEventSchema).max(100),
  source: z.string().min(1).max(100),
});

// const webhookSignatureSchema = z.object({
//   timestamp: z.string(),
//   signature: z.string(),
// });

class SecurityWebhookProcessor {
  private monitor: SecurityMonitor;
  // private validSources = new Set([
  //   'cloudflare',
  //   'aws-guardduty',
  //   'custom-monitoring',
  //   'external-ids',
  //   'firewall',
  //   'waf',
  //   'cdn',
  //   'load-balancer',
  // ]);

  constructor() {
    this.monitor = new SecurityMonitor();
  }

  validateWebhookSignature(_body: string, headers: Headers): boolean {
    // Simple validation - in production, implement proper HMAC verification
    const signature = headers.get('x-webhook-signature');
    const timestamp = headers.get('x-webhook-timestamp');

    if (!signature || !timestamp) {
      return false;
    }

    // Check timestamp is recent (within 5 minutes)
    const webhookTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - webhookTime.getTime());
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxAge) {
      return false;
    }

    // In production, verify HMAC signature here
    // const expectedSignature = generateHMAC(body, webhookSecret);
    // return signature === expectedSignature;

    return true; // Simplified for demo
  }

  async processWebhookEvent(eventData: WebhookEvent): Promise<string> {
    const enrichedEvent = {
      ...eventData,
      metadata: {
        ...eventData.metadata,
        webhook_source: eventData.source,
        processed_at: new Date().toISOString(),
      },
    };

    // Remove the source field as it's now in metadata
    delete enrichedEvent.source;

    return logSecurityEvent(enrichedEvent);
  }

  async createAutomaticAlert(eventData: WebhookEvent): Promise<string | null> {
    // Auto-create alerts for high/critical severity events
    if (!['high', 'critical'].includes(eventData.severity)) {
      return null;
    }

    // Create alert
    const alertId = await this.monitor.createCustomAlert({
      event_id: '', // Will be set after event creation
      alert_type: 'pattern',
      severity: eventData.severity,
      title: `External Alert: ${eventData.title}`,
      message: `Security event received from ${eventData.source}: ${eventData.description}`,
      channels: this.getAlertChannels(eventData.severity) as AlertChannel[],
      acknowledged: false,
      resolved: false,
      metadata: {
        webhook_source: eventData.source,
        auto_generated: true,
        external_event: true,
      },
    });

    return alertId;
  }

  private getAlertChannels(severity: string): AlertChannel[] {
    switch (severity) {
      case 'critical':
        return ['email', 'slack', 'webhook', 'sms'];
      case 'high':
        return ['email', 'slack', 'webhook'];
      case 'medium':
        return ['email', 'slack'];
      case 'low':
      default:
        return ['email'];
    }
  }
}

export default withMiddleware(async (context) => {
  const { req } = context;
  const url = new URL(req.url);
  const { method } = req;
  const pathSegments = url.pathname.split('/').filter(Boolean);

  const processor = new SecurityWebhookProcessor();

  try {
    if (method !== 'POST') {
      return await createErrorResponse('Only POST method allowed', 405, req);
    }

    // Validate webhook signature for security
    const body = await req.text();
    if (!processor.validateWebhookSignature(body, req.headers)) {
      return await createErrorResponse('Invalid webhook signature', 401, req, {}, {
        securityEventType: 'unauthorized_access',
        severity: 'high',
      });
    }

    const jsonBody = JSON.parse(body);

    if (pathSegments[1] === 'bulk') {
      // POST /security-webhooks/bulk - Bulk security events
      const { events, source } = bulkWebhookSchema.parse(jsonBody);

      const results = {
        processed: 0,
        failed: 0,
        eventIds: [] as string[],
        alertIds: [] as string[],
        errors: [] as string[],
      };

      for (const eventData of events) {
        try {
          // Add source from bulk request
          const eventWithSource = { ...eventData, source };

          const eventId = await processor.processWebhookEvent(eventWithSource);
          results.eventIds.push(eventId);
          results.processed++;

          // Try to create automatic alert
          const alertId = await processor.createAutomaticAlert(eventWithSource);
          if (alertId) {
            results.alertIds.push(alertId);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return createSuccessResponse({
        message: `Processed ${results.processed} events, ${results.failed} failed`,
        ...results,
      }, undefined, 200, req);
    }
      // POST /security-webhooks - Single security event
      const eventData = webhookEventSchema.parse(jsonBody);

      const eventId = await processor.processWebhookEvent(eventData);

      // Try to create automatic alert
      const alertId = await processor.createAutomaticAlert(eventData);

      return createSuccessResponse({
        message: 'Security event processed successfully',
        event_id: eventId,
        alert_id: alertId,
        auto_alert_created: Boolean(alertId),
      }, undefined, 201, req);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return await createErrorResponse('Invalid webhook data format', 400, req, {
        validation_errors: (error as z.ZodError).errors,
      }, {
        securityEventType: 'malicious_payload',
        severity: 'medium',
      });
    }

    console.error('Security webhook error:', error);
    return await createErrorResponse('Failed to process webhook', 500, req,
      process.env.NODE_ENV === 'development' ? { error: error instanceof Error ? error.message : String(error) } : undefined,
    );
  }
}, {
  requireAuth: false, // Webhooks use signature validation instead
  rateLimit: true,
  securityMonitoring: true,
});