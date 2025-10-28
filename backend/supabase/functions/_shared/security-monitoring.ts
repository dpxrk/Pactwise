/// <reference path="../../types/global.d.ts" />

import { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase.ts';

export type SecurityEventType =
  | 'auth_failure'
  | 'rate_limit_violation'
  | 'suspicious_activity'
  | 'data_breach_attempt'
  | 'privilege_escalation'
  | 'unauthorized_access'
  | 'malicious_payload'
  | 'brute_force_attack'
  | 'anomalous_behavior'
  | 'system_intrusion'
  | 'compliance_violation'
  | 'sla_breach'
  | 'threat_detected';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'sms';
export type AlertType = 'threshold' | 'pattern' | 'anomaly' | 'manual';

/**
 * Geolocation data for IP addresses
 */
export interface GeoLocation {
  city?: string;
  country?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * User context information for security events
 */
export interface UserContext {
  user_email?: string;
  user_role?: string;
  last_login?: string;
  failed_attempts?: number;
}

/**
 * Pattern analysis results for threat detection
 */
export interface PatternAnalysis {
  suspicious: boolean;
  patterns: string[];
  confidence_score?: number;
  threat_level?: SecuritySeverity;
}

/**
 * Security event metadata structure
 */
export interface SecurityEventMetadata extends Record<string, unknown> {
  geo_location?: GeoLocation;
  user_email?: string;
  user_role?: string;
  last_login?: string;
  failed_attempts?: number;
  pattern_analysis?: PatternAnalysis;
  error?: string;
  url?: string;
  method?: string;
  alert_id?: string;
  channel?: AlertChannel;
}

/**
 * Main security event interface
 */
export interface SecurityEvent {
  id?: string;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  source_ip: string;
  user_agent?: string;
  user_id?: string;
  enterprise_id?: string;
  endpoint?: string;
  request_id?: string;
  metadata: SecurityEventMetadata;
  created_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  false_positive?: boolean;
}

/**
 * Security alert metadata structure
 */
export interface SecurityAlertMetadata extends Record<string, unknown> {
  rule_name?: string;
  event_count?: number;
  time_window?: number;
  threshold?: number;
  enterprise_id?: string;
  latest_event?: string;
  total_events?: number;
  resolution?: string;
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  id: string;
  event_id: string;
  rule_id?: string;
  alert_type: AlertType;
  severity: SecuritySeverity;
  title: string;
  message: string;
  channels: AlertChannel[];
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  metadata: SecurityAlertMetadata;
}

/**
 * Security rule configuration interface
 */
export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  event_types: SecurityEventType[];
  severity_threshold: SecuritySeverity;
  time_window_minutes: number;
  threshold_count: number;
  enabled: boolean;
  alert_channels: AlertChannel[];
  enterprise_id?: string;
  created_by: string;
}

/**
 * Email data structure for security alerts
 */
export interface SecurityEmailData {
  to: string[];
  subject: string;
  html: string;
  metadata: {
    alert_id: string;
    event_id?: string;
    enterprise_id?: string | null;
  };
}

/**
 * Webhook payload structure for security alerts
 */
export interface WebhookPayload {
  alert: SecurityAlert;
  event: SecurityEvent;
  timestamp: string;
  signature?: string;
}

/**
 * Dashboard metrics interface
 */
export interface SecurityDashboardMetrics {
  timeRange: string;
  events: {
    total: number;
    by_severity: Record<SecuritySeverity, number>;
  };
  alerts: {
    total: number;
    acknowledged: number;
    resolved: number;
    pending: number;
  };
  top_ips: Array<{ item: string; count: number }>;
  top_event_types: Array<{ item: string; count: number }>;
}

/**
 * Threat detection pattern matching result
 */
export interface ThreatDetectionResult {
  suspicious: boolean;
  patterns: string[];
}

/**
 * Advanced Security Monitoring and Alerting System
 */
export class SecurityMonitor {
  private supabase: SupabaseClient;
  private alertBuffer: SecurityEvent[] = [];
  private rules: Map<string, SecurityRule> = new Map();
  private patterns: Map<string, RegExp> = new Map();

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createAdminClient();
    this.initializePatterns();
    this.loadSecurityRules();
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<string> {
    // Enrich event with additional context
    const enrichedEvent = await this.enrichEvent(event);

    // Store event in database
    const { data, error } = await this.supabase
      .from('security_events')
      .insert(enrichedEvent)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to log security event:', error);
      throw error;
    }

    const eventId = data.id;

    // Add to alert buffer for real-time processing
    this.alertBuffer.push({ ...enrichedEvent, id: eventId });

    // Process alerts asynchronously
    this.processAlerts(enrichedEvent);

    return eventId;
  }

  /**
   * Enrich security event with additional context
   */
  private async enrichEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<SecurityEvent> {
    const enriched: SecurityEvent = {
      ...event,
      created_at: new Date().toISOString(),
    };

    // Add geolocation for IP
    if (event.source_ip && event.source_ip !== 'unknown') {
      try {
        const geoData = await this.getGeoLocation(event.source_ip);
        enriched.metadata = {
          ...enriched.metadata,
          geo_location: geoData,
        };
      } catch {
        // Geo lookup failed, continue without it
      }
    }

    // Add user context if available
    if (event.user_id) {
      try {
        const { data: user } = await this.supabase
          .from('users')
          .select('email, role, last_login_at, failed_login_attempts')
          .eq('id', event.user_id)
          .single();

        if (user) {
          enriched.metadata = {
            ...enriched.metadata,
            user_email: user.email,
            user_role: user.role,
            last_login: user.last_login_at,
            failed_attempts: user.failed_login_attempts,
          };
        }
      } catch {
        // User lookup failed, continue without it
      }
    }

    // Analyze for patterns
    const patternAnalysis = this.analyzePatterns(enriched);
    if (patternAnalysis.suspicious) {
      enriched.metadata = {
        ...enriched.metadata,
        pattern_analysis: patternAnalysis,
      };
    }

    return enriched;
  }

  /**
   * Process alerts based on security rules
   */
  private async processAlerts(event: SecurityEvent): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {continue;}
      if (!rule.event_types.includes(event.event_type)) {continue;}
      if (rule.enterprise_id && rule.enterprise_id !== event.enterprise_id) {continue;}

      // Check if event meets severity threshold
      const severityLevels: Record<SecuritySeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      if (severityLevels[event.severity] < severityLevels[rule.severity_threshold]) {
        continue;
      }

      // Check if threshold is exceeded within time window
      const windowStart = new Date(Date.now() - rule.time_window_minutes * 60 * 1000);

      const { count } = await this.supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .in('event_type', rule.event_types)
        .gte('created_at', windowStart.toISOString())
        .eq('enterprise_id', event.enterprise_id || null);

      if ((count || 0) >= rule.threshold_count) {
        await this.createAlert(event, rule, count || 0);
      }
    }
  }

  /**
   * Create manual security alert (legacy method)
   */
  public async createManualAlert(alertData: {
    event_id: string;
    alert_type: AlertType;
    severity: SecuritySeverity;
    title: string;
    message: string;
    created_by: string;
    enterprise_id: string;
  }): Promise<string> {
    const { data: alert } = await this.supabase
      .from('security_alerts')
      .insert({
        ...alertData,
        acknowledged: false,
        resolved: false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return alert?.id || '';
  }

  public async createAlert(
    event: SecurityEvent,
    rule: SecurityRule,
    eventCount: number,
  ): Promise<void> {
    // Check if similar alert already exists and is unresolved
    const { data: existingAlert } = await this.supabase
      .from('security_alerts')
      .select('id')
      .eq('rule_id', rule.id)
      .eq('resolved', false)
      .gte('created_at', new Date(Date.now() - rule.time_window_minutes * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingAlert) {
      // Update existing alert instead of creating new one
      await this.supabase
        .from('security_alerts')
        .update({
          event_count: eventCount,
          last_triggered: new Date().toISOString(),
          metadata: {
            latest_event: event.id,
            total_events: eventCount,
          },
        })
        .eq('id', existingAlert.id);
      return;
    }

    // Create new alert
    const alert: Omit<SecurityAlert, 'id'> = {
      event_id: event.id!,
      rule_id: rule.id,
      alert_type: 'threshold',
      severity: event.severity,
      title: `Security Alert: ${rule.name}`,
      message: this.generateAlertMessage(event, rule, eventCount),
      channels: rule.alert_channels,
      acknowledged: false,
      resolved: false,
      metadata: {
        rule_name: rule.name,
        event_count: eventCount,
        time_window: rule.time_window_minutes,
        threshold: rule.threshold_count,
        ...(event.enterprise_id ? { enterprise_id: event.enterprise_id } : {}),
      },
    };

    const { data: alertData } = await this.supabase
      .from('security_alerts')
      .insert(alert)
      .select('id')
      .single();

    if (alertData) {
      // Dispatch alert through configured channels
      await this.dispatchAlert({ ...alert, id: alertData.id }, event);
    }
  }

  /**
   * Create a custom alert with full control over the alert data
   */
  public async createCustomAlert(alertData: {
    event_id?: string;
    alert_type: AlertType;
    severity: SecuritySeverity;
    title: string;
    message: string;
    channels: AlertChannel[];
    acknowledged?: boolean;
    resolved?: boolean;
    metadata?: SecurityAlertMetadata;
  }): Promise<string> {
    const { data: alert } = await this.supabase
      .from('security_alerts')
      .insert({
        ...alertData,
        acknowledged: alertData.acknowledged ?? false,
        resolved: alertData.resolved ?? false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return alert?.id || '';
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    event: SecurityEvent,
    rule: SecurityRule,
    eventCount: number,
  ): string {
    const timeWindow = rule.time_window_minutes;
    const threshold = rule.threshold_count;

    let message = `Security rule "${rule.name}" triggered. `;
    message += `Detected ${eventCount} ${event.event_type} events in the last ${timeWindow} minutes, `;
    message += `exceeding threshold of ${threshold}.\n\n`;

    message += 'Latest event details:\n';
    message += `- Type: ${event.event_type}\n`;
    message += `- Severity: ${event.severity}\n`;
    message += `- Source IP: ${event.source_ip}\n`;
    message += `- Endpoint: ${event.endpoint || 'N/A'}\n`;

    if (event.user_id) {
      message += `- User: ${event.metadata?.user_email || event.user_id}\n`;
    }

    if (event.metadata?.geo_location) {
      const geo = event.metadata.geo_location as { city?: string; country?: string };
      message += `- Location: ${geo.city || 'Unknown'}, ${geo.country || 'Unknown'}\n`;
    }

    message += `\nDescription: ${event.description}`;

    return message;
  }

  /**
   * Dispatch alert through configured channels
   */
  private async dispatchAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    const promises = alert.channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert, event);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, event);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, event);
            break;
          case 'sms':
            await this.sendSMSAlert(alert, event);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} alert:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Log the failure but don't stop other channels
        await this.logSecurityEvent({
          event_type: 'system_intrusion',
          severity: 'medium',
          title: 'Alert Dispatch Failed',
          description: `Failed to send ${channel} alert: ${errorMessage}`,
          source_ip: 'system',
          metadata: {
            alert_id: alert.id,
            channel,
            error: errorMessage,
          },
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    // Get admin users for the enterprise
    const { data: admins } = await this.supabase
      .from('users')
      .select('email, first_name')
      .eq('enterprise_id', event.enterprise_id)
      .in('role', ['admin', 'owner'])
      .eq('is_active', true);

    if (!admins?.length) {return;}

    interface AdminUser {
      email: string;
      first_name: string | null;
    }

    const emailData = {
      to: admins.map((admin: AdminUser) => admin.email),
      subject: `🚨 Security Alert: ${alert.title}`,
      html: this.generateEmailHTML(alert, event),
      metadata: {
        alert_id: alert.id,
        ...(event.id && { event_id: event.id }),
        enterprise_id: event.enterprise_id || null,
      },
    };

    // Send via your email service (e.g., Resend, SendGrid, etc.)
    await this.sendEmail(emailData);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {return;}

    const slackMessage = {
      text: `🚨 Security Alert: ${alert.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Security Alert',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Type:* ${event.event_type}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:* ${alert.severity}`,
            },
            {
              type: 'mrkdwn',
              text: `*Source IP:* ${event.source_ip}`,
            },
            {
              type: 'mrkdwn',
              text: `*Endpoint:* ${event.endpoint || 'N/A'}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.message,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Acknowledge',
              },
              action_id: `ack_${alert.id}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              action_id: `view_${alert.id}`,
            },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    const webhookUrl = Deno.env.get('SECURITY_WEBHOOK_URL');
    if (!webhookUrl) {return;}

    const basePayload = {
      alert,
      event,
      timestamp: new Date().toISOString(),
    };

    const payload = {
      ...basePayload,
      signature: await this.generateWebhookSignature(basePayload),
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pactwise-Signature': payload.signature,
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send SMS alert (for critical events)
   */
  private async sendSMSAlert(alert: SecurityAlert, _event: SecurityEvent): Promise<void> {
    if (alert.severity !== 'critical') {return;} // Only send SMS for critical alerts

    // Implementation would depend on your SMS provider (Twilio, etc.)
    console.log('SMS alert would be sent for critical security event:', alert.id);
  }

  /**
   * Analyze patterns in security events
   */
  private analyzePatterns(event: SecurityEvent): ThreatDetectionResult {
    const patterns: string[] = [];
    let suspicious = false;

    // Check for known malicious patterns
    for (const [patternName, regex] of this.patterns.entries()) {
      const testString = `${event.description} ${event.endpoint || ''} ${event.user_agent || ''}`;
      if (regex.test(testString)) {
        patterns.push(patternName);
        suspicious = true;
      }
    }

    // Check for rapid-fire requests from same IP
    if (event.source_ip !== 'unknown') {
      // This would need implementation with time-based analysis
      // For now, just a placeholder
    }

    return { suspicious, patterns };
  }

  /**
   * Initialize malicious pattern detection
   */
  private initializePatterns(): void {
    this.patterns.set('sql_injection', /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b|\bDELETE\b).*(\bFROM\b|\bWHERE\b)/i);
    this.patterns.set('xss_attempt', /<script|javascript:|onload=|onerror=/i);
    this.patterns.set('path_traversal', /\.\.[\/\\]|\.\.[\/\\]\.\./);
    this.patterns.set('command_injection', /(\||\&\&|\;).*(\bcat\b|\bls\b|\bwhoami\b|\bpwd\b)/i);
    this.patterns.set('bot_activity', /bot|crawler|spider|scraper/i);
    this.patterns.set('scanning_tools', /(nmap|nikto|sqlmap|burp|nessus)/i);
  }

  /**
   * Load security rules from database
   */
  private async loadSecurityRules(): Promise<void> {
    const { data: rules } = await this.supabase
      .from('security_rules')
      .select('*')
      .eq('enabled', true);

    if (rules) {
      rules.forEach((rule: SecurityRule) => {
        this.rules.set(rule.id, rule);
      });
    }
  }

  /**
   * Helper methods (implementations would depend on your services)
   */
  private async getGeoLocation(_ip: string): Promise<GeoLocation> {
    // Implement with your geo IP service
    return { city: 'Unknown', country: 'Unknown' };
  }

  private async sendEmail(emailData: SecurityEmailData): Promise<void> {
    // Implement with your email service
    console.log('Email would be sent:', emailData.subject);
  }

  private generateEmailHTML(alert: SecurityAlert, event: SecurityEvent): string {
    return `
      <h2>🚨 Security Alert</h2>
      <p><strong>Alert:</strong> ${alert.title}</p>
      <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
      <p><strong>Event Type:</strong> ${event.event_type}</p>
      <p><strong>Source IP:</strong> ${event.source_ip}</p>
      <p><strong>Time:</strong> ${event.created_at}</p>
      <hr>
      <p>${alert.message.replace(/\n/g, '<br>')}</p>
      <p><a href="${Deno.env.get('FRONTEND_URL')}/security/alerts/${alert.id}">View Alert Details</a></p>
    `;
  }

  private async generateWebhookSignature(payload: Omit<WebhookPayload, 'signature'>): Promise<string> {
    const secret = Deno.env.get('WEBHOOK_SECRET') || 'default-secret';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.supabase
      .from('security_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string, resolution?: string): Promise<void> {
    await this.supabase
      .from('security_alerts')
      .update({
        resolved: true,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        metadata: {
          resolution: resolution || 'Manually resolved',
        },
      })
      .eq('id', alertId);
  }

  /**
   * Get security dashboard metrics
   */
  async getDashboardMetrics(enterpriseId?: string, timeRange: '1h' | '24h' | '7d' = '24h'): Promise<SecurityDashboardMetrics> {
    let cutoff: Date;
    switch (timeRange) {
      case '1h':
        cutoff = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    const [events, alerts, topIPs, topEvents] = await Promise.all([
      this.supabase
        .from('security_events')
        .select('severity, event_type, created_at')
        .gte('created_at', cutoff.toISOString())
        .eq('enterprise_id', enterpriseId || null),

      this.supabase
        .from('security_alerts')
        .select('severity, acknowledged, resolved, created_at')
        .gte('created_at', cutoff.toISOString()),

      this.supabase
        .from('security_events')
        .select('source_ip')
        .gte('created_at', cutoff.toISOString())
        .eq('enterprise_id', enterpriseId || null),

      this.supabase
        .from('security_events')
        .select('event_type')
        .gte('created_at', cutoff.toISOString())
        .eq('enterprise_id', enterpriseId || null),
    ]);

    // Process metrics
    const eventsBySeverity: Record<SecuritySeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    events.data?.forEach((event: { severity: SecuritySeverity; event_type: string; created_at: string }) => {
      eventsBySeverity[event.severity]++;
    });

    interface DashboardAlert {
      severity: SecuritySeverity;
      acknowledged: boolean;
      resolved: boolean;
      created_at: string;
    }

    const alertsStatus = { total: 0, acknowledged: 0, resolved: 0, pending: 0 };
    alerts.data?.forEach((alert: DashboardAlert) => {
      alertsStatus.total++;
      if (alert.resolved) {alertsStatus.resolved++;}
      else if (alert.acknowledged) {alertsStatus.acknowledged++;}
      else {alertsStatus.pending++;}
    });

    return {
      timeRange,
      events: {
        total: events.data?.length || 0,
        by_severity: eventsBySeverity,
      },
      alerts: alertsStatus,
      top_ips: this.getTopItems(topIPs.data || [], 'source_ip'),
      top_event_types: this.getTopItems(topEvents.data || [], 'event_type'),
    };
  }

  private getTopItems(data: Array<Record<string, unknown>>, field: string): Array<{ item: string; count: number }> {
    const counts = new Map<string, number>();
    data.forEach(item => {
      const value = item[field];
      counts.set(String(value), (counts.get(String(value)) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([item, count]) => ({ item, count }));
  }
}

/**
 * Convenience function to log security events
 */
export async function logSecurityEvent(
  event: Omit<SecurityEvent, 'id' | 'created_at'>,
): Promise<string> {
  const monitor = new SecurityMonitor();
  return monitor.logSecurityEvent(event);
}

/**
 * Middleware for automatic security event logging
 */
export function securityEventMiddleware(req: Request, eventType: SecurityEventType, severity: SecuritySeverity = 'medium') {
  return async (error?: Error | null) => {
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;
    const url = new URL(req.url);

    await logSecurityEvent({
      event_type: eventType,
      severity,
      title: `Security Event: ${eventType}`,
      description: error?.message || `${eventType} detected`,
      source_ip: ip,
      user_agent: userAgent,
      endpoint: `${req.method} ${url.pathname}`,
      metadata: {
        ...(error ? { error: error.toString() } : {}),
        url: req.url,
        method: req.method,
      },
    });
  };
}