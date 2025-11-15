'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import AgentTile from '@/components/agents/AgentTile';
import MetricsGrid, { GlobalMetrics } from '@/components/agents/MetricsGrid';
import CommandPalette from '@/components/agents/CommandPalette';
import AgentExecutionTerminal, { ExecutionLog } from '@/components/agents/AgentExecutionTerminal';
import { ChevronDown, Clipboard, Terminal } from 'lucide-react';
import type { AgentType, AgentCategory, AgentComplexityLevel } from '@/types/agents.types';

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

interface OverviewTabProps {
  agents: AgentConfig[];
  systemStatus: 'running' | 'stopped' | 'error';
  isLoading: boolean;
}

export default function AgentOverviewTab({ agents, systemStatus, isLoading }: OverviewTabProps) {
  const { userProfile } = useAuth();
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);

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
  const categoryInfo: Record<string, { title: string; icon: string; description: string }> = {
    orchestration: {
      title: 'Orchestration & Workflow',
      icon: '🎯',
      description: 'System coordination, workflow automation, and task management',
    },
    document: {
      title: 'Document Processing',
      icon: '📑',
      description: 'Document extraction, metadata generation, and file processing',
    },
    legal: {
      title: 'Legal & Compliance',
      icon: '⚖️',
      description: 'Legal analysis, compliance monitoring, and risk assessment',
    },
    financial: {
      title: 'Financial Analysis',
      icon: '💰',
      description: 'Financial risk assessment, cost analysis, and reporting',
    },
    management: {
      title: 'Vendor Management',
      icon: '🏢',
      description: 'Vendor lifecycle and performance tracking',
    },
    analytics: {
      title: 'Analytics & Insights',
      icon: '📊',
      description: 'Data analysis, trend identification, and predictive insights',
    },
    system: {
      title: 'System Support',
      icon: '⚙️',
      description: 'Notifications, data quality, and system integration',
    },
    advanced: {
      title: 'Advanced & Experimental',
      icon: '🧪',
      description: 'Next-generation AI agents with advanced cognitive capabilities',
    },
  };

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === '/' && !isCommandPaletteOpen) {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isInputFocused) {
          e.preventDefault();
          setIsCommandPaletteOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  // Fetch dashboard data
  useEffect(() => {
    if (!userProfile?.enterprise_id) return;

    const fetchData = async () => {
      try {
        const enterpriseId = userProfile.enterprise_id;
        const [metricsData, activityData, logsData] = await Promise.all([
          agentsAPI.getDashboardMetrics(enterpriseId),
          agentsAPI.getRecentActivity(enterpriseId, 10),
          agentsAPI.getRecentLogs(enterpriseId, 50)
        ]);

        setGlobalMetrics(metricsData);
        setRecentActivity(activityData);
        setExecutionLogs(logsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchData();
  }, [userProfile?.enterprise_id]);

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

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <MetricsGrid metrics={globalMetrics} isLoading={isLoading} />

      {/* Main Content Grid - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Agent Grid - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-purple-900 uppercase tracking-wider font-mono">
              AI AGENTS
            </h2>
            <span className="text-xs text-ghost-600 font-mono">{agents.length} AGENTS AVAILABLE</span>
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
                <div key={category} className="border border-ghost-300 bg-white overflow-hidden">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(category)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-ghost-50 hover:bg-ghost-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-purple-900 font-mono">{info.title}</h3>
                        <p className="text-xs text-ghost-600">{info.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ghost-600 font-mono">{categoryAgents.length} AGENTS</span>
                      <ChevronDown
                        className={`w-4 h-4 text-ghost-600 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                      />
                    </div>
                  </button>

                  {/* Section Content */}
                  {!isCollapsed && (
                    <div className="p-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {categoryAgents.map((agent) => (
                          <AgentTile key={agent.name} {...agent} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recent Activity + Execution Monitor */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Activity Section */}
          <div className="border border-ghost-300 bg-white overflow-hidden">
            <button
              onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
              className="w-full px-4 py-3 flex items-center justify-between bg-ghost-50 hover:bg-ghost-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clipboard className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-purple-900 uppercase tracking-wider font-mono">
                  RECENT ACTIVITY
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {recentActivity.length > 0 && !isActivityCollapsed && (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-purple-500 hover:text-purple-400 transition-colors"
                  >
                    View All
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-ghost-600 transition-transform ${isActivityCollapsed ? '' : 'rotate-180'}`}
                />
              </div>
            </button>

            {!isActivityCollapsed && (
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto bg-white">
                {recentActivity.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clipboard className="w-12 h-12 mx-auto mb-4 text-ghost-400 opacity-50" />
                    <p className="text-sm text-ghost-600">No recent activity</p>
                    <p className="text-xs text-ghost-500 mt-1">
                      Activity will appear here as agents process tasks
                    </p>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id || activity.timestamp}
                      className="pb-3 border-b border-ghost-200 last:border-0 last:pb-0"
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
                          <p className="text-xs text-ghost-700 leading-relaxed">
                            {activity.message}
                          </p>
                          <span className="text-xs text-ghost-500 font-mono">{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Execution Monitor */}
          <div className="border border-ghost-300 bg-white overflow-hidden">
            <button
              onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
              className="w-full px-4 py-3 flex items-center justify-between bg-ghost-50 hover:bg-ghost-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-purple-900 uppercase tracking-wider font-mono">
                  EXECUTION MONITOR
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {executionLogs.length > 0 && !isTerminalCollapsed && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-ghost-600 font-mono">LIVE</span>
                  </div>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-ghost-600 transition-transform ${isTerminalCollapsed ? '' : 'rotate-180'}`}
                />
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

      {/* Global Command Palette */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
