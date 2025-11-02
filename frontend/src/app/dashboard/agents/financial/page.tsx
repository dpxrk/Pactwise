'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { DollarSign, Calculator } from 'lucide-react';

const financialConfig: AgentPageConfig = {
  agentType: 'financial',
  name: 'Financial Analyst',
  icon: '💰',
  description: 'Financial risk assessment, cost analysis, and budget impact evaluation',

  capabilities: [
    'Analyze financial risks and exposure',
    'Track and forecast budget impact',
    'Extract payment schedules and terms',
    'Calculate ROI and payback periods',
    'Identify cost savings opportunities',
    'Analyze spending variances',
    'Generate cost breakdowns',
    'Forecast cash flow impact'
  ],

  useWhen: 'Evaluating contract financial impact, analyzing costs, or tracking budget utilization.',

  exampleQueries: [
    'Analyze financial risks of this contract',
    'Calculate total cost of ownership',
    'Extract payment schedule',
    'Identify cost-saving opportunities',
    'Forecast budget impact',
    'Compare vendor pricing'
  ],

  customTabs: [
    {
      id: 'roi-calculator',
      label: 'ROI Calculator',
      icon: <Calculator className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">ROI Calculator</h3>
          <div className="text-text-muted">Interactive ROI calculator will be implemented here.</div>
        </Card>
      )
    },
    {
      id: 'budget-impact',
      label: 'Budget Impact',
      icon: <DollarSign className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Budget Impact Simulator</h3>
          <div className="text-text-muted">Budget impact visualization will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function FinancialAgentPage() {
  return <AgentPageTemplate config={financialConfig} />;
}
