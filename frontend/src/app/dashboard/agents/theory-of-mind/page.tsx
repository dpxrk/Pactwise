'use client';

import React from 'react';
import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

const theoryOfMindConfig: AgentPageConfig = {
  agentType: 'theory_of_mind_manager',
  name: 'Theory of Mind Manager',
  icon: '🎭',
  description: 'Advanced cognitive reasoning with stakeholder modeling and intent understanding',

  capabilities: [
    'Predict user needs and preferences',
    'Understand stakeholder perspectives',
    'Model decision-making contexts',
    'Anticipate workflow requirements',
    'Multi-stakeholder analysis',
    'Intent recognition and planning',
    'Contextual awareness',
    'Empathetic system orchestration'
  ],

  useWhen: 'Managing complex stakeholder interactions, anticipating user needs, or providing context-aware orchestration.',

  exampleQueries: [
    'Predict next workflow needs',
    'Analyze stakeholder perspectives',
    'Model decision context',
    'Anticipate requirements',
    'Understand user intent',
    'Suggest proactive actions'
  ],

  customTabs: [
    {
      id: 'stakeholders',
      label: 'Stakeholder Model',
      icon: <Users className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Stakeholder Analysis</h3>
          <div className="text-text-muted">Stakeholder models and perspectives will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function TheoryOfMindPage() {
  return <AgentPageTemplate config={theoryOfMindConfig} />;
}
