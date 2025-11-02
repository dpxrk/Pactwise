'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';

const causalFinancialConfig: AgentPageConfig = {
  agentType: 'causal_financial',
  name: 'Causal Financial Analyst',
  icon: '🔬',
  description: 'Advanced financial analysis with causal inference and root cause identification',

  capabilities: [
    'Identify cost drivers through causal analysis',
    'Analyze cause-effect relationships in spending',
    'Model financial intervention impacts',
    'Predict outcomes of financial decisions',
    'Root cause analysis for variances',
    'Counterfactual scenario analysis',
    'Causal relationship mapping',
    'What-if impact modeling'
  ],

  useWhen: 'Understanding root causes of costs, predicting intervention outcomes, or analyzing complex financial relationships.',

  exampleQueries: [
    'Identify cost drivers',
    'Analyze spending causality',
    'Model intervention impact',
    'Predict decision outcome',
    'Explain variance causes',
    'Run what-if scenarios'
  ],

  customTabs: [
    {
      id: 'causal-graph',
      label: 'Causal Graph',
      icon: <GitBranch className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Causal Relationships</h3>
          <div className="text-text-muted">Causal graph visualization will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function CausalFinancialPage() {
  return <AgentPageTemplate config={causalFinancialConfig} />;
}
