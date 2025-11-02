'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import AgentTile from '@/components/agents/AgentTile';
import MetricsGrid, { GlobalMetrics } from '@/components/agents/MetricsGrid';
import CommandPalette from '@/components/agents/CommandPalette';
import AgentExecutionTerminal, { ExecutionLog } from '@/components/agents/AgentExecutionTerminal';
import type { AgentType, AgentComplexityLevel, AgentCategory } from '@/types/agents.types';

interface Activity {
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
  // ============================================================================
  // CORE ORCHESTRATION AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // DOCUMENT PROCESSING AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // LEGAL & COMPLIANCE AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // FINANCIAL AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // VENDOR & MANAGEMENT AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // ANALYTICS AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // SYSTEM SUPPORT AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },

  // ============================================================================
  // ADVANCED/EXPERIMENTAL AGENTS
  // ============================================================================
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
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
    metrics: {
      processed: 0,
      activeCount: 0,
    }
  },
];

const AgentDashboard = () => {
  const { userProfile, isLoading: isAuthLoading } = useAuth();
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>(agentConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<'running' | 'stopped' | 'error'>('stopped');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(['orchestration', 'document', 'legal', 'financial', 'management', 'analytics', 'system', 'advanced'])
  );
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Group agents by category
  const groupedAgents = agents.reduce((acc, agent) => {
    const category = agent.category || 'core';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(agent);
    return acc;
  }, {} as Record<string, AgentConfig[]>);

  // Category display metadata
  const categoryInfo: Record<string, { title: string; icon: string; description: string; defaultCollapsed?: boolean }> = {
    orchestration: {
      title: 'Orchestration & Workflow',
      icon: '🎯',
      description: 'System coordination, workflow automation, and task management',
      defaultCollapsed: true,
    },
    document: {
      title: 'Document Processing',
      icon: '📑',
      description: 'Document extraction, metadata generation, and file processing',
      defaultCollapsed: true,
    },
    legal: {
      title: 'Legal & Compliance',
      icon: '⚖️',
      description: 'Legal analysis, compliance monitoring, and risk assessment',
      defaultCollapsed: true,
    },
    financial: {
      title: 'Financial Analysis',
      icon: '💰',
      description: 'Financial risk assessment, cost analysis, and reporting',
      defaultCollapsed: true,
    },
    management: {
      title: 'Vendor Management',
      icon: '🏢',
      description: 'Vendor lifecycle and performance tracking',
      defaultCollapsed: true,
    },
    analytics: {
      title: 'Analytics & Insights',
      icon: '📊',
      description: 'Data analysis, trend identification, and predictive insights',
      defaultCollapsed: true,
    },
    system: {
      title: 'System Support',
      icon: '⚙️',
      description: 'Notifications, data quality, and system integration',
      defaultCollapsed: true,
    },
    advanced: {
      title: 'Advanced & Experimental',
      icon: '🧪',
      description: 'Next-generation AI agents with advanced cognitive capabilities',
      defaultCollapsed: true,
    },
  };

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Also support '/' key for quick search
      if (e.key === '/' && !isCommandPaletteOpen) {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA';

        if (!isInputFocused) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Fetch dashboard data on mount
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      return;
    }

    // If no user profile or enterprise ID, stop loading
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

        // Fetch all data in parallel
        const [systemStatusData, metricsData, activityData, logsData] = await Promise.all([
          agentsAPI.getAgentSystemStatus(enterpriseId),
          agentsAPI.getDashboardMetrics(enterpriseId),
          agentsAPI.getRecentActivity(enterpriseId, 10),
          agentsAPI.getRecentLogs(enterpriseId, 50)
        ]);

        // Update system status
        if (systemStatusData.system) {
          setSystemStatus(systemStatusData.system.status as any);
        }

        // Merge backend agents with static config
        const backendAgents = systemStatusData.agents.map((agent: any) => {
          // Find matching static config
          const staticConfig = agentConfig.find(
            (c) => c.type === agent.type
          );

          return {
            name: staticConfig?.name || agent.name,
            path: staticConfig?.path || `/dashboard/agents/${agent.type}`,
            description: staticConfig?.description || agent.description || '',
            icon: staticConfig?.icon || '🤖',
            type: agent.type,
            status: agent.isEnabled
              ? (agent.status as any)
              : ('disabled' as any),
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

        // If no backend agents, use static config
        const finalAgents = backendAgents.length > 0 ? backendAgents : agentConfig;

        setAgents(finalAgents);
        setGlobalMetrics(metricsData);
        setRecentActivity(activityData);
        setExecutionLogs(logsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Fall back to static config on error
        setAgents(agentConfig);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile?.enterprise_id, isAuthLoading]);

  // Set up real-time log subscription
  useEffect(() => {
    if (!userProfile?.enterprise_id) return;

    const channel = agentsAPI.subscribeToAgentLogs(
      userProfile.enterprise_id,
      (newLog) => {
        setExecutionLogs((prev) => [...prev, newLog]);
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [userProfile?.enterprise_id]);

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Subtle grid background + noise */}
      <div className="fixed inset-0 grid-bg opacity-30 noise-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {/* Top Bar - Bloomberg style */}
        <div className="border-b border-terminal-border bg-terminal-surface/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-[1920px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-text-primary tracking-tight">
                  Agent Command Center
                </h1>
                <div className="h-4 w-px bg-terminal-border" />
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      systemStatus === 'running'
                        ? 'bg-success status-pulse'
                        : systemStatus === 'error'
                        ? 'bg-error'
                        : 'bg-ghost-500'
                    }`}
                  />
                  <span className="text-xs text-text-tertiary">
                    {systemStatus === 'running'
                      ? 'All Systems Operational'
                      : systemStatus === 'error'
                      ? 'System Error'
                      : 'System Stopped'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <span className="opacity-60">Last Updated:</span>{' '}
                  <span className="text-text-secondary">Just now</span>
                </div>

                <div className="px-3 py-1.5 bg-terminal-panel border border-terminal-border rounded text-text-secondary text-xs">
                  Press{' '}
                  <kbd className="px-1 py-0.5 bg-terminal-surface border border-terminal-border rounded mx-1">
                    ⌘
                  </kbd>
                  <kbd className="px-1 py-0.5 bg-terminal-surface border border-terminal-border rounded">
                    K
                  </kbd>{' '}
                  for commands
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          {/* Metrics Grid */}
          <MetricsGrid metrics={globalMetrics} isLoading={isLoading} />

          {/* Main Content Grid - 3 Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section: Agent Grid - Takes 2 columns */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  AI Agents
                </h2>
                <span className="text-xs text-text-tertiary">{agents.length} agents available</span>
              </div>

              {/* Grouped Agents with Collapsible Sections */}
              <div className="space-y-4">
                    {Object.entries(groupedAgents).map(([category, categoryAgents]) => {
                      const info = categoryInfo[category] || {
                        title: category.charAt(0).toUpperCase() + category.slice(1),
                        icon: '🤖',
                        description: '',
                      };
                      const isCollapsed = collapsedSections.has(category);

                      return (
                        <div key={category} className="terminal-panel rounded overflow-hidden">
                          {/* Section Header */}
                          <button
                            onClick={() => toggleSection(category)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-terminal-surface hover:bg-terminal-hover state-transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{info.icon}</span>
                              <div className="text-left">
                                <h3 className="text-sm font-semibold text-text-primary">{info.title}</h3>
                                <p className="text-xs text-text-tertiary">{info.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted">{categoryAgents.length} agents</span>
                              <svg
                                className={`w-4 h-4 text-text-tertiary state-transition ${isCollapsed ? '' : 'rotate-180'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Section Content */}
                          {!isCollapsed && (
                            <div className="p-4 bg-terminal-bg/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {categoryAgents.map((agent, index) => (
                                  <div
                                    key={agent.name}
                                    className={`animate-fade-in-up opacity-0 stagger-${Math.min(index + 1, 8)}`}
                                    style={{
                                      animationFillMode: 'forwards',
                                      animationDuration: '0.3s',
                                      animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                  >
                                    <AgentTile {...agent} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
            </div>

            {/* Right Column: Recent Activity + Execution Monitor - Takes 1 column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Recent Activity Section - Collapsible */}
              <div className="terminal-panel rounded overflow-hidden">
                <button
                  onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-terminal-surface hover:bg-terminal-hover state-transition"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                      Recent Activity
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {recentActivity.length > 0 && !isActivityCollapsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="text-xs text-purple-500 hover:text-purple-400 state-transition"
                      >
                        View All
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-text-tertiary state-transition ${
                        isActivityCollapsed ? '' : 'rotate-180'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {!isActivityCollapsed && (
                  <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto terminal-scrollbar bg-terminal-bg/50">
                    {recentActivity.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="text-text-muted mb-2">
                          <svg
                            className="w-12 h-12 mx-auto opacity-50"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-text-tertiary">No recent activity</p>
                        <p className="text-xs text-text-muted mt-1">
                          Activity will appear here as agents process tasks
                        </p>
                      </div>
                    ) : (
                      <>
                        {recentActivity.map((activity) => (
                          <div
                            key={activity.id || activity.timestamp}
                            className="pb-3 border-b border-terminal-border last:border-0 last:pb-0"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  activity.status === 'success'
                                    ? 'bg-success'
                                    : activity.status === 'warning'
                                    ? 'bg-warning'
                                    : activity.status === 'error'
                                    ? 'bg-error'
                                    : 'bg-purple-500'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-text-secondary leading-relaxed">
                                  {activity.message}
                                </p>
                                <span className="text-xs text-text-muted">{activity.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {recentActivity.length >= 4 && (
                          <button className="w-full py-2 text-xs text-text-tertiary hover:text-text-secondary state-transition text-center">
                            Load more activity
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Execution Monitor */}
              <div className="terminal-panel rounded overflow-hidden">
                <button
                  onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-terminal-surface hover:bg-terminal-hover state-transition"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                      Execution Monitor
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {executionLogs.length > 0 && !isTerminalCollapsed && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success status-pulse" />
                        <span className="text-xs text-text-tertiary">Live</span>
                      </div>
                    )}
                    <svg
                      className={`w-4 h-4 text-text-tertiary state-transition ${
                        isTerminalCollapsed ? '' : 'rotate-180'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {!isTerminalCollapsed && (
                  <div className="overflow-hidden">
                    <AgentExecutionTerminal logs={executionLogs} isLive={true} maxHeight="calc(100vh - 400px)" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
};

export default AgentDashboard;
