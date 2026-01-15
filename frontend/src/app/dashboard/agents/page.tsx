'use client';

import {
  LayoutGrid,
  Brain,
  Sparkles,
  ListTodo,
  Activity,
  Settings
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import AgentDetailsTab from '@/components/agents/tabs/AgentDetailsTab';
import DonnaAITab from '@/components/agents/tabs/DonnaAITab';
import AgentMemoryTab from '@/components/agents/tabs/MemoryTab';
import AgentOverviewTab from '@/components/agents/tabs/OverviewTab';
import PerformanceTab from '@/components/agents/tabs/PerformanceTab';
import TaskQueueTab from '@/components/agents/tabs/TaskQueueTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import type { AgentType, AgentComplexityLevel, AgentCategory } from '@/types/agents.types';

interface _Activity {
  id: string;
  type: 'contract' | 'savings' | 'rfp' | 'alert' | 'vendor' | 'approval';
  message: string;
  time: string;
  status: 'success' | 'warning' | 'info' | 'error';
  timestamp?: number;
}

interface AgentConfig {
  name: string;
  path: string;
  description: string;
  icon: string;
  type: AgentType;
  status: 'active' | 'ready' | 'beta' | 'disabled';
  wip?: boolean;
  metrics?: {
    processed?: number;
    savings?: string;
    activeCount?: number;
  };
  category: AgentCategory;
  complexityLevel?: AgentComplexityLevel;
  useWhen?: string;
  exampleQueries?: string[];
}

// Complete Agent Configuration - All 17 Backend Agent Types
const agentConfig: AgentConfig[] = [
  // CORE ORCHESTRATION AGENTS
  {
    name: 'System Manager',
    path: '/dashboard/agents/manager',
    description: 'System coordination, workflow orchestration, and task management',
    icon: '🎯',
    type: 'manager',
    status: 'active',
    category: 'orchestration',
    complexityLevel: 'standard',
    useWhen: 'Coordinating multi-agent workflows and managing system tasks',
    exampleQueries: [
      'Coordinate contract renewal workflow',
      'Manage task queue',
      'Orchestrate multi-step processes',
      'Monitor system health'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Workflow Engine',
    path: '/dashboard/agents/workflow',
    description: 'Multi-step workflow execution and automation',
    icon: '⚙️',
    type: 'workflow',
    status: 'active',
    category: 'orchestration',
    complexityLevel: 'standard',
    useWhen: 'Automating complex business processes',
    exampleQueries: [
      'Execute approval workflow',
      'Automate vendor onboarding',
      'Run compliance checks',
      'Process batch operations'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // DOCUMENT PROCESSING AGENTS
  {
    name: 'Document Secretary',
    path: '/dashboard/agents/secretary',
    description: 'Document extraction, metadata generation, and file processing',
    icon: '📑',
    type: 'secretary',
    status: 'active',
    category: 'document',
    complexityLevel: 'standard',
    useWhen: 'Processing and extracting data from documents',
    exampleQueries: [
      'Extract contract metadata',
      'Process uploaded documents',
      'Generate document summaries',
      'Parse vendor certificates'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // LEGAL & COMPLIANCE AGENTS
  {
    name: 'Legal Analyst',
    path: '/dashboard/agents/legal',
    description: 'Contract analysis, legal risk assessment, and clause extraction',
    icon: '⚖️',
    type: 'legal',
    status: 'active',
    category: 'legal',
    complexityLevel: 'advanced',
    useWhen: 'Analyzing contracts for legal risks and compliance',
    exampleQueries: [
      'Review software license agreement',
      'Extract key clauses from contract',
      'Assess legal risks',
      'Check compliance with playbook'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Compliance Monitor',
    path: '/dashboard/agents/compliance',
    description: 'Regulatory compliance tracking and audit management',
    icon: '✅',
    type: 'compliance',
    status: 'active',
    category: 'legal',
    complexityLevel: 'standard',
    useWhen: 'Ensuring regulatory compliance and managing audits',
    exampleQueries: [
      'Check GDPR compliance',
      'Monitor SOC 2 requirements',
      'Track regulatory changes',
      'Generate compliance reports'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Risk Assessment',
    path: '/dashboard/agents/risk-assessment',
    description: 'Comprehensive risk evaluation and mitigation planning',
    icon: '⚠️',
    type: 'risk_assessment',
    status: 'active',
    category: 'legal',
    complexityLevel: 'advanced',
    useWhen: 'Identifying and evaluating business risks',
    exampleQueries: [
      'Assess vendor risk profile',
      'Evaluate contract risks',
      'Generate risk mitigation plan',
      'Monitor risk indicators'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // FINANCIAL AGENTS
  {
    name: 'Financial Analyst',
    path: '/dashboard/agents/financial',
    description: 'Financial risk assessment, reporting, and cost analysis',
    icon: '💰',
    type: 'financial',
    status: 'active',
    category: 'financial',
    complexityLevel: 'standard',
    useWhen: 'Analyzing financial data and calculating ROI',
    exampleQueries: [
      'Calculate cost savings',
      'Analyze spending trends',
      'Generate financial reports',
      'Assess budget impact'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // VENDOR & MANAGEMENT AGENTS
  {
    name: 'Vendor Manager',
    path: '/dashboard/agents/vendor',
    description: 'Vendor lifecycle management and performance tracking',
    icon: '🏢',
    type: 'vendor',
    status: 'active',
    category: 'management',
    complexityLevel: 'standard',
    useWhen: 'Managing vendor relationships and performance',
    exampleQueries: [
      'Track vendor performance',
      'Monitor SLA compliance',
      'Onboard new vendor',
      'Generate vendor scorecards'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // ANALYTICS AGENTS
  {
    name: 'Analytics Engine',
    path: '/dashboard/agents/analytics',
    description: 'Data analysis, trend identification, and predictive insights',
    icon: '📊',
    type: 'analytics',
    status: 'active',
    category: 'analytics',
    complexityLevel: 'standard',
    useWhen: 'Analyzing data patterns and generating insights',
    exampleQueries: [
      'Analyze spending patterns',
      'Identify cost trends',
      'Predict future spend',
      'Generate analytics dashboards'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // SYSTEM SUPPORT AGENTS
  {
    name: 'Notification Manager',
    path: '/dashboard/agents/notifications',
    description: 'Alert management and communication orchestration',
    icon: '🔔',
    type: 'notifications',
    status: 'active',
    category: 'system',
    complexityLevel: 'standard',
    useWhen: 'Managing notifications and alerts',
    exampleQueries: [
      'Send contract expiry alerts',
      'Notify approval required',
      'Schedule reminder emails',
      'Configure notification rules'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Data Quality Monitor',
    path: '/dashboard/agents/data-quality',
    description: 'Data validation, quality assurance, and integrity checks',
    icon: '🔍',
    type: 'data-quality',
    status: 'active',
    category: 'system',
    complexityLevel: 'standard',
    useWhen: 'Ensuring data quality and consistency',
    exampleQueries: [
      'Validate vendor data',
      'Check data completeness',
      'Identify data anomalies',
      'Clean duplicate records'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Integration Hub',
    path: '/dashboard/agents/integration',
    description: 'External system integration and data synchronization',
    icon: '🔗',
    type: 'integration',
    status: 'active',
    category: 'system',
    complexityLevel: 'standard',
    useWhen: 'Connecting with external systems',
    exampleQueries: [
      'Sync with ERP system',
      'Import from SAP',
      'Export to accounting',
      'Connect to vendor API'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  // ADVANCED/EXPERIMENTAL AGENTS
  {
    name: 'Theory of Mind Manager',
    path: '/dashboard/agents/theory-of-mind',
    description: 'Advanced cognitive reasoning and user intent understanding',
    icon: '🧠',
    type: 'theory_of_mind_manager',
    status: 'beta',
    category: 'advanced',
    complexityLevel: 'expert',
    useWhen: 'Requiring advanced reasoning about user goals and intentions',
    exampleQueries: [
      'Predict user needs',
      'Understand stakeholder perspectives',
      'Anticipate workflow requirements',
      'Model decision-making contexts'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Continual Learning Secretary',
    path: '/dashboard/agents/continual-secretary',
    description: 'Self-improving document processing with continuous learning',
    icon: '📚',
    type: 'continual_secretary',
    status: 'beta',
    category: 'advanced',
    complexityLevel: 'expert',
    useWhen: 'Processing documents with evolving patterns',
    exampleQueries: [
      'Learn from document patterns',
      'Adapt to new contract types',
      'Improve extraction accuracy',
      'Optimize processing workflows'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Metacognitive Secretary',
    path: '/dashboard/agents/metacognitive-secretary',
    description: 'Self-aware document processing with reasoning capabilities',
    icon: '🤔',
    type: 'metacognitive_secretary',
    status: 'beta',
    category: 'advanced',
    complexityLevel: 'expert',
    useWhen: 'Complex document analysis requiring self-reflection',
    exampleQueries: [
      'Self-assess extraction confidence',
      'Reason about document structure',
      'Identify knowledge gaps',
      'Optimize processing strategy'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Causal Financial Analyst',
    path: '/dashboard/agents/causal-financial',
    description: 'Advanced financial analysis with causal reasoning',
    icon: '🔬',
    type: 'causal_financial',
    status: 'beta',
    category: 'advanced',
    complexityLevel: 'expert',
    useWhen: 'Understanding cause-effect relationships in financial data',
    exampleQueries: [
      'Identify cost drivers',
      'Analyze spending causality',
      'Model financial impacts',
      'Predict intervention outcomes'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
  {
    name: 'Quantum Financial Optimizer',
    path: '/dashboard/agents/quantum-financial',
    description: 'Quantum-inspired financial optimization and analysis',
    icon: '⚛️',
    type: 'quantum_financial',
    status: 'beta',
    category: 'advanced',
    complexityLevel: 'expert',
    useWhen: 'Complex portfolio optimization and scenario analysis',
    exampleQueries: [
      'Optimize vendor portfolio',
      'Analyze quantum scenarios',
      'Find optimal allocation',
      'Simulate market dynamics'
    ],
    metrics: { processed: 0, activeCount: 0 }
  },
];

const AgentDashboard = () => {
  const { userProfile, isLoading: isAuthLoading } = useAuth();
  const [agents, setAgents] = useState<AgentConfig[]>(agentConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<'running' | 'stopped' | 'error'>('stopped');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data on mount
  useEffect(() => {
    if (isAuthLoading) return;
    if (!userProfile?.enterprise_id) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const enterpriseId = userProfile.enterprise_id;
        if (!enterpriseId) {
          console.error('No enterprise ID found');
          setIsLoading(false);
          return;
        }

        // Fetch system status and merge with static config
        const systemStatusData = await agentsAPI.getAgentSystemStatus(enterpriseId);

        if (systemStatusData.system) {
          setSystemStatus(systemStatusData.system.status as any);
        }

        const backendAgents = systemStatusData.agents.map((agent: any) => {
          const staticConfig = agentConfig.find((c) => c.type === agent.type);
          return {
            name: staticConfig?.name || agent.name,
            path: staticConfig?.path || `/dashboard/agents/${agent.type}`,
            description: staticConfig?.description || agent.description || '',
            icon: staticConfig?.icon || '🤖',
            type: agent.type,
            status: agent.isEnabled ? (agent.status as any) : ('disabled' as any),
            wip: staticConfig?.wip || false,
            category: staticConfig?.category || ('core' as any),
            complexityLevel: staticConfig?.complexityLevel,
            useWhen: staticConfig?.useWhen,
            exampleQueries: staticConfig?.exampleQueries,
            metrics: agent.metrics
              ? {
                  processed: agent.metrics.totalRuns || agent.runCount,
                  activeCount: agent.metrics.dataProcessed,
                  savings: agent.metrics.customMetrics?.savings
                }
              : undefined
          };
        });

        const finalAgents = backendAgents.length > 0 ? backendAgents : agentConfig;
        setAgents(finalAgents);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setAgents(agentConfig);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile?.enterprise_id, isAuthLoading]);

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Subtle grid background (40x40px as per design system) */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(210, 209, 222) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, rgb(210, 209, 222) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Top Bar - Bloomberg style with purple/pink branding */}
        <div className="border-b border-ghost-300 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-[1920px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-purple-900 tracking-tight font-mono">
                  AGENT COMMAND CENTER
                </h1>
                <div className="h-4 w-px bg-ghost-300" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      systemStatus === 'running'
                        ? 'bg-success animate-pulse'
                        : systemStatus === 'error'
                        ? 'bg-error'
                        : 'bg-ghost-500'
                    }`}
                  />
                  <span className="text-xs text-ghost-600 font-mono">
                    {systemStatus === 'running'
                      ? 'ALL SYSTEMS OPERATIONAL'
                      : systemStatus === 'error'
                      ? 'SYSTEM ERROR'
                      : 'SYSTEM STOPPED'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-ghost-600 font-mono">
                  <span className="opacity-60">LAST UPDATED:</span>
                  <span className="text-ghost-700">JUST NOW</span>
                </div>

                <div className="px-3 py-1.5 bg-ghost-50 border border-ghost-300 text-ghost-700 text-xs font-mono">
                  Press{' '}
                  <kbd className="px-1 py-0.5 bg-white border border-ghost-300 mx-1">
                    ⌘
                  </kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-ghost-300">
                    K
                  </kbd>{' '}
                  for commands
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard with Tabs */}
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab Navigation - Bloomberg/Linear style with purple/pink accents */}
            <TabsList className="bg-white border border-ghost-300 p-1 h-auto">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <LayoutGrid className="w-4 h-4" />
                OVERVIEW
              </TabsTrigger>
              <TabsTrigger
                value="memory"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <Brain className="w-4 h-4" />
                MEMORY
              </TabsTrigger>
              <TabsTrigger
                value="donna"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <Sparkles className="w-4 h-4" />
                DONNA AI
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <ListTodo className="w-4 h-4" />
                TASK QUEUE
              </TabsTrigger>
              <TabsTrigger
                value="performance"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <Activity className="w-4 h-4" />
                PERFORMANCE
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-purple-900 data-[state=active]:text-white font-mono text-xs px-4 py-2"
              >
                <Settings className="w-4 h-4" />
                AGENT DETAILS
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="overview" className="mt-0">
              <AgentOverviewTab
                agents={agents}
                systemStatus={systemStatus}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="memory" className="mt-0">
              <AgentMemoryTab />
            </TabsContent>

            <TabsContent value="donna" className="mt-0">
              <DonnaAITab />
            </TabsContent>

            <TabsContent value="queue" className="mt-0">
              <TaskQueueTab />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceTab />
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <AgentDetailsTab agents={agents} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
