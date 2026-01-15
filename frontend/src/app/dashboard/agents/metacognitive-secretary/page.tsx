'use client';

import { Brain, Search } from 'lucide-react';
import React from 'react';

import AgentPageTemplate, { AgentPageConfig } from '@/components/agents/AgentPageTemplate';
import { Card } from '@/components/ui/card';

const metacognitiveSecretaryConfig: AgentPageConfig = {
  agentType: 'metacognitive_secretary',
  name: 'Metacognitive Secretary',
  icon: '🧠',
  description: 'Self-aware document processing with reasoning traces and confidence scoring',

  capabilities: [
    'Self-assess extraction confidence',
    'Explain reasoning behind extractions',
    'Identify uncertainty in results',
    'Generate reasoning traces for debugging',
    'Meta-level analysis of processing quality',
    'Self-correct based on confidence',
    'Transparent decision-making',
    'Quality self-evaluation'
  ],

  useWhen: 'Processing complex documents requiring explainability, debugging extraction issues, or ensuring high-confidence results.',

  exampleQueries: [
    'Extract with confidence scores',
    'Explain extraction reasoning',
    'Identify low-confidence results',
    'Show reasoning trace',
    'Self-assess quality',
    'Debug extraction decision'
  ],

  customTabs: [
    {
      id: 'reasoning-traces',
      label: 'Reasoning Traces',
      icon: <Search className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Processing Reasoning</h3>
          <div className="text-text-muted">Step-by-step reasoning traces will be displayed here.</div>
        </Card>
      )
    },
    {
      id: 'confidence',
      label: 'Confidence Analysis',
      icon: <Brain className="w-4 h-4" />,
      content: (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">Confidence Scores</h3>
          <div className="text-text-muted">Confidence analysis and uncertainty mapping will be displayed here.</div>
        </Card>
      )
    }
  ]
};

export default function MetacognitiveSecretaryPage() {
  return <AgentPageTemplate config={metacognitiveSecretaryConfig} />;
}
