'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { Network } from 'lucide-react';

const managerConfig: AgentPageConfig = {
  agentType: 'manager',
  name: 'System Manager',
  icon: '🎯',
  description: 'System coordination, workflow orchestration, and multi-agent task management',

  capabilities: [
    'Coordinate multi-agent workflows',
    'Monitor system health and performance',
    'Prioritize and optimize task queue',
    'Handle agent failures and recovery',
    'Orchestrate complex multi-step processes',
    'Load balance across agents',
    'Manage task dependencies',
    'Provide system-wide analytics'
  ],

  useWhen: 'Managing complex workflows, coordinating multiple agents, or monitoring overall system health.',

  exampleQueries: [
    'Coordinate contract renewal workflow',
    'Monitor all agent health status',
    'Optimize task queue priorities',
    'Orchestrate vendor onboarding process',
    'Balance workload across agents',
    'Generate system performance report'
  ],

  customTabs: [
    {
      id: 'system-health',
      label: 'System Health',
      icon: <Network className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">System Health Dashboard</h3>
          <div className="text-text-muted">System health monitoring will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function ManagerAgentPage() {
  return <AgentPageTemplate config={managerConfig} />;
}
