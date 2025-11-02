'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const vendorConfig: AgentPageConfig = {
  agentType: 'vendor',
  name: 'Vendor Manager',
  icon: '🤝',
  description: 'Vendor lifecycle management, performance tracking, and SLA monitoring',

  capabilities: [
    'Track vendor performance metrics',
    'Monitor SLA compliance',
    'Assess vendor health and stability',
    'Generate vendor scorecards',
    'Identify underperforming vendors',
    'Manage vendor relationships',
    'Track vendor contracts and renewals',
    'Vendor risk monitoring'
  ],

  useWhen: 'Managing vendor relationships, tracking performance, or ensuring SLA compliance.',

  exampleQueries: [
    'Generate vendor scorecard',
    'Track SLA compliance',
    'Assess vendor health',
    'Identify performance issues',
    'Monitor contract renewals',
    'Compare vendor performance'
  ]
};

export default function VendorAgentPage() {
  return <AgentPageTemplate config={vendorConfig} />;
}
