'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { Scale } from 'lucide-react';

const legalConfig: AgentPageConfig = {
  agentType: 'legal',
  name: 'Legal Analyst',
  icon: '⚖️',
  description: 'Contract analysis, legal risk assessment, and compliance validation specialist',

  capabilities: [
    'Analyze contract legal risks and exposure',
    'Extract and classify legal clauses (liability, termination, IP, confidentiality)',
    'Assess compliance with regulatory requirements',
    'Identify non-standard or high-risk terms',
    'Generate legal risk scores (critical, high, medium, low)',
    'Check for missing standard clauses',
    'Process contract approval workflows',
    'Provide legal recommendations'
  ],

  useWhen: 'Reviewing contracts for legal risks, ensuring compliance, or assessing contractual obligations.',

  exampleQueries: [
    'Analyze legal risks in this contract',
    'Extract all liability clauses',
    'Check GDPR compliance',
    'Identify termination conditions',
    'Review intellectual property terms',
    'Assess overall legal risk score'
  ],

  customTabs: [
    {
      id: 'clauses',
      label: 'Clause Library',
      icon: <Scale className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Standard Clauses</h3>
          <div className="text-text-muted">Clause library and templates will be displayed here.</div>
        </Card>
      )
    },
    {
      id: 'risks',
      label: 'Risk Heatmap',
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Risk Analysis</h3>
          <div className="text-text-muted">Risk heatmap visualization will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function LegalAgentPage() {
  return <AgentPageTemplate config={legalConfig} />;
}
