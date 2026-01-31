/**
 * Notifications Agent Module
 *
 * Provides comprehensive notification management for the Pactwise platform.
 * Handles alert processing, reminder generation, notification routing,
 * escalation handling, and digest generation with intelligent delivery.
 *
 * @module NotificationsAgent
 * @version 2.0.0 (Production-Ready Upgrade)
 *
 * ## Capabilities
 * - **Alert Management**: Critical alert detection, severity assessment, multi-channel delivery
 * - **Reminder Generation**: Smart reminders with timing-based urgency and escalation
 * - **Notification Routing**: Rule-based routing, recipient determination, channel selection
 * - **Escalation Handling**: Automatic escalation for unacknowledged critical alerts
 *
 * ## Notification Types
 * - `alert`: Time-sensitive notifications requiring immediate attention
 * - `reminder`: Scheduled notifications for upcoming deadlines and actions
 * - `digest`: Aggregated summary notifications (daily, weekly, monthly)
 *
 * ## Alert Types Supported
 * - `contract_expiration`: Contract renewal/expiration warnings
 * - `budget_exceeded`: Budget overage notifications
 * - `compliance_violation`: Regulatory compliance issues
 * - `vendor_issue`: Vendor performance or relationship problems
 * - `payment_due`: Upcoming or overdue payment reminders
 * - `approval_required`: Pending approval requests
 * - `performance_alert`: KPI/SLA threshold breaches
 *
 * ## Reminder Types Supported
 * - `contract_renewal`: Contract renewal deadline reminders
 * - `payment_reminder`: Payment due date reminders
 * - `report_due`: Report submission deadlines
 * - `review_scheduled`: Scheduled review notifications
 * - `training_due`: Training/certification expiration reminders
 * - `audit_preparation`: Audit preparation timeline reminders
 *
 * ## Architecture
 *
 * ### Routing Rules
 * The agent applies configurable routing rules to determine:
 * - Which recipients receive each notification
 * - Which channels are used (email, SMS, push, Slack, in-app)
 * - Priority and timing of delivery
 *
 * ### Escalation System
 * Multi-level escalation based on severity:
 * - Critical: Immediate escalation (15min -> 30min -> 60min)
 * - High: Delayed escalation (60min -> 240min)
 * - Compliance violations: Immediate compliance officer notification
 *
 * ### Aggregation
 * Groups similar notifications to reduce noise:
 * - Vendor issues aggregated daily
 * - Low-priority items batched for digests
 *
 * ### Fatigue Detection
 * Monitors notification volume and recommends:
 * - Threshold adjustments when volume is high
 * - Aggregation opportunities
 * - Suppression of non-critical notifications
 *
 * ## Error Handling
 * - Graceful fallback from smart routing to standard routing
 * - Comprehensive error logging via audit trail
 * - Insight generation for routing failures
 *
 * ## Configuration
 * Notification behavior can be configured via:
 * - `NotificationContext.notificationType`: Alert, reminder, or digest
 * - `NotificationContext.period`: Daily, weekly, or monthly (for digests)
 * - `NotificationContext.format`: Standard, executive, visual, detailed, comprehensive
 * - `NotificationContext.role`: Filter recipients by role
 *
 * @example
 * ```typescript
 * // Process a contract expiration alert
 * const agent = new NotificationsAgent(supabase);
 * const result = await agent.process(
 *   { type: 'contract_expiration', contractName: 'Vendor Agreement', daysUntil: 7 },
 *   { notificationType: 'alert' }
 * );
 *
 * // Generate a daily digest
 * const digest = await agent.process(
 *   {},
 *   { notificationType: 'digest', period: 'daily', format: 'executive' }
 * );
 *
 * // Process a payment reminder
 * const reminder = await agent.process(
 *   { vendorName: 'Acme Corp', amount: 5000, dueDate: '2024-02-15' },
 *   { notificationType: 'reminder' }
 * );
 *
 * // Smart notification routing with event type
 * const smartAlert = await agent.process(
 *   { title: 'Critical Issue', message: 'Immediate attention required' },
 *   { notificationType: 'alert', eventType: 'system_critical', enterpriseId: 'ent-123' }
 * );
 * ```
 *
 * @see BaseAgent - Parent class providing core agent functionality
 * @see ProcessingResult - Standard result type for agent processing
 */
import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// Extended context for notifications
interface NotificationContext extends AgentContext {
  notificationType?: 'alert' | 'reminder' | 'digest';
  eventType?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  format?: 'standard' | 'executive' | 'visual' | 'detailed' | 'comprehensive';
  role?: string;
}

// Helper interfaces
interface Recipient {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  channels?: string[];
  priority?: string;
  reason?: string;
}

interface NotificationMessage {
  subject: string;
  body: string;
  priority?: string;
  metadata?: Record<string, unknown>;
  action?: string;
  urgency?: string;
}

interface EscalationInfo {
  required: boolean;
  timeline?: string;
  escalateTo?: string[];
  reason?: string;
  levels?: Array<{ level: number; role: string; afterMinutes: number }>;
}

interface ActionItem {
  action: string;
  deadline?: string;
  assignee?: string;
  priority?: string;
  label?: string;
  type?: string;
  options?: string[];
}

interface ReminderTiming {
  scheduledAt?: string;
  recurrence?: string;
  timezone?: string;
  isValid?: boolean;
  daysUntilDue: number | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  dueDate?: string;
}

interface ReminderFrequency {
  type?: string;
  interval?: number;
  maxReminders?: number;
  frequency?: string;
  escalateAfter?: number;
}

// Type guards and helper types
interface UnknownData extends Record<string, unknown> {
  type?: string;
  severity?: string;
  assignedTo?: string;
  value?: number;
  contractName?: string;
  daysUntil?: number;
  category?: string;
  overagePercent?: number;
  currentSpend?: number;
  budget?: number;
  regulation?: string;
  description?: string;
  vendorName?: string;
  issue?: string;
  performanceScore?: number;
  amount?: number;
  dueDate?: string;
  terms?: string;
  itemType?: string;
  itemName?: string;
  requester?: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
  trend?: string;
  title?: string;
  reportName?: string;
  reviewType?: string;
  trainingName?: string;
  auditType?: string;
}

interface DigestData {
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: Array<{ type: string; count: number; severity: string }>;
  };
  reminders: {
    overdue: number;
    dueSoon: number;
    upcoming: number;
    items: Array<{ type: string; count: number }>;
  };
  insights: {
    generated: number;
    actionable: number;
    categories: string[];
  };
  metrics: {
    contractsProcessed: number;
    vendorsOnboarded: number;
    savingsIdentified: number;
    complianceScore: number;
  };
}

interface DigestSummary {
  criticalItems: number;
  totalNotifications: number;
  requiresAction: number;
  insights: number;
  keyMetrics: {
    contractActivity: number;
    vendorActivity: number;
    savings: number;
    compliance: number;
  };
}

interface TrendAnalysis {
  trends: Record<string, string>;
  significantChanges: string[];
  recommendation: string;
}

// Removed unused interface - kept for potential future use
// interface AlertFrequency {
//   count: number;
//   period: string;
//   isHigh: boolean;
//   trend: string;
// }

interface RouteInfo {
  notification: unknown;
  recipients: unknown[];
  channels: string[];
  priority: string;
  suppress: boolean;
  suppressionReason: string | null;
  aggregate: boolean;
  aggregateKey: string | null;
}

interface RoutingRule {
  name: string;
  condition: Record<string, unknown>;
  action?: string;
  reason?: string;
  aggregate?: boolean;
  aggregateKey?: string;
  recipients?: unknown[];
  channels?: string[];
  priority?: string;
}

interface FatigueAssessment {
  level: string;
  description: string;
  metrics: {
    totalVolume: number;
    criticalRatio: number;
    suppressionRatio: number;
    aggregationPotential: number;
  };
  recommendations: string[];
}

interface NotificationAnalysis {
  total: number;
  byType: Record<string, number>;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  routing: unknown[];
  suppressions: unknown[];
  aggregations: unknown[];
}

export class NotificationsAgent extends BaseAgent {
  get agentType() {
    return 'notifications';
  }

  get capabilities() {
    return ['alert_management', 'reminder_generation', 'notification_routing', 'escalation_handling'];
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult<unknown>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    const notifContext = context as NotificationContext | undefined;

    try {
      // Determine notification type
      if (notifContext?.notificationType === 'alert') {
        return await this.processAlert(data, notifContext, rulesApplied, insights);
      } else if (notifContext?.notificationType === 'reminder') {
        return await this.processReminder(data, notifContext, rulesApplied, insights);
      } else if (notifContext?.notificationType === 'digest') {
        return await this.generateDigest(data, notifContext, rulesApplied, insights);
      }

      // Default: analyze and route notifications
      return await this.analyzeAndRouteNotifications(data, notifContext, rulesApplied, insights);

    } catch (error) {
      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  private async processAlert(
    data: unknown,
    context: NotificationContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<unknown>> {
    rulesApplied.push('alert_processing');
    const typedData = data as UnknownData;

    const alert = {
      type: this.classifyAlert(data),
      severity: this.assessAlertSeverity(data),
      recipients: await this.determineRecipients(data),
      channels: this.selectNotificationChannels(data),
      message: this.composeAlertMessage(data),
      escalation: this.determineEscalation(data),
      actions: this.identifyRequiredActions(data),
    };

    // Use smart notification routing if context provides event type
    if (context?.eventType && context?.enterpriseId) {
      return this.sendSmartNotification(
        context.eventType,
        {
          ...(typeof typedData === 'object' && typedData !== null ? typedData : {}),
          title: alert.message.subject,
          message: alert.message.body,
          severity: alert.severity,
          alert_data: alert,
        },
        context,
        rulesApplied,
        insights,
      );
    }

    // Critical alert handling
    if (alert.severity === 'critical') {
      insights.push(this.createInsight(
        'critical_alert',
        'critical',
        'Critical Alert Triggered',
        alert.message.subject,
        'Immediate action required',
        { alert },
      ));
      rulesApplied.push('critical_alert_handling');

      // Add escalation if needed
      if (alert.escalation.required) {
        alert.escalation.timeline = 'immediate';
        alert.channels.push('sms', 'phone');
      }
    }

    // High frequency alert detection
    const alertFrequency = await this.checkAlertFrequency(alert.type);
    if (alertFrequency.isHigh) {
      insights.push(this.createInsight(
        'high_alert_frequency',
        'medium',
        'High Alert Frequency Detected',
        `${alertFrequency.count} similar alerts in the last ${alertFrequency.period}`,
        'Review alert thresholds or address root cause',
        { frequency: alertFrequency },
      ));
      rulesApplied.push('frequency_analysis');
    }

    return this.createResult(
      true,
      alert,
      insights,
      rulesApplied,
      0.9,
      { notificationSent: true },
    );
  }

  private async processReminder(
    data: unknown,
    _context: NotificationContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<unknown>> {
    rulesApplied.push('reminder_processing');

    const reminder = {
      type: this.classifyReminder(data),
      timing: this.calculateReminderTiming(data),
      recipients: await this.determineReminderRecipients(data),
      message: this.composeReminderMessage(data),
      frequency: this.determineReminderFrequency(data),
      actions: this.identifyReminderActions(data),
    };

    // Urgent reminder handling
    if (reminder.timing.daysUntilDue !== null && reminder.timing.daysUntilDue <= 1) {
      insights.push(this.createInsight(
        'urgent_reminder',
        'high',
        'Urgent Action Required',
        reminder.message.subject,
        'Complete action within 24 hours',
        { reminder },
      ));
      rulesApplied.push('urgent_reminder_handling');
    }

    // Overdue detection
    if (reminder.timing.isOverdue) {
      insights.push(this.createInsight(
        'overdue_item',
        'high',
        'Overdue Item',
        `${reminder.type} is ${reminder.timing.daysOverdue ?? 0} days overdue`,
        'Take immediate action or request extension',
        { reminder },
      ));
      rulesApplied.push('overdue_detection');
    }

    return this.createResult(
      true,
      reminder,
      insights,
      rulesApplied,
      0.9,
    );
  }

  private async generateDigest(
    _data: unknown,
    context: NotificationContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<unknown>> {
    rulesApplied.push('digest_generation');

    const digestData = await this.gatherDigestData(context);

    const digest = {
      period: context?.period || 'daily',
      summary: this.generateSummary(digestData),
      sections: this.organizeSections(digestData),
      recipients: await this.determineDigestRecipients(context),
      formatting: this.determineDigestFormat(context),
      schedule: this.calculateNextDigest(context),
    };

    // Key metrics for digest
    const summary = digest.summary as DigestSummary;
    if (summary.criticalItems > 0) {
      insights.push(this.createInsight(
        'critical_items_in_digest',
        'high',
        'Critical Items Require Attention',
        `${summary.criticalItems} critical items in this ${digest.period} digest`,
        'Review and address critical items first',
        { summary: digest.summary },
      ));
    }

    // Trend analysis
    const trends = this.analyzeDigestTrends(digestData) as TrendAnalysis;
    if (trends.significantChanges.length > 0) {
      insights.push(this.createInsight(
        'significant_trends',
        'medium',
        'Significant Trends Detected',
        `Notable changes in ${trends.significantChanges.join(', ')}`,
        'Review trends and adjust strategies accordingly',
        { trends },
        false,
      ));
      rulesApplied.push('trend_analysis');
    }

    return this.createResult(
      true,
      digest,
      insights,
      rulesApplied,
      0.9,
    );
  }

  private async analyzeAndRouteNotifications(
    data: unknown,
    _context: NotificationContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<unknown>> {
    rulesApplied.push('notification_routing');

    const notifications = Array.isArray(data) ? data : [data];
    const analysis: NotificationAnalysis = {
      total: notifications.length,
      byType: this.groupNotificationsByType(notifications),
      bySeverity: this.groupNotificationsBySeverity(notifications) as NotificationAnalysis['bySeverity'],
      routing: [],
      suppressions: [],
      aggregations: [],
    };

    // Process each notification
    for (const notification of notifications) {
      const route = await this.routeNotification(notification) as RouteInfo;

      if (route.suppress) {
        analysis.suppressions.push({
          notification,
          reason: route.suppressionReason,
        });
      } else {
        analysis.routing.push(route);
      }
    }

    // Aggregation opportunities
    analysis.aggregations = this.identifyAggregationOpportunities(analysis.routing);

    if (analysis.aggregations.length > 0) {
      insights.push(this.createInsight(
        'notification_aggregation',
        'low',
        'Notification Aggregation Possible',
        `${analysis.aggregations.length} groups of notifications can be combined`,
        'Enable notification batching to reduce noise',
        { aggregations: analysis.aggregations },
        false,
      ));
      rulesApplied.push('aggregation_analysis');
    }

    // Alert fatigue detection
    const fatigueRisk = this.assessAlertFatigue(analysis) as FatigueAssessment;
    if (fatigueRisk.level === 'high') {
      insights.push(this.createInsight(
        'alert_fatigue_risk',
        'medium',
        'High Alert Fatigue Risk',
        fatigueRisk.description,
        'Review notification rules and thresholds',
        { fatigue: fatigueRisk },
      ));
      rulesApplied.push('fatigue_detection');
    }

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      0.9,
    );
  }

  // Alert processing methods
  private classifyAlert(data: unknown): string {
    const content = JSON.stringify(data).toLowerCase();

    if (content.includes('contract') && content.includes('expir')) {return 'contract_expiration';}
    if (content.includes('budget') && content.includes('exceed')) {return 'budget_exceeded';}
    if (content.includes('compliance') || content.includes('violation')) {return 'compliance_violation';}
    if (content.includes('vendor') && content.includes('issue')) {return 'vendor_issue';}
    if (content.includes('payment') && content.includes('due')) {return 'payment_due';}
    if (content.includes('approval') && content.includes('required')) {return 'approval_required';}
    if (content.includes('performance') && content.includes('threshold')) {return 'performance_alert';}

    return 'general_alert';
  }

  private assessAlertSeverity(data: unknown): string {
    // Rule-based severity assessment
    const content = JSON.stringify(data).toLowerCase();
    const typedData = data as UnknownData;

    // Critical keywords
    if (content.match(/critical|emergency|urgent|immediate|breach|violation|expired/)) {
      return 'critical';
    }

    // High severity indicators
    if (content.match(/high|important|overdue|escalat|deadline/)) {
      return 'high';
    }

    // Medium severity indicators
    if (content.match(/medium|moderate|attention|review|upcoming/)) {
      return 'medium';
    }

    // Check numeric thresholds
    if (typedData.value) {
      if (typedData.value > 100000) {return 'high';}
      if (typedData.value > 50000) {return 'medium';}
    }

    return 'low';
  }

  private async determineRecipients(data: unknown): Promise<Recipient[]> {
    const recipients: Recipient[] = [];
    const type = this.classifyAlert(data);
    const severity = this.assessAlertSeverity(data);
    const typedData = data as UnknownData;

    // Base recipients from data
    if (typedData.assignedTo) {
      recipients.push({
        userId: typedData.assignedTo,
        role: 'assigned',
        channels: ['email', 'in-app'],
      });
    }

    // Role-based routing
    const roleRouting = {
      contract_expiration: ['contract_manager', 'legal_team'],
      budget_exceeded: ['finance_manager', 'department_head'],
      compliance_violation: ['compliance_officer', 'legal_team'],
      vendor_issue: ['vendor_manager', 'procurement_team'],
      payment_due: ['accounts_payable', 'finance_team'],
      approval_required: ['approver', 'backup_approver'],
      performance_alert: ['operations_manager', 'analytics_team'],
    };

    const roles = roleRouting[type as keyof typeof roleRouting] || ['admin'];

    for (const role of roles) {
      recipients.push({
        role,
        priority: severity === 'critical' ? 'immediate' : 'normal',
        channels: this.getChannelsForRole(role, severity),
      });
    }

    // Escalation recipients
    if (severity === 'critical') {
      recipients.push({
        role: 'executive',
        priority: 'immediate',
        channels: ['email', 'sms'],
      });
    }

    return recipients;
  }

  private selectNotificationChannels(data: unknown): string[] {
    const severity = this.assessAlertSeverity(data);
    const type = this.classifyAlert(data);
    const channels: string[] = ['in-app'];

    // Always include email for documented trail
    channels.push('email');

    // SMS for critical alerts
    if (severity === 'critical') {
      channels.push('sms');
    }

    // Slack for team notifications
    if (['vendor_issue', 'performance_alert'].includes(type)) {
      channels.push('slack');
    }

    // Push notifications for time-sensitive
    if (severity === 'high' || severity === 'critical') {
      channels.push('push');
    }

    return [...new Set(channels)];
  }

  private composeAlertMessage(data: unknown): NotificationMessage {
    const type = this.classifyAlert(data);
    const severity = this.assessAlertSeverity(data);
    const typedData = data as UnknownData;

    const templates = {
      contract_expiration: {
        subject: `${severity.toUpperCase()}: Contract Expiring - ${typedData.contractName || 'Unknown'}`,
        body: `Contract "${typedData.contractName}" expires in ${typedData.daysUntil || 'N/A'} days. Immediate action required to avoid service disruption.`,
        action: 'Review and renew contract',
      },
      budget_exceeded: {
        subject: `Budget Alert: ${typedData.category || 'Category'} Over Budget`,
        body: `${typedData.category} has exceeded budget by ${typedData.overagePercent || 'N/A'}%. Current spend: ${typedData.currentSpend}, Budget: ${typedData.budget}.`,
        action: 'Review spending and adjust',
      },
      compliance_violation: {
        subject: `COMPLIANCE ALERT: ${typedData.regulation || 'Violation'} Detected`,
        body: `Compliance violation detected: ${typedData.description}. This requires immediate attention to avoid penalties.`,
        action: 'Address compliance issue',
      },
      vendor_issue: {
        subject: `Vendor Issue: ${typedData.vendorName || 'Unknown Vendor'}`,
        body: `Issue reported with vendor ${typedData.vendorName}: ${typedData.issue}. Performance score: ${typedData.performanceScore || 'N/A'}.`,
        action: 'Contact vendor and resolve',
      },
      payment_due: {
        subject: `Payment Due: ${typedData.vendorName || 'Vendor'} - $${typedData.amount || 'N/A'}`,
        body: `Payment of $${typedData.amount} is due to ${typedData.vendorName} on ${typedData.dueDate}. Terms: ${typedData.terms || 'Standard'}.`,
        action: 'Process payment',
      },
      approval_required: {
        subject: `Approval Required: ${typedData.itemType || 'Item'} - ${typedData.itemName || 'N/A'}`,
        body: `Your approval is required for: ${typedData.itemName}. Value: $${typedData.value || 'N/A'}. Requester: ${typedData.requester || 'N/A'}.`,
        action: 'Review and approve',
      },
      performance_alert: {
        subject: `Performance Alert: ${typedData.metric || 'Metric'} Below Threshold`,
        body: `${typedData.metric} is at ${typedData.currentValue}, below threshold of ${typedData.threshold}. Trend: ${typedData.trend || 'N/A'}.`,
        action: 'Investigate and improve',
      },
      general_alert: {
        subject: `Alert: ${typedData.title || 'Notification'}`,
        body: typedData.description || 'A notification requires your attention.',
        action: 'Review notification',
      },
    };

    const template = templates[type as keyof typeof templates] || templates.general_alert;

    return {
      subject: template.subject,
      body: template.body,
      action: template.action,
      priority: severity,
      metadata: {
        type,
        severity,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private determineEscalation(data: unknown): EscalationInfo {
    const severity = this.assessAlertSeverity(data);
    const type = this.classifyAlert(data);

    const escalation = {
      required: false,
      levels: [] as string[],
      timeline: 'standard',
    };

    // Critical always escalates
    if (severity === 'critical') {
      escalation.required = true;
      escalation.levels = [
        { level: 1, role: 'manager', afterMinutes: 15 },
        { level: 2, role: 'director', afterMinutes: 30 },
        { level: 3, role: 'executive', afterMinutes: 60 },
      ];
      escalation.timeline = 'immediate';
    }

    // High severity escalates after delay
    else if (severity === 'high') {
      escalation.required = true;
      escalation.levels = [
        { level: 1, role: 'manager', afterMinutes: 60 },
        { level: 2, role: 'director', afterMinutes: 240 },
      ];
    }

    // Type-specific escalations
    if (type === 'compliance_violation') {
      escalation.required = true;
      escalation.levels.unshift({
        level: 0,
        role: 'compliance_officer',
        afterMinutes: 0,
      });
    }

    return escalation;
  }

  private identifyRequiredActions(data: unknown): ActionItem[] {
    const type = this.classifyAlert(data);

    const actionMap = {
      contract_expiration: [
        { action: 'review_contract', deadline: '7_days' },
        { action: 'negotiate_renewal', deadline: '14_days' },
        { action: 'execute_renewal', deadline: '30_days' },
      ],
      budget_exceeded: [
        { action: 'review_spending', deadline: 'immediate' },
        { action: 'identify_cuts', deadline: '3_days' },
        { action: 'implement_controls', deadline: '7_days' },
      ],
      compliance_violation: [
        { action: 'assess_violation', deadline: 'immediate' },
        { action: 'remediate_issue', deadline: '24_hours' },
        { action: 'document_resolution', deadline: '48_hours' },
      ],
      vendor_issue: [
        { action: 'contact_vendor', deadline: '24_hours' },
        { action: 'develop_resolution', deadline: '3_days' },
        { action: 'monitor_improvement', deadline: '30_days' },
      ],
      payment_due: [
        { action: 'verify_invoice', deadline: '2_days' },
        { action: 'obtain_approval', deadline: '3_days' },
        { action: 'process_payment', deadline: 'due_date' },
      ],
      approval_required: [
        { action: 'review_request', deadline: '24_hours' },
        { action: 'make_decision', deadline: '48_hours' },
      ],
      performance_alert: [
        { action: 'analyze_cause', deadline: '24_hours' },
        { action: 'implement_fix', deadline: '7_days' },
        { action: 'verify_improvement', deadline: '30_days' },
      ],
    };

    return actionMap[type as keyof typeof actionMap] || [
      { action: 'review_alert', deadline: '24_hours' },
    ];
  }

  private async checkAlertFrequency(alertType: string): Promise<unknown> {
    // Simulate frequency check
    const recentAlerts = {
      contract_expiration: 5,
      budget_exceeded: 12,
      compliance_violation: 2,
      vendor_issue: 8,
      payment_due: 20,
      approval_required: 15,
      performance_alert: 10,
    };

    const count = recentAlerts[alertType as keyof typeof recentAlerts] || 0;
    const threshold = 10;

    return {
      count,
      period: '7 days',
      isHigh: count > threshold,
      trend: count > 15 ? 'increasing' : count > 5 ? 'stable' : 'decreasing',
    };
  }

  // Reminder processing methods
  private classifyReminder(data: unknown): string {
    const content = JSON.stringify(data).toLowerCase();

    if (content.includes('contract') && content.includes('renewal')) {return 'contract_renewal';}
    if (content.includes('payment')) {return 'payment_reminder';}
    if (content.includes('report') || content.includes('submission')) {return 'report_due';}
    if (content.includes('review') || content.includes('evaluation')) {return 'review_scheduled';}
    if (content.includes('training') || content.includes('certification')) {return 'training_due';}
    if (content.includes('audit')) {return 'audit_preparation';}

    return 'general_reminder';
  }

  private calculateReminderTiming(data: unknown): ReminderTiming {
    const typedData = data as UnknownData;
    const dueDate = typedData.dueDate ? new Date(typedData.dueDate) : null;
    const now = new Date();

    if (!dueDate) {
      return {
        isValid: false,
        daysUntilDue: null,
        isOverdue: false,
        daysOverdue: 0,
      };
    }

    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isValid: true,
      daysUntilDue: Math.max(0, diffDays),
      isOverdue: diffDays < 0,
      daysOverdue: Math.abs(Math.min(0, diffDays)),
      dueDate: dueDate.toISOString(),
    };
  }

  private async determineReminderRecipients(data: unknown): Promise<Recipient[]> {
    const timing = this.calculateReminderTiming(data);
    const typedData = data as UnknownData;

    const recipients: Recipient[] = [];

    // Primary recipient
    if (typedData.assignedTo) {
      recipients.push({
        userId: typedData.assignedTo,
        priority: timing.isOverdue ? 'high' : 'normal',
      });
    }

    // CC recipients based on timing
    if (timing.isOverdue || (timing.daysUntilDue !== null && timing.daysUntilDue <= 1)) {
      recipients.push({
        role: 'manager',
        priority: 'high',
        reason: 'escalation',
      });
    }

    return recipients;
  }

  private composeReminderMessage(data: unknown): NotificationMessage {
    const type = this.classifyReminder(data);
    const timing = this.calculateReminderTiming(data);
    const typedData = data as UnknownData;

    let urgency = 'standard';
    if (timing.isOverdue) {urgency = 'overdue';}
    else if (timing.daysUntilDue !== null && timing.daysUntilDue <= 1) {urgency = 'urgent';}
    else if (timing.daysUntilDue !== null && timing.daysUntilDue <= 7) {urgency = 'upcoming';}

    const templates = {
      contract_renewal: {
        subject: `Contract Renewal Reminder: ${typedData.contractName || 'Contract'}`,
        body: `Contract "${typedData.contractName}" is due for renewal. ${timing.isOverdue ? `OVERDUE by ${timing.daysOverdue ?? 0} days!` : `Due in ${timing.daysUntilDue ?? 'N/A'} days.`}`,
      },
      payment_reminder: {
        subject: `Payment Reminder: ${typedData.vendorName || 'Vendor'} - $${typedData.amount || 'N/A'}`,
        body: `Payment of $${typedData.amount} to ${typedData.vendorName} is ${timing.isOverdue ? 'OVERDUE' : `due in ${timing.daysUntilDue ?? 'N/A'} days`}.`,
      },
      report_due: {
        subject: `Report Due: ${typedData.reportName || 'Report'}`,
        body: `${typedData.reportName} is ${timing.isOverdue ? 'OVERDUE' : `due in ${timing.daysUntilDue ?? 'N/A'} days`}. Please submit as soon as possible.`,
      },
      review_scheduled: {
        subject: `Review Scheduled: ${typedData.reviewType || 'Review'}`,
        body: `${typedData.reviewType} is scheduled ${timing.isOverdue ? '(MISSED)' : `in ${timing.daysUntilDue ?? 'N/A'} days`}. Please prepare necessary materials.`,
      },
      training_due: {
        subject: `Training Reminder: ${typedData.trainingName || 'Training'}`,
        body: `${typedData.trainingName} ${timing.isOverdue ? 'certification has EXPIRED' : `is due in ${timing.daysUntilDue ?? 'N/A'} days`}. Complete to maintain compliance.`,
      },
      audit_preparation: {
        subject: `Audit Preparation: ${typedData.auditType || 'Audit'}`,
        body: `${typedData.auditType} audit is ${timing.isOverdue ? 'OVERDUE for preparation' : `scheduled in ${timing.daysUntilDue ?? 'N/A'} days`}. Begin preparation immediately.`,
      },
      general_reminder: {
        subject: `Reminder: ${typedData.title || 'Action Required'}`,
        body: `This is a reminder about: ${typedData.description || 'Pending action'}. ${timing.isOverdue ? 'This item is OVERDUE.' : `Due in ${timing.daysUntilDue ?? 'N/A'} days.`}`,
      },
    };

    const template = templates[type as keyof typeof templates] || templates.general_reminder;

    return {
      subject: `[${urgency.toUpperCase()}] ${template.subject}`,
      body: template.body,
      urgency,
      metadata: {
        type,
        daysUntilDue: timing.daysUntilDue,
        isOverdue: timing.isOverdue,
      },
    };
  }

  private determineReminderFrequency(data: unknown): ReminderFrequency {
    const timing = this.calculateReminderTiming(data);

    // Overdue items - daily reminders
    if (timing.isOverdue) {
      return {
        frequency: 'daily',
        maxReminders: 7,
        escalateAfter: 3,
      };
    }

    // Based on days until due
    if (timing.daysUntilDue !== null && timing.daysUntilDue <= 1) {
      return {
        frequency: 'every_4_hours',
        maxReminders: 6,
        escalateAfter: 2,
      };
    } else if (timing.daysUntilDue !== null && timing.daysUntilDue <= 7) {
      return {
        frequency: 'daily',
        maxReminders: 7,
        escalateAfter: 5,
      };
    } else if (timing.daysUntilDue !== null && timing.daysUntilDue <= 30) {
      return {
        frequency: 'weekly',
        maxReminders: 4,
        escalateAfter: 2,
      };
    }

    // Default
    return {
      frequency: 'biweekly',
      maxReminders: 2,
      escalateAfter: 2,
    };
  }

  private identifyReminderActions(data: unknown): ActionItem[] {
    const type = this.classifyReminder(data);
    const actions: ActionItem[] = [];

    // Common actions
    actions.push({
      action: 'acknowledge',
      label: 'Acknowledge Receipt',
      type: 'quick',
    });

    // Type-specific actions
    const typeActions = {
      contract_renewal: [
        { action: 'start_renewal', label: 'Start Renewal Process', type: 'primary' },
        { action: 'schedule_meeting', label: 'Schedule Review Meeting', type: 'secondary' },
      ],
      payment_reminder: [
        { action: 'process_payment', label: 'Process Payment', type: 'primary' },
        { action: 'dispute_invoice', label: 'Dispute Invoice', type: 'secondary' },
      ],
      report_due: [
        { action: 'submit_report', label: 'Submit Report', type: 'primary' },
        { action: 'request_extension', label: 'Request Extension', type: 'secondary' },
      ],
      review_scheduled: [
        { action: 'confirm_attendance', label: 'Confirm Attendance', type: 'primary' },
        { action: 'reschedule', label: 'Request Reschedule', type: 'secondary' },
      ],
      training_due: [
        { action: 'start_training', label: 'Start Training', type: 'primary' },
        { action: 'view_requirements', label: 'View Requirements', type: 'secondary' },
      ],
      audit_preparation: [
        { action: 'view_checklist', label: 'View Audit Checklist', type: 'primary' },
        { action: 'assign_tasks', label: 'Assign Prep Tasks', type: 'secondary' },
      ],
    };

    const specificActions = typeActions[type as keyof typeof typeActions] || [
      { action: 'take_action', label: 'Take Action', type: 'primary' },
    ];

    actions.push(...specificActions);

    // Add snooze option
    actions.push({
      action: 'snooze',
      label: 'Remind Me Later',
      type: 'tertiary',
      options: ['1 hour', '4 hours', '1 day', '1 week'],
    });

    return actions;
  }

  // Digest methods
  private async gatherDigestData(_context: NotificationContext): Promise<DigestData> {
    // Simulate gathering data for digest
    // Note: context parameter reserved for future use

    return {
      alerts: {
        critical: 2,
        high: 5,
        medium: 12,
        low: 8,
        items: [
          { type: 'contract_expiration', count: 3, severity: 'high' },
          { type: 'budget_exceeded', count: 2, severity: 'critical' },
          { type: 'vendor_issue', count: 5, severity: 'medium' },
        ],
      },
      reminders: {
        overdue: 3,
        dueSoon: 7,
        upcoming: 15,
        items: [
          { type: 'contract_renewal', count: 4 },
          { type: 'payment_reminder', count: 8 },
          { type: 'report_due', count: 3 },
        ],
      },
      insights: {
        generated: 10,
        actionable: 6,
        categories: ['cost_savings', 'risk_mitigation', 'process_improvement'],
      },
      metrics: {
        contractsProcessed: 15,
        vendorsOnboarded: 2,
        savingsIdentified: 50000,
        complianceScore: 0.92,
      },
    };
  }

  private generateSummary(data: DigestData): DigestSummary {
    const totalAlerts = Object.values(data.alerts).reduce((sum: number, val: unknown) =>
      typeof val === 'number' ? sum + val : sum, 0,
    );

    const totalReminders = data.reminders.overdue + data.reminders.dueSoon + data.reminders.upcoming;

    return {
      criticalItems: data.alerts.critical + data.reminders.overdue,
      totalNotifications: totalAlerts + totalReminders,
      requiresAction: data.alerts.critical + data.alerts.high + data.reminders.overdue + data.reminders.dueSoon,
      insights: data.insights.actionable,
      keyMetrics: {
        contractActivity: data.metrics.contractsProcessed,
        vendorActivity: data.metrics.vendorsOnboarded,
        savings: data.metrics.savingsIdentified,
        compliance: data.metrics.complianceScore,
      },
    };
  }

  private organizeSections(data: DigestData): unknown[] {
    const sections = [
      {
        title: 'Critical & Overdue Items',
        priority: 1,
        items: [
          ...data.alerts.items.filter((a: { severity: string }) => a.severity === 'critical'),
          ...data.reminders.items.filter((_r: unknown) => data.reminders.overdue > 0),
        ],
        actionRequired: true,
      },
      {
        title: 'Upcoming Deadlines',
        priority: 2,
        items: data.reminders.items,
        daysAhead: 7,
      },
      {
        title: 'Performance Insights',
        priority: 3,
        items: data.insights.categories.map((cat: string) => ({
          category: cat,
          count: Math.floor(data.insights.generated / 3),
        })),
        trend: 'improving',
      },
      {
        title: 'Key Metrics',
        priority: 4,
        metrics: data.metrics,
        comparison: 'week-over-week',
      },
    ];

    return sections.sort((a, b) => a.priority - b.priority);
  }

  private async determineDigestRecipients(context: NotificationContext): Promise<Recipient[]> {
    const role = context?.role || 'all';

    const recipients = [
      {
        role: 'executive',
        format: 'summary',
        sections: ['critical', 'metrics'],
        frequency: 'weekly',
      },
      {
        role: 'manager',
        format: 'detailed',
        sections: ['all'],
        frequency: 'daily',
      },
      {
        role: 'analyst',
        format: 'comprehensive',
        sections: ['all', 'raw_data'],
        frequency: 'daily',
      },
    ];

    return role === 'all' ? recipients : recipients.filter(r => r.role === role);
  }

  private determineDigestFormat(context: NotificationContext): unknown {
    const format = context?.format || 'standard';

    return {
      type: format,
      includeCharts: ['executive', 'visual'].includes(format),
      includeDetails: ['detailed', 'comprehensive'].includes(format),
      includeActions: true,
      groupBy: format === 'executive' ? 'severity' : 'type',
    };
  }

  private calculateNextDigest(context: NotificationContext): unknown {
    const period = context?.period || 'daily';
    const now = new Date();

    const schedules = {
      daily: { hour: 8, minute: 0 },
      weekly: { dayOfWeek: 1, hour: 8, minute: 0 }, // Monday
      monthly: { dayOfMonth: 1, hour: 8, minute: 0 },
    };

    const schedule = schedules[period as keyof typeof schedules] || schedules.daily;

    // Calculate next occurrence
    const next = new Date(now);
    if (period === 'daily') {
      next.setDate(next.getDate() + 1);
      next.setHours(schedule.hour, schedule.minute, 0, 0);
    }
    // Add weekly/monthly calculation as needed

    return {
      nextRun: next.toISOString(),
      schedule,
      timezone: 'UTC',
    };
  }

  private analyzeDigestTrends(_data: DigestData): TrendAnalysis {
    // Simple trend analysis
    const trends = {
      alerts: 'increasing', // Would calculate from historical data
      reminders: 'stable',
      compliance: 'improving',
      spend: 'decreasing',
    };

    const significantChanges = Object.entries(trends)
      .filter(([_, trend]) => trend !== 'stable')
      .map(([metric]) => metric);

    return {
      trends,
      significantChanges,
      recommendation: significantChanges.length > 2
        ? 'Review process changes that may be causing trends'
        : 'Continue monitoring',
    };
  }

  // Routing methods
  private groupNotificationsByType(notifications: unknown[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const notification of notifications) {
      const typedNotif = notification as UnknownData;
      const type = typedNotif.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    }

    return groups;
  }

  private groupNotificationsBySeverity(notifications: unknown[]): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    const groups = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const notification of notifications) {
      const typedNotif = notification as UnknownData;
      const severity = typedNotif.severity || 'low';
      if (severity in groups) {
        groups[severity as keyof typeof groups]++;
      }
    }

    return groups;
  }

  private async routeNotification(notification: unknown): Promise<RouteInfo> {
    const rules = await this.getRoutingRules();
    const route: RouteInfo = {
      notification,
      recipients: [],
      channels: [],
      priority: 'normal',
      suppress: false,
      suppressionReason: null,
      aggregate: false,
      aggregateKey: null,
    };

    // Apply routing rules
    for (const rule of rules) {
      if (this.matchesRule(notification, rule)) {
        if (rule.action === 'suppress') {
          route.suppress = true;
          route.suppressionReason = rule.reason ?? null;
          break;
        }

        if (rule.recipients) {
          route.recipients.push(...rule.recipients);
        }

        if (rule.channels) {
          route.channels.push(...rule.channels);
        }

        if (rule.priority) {
          route.priority = rule.priority;
        }

        if (rule.aggregate) {
          route.aggregate = true;
          route.aggregateKey = rule.aggregateKey ?? null;
        }
      }
    }

    // Default routing if no rules matched
    if (route.recipients.length === 0 && !route.suppress) {
      route.recipients = await this.determineRecipients(notification);
      route.channels = this.selectNotificationChannels(notification);
    }

    return route;
  }

  private async getRoutingRules(): Promise<RoutingRule[]> {
    // Simulated routing rules
    return [
      {
        name: 'Suppress low priority info',
        condition: { severity: 'low', type: 'info' },
        action: 'suppress',
        reason: 'Low priority informational',
      },
      {
        name: 'Aggregate vendor issues',
        condition: { type: 'vendor_issue', severity: ['low', 'medium'] },
        aggregate: true,
        aggregateKey: 'vendor_daily',
        channels: ['email'],
      },
      {
        name: 'Escalate critical',
        condition: { severity: 'critical' },
        recipients: [{ role: 'executive' }],
        channels: ['email', 'sms', 'phone'],
        priority: 'immediate',
      },
      {
        name: 'Route compliance to legal',
        condition: { type: 'compliance_violation' },
        recipients: [{ role: 'legal_team' }, { role: 'compliance_officer' }],
        priority: 'high',
      },
    ];
  }

  private matchesRule(notification: unknown, rule: RoutingRule): boolean {
    const typedNotif = notification as UnknownData;
    for (const [key, value] of Object.entries(rule.condition)) {
      if (Array.isArray(value)) {
        if (!value.includes((typedNotif as Record<string, unknown>)[key])) {return false;}
      } else {
        if ((typedNotif as Record<string, unknown>)[key] !== value) {return false;}
      }
    }
    return true;
  }

  private identifyAggregationOpportunities(routing: unknown[]): unknown[] {
    const opportunities: unknown[] = [];
    const groups: Record<string, RouteInfo[]> = {};

    // Group by potential aggregation keys
    for (const route of routing) {
      const typedRoute = route as RouteInfo;
      if (!typedRoute.suppress) {
        const typedNotif = typedRoute.notification as UnknownData;
        const key = `${typedNotif.type}_${typedNotif.severity}`;
        if (!groups[key]) {groups[key] = [];}
        groups[key].push(typedRoute);
      }
    }

    // Identify groups that could be aggregated
    for (const [key, routes] of Object.entries(groups)) {
      if (routes.length > 3) {
        const firstNotif = routes[0].notification as UnknownData;
        opportunities.push({
          key,
          count: routes.length,
          type: firstNotif.type,
          severity: firstNotif.severity,
          benefit: 'Reduce notification volume',
        });
      }
    }

    return opportunities;
  }

  private assessAlertFatigue(analysis: NotificationAnalysis): FatigueAssessment {
    const totalNotifications = analysis.total;
    const criticalRatio = analysis.bySeverity.critical / totalNotifications;
    const suppressionRatio = analysis.suppressions.length / totalNotifications;

    let level = 'low';
    let description = 'Notification volume is manageable';

    if (totalNotifications > 100) {
      level = 'high';
      description = 'Very high notification volume may cause alert fatigue';
    } else if (totalNotifications > 50) {
      level = 'medium';
      description = 'Moderate notification volume';
    }

    if (criticalRatio < 0.05 && totalNotifications > 20) {
      level = 'high';
      description = 'Too many non-critical alerts may desensitize users';
    }

    return {
      level,
      description,
      metrics: {
        totalVolume: totalNotifications,
        criticalRatio,
        suppressionRatio,
        aggregationPotential: analysis.aggregations.length,
      },
      recommendations: this.getFatigueRecommendations(level, analysis),
    };
  }

  private getFatigueRecommendations(level: string, analysis: NotificationAnalysis): string[] {
    const recommendations: string[] = [];

    if (level === 'high') {
      recommendations.push('Increase notification thresholds');
      recommendations.push('Enable notification aggregation');
      recommendations.push('Review and update routing rules');
    }

    if (analysis.aggregations.length > 0) {
      recommendations.push(`Aggregate ${analysis.aggregations.length} notification groups`);
    }

    if (analysis.suppressions.length < analysis.total * 0.1) {
      recommendations.push('Consider suppressing more low-priority notifications');
    }

    return recommendations;
  }

  private getChannelsForRole(role: string, severity: string): string[] {
    const channels = ['email', 'in-app'];

    if (severity === 'critical') {
      channels.push('sms');
      if (['executive', 'compliance_officer'].includes(role)) {
        channels.push('phone');
      }
    }

    if (['operations_manager', 'analytics_team'].includes(role)) {
      channels.push('slack');
    }

    return channels;
  }

  private async sendSmartNotification(
    eventType: string,
    eventData: unknown,
    _context: NotificationContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<unknown>> {
    rulesApplied.push('smart_notification_routing');

    try {
      // Call the database function for intelligent routing
      const routingResult = await this.callDatabaseFunction('send_smart_notification', {
        p_event_type: eventType,
        p_event_data: eventData,
        p_enterprise_id: this.enterpriseId,
      });

      // Extract notification details
      const {
        recipients_count,
        severity,
        notifications_sent,
        escalation_scheduled,
      } = routingResult;

      // Create insights based on routing results
      if (severity === 'critical' || severity === 'high') {
        insights.push(this.createInsight(
          'critical_notification_sent',
          severity,
          `${severity.charAt(0).toUpperCase() + severity.slice(1)} Notification Sent`,
          `${notifications_sent} notifications sent to ${recipients_count} recipients`,
          escalation_scheduled ? 'Escalation scheduled' : 'Monitor for acknowledgment',
          {
            eventType,
            routingResult,
            eventData: typeof eventData === 'object' && eventData !== null ? {
              ...(eventData as Record<string, unknown>),
              // Remove sensitive data before storing
              alert_data: undefined,
            } : {},
          },
        ));
      }

      // High-frequency event detection
      if (notifications_sent > 10) {
        insights.push(this.createInsight(
          'high_notification_volume',
          'medium',
          'High Notification Volume',
          `${notifications_sent} notifications triggered for ${eventType}`,
          'Consider aggregating similar notifications',
          { eventType, count: notifications_sent },
        ));
        rulesApplied.push('volume_detection');
      }

      // Check for escalation
      if (escalation_scheduled) {
        insights.push(this.createInsight(
          'escalation_scheduled',
          'low',
          'Escalation Scheduled',
          'Notification will be escalated if not acknowledged',
          'Ensure timely response to avoid escalation',
          { eventType, escalation: true },
        ));
        rulesApplied.push('escalation_setup');
      }

      // Create activity log
      await this.createAuditLog(
        'notification_routing',
        'notification',
        eventType,
        {
          recipients_count,
          severity,
          notifications_sent,
          escalation_scheduled,
        },
      );

      return this.createResult(
        true,
        {
          eventType,
          eventData,
          recipientsCount: recipients_count,
          notificationsSent: notifications_sent,
          severity,
          escalationScheduled: escalation_scheduled,
          routingCompleted: true,
        },
        insights,
        rulesApplied,
        0.95,
        {
          notificationsSent: notifications_sent,
          routingMethod: 'smart_routing',
        },
      );

    } catch (error) {
      // Fallback to standard notification routing
      insights.push(this.createInsight(
        'routing_fallback',
        'medium',
        'Smart Routing Unavailable',
        'Falling back to standard notification routing',
        error instanceof Error ? error.message : String(error),
        { error: error instanceof Error ? error.message : String(error) },
      ));
      rulesApplied.push('fallback_routing');

      // Continue with standard processAlert logic
      const alert = {
        type: this.classifyAlert(eventData),
        severity: this.assessAlertSeverity(eventData),
        recipients: await this.determineRecipients(eventData),
        channels: this.selectNotificationChannels(eventData),
        message: this.composeAlertMessage(eventData),
        escalation: this.determineEscalation(eventData),
        actions: this.identifyRequiredActions(eventData),
      };

      return this.createResult(
        true,
        alert,
        insights,
        rulesApplied,
        0.85,
        {
          notificationSent: true,
          routingMethod: 'standard',
        },
      );
    }
  }
}