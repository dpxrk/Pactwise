'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const analyticsConfig: AgentPageConfig = {
  agentType: 'analytics',
  name: 'Analytics Engine',
  icon: '📊',
  description: 'Data analysis, trend identification, and predictive insights generation',

  capabilities: [
    'Analyze spending patterns and trends',
    'Identify cost optimization opportunities',
    'Generate predictive forecasts',
    'Create custom dashboards',
    'Track KPIs and metrics',
    'Anomaly detection',
    'Comparative analysis',
    'Data visualization'
  ],

  useWhen: 'Analyzing data trends, generating insights, or creating business intelligence dashboards.',

  exampleQueries: [
    'Analyze spending patterns',
    'Identify cost trends',
    'Generate forecast',
    'Create performance dashboard',
    'Detect anomalies',
    'Compare period performance'
  ]
};

export default function AnalyticsAgentPage() {
  return <AgentPageTemplate config={analyticsConfig} />;
}
