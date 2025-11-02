'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';

const workflowConfig: AgentPageConfig = {
  agentType: 'workflow',
  name: 'Workflow Engine',
  icon: '⚙️',
  description: 'Multi-step workflow execution and business process automation',

  capabilities: [
    'Execute multi-step workflows sequentially or in parallel',
    'Handle conditional branching logic',
    'Retry and fallback mechanisms',
    'Workflow step monitoring and logging',
    'Trigger-based workflow activation',
    'Custom workflow definition',
    'Workflow template library',
    'Integration with other agents'
  ],

  useWhen: 'Automating complex business processes, approval workflows, or multi-step operations.',

  exampleQueries: [
    'Execute contract approval workflow',
    'Automate vendor onboarding process',
    'Run compliance check workflow',
    'Process batch renewals',
    'Orchestrate document review',
    'Trigger escalation workflow'
  ]
};

export default function WorkflowAgentPage() {
  return <AgentPageTemplate config={workflowConfig} />;
}
