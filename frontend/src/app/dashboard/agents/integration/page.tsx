'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const integrationConfig: AgentPageConfig = {
  agentType: 'integration',
  name: 'Integration Hub',
  icon: '🔗',
  description: 'External system integration, data synchronization, and API orchestration',

  capabilities: [
    'Sync with ERP systems',
    'Import data from SAP',
    'Export to accounting systems',
    'Connect to vendor APIs',
    'Automated data synchronization',
    'API rate limiting and retry',
    'Transform data formats',
    'Integration monitoring'
  ],

  useWhen: 'Integrating with external systems, synchronizing data, or orchestrating API calls.',

  exampleQueries: [
    'Sync with ERP',
    'Import SAP data',
    'Export to QuickBooks',
    'Connect vendor API',
    'Sync contract data',
    'Monitor integration status'
  ]
};

export default function IntegrationAgentPage() {
  return <AgentPageTemplate config={integrationConfig} />;
}
