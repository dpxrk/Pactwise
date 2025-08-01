import { BaseAgent, ProcessingResult, Insight } from './base.ts';

export class NotificationsAgent extends BaseAgent {
  get agentType() {
    return 'notifications';
  }

  get capabilities() {
    return ['alert_management', 'reminder_generation', 'notification_routing', 'escalation_handling'];
  }

  async process(data: any, context?: any): Promise<ProcessingResult<any>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Determine notification type
      if (context?.notificationType === 'alert') {
        return await this.processAlert(data, context, rulesApplied, insights);
      } else if (context?.notificationType === 'reminder') {
        return await this.processReminder(data, context, rulesApplied, insights);
      } else if (context?.notificationType === 'digest') {
        return await this.generateDigest(data, context, rulesApplied, insights);
      }

      // Default: analyze and route notifications
      return await this.analyzeAndRouteNotifications(data, context, rulesApplied, insights);

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
    data: any,
    context: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('alert_processing');

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
          ...data,
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
    data: any,
    _context: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
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
    if (reminder.timing.daysUntilDue <= 1) {
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
        `${reminder.type} is ${reminder.timing.daysOverdue} days overdue`,
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
    _data: any,
    context: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
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
    if (digest.summary.criticalItems > 0) {
      insights.push(this.createInsight(
        'critical_items_in_digest',
        'high',
        'Critical Items Require Attention',
        `${digest.summary.criticalItems} critical items in this ${digest.period} digest`,
        'Review and address critical items first',
        { summary: digest.summary },
      ));
    }

    // Trend analysis
    const trends = this.analyzeDigestTrends(digestData);
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
    data: any,
    _context: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('notification_routing');

    const notifications = Array.isArray(data) ? data : [data];
    const analysis = {
      total: notifications.length,
      byType: this.groupNotificationsByType(notifications),
      bySeverity: this.groupNotificationsBySeverity(notifications),
      routing: [] as any[],
      suppressions: [] as any[],
      aggregations: [] as any[],
    };

    // Process each notification
    for (const notification of notifications) {
      const route = await this.routeNotification(notification);

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
    const fatigueRisk = this.assessAlertFatigue(analysis);
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
  private classifyAlert(data: any): string {
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

  private assessAlertSeverity(data: any): string {
    // Rule-based severity assessment
    const content = JSON.stringify(data).toLowerCase();

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
    if (data.value) {
      if (data.value > 100000) {return 'high';}
      if (data.value > 50000) {return 'medium';}
    }

    return 'low';
  }

  private async determineRecipients(data: any): Promise<any[]> {
    const recipients: any[] = [];
    const type = this.classifyAlert(data);
    const severity = this.assessAlertSeverity(data);

    // Base recipients from data
    if (data.assignedTo) {
      recipients.push({
        userId: data.assignedTo,
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

  private selectNotificationChannels(data: any): string[] {
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

  private composeAlertMessage(data: any): any {
    const type = this.classifyAlert(data);
    const severity = this.assessAlertSeverity(data);

    const templates = {
      contract_expiration: {
        subject: `${severity.toUpperCase()}: Contract Expiring - ${data.contractName || 'Unknown'}`,
        body: `Contract "${data.contractName}" expires in ${data.daysUntil || 'N/A'} days. Immediate action required to avoid service disruption.`,
        action: 'Review and renew contract',
      },
      budget_exceeded: {
        subject: `Budget Alert: ${data.category || 'Category'} Over Budget`,
        body: `${data.category} has exceeded budget by ${data.overagePercent || 'N/A'}%. Current spend: ${data.currentSpend}, Budget: ${data.budget}.`,
        action: 'Review spending and adjust',
      },
      compliance_violation: {
        subject: `COMPLIANCE ALERT: ${data.regulation || 'Violation'} Detected`,
        body: `Compliance violation detected: ${data.description}. This requires immediate attention to avoid penalties.`,
        action: 'Address compliance issue',
      },
      vendor_issue: {
        subject: `Vendor Issue: ${data.vendorName || 'Unknown Vendor'}`,
        body: `Issue reported with vendor ${data.vendorName}: ${data.issue}. Performance score: ${data.performanceScore || 'N/A'}.`,
        action: 'Contact vendor and resolve',
      },
      payment_due: {
        subject: `Payment Due: ${data.vendorName || 'Vendor'} - $${data.amount || 'N/A'}`,
        body: `Payment of $${data.amount} is due to ${data.vendorName} on ${data.dueDate}. Terms: ${data.terms || 'Standard'}.`,
        action: 'Process payment',
      },
      approval_required: {
        subject: `Approval Required: ${data.itemType || 'Item'} - ${data.itemName || 'N/A'}`,
        body: `Your approval is required for: ${data.itemName}. Value: $${data.value || 'N/A'}. Requester: ${data.requester || 'N/A'}.`,
        action: 'Review and approve',
      },
      performance_alert: {
        subject: `Performance Alert: ${data.metric || 'Metric'} Below Threshold`,
        body: `${data.metric} is at ${data.currentValue}, below threshold of ${data.threshold}. Trend: ${data.trend || 'N/A'}.`,
        action: 'Investigate and improve',
      },
      general_alert: {
        subject: `Alert: ${data.title || 'Notification'}`,
        body: data.description || 'A notification requires your attention.',
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

  private determineEscalation(data: any): any {
    const severity = this.assessAlertSeverity(data);
    const type = this.classifyAlert(data);

    const escalation = {
      required: false,
      levels: [] as any[],
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

  private identifyRequiredActions(data: any): any[] {
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

  private async checkAlertFrequency(alertType: string): Promise<any> {
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
  private classifyReminder(data: any): string {
    const content = JSON.stringify(data).toLowerCase();

    if (content.includes('contract') && content.includes('renewal')) {return 'contract_renewal';}
    if (content.includes('payment')) {return 'payment_reminder';}
    if (content.includes('report') || content.includes('submission')) {return 'report_due';}
    if (content.includes('review') || content.includes('evaluation')) {return 'review_scheduled';}
    if (content.includes('training') || content.includes('certification')) {return 'training_due';}
    if (content.includes('audit')) {return 'audit_preparation';}

    return 'general_reminder';
  }

  private calculateReminderTiming(data: any): any {
    const dueDate = data.dueDate ? new Date(data.dueDate) : null;
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

  private async determineReminderRecipients(data: any): Promise<any[]> {
    const timing = this.calculateReminderTiming(data);

    const recipients: any[] = [];

    // Primary recipient
    if (data.assignedTo) {
      recipients.push({
        userId: data.assignedTo,
        priority: timing.isOverdue ? 'high' : 'normal',
      });
    }

    // CC recipients based on timing
    if (timing.isOverdue || timing.daysUntilDue <= 1) {
      recipients.push({
        role: 'manager',
        priority: 'high',
        reason: 'escalation',
      });
    }

    return recipients;
  }

  private composeReminderMessage(data: any): any {
    const type = this.classifyReminder(data);
    const timing = this.calculateReminderTiming(data);

    let urgency = 'standard';
    if (timing.isOverdue) {urgency = 'overdue';}
    else if (timing.daysUntilDue <= 1) {urgency = 'urgent';}
    else if (timing.daysUntilDue <= 7) {urgency = 'upcoming';}

    const templates = {
      contract_renewal: {
        subject: `Contract Renewal Reminder: ${data.contractName || 'Contract'}`,
        body: `Contract "${data.contractName}" is due for renewal. ${timing.isOverdue ? `OVERDUE by ${timing.daysOverdue} days!` : `Due in ${timing.daysUntilDue} days.`}`,
      },
      payment_reminder: {
        subject: `Payment Reminder: ${data.vendorName || 'Vendor'} - $${data.amount || 'N/A'}`,
        body: `Payment of $${data.amount} to ${data.vendorName} is ${timing.isOverdue ? 'OVERDUE' : `due in ${timing.daysUntilDue} days`}.`,
      },
      report_due: {
        subject: `Report Due: ${data.reportName || 'Report'}`,
        body: `${data.reportName} is ${timing.isOverdue ? 'OVERDUE' : `due in ${timing.daysUntilDue} days`}. Please submit as soon as possible.`,
      },
      review_scheduled: {
        subject: `Review Scheduled: ${data.reviewType || 'Review'}`,
        body: `${data.reviewType} is scheduled ${timing.isOverdue ? '(MISSED)' : `in ${timing.daysUntilDue} days`}. Please prepare necessary materials.`,
      },
      training_due: {
        subject: `Training Reminder: ${data.trainingName || 'Training'}`,
        body: `${data.trainingName} ${timing.isOverdue ? 'certification has EXPIRED' : `is due in ${timing.daysUntilDue} days`}. Complete to maintain compliance.`,
      },
      audit_preparation: {
        subject: `Audit Preparation: ${data.auditType || 'Audit'}`,
        body: `${data.auditType} audit is ${timing.isOverdue ? 'OVERDUE for preparation' : `scheduled in ${timing.daysUntilDue} days`}. Begin preparation immediately.`,
      },
      general_reminder: {
        subject: `Reminder: ${data.title || 'Action Required'}`,
        body: `This is a reminder about: ${data.description || 'Pending action'}. ${timing.isOverdue ? 'This item is OVERDUE.' : `Due in ${timing.daysUntilDue} days.`}`,
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

  private determineReminderFrequency(data: any): any {
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
    if (timing.daysUntilDue <= 1) {
      return {
        frequency: 'every_4_hours',
        maxReminders: 6,
        escalateAfter: 2,
      };
    } else if (timing.daysUntilDue <= 7) {
      return {
        frequency: 'daily',
        maxReminders: 7,
        escalateAfter: 5,
      };
    } else if (timing.daysUntilDue <= 30) {
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

  private identifyReminderActions(data: any): any[] {
    const type = this.classifyReminder(data);
    const actions: any[] = [];

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
  private async gatherDigestData(_context: any): Promise<any> {
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

  private generateSummary(data: any): any {
    const totalAlerts = Object.values(data.alerts).reduce((sum: number, val: any) =>
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

  private organizeSections(data: any): any[] {
    const sections = [
      {
        title: 'Critical & Overdue Items',
        priority: 1,
        items: [
          ...data.alerts.items.filter((a: any) => a.severity === 'critical'),
          ...data.reminders.items.filter((_r: any) => data.reminders.overdue > 0),
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

  private async determineDigestRecipients(context: any): Promise<any[]> {
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

  private determineDigestFormat(context: any): any {
    const format = context?.format || 'standard';

    return {
      type: format,
      includeCharts: ['executive', 'visual'].includes(format),
      includeDetails: ['detailed', 'comprehensive'].includes(format),
      includeActions: true,
      groupBy: format === 'executive' ? 'severity' : 'type',
    };
  }

  private calculateNextDigest(context: any): any {
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

  private analyzeDigestTrends(_data: any): any {
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
  private groupNotificationsByType(notifications: any[]): any {
    const groups: Record<string, number> = {};

    for (const notification of notifications) {
      const type = notification.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    }

    return groups;
  }

  private groupNotificationsBySeverity(notifications: any[]): any {
    const groups = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const notification of notifications) {
      const severity = notification.severity || 'low';
      if (severity in groups) {
        groups[severity as keyof typeof groups]++;
      }
    }

    return groups;
  }

  private async routeNotification(notification: any): Promise<any> {
    const rules = await this.getRoutingRules();
    const route = {
      notification,
      recipients: [] as any[],
      channels: [] as string[],
      priority: 'normal' as string,
      suppress: false,
      suppressionReason: null as string | null,
      aggregate: false,
      aggregateKey: null as string | null,
    };

    // Apply routing rules
    for (const rule of rules) {
      if (this.matchesRule(notification, rule)) {
        if (rule.action === 'suppress') {
          route.suppress = true;
          route.suppressionReason = rule.reason;
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
          route.aggregateKey = rule.aggregateKey;
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

  private async getRoutingRules(): Promise<any[]> {
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

  private matchesRule(notification: any, rule: any): boolean {
    for (const [key, value] of Object.entries(rule.condition)) {
      if (Array.isArray(value)) {
        if (!value.includes(notification[key])) {return false;}
      } else {
        if (notification[key] !== value) {return false;}
      }
    }
    return true;
  }

  private identifyAggregationOpportunities(routing: any[]): any[] {
    const opportunities: any[] = [];
    const groups: Record<string, any[]> = {};

    // Group by potential aggregation keys
    for (const route of routing) {
      if (!route.suppress) {
        const key = `${route.notification.type}_${route.notification.severity}`;
        if (!groups[key]) {groups[key] = [];}
        groups[key].push(route);
      }
    }

    // Identify groups that could be aggregated
    for (const [key, routes] of Object.entries(groups)) {
      if (routes.length > 3) {
        opportunities.push({
          key,
          count: routes.length,
          type: routes[0].notification.type,
          severity: routes[0].notification.severity,
          benefit: 'Reduce notification volume',
        });
      }
    }

    return opportunities;
  }

  private assessAlertFatigue(analysis: any): any {
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

  private getFatigueRecommendations(level: string, analysis: any): string[] {
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
    eventData: any,
    _context: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
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
            eventData: {
              ...eventData,
              // Remove sensitive data before storing
              alert_data: undefined,
            },
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