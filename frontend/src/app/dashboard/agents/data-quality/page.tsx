'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const dataQualityConfig: AgentPageConfig = {
  agentType: 'data-quality',
  name: 'Data Quality Monitor',
  icon: '🔍',
  description: 'Data validation, quality assurance, integrity checks, and anomaly detection',

  capabilities: [
    'Validate data completeness and accuracy',
    'Check data consistency',
    'Identify anomalies and outliers',
    'Clean duplicate records',
    'Standardize data formats',
    'Generate data quality scores',
    'Track data quality trends',
    'Automated data cleansing'
  ],

  useWhen: 'Ensuring data quality, validating data integrity, or identifying data issues.',

  exampleQueries: [
    'Validate vendor data',
    'Check data completeness',
    'Identify duplicates',
    'Detect anomalies',
    'Generate quality report',
    'Clean vendor records'
  ]
};

export default function DataQualityAgentPage() {
  return <AgentPageTemplate config={dataQualityConfig} />;
}
