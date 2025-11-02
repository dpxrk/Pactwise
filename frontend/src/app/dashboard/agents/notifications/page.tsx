'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const notificationsConfig: AgentPageConfig = {
  agentType: 'notifications',
  name: 'Notification Manager',
  icon: '🔔',
  description: 'Alert orchestration, multi-channel communication, and escalation management',

  capabilities: [
    'Send contract expiry alerts',
    'Notify approval requirements',
    'Schedule automated reminders',
    'Escalate urgent issues',
    'Multi-channel delivery (email, Slack, in-app)',
    'Custom notification rules',
    'Alert prioritization',
    'Notification analytics'
  ],

  useWhen: 'Managing alerts and notifications, ensuring timely communications, or setting up automated reminders.',

  exampleQueries: [
    'Send contract expiry alert',
    'Notify pending approvals',
    'Schedule renewal reminder',
    'Escalate critical issue',
    'Configure notification rules',
    'Track notification delivery'
  ]
};

export default function NotificationsAgentPage() {
  return <AgentPageTemplate config={notificationsConfig} />;
}
