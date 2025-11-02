'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const riskConfig: AgentPageConfig = {
  agentType: 'risk_assessment',
  name: 'Risk Assessment',
  icon: '⚠️',
  description: 'Comprehensive risk evaluation and mitigation strategy development',

  capabilities: [
    'Assess vendor risk profiles',
    'Evaluate contract-specific risks',
    'Generate risk mitigation plans',
    'Monitor risk indicators in real-time',
    'Financial risk quantification',
    'Legal risk analysis',
    'Operational risk identification',
    'Risk trend analysis'
  ],

  useWhen: 'Evaluating business risks, developing mitigation strategies, or monitoring risk exposure.',

  exampleQueries: [
    'Assess vendor risk profile',
    'Evaluate contract risks',
    'Generate mitigation plan',
    'Monitor critical risk indicators',
    'Quantify financial exposure',
    'Analyze risk trends'
  ]
};

export default function RiskAssessmentAgentPage() {
  return <AgentPageTemplate config={riskConfig} />;
}
