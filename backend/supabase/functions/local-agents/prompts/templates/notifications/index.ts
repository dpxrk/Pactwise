/**
 * Notifications Agent Prompt Templates
 *
 * Alert generation, reminder scheduling, escalation routing,
 * and notification content formatting.
 */

import type { PromptTemplate } from '../../types.ts';

const META = {
  author: 'system',
  createdAt: '2026-02-15',
  updatedAt: '2026-02-15',
};

export const notificationsTemplates: PromptTemplate[] = [
  // ── System Prompt ─────────────────────────────────────────────────
  {
    id: 'notifications-system',
    agentType: 'notifications',
    category: 'system',
    name: 'Notifications Agent System Prompt',
    description: 'Core system prompt for the Notifications Agent',
    version: '1.0.0',
    template: `You are the Notifications Agent for Pactwise, an enterprise contract management platform.

Your specialization is generating timely, relevant, and actionable notifications. You determine what to communicate, to whom, when, and how.

Core capabilities:
- Contract expiration and renewal reminders
- Compliance deadline alerts
- Financial threshold warnings (budget, spend anomalies)
- Task assignment and status update notifications
- Escalation routing based on severity and response time
- Digest compilation (daily/weekly summaries)

Operating principles:
- Minimize notification fatigue — only send what is actionable or time-sensitive
- Match urgency to channel: critical → immediate push/email, normal → in-app, low → digest
- Include enough context for the recipient to act without switching contexts
- Personalize based on recipient role (executive gets summary, manager gets details)
- Track notification effectiveness (open rates, action rates) to improve relevance
- Respect quiet hours: {{quiet_hours}} unless severity is critical
- Group related notifications to reduce volume

Enterprise context: {{enterprise_name}} (ID: {{enterprise_id}})`,
    variables: [
      { name: 'enterprise_name', description: 'Name of the enterprise', required: false, defaultValue: 'Current Enterprise', type: 'string' },
      { name: 'enterprise_id', description: 'Enterprise identifier', required: true, type: 'string' },
      { name: 'quiet_hours', description: 'Quiet hours period (e.g., "10pm-7am local")', required: false, defaultValue: '10pm-7am local time', type: 'string' },
    ],
    metadata: { ...META, tags: ['system', 'notifications'], maxTokens: 500, temperature: 0.3 },
  },

  // ── Alert Generation ──────────────────────────────────────────────
  {
    id: 'notifications-generate-alert',
    agentType: 'notifications',
    category: 'task',
    name: 'Alert Generation',
    description: 'Generates an alert notification from a trigger event',
    version: '1.0.0',
    template: `Generate a notification for this trigger event.

Event: {{event_type}}
Details: {{event_details}}
Affected entity: {{entity_type}} — {{entity_id}}
Triggered at: {{trigger_time}}

Recipient context:
- Role: {{recipient_role}}
- Preferences: {{notification_preferences}}

Generate:
1. **Subject line**: Concise, scannable (under 60 chars)
2. **Body**:
   - What happened (1 sentence)
   - Why it matters (1 sentence)
   - What action is needed (specific, actionable)
   - Deadline for action (if applicable)
3. **Severity**: critical / high / normal / low
4. **Channel**: push / email / in_app / digest
5. **Action buttons**: Up to 2 CTAs with labels and deep links
6. **Grouping key**: For notification deduplication/batching`,
    variables: [
      { name: 'event_type', description: 'Type of trigger event', required: true, type: 'string' },
      { name: 'event_details', description: 'Detailed event information', required: true, type: 'json' },
      { name: 'entity_type', description: 'Type of affected entity (contract, vendor, etc.)', required: true, type: 'string' },
      { name: 'entity_id', description: 'ID of the affected entity', required: true, type: 'string' },
      { name: 'trigger_time', description: 'When the event was triggered', required: true, type: 'string' },
      { name: 'recipient_role', description: 'Role of the notification recipient', required: true, type: 'string' },
      { name: 'notification_preferences', description: 'Recipient notification preferences', required: false, defaultValue: 'default', type: 'string' },
    ],
    fewShotExamples: [
      {
        input: 'Event: contract_expiring, Details: {"contractName":"CloudServ MSA","expiresIn":30,"value":360000,"autoRenew":false}, Entity: contract-abc123, Recipient: manager',
        output: '{"subject":"CloudServ MSA expires in 30 days — action required","body":"The Master Services Agreement with CloudServ Inc ($360K annual value) expires on March 17, 2026. Since auto-renewal is disabled, the contract will lapse without action. Please initiate renewal negotiations or confirm non-renewal by March 3 to ensure continuity.","severity":"high","channel":"email","actionButtons":[{"label":"Start Renewal","deepLink":"/dashboard/contracts/abc123/renew"},{"label":"Review Contract","deepLink":"/dashboard/contracts/abc123"}],"groupingKey":"contract-expiry-abc123"}',
        explanation: 'High severity because of $360K value and no auto-renewal. Email channel appropriate for 30-day notice. Deadline set 2 weeks before expiry for negotiation buffer.',
      },
    ],
    metadata: { ...META, tags: ['alert', 'generation', 'notifications'], maxTokens: 1000, temperature: 0.3 },
  },

  // ── Escalation Routing ────────────────────────────────────────────
  {
    id: 'notifications-escalation',
    agentType: 'notifications',
    category: 'task',
    name: 'Escalation Routing',
    description: 'Determines escalation path when issues are not addressed',
    version: '1.0.0',
    template: `Determine the escalation path for this unresolved issue.

Issue: {{issue_description}}
Original notification sent: {{original_notification_time}}
Assigned to: {{current_assignee}}
Time since notification: {{hours_elapsed}} hours
Severity: {{severity}}
SLA deadline: {{sla_deadline}}

Escalation rules:
- Normal issues: Escalate after 48h with no response
- High issues: Escalate after 24h
- Critical issues: Escalate after 4h
- Each escalation goes one level up the reporting chain

Determine:
1. Should this be escalated? (yes/no with reasoning)
2. Escalation level: first_escalation / second_escalation / executive_escalation
3. Who to notify: Role(s) that should receive the escalation
4. Escalation message: Include original context, time elapsed, and impact of delay
5. Updated deadline: When will the next escalation trigger if still unresolved?`,
    variables: [
      { name: 'issue_description', description: 'Description of the unresolved issue', required: true, type: 'string' },
      { name: 'original_notification_time', description: 'When the original notification was sent', required: true, type: 'string' },
      { name: 'current_assignee', description: 'Current person responsible', required: true, type: 'string' },
      { name: 'hours_elapsed', description: 'Hours since original notification', required: true, type: 'number' },
      { name: 'severity', description: 'Issue severity level', required: true, type: 'string' },
      { name: 'sla_deadline', description: 'SLA deadline for resolution', required: false, defaultValue: 'Not specified', type: 'string' },
    ],
    metadata: { ...META, tags: ['escalation', 'routing', 'notifications'], maxTokens: 1000, temperature: 0.2 },
  },

  // ── Digest Compilation ────────────────────────────────────────────
  {
    id: 'notifications-digest',
    agentType: 'notifications',
    category: 'task',
    name: 'Notification Digest Compilation',
    description: 'Compiles a daily or weekly digest from accumulated notifications',
    version: '1.0.0',
    template: `Compile a {{digest_frequency}} digest from these notifications.

Notifications ({{notification_count}} total):
{{notifications_data}}

Recipient: {{recipient_name}} ({{recipient_role}})

Digest rules:
1. Group by category (contracts, vendors, compliance, financial, tasks)
2. Within each category, sort by severity (critical first)
3. Merge duplicate or related notifications
4. For each item, include: one-line summary, severity indicator, action link
5. Add a "Requires your attention" section at the top for items needing action
6. Include a metrics snapshot: items resolved since last digest, new items, trending
7. Keep total digest under 20 items (summarize remainder as "and N more...")

Tone: Professional, scannable, respectful of the reader's time.`,
    variables: [
      { name: 'digest_frequency', description: 'Digest frequency (daily/weekly)', required: true, type: 'string' },
      { name: 'notifications_data', description: 'Array of notification objects', required: true, type: 'json' },
      { name: 'notification_count', description: 'Total number of notifications', required: true, type: 'number' },
      { name: 'recipient_name', description: 'Recipient name', required: true, type: 'string' },
      { name: 'recipient_role', description: 'Recipient role', required: true, type: 'string' },
    ],
    metadata: { ...META, tags: ['digest', 'compilation', 'notifications'], maxTokens: 2000, temperature: 0.3 },
  },
];
