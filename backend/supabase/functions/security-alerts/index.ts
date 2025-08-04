import { withMiddleware } from '../_shared/middleware.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { createErrorResponse, createSuccessResponse } from '../_shared/responses.ts';
import { SecurityMonitor, type AlertChannel } from '../_shared/security-monitoring.ts';

/**
 * Automated Security Alerting System
 * Runs periodically to check for security patterns and create alerts
 */

interface AlertRule {
  id: string;
  name: string;
  description: string;
  eventType: string;
  threshold: number;
  timeWindowMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'failed_auth_burst',
    name: 'Failed Authentication Burst',
    description: 'Multiple failed authentication attempts from same IP',
    eventType: 'auth_failure',
    threshold: 10,
    timeWindowMinutes: 10,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'rate_limit_abuse',
    name: 'Rate Limit Abuse',
    description: 'Excessive rate limit violations',
    eventType: 'rate_limit_violation',
    threshold: 20,
    timeWindowMinutes: 30,
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'unauthorized_access_pattern',
    name: 'Unauthorized Access Pattern',
    description: 'Pattern of unauthorized access attempts',
    eventType: 'unauthorized_access',
    threshold: 15,
    timeWindowMinutes: 20,
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'system_errors_spike',
    name: 'System Errors Spike',
    description: 'Unusual number of system errors',
    eventType: 'system_intrusion',
    threshold: 5,
    timeWindowMinutes: 15,
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'suspicious_payload_pattern',
    name: 'Suspicious Payload Pattern',
    description: 'Multiple malicious payload attempts',
    eventType: 'malicious_payload',
    threshold: 8,
    timeWindowMinutes: 15,
    severity: 'high',
    enabled: true,
  },
];

class SecurityAlertProcessor {
  private monitor: SecurityMonitor;
  private supabase;

  constructor() {
    this.monitor = new SecurityMonitor();
    this.supabase = createAdminClient();
  }

  async processAlertRules(): Promise<{
    processed: number;
    alertsCreated: number;
    rules: string[];
  }> {
    let processed = 0;
    let alertsCreated = 0;
    const triggeredRules: string[] = [];

    for (const rule of DEFAULT_ALERT_RULES) {
      if (!rule.enabled) {continue;}

      try {
        const triggered = await this.checkAlertRule(rule);
        processed++;

        if (triggered) {
          alertsCreated++;
          triggeredRules.push(rule.name);
        }
      } catch (error) {
        console.error(`Failed to process alert rule ${rule.id}:`, error);
      }
    }

    return {
      processed,
      alertsCreated,
      rules: triggeredRules,
    };
  }

  private async checkAlertRule(rule: AlertRule): Promise<boolean> {
    const cutoff = new Date(Date.now() - rule.timeWindowMinutes * 60 * 1000);

    // Query events matching the rule criteria
    const { data: events, error } = await this.supabase
      .from('security_events')
      .select('source_ip, enterprise_id, created_at')
      .eq('event_type', rule.eventType)
      .gte('created_at', cutoff.toISOString());

    if (error) {
      console.error(`Failed to query events for rule ${rule.id}:`, error);
      return false;
    }

    if (!events || events.length === 0) {
      return false;
    }

    // Group events by source IP and enterprise
    const eventGroups = new Map<string, Array<{source_ip: string; enterprise_id?: string | null; created_at: string}>>();

    for (const event of events) {
      const key = `${event.source_ip}-${event.enterprise_id || 'global'}`;
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      eventGroups.get(key)!.push(event);
    }

    let alertTriggered = false;

    // Check each group against threshold
    for (const [groupKey, groupEvents] of eventGroups) {
      if (groupEvents.length >= rule.threshold) {
        await this.createGroupAlert(rule, groupKey, groupEvents);
        alertTriggered = true;
      }
    }

    return alertTriggered;
  }

  private async createGroupAlert(rule: AlertRule, groupKey: string, events: Array<{id?: string; source_ip: string; enterprise_id?: string | null; created_at: string}>): Promise<void> {
    const [sourceIp, enterpriseId] = groupKey.split('-');
    const actualEnterpriseId = enterpriseId === 'global' ? null : enterpriseId;

    // Check if we already have a recent alert for this pattern
    const recentCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
    const { data: existingAlerts } = await this.supabase
      .from('security_alerts')
      .select('id')
      .eq('alert_type', 'threshold')
      .gte('created_at', recentCutoff.toISOString())
      .contains('metadata', {
        rule_id: rule.id,
        source_ip: sourceIp,
        enterprise_id: actualEnterpriseId,
      });

    if (existingAlerts && existingAlerts.length > 0) {
      console.log(`Skipping duplicate alert for rule ${rule.id}, IP ${sourceIp}`);
      return;
    }

    // Create alert using the most recent event
    const latestEvent = events[events.length - 1];

    try {
      const eventId = latestEvent.id || events[0].id;
      const alertId = await this.monitor.createCustomAlert({
        ...(eventId && { event_id: eventId }),
        alert_type: 'threshold',
        severity: rule.severity,
        title: `${rule.name} - ${sourceIp}`,
        message: `${rule.description}. Detected ${events.length} occurrences in ${rule.timeWindowMinutes} minutes from IP ${sourceIp}.`,
        channels: this.getAlertChannels(rule.severity),
        acknowledged: false,
        resolved: false,
        metadata: {
          rule_id: rule.id,
          rule_name: rule.name,
          source_ip: sourceIp,
          enterprise_id: actualEnterpriseId,
          event_count: events.length,
          time_window_minutes: rule.timeWindowMinutes,
          threshold: rule.threshold,
          events_in_window: events.map(e => e.id).filter((id): id is string => id !== undefined),
          auto_generated: true,
        },
      });

      console.log(`Created security alert ${alertId} for rule ${rule.id}, IP ${sourceIp}`);
    } catch (error) {
      console.error(`Failed to create alert for rule ${rule.id}:`, error);
    }
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
  
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, req);
  }

  try {
    const processor = new SecurityAlertProcessor();
    const result = await processor.processAlertRules();

    return createSuccessResponse({
      timestamp: new Date().toISOString(),
      ...result,
    }, 'Security alerts processed successfully', 200, req);
  } catch (error) {
    console.error('Security alert processing error:', error);
    return createErrorResponse('Failed to process security alerts', 500, req, {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});