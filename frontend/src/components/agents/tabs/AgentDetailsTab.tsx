'use client';

import { Settings, Play, Info, Code, FileText, Calculator, Scale, Shield } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { AgentType, AgentCategory } from '@/types/agents.types';

interface AgentConfig {
  name: string;
  path: string;
  description: string;
  icon: string;
  type: AgentType;
  status: 'active' | 'ready' | 'beta' | 'disabled';
  category: AgentCategory;
  complexityLevel?: string;
  useWhen?: string;
  exampleQueries?: string[];
}

interface AgentDetailsTabProps {
  agents: AgentConfig[];
}

export default function AgentDetailsTab({ agents }: AgentDetailsTabProps) {
  const { userProfile: _userProfile } = useAuth();
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('secretary');

  const selectedAgent = agents.find(a => a.type === selectedAgentType);

  // Agent-specific capabilities
  const agentCapabilities: Record<string, { icon: any; name: string; description: string }[]> = {
    secretary: [
      { icon: FileText, name: 'Extract Metadata', description: 'Extract structured metadata from documents' },
      { icon: FileText, name: 'Summarize Document', description: 'Generate document summaries' },
      { icon: Code, name: 'Extract Entities', description: 'Identify and extract named entities' },
      { icon: FileText, name: 'Format Document', description: 'Convert document formats' },
      { icon: Code, name: 'Classify Content', description: 'Classify document types and content' },
    ],
    financial: [
      { icon: Calculator, name: 'Calculate NPV', description: 'Net Present Value calculations' },
      { icon: Calculator, name: 'Calculate IRR', description: 'Internal Rate of Return analysis' },
      { icon: Calculator, name: 'Cash Flow Projection', description: 'Multi-period cash flow forecasting' },
      { icon: Calculator, name: 'ROI Analysis', description: 'Return on Investment calculations' },
      { icon: Calculator, name: 'Currency Conversion', description: 'Multi-currency support' },
    ],
    legal: [
      { icon: Scale, name: 'Clause Pattern Matching', description: 'Identify standard and custom clauses' },
      { icon: Scale, name: 'Jurisdiction Analysis', description: 'Jurisdiction-aware legal analysis' },
      { icon: Scale, name: 'Precedent Comparison', description: 'Compare against legal precedents' },
      { icon: Shield, name: 'Red Flag Detection', description: 'Identify potential legal issues' },
      { icon: FileText, name: 'Obligation Extraction', description: 'Extract contractual obligations' },
    ],
    compliance: [
      { icon: Shield, name: 'GDPR Compliance', description: 'General Data Protection Regulation checks' },
      { icon: Shield, name: 'CCPA Compliance', description: 'California Consumer Privacy Act checks' },
      { icon: Shield, name: 'HIPAA Compliance', description: 'Health Insurance Portability checks' },
      { icon: Shield, name: 'SOX Compliance', description: 'Sarbanes-Oxley Act compliance' },
      { icon: Shield, name: 'Audit Preparation', description: 'Prepare audit documentation' },
    ],
    risk_assessment: [
      { icon: Shield, name: 'Financial Risk', description: 'Assess financial exposure' },
      { icon: Shield, name: 'Operational Risk', description: 'Evaluate operational risks' },
      { icon: Shield, name: 'Legal Risk', description: 'Identify legal liabilities' },
      { icon: Shield, name: 'Reputational Risk', description: 'Assess brand and reputation risks' },
      { icon: Shield, name: 'Risk Matrix', description: 'Visualize likelihood × impact' },
    ],
  };

  const capabilities = agentCapabilities[selectedAgentType] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border-ghost-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <Settings className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 font-mono">AGENT CAPABILITIES</h2>
              <p className="text-sm text-ghost-600 mt-1">
                Explore and execute agent-specific capabilities
              </p>
            </div>
          </div>

          <Select value={selectedAgentType} onValueChange={(value) => setSelectedAgentType(value as AgentType)}>
            <SelectTrigger className="w-64 border-ghost-300 font-mono">
              <SelectValue placeholder="Select Agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.type} value={agent.type} className="font-mono">
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Selected Agent Info */}
      {selectedAgent && (
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-300/5 border-purple-500/20 p-6">
          <div className="flex items-start gap-6">
            <div className="text-4xl">{selectedAgent.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-purple-900 font-mono">{selectedAgent.name}</h3>
                <Badge className={`
                  ${selectedAgent.status === 'active' ? 'bg-success/20 text-success border-success/30' : ''}
                  ${selectedAgent.status === 'beta' ? 'bg-warning/20 text-warning border-warning/30' : ''}
                  ${selectedAgent.status === 'ready' ? 'bg-purple-500/20 text-purple-500 border-purple-500/30' : ''}
                  font-mono text-xs
                `}>
                  {selectedAgent.status.toUpperCase()}
                </Badge>
                {selectedAgent.complexityLevel && (
                  <Badge className="bg-ghost-500/20 text-ghost-700 border-ghost-500/30 font-mono text-xs">
                    {selectedAgent.complexityLevel.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-ghost-700 mb-4">{selectedAgent.description}</p>
              {selectedAgent.useWhen && (
                <div className="p-3 bg-white/50 border border-purple-500/10">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                      <div className="text-xs text-ghost-700">{selectedAgent.useWhen}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Capabilities Grid */}
      <div>
        <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
          AVAILABLE CAPABILITIES
        </h3>

        {capabilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((capability, idx) => (
              <Card
                key={idx}
                className="bg-white border-ghost-300 p-5 hover:border-purple-500 transition-colors group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500 group-hover:border-purple-500 transition-colors">
                    <capability.icon className="w-5 h-5 text-purple-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-purple-900 mb-1 font-mono">
                      {capability.name}
                    </h4>
                    <p className="text-xs text-ghost-600 leading-relaxed mb-3">
                      {capability.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-ghost-300 hover:border-purple-500 hover:text-purple-500 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500 transition-all h-7 text-xs font-mono"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      EXECUTE
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white border-ghost-300 p-12">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 text-purple-500 opacity-30" />
              <h3 className="text-lg font-semibold text-purple-900 mb-2 font-mono">
                CAPABILITIES COMING SOON
              </h3>
              <p className="text-sm text-ghost-600 max-w-md mx-auto">
                Detailed capability interfaces for this agent type are being developed.
                Check back soon for agent-specific functionality.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Example Queries */}
      {selectedAgent?.exampleQueries && selectedAgent.exampleQueries.length > 0 && (
        <Card className="bg-white border-ghost-300 p-6">
          <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
            EXAMPLE QUERIES
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {selectedAgent.exampleQueries.map((query, idx) => (
              <div
                key={idx}
                className="p-3 bg-ghost-50 border border-ghost-300 hover:border-purple-500 hover:bg-purple-500/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-2">
                  <span className="text-purple-500 text-xs font-mono mt-0.5">•</span>
                  <span className="text-xs text-ghost-700 group-hover:text-purple-900 font-mono">
                    {query}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
