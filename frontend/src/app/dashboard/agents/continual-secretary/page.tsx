'use client';

import { TrendingUp } from 'lucide-react';
import React from 'react';

import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';

const continualSecretaryConfig: AgentPageConfig = {
  agentType: 'continual_secretary',
  name: 'Continual Learning Secretary',
  icon: '📚',
  description: 'Self-improving document processing that learns from user corrections and feedback',

  capabilities: [
    'Learn from user corrections and feedback',
    'Adapt extraction rules based on patterns',
    'Improve accuracy over time',
    'Consolidate knowledge from examples',
    'Track learning progress and improvement',
    'Self-optimize processing strategies',
    'Pattern recognition and application',
    'Confidence-based learning prioritization'
  ],

  useWhen: 'Processing documents with evolving formats, learning organization-specific patterns, or continuously improving extraction accuracy.',

  exampleQueries: [
    'Extract metadata with learning enabled',
    'Learn from correction examples',
    'Show learning progress',
    'Apply learned patterns',
    'Optimize extraction strategy',
    'Review knowledge base'
  ],

  customTabs: [
    {
      id: 'learning-progress',
      label: 'Learning Progress',
      icon: <TrendingUp className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Learning Metrics</h3>
          <div className="text-text-muted">Learning progress and improvement metrics will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function ContinualSecretaryPage() {
  return <AgentPageTemplate config={continualSecretaryConfig} />;
}
