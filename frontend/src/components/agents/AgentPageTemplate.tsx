'use client';

import {
  PlayCircle,
  PauseCircle,
  Settings,
  Activity,
  Brain,
  BarChart3,
  ListChecks,
  Sparkles,
  FileText
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import type { AgentType, Agent } from '@/types/agents.types';

import ConfigurationPanel from './ConfigurationPanel';
import InsightTable from './InsightTable';
import LogViewer from './LogViewer';
import MemoryViewer from './MemoryViewer';
import PerformanceCharts from './PerformanceCharts';
import TaskQueueTable from './TaskQueueTable';
import TaskSubmissionForm from './TaskSubmissionForm';

export interface AgentPageConfig {
  /** Agent type identifier */
  agentType: AgentType;
  /** Display name */
  name: string;
  /** Icon emoji or component */
  icon: string | React.ReactNode;
  /** Description */
  description: string;
  /** Detailed capabilities list */
  capabilities: string[];
  /** When to use this agent */
  useWhen: string;
  /** Example queries/tasks */
  exampleQueries: string[];
  /** Custom tabs specific to this agent */
  customTabs?: AgentCustomTab[];
  /** Custom header actions */
  customActions?: React.ReactNode;
  /** Show/hide certain tabs */
  tabVisibility?: {
    overview?: boolean;
    tasks?: boolean;
    insights?: boolean;
    memory?: boolean;
    config?: boolean;
    analytics?: boolean;
    logs?: boolean;
  };
}

export interface AgentCustomTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface AgentPageTemplateProps {
  config: AgentPageConfig;
  children?: React.ReactNode;
}

/**
 * Base template for all agent pages
 * Provides consistent layout with tabs for Overview, Tasks, Insights, Memory, Config, Analytics, Logs
 */
export default function AgentPageTemplate({ config, children }: AgentPageTemplateProps) {
  const { userProfile } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEnabled, setIsEnabled] = useState(false);

  const enterpriseId = userProfile?.enterprise_id;

  // Default tab visibility (all visible unless specified)
  const tabVisibility = {
    overview: true,
    tasks: true,
    insights: true,
    memory: true,
    config: true,
    analytics: true,
    logs: true,
    ...config.tabVisibility
  };

  // Load agent data
  useEffect(() => {
    async function loadAgentData() {
      if (!enterpriseId) {
        console.warn('No enterprise ID available for loading agent data');
        setLoading(false);
        return;
      }

      try {
        let statusData = await agentsAPI.getAgentSystemStatus(enterpriseId);

        // Handle when no agent system exists yet - auto-initialize
        if (!statusData || !statusData.agents || statusData.agents.length === 0) {
          try {
            await agentsAPI.initializeAgentSystem(enterpriseId);

            // Reload agent data after initialization
            statusData = await agentsAPI.getAgentSystemStatus(enterpriseId);
          } catch (initError) {
            console.error('Failed to initialize agent system:', initError);
            setLoading(false);
            return;
          }
        }

        // Ensure we have agents data
        if (!statusData?.agents) {
          console.warn('No agents available after initialization');
          setLoading(false);
          return;
        }

        // Find this specific agent by type
        const agentData = statusData.agents.find((a: Agent) => a.type === config.agentType);

        if (agentData) {
          setAgent(agentData);
          setIsEnabled(agentData.isEnabled);
        } else {
          console.warn(`Agent type ${config.agentType} not found in agent system`);
        }
      } catch (error) {
        console.error(`Error loading agent ${config.agentType}:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadAgentData();
  }, [enterpriseId, config.agentType]);

  // Toggle agent enabled/disabled
  const handleToggleAgent = async () => {
    if (!agent || !enterpriseId) return;

    try {
      const newState = !isEnabled;
      await agentsAPI.toggleAgent(agent._id, newState);
      setIsEnabled(newState);

      // Reload agent data to get updated status
      const statusData = await agentsAPI.getAgentSystemStatus(enterpriseId);
      if (statusData?.agents) {
        const updatedAgent = statusData.agents.find((a: Agent) => a.type === config.agentType);
        if (updatedAgent) setAgent(updatedAgent);
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  // Get status badge color
  const getStatusColor = () => {
    if (!agent) return 'bg-ghost-500';
    if (!isEnabled) return 'bg-ghost-500';

    switch (agent.status) {
      case 'active': return 'bg-purple-500';
      case 'busy': return 'bg-warning';
      case 'error': return 'bg-error';
      default: return 'bg-ghost-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!agent) return 'Unknown';
    if (!isEnabled) return 'Disabled';

    return agent.status.charAt(0).toUpperCase() + agent.status.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-muted">Loading agent data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100 p-6">
      {/* Header Section */}
      <div className="mb-6">
        <Card className="bg-white border-ghost-300 p-6">
          <div className="flex items-start justify-between">
            {/* Left: Icon, Name, Description */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="text-4xl">
                  {typeof config.icon === 'string' ? config.icon : config.icon}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-purple-900">{config.name}</h1>
                  <p className="text-sm text-text-tertiary mt-1">{config.description}</p>
                </div>
              </div>

              {/* Status and Metrics */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                  <span className="text-sm text-text-secondary">{getStatusText()}</span>
                </div>

                {agent && (
                  <>
                    <div className="h-4 w-px bg-ghost-300" />
                    <div className="text-sm text-text-muted">
                      <span className="text-text-secondary font-medium metric-value">{agent.runCount || 0}</span> runs
                    </div>
                    <div className="text-sm text-text-muted">
                      <span className="text-text-secondary font-medium metric-value">{agent.errorCount || 0}</span> errors
                    </div>
                    {agent.metrics?.successfulRuns !== undefined && (
                      <div className="text-sm text-text-muted">
                        <span className="text-purple-500 font-medium metric-value">
                          {agent.runCount > 0
                            ? ((agent.metrics.successfulRuns / agent.runCount) * 100).toFixed(1)
                            : '0'}%
                        </span> success rate
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {config.customActions}

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAgent}
                className="border-purple-500 text-purple-900 hover:bg-purple-50"
              >
                {isEnabled ? (
                  <>
                    <PauseCircle className="w-4 h-4 mr-2" />
                    Disable
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Enable
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-ghost-300 p-1">
          {tabVisibility.overview && (
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
          )}
          {tabVisibility.tasks && (
            <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <ListChecks className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
          )}
          {tabVisibility.insights && (
            <TabsTrigger value="insights" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          )}
          {tabVisibility.memory && (
            <TabsTrigger value="memory" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Memory
            </TabsTrigger>
          )}
          {tabVisibility.config && (
            <TabsTrigger value="config" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Config
            </TabsTrigger>
          )}
          {tabVisibility.analytics && (
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          )}
          {tabVisibility.logs && (
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          )}

          {/* Custom tabs */}
          {config.customTabs?.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        {tabVisibility.overview && (
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Capabilities */}
              <Card className="lg:col-span-2 bg-white border-ghost-300 p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Capabilities</h3>
                <ul className="space-y-2">
                  {config.capabilities.map((capability, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-text-secondary">
                      <span className="text-purple-500 mt-0.5">✓</span>
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Use When */}
              <Card className="bg-white border-ghost-300 p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">When to Use</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{config.useWhen}</p>
              </Card>

              {/* Example Queries */}
              <Card className="lg:col-span-3 bg-white border-ghost-300 p-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Example Queries</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {config.exampleQueries.map((query, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-terminal-surface border border-terminal-border rounded text-sm text-purple-500 font-mono"
                    >
                      <span className="text-text-muted mr-2">•</span>
                      {query}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Tasks Tab */}
        {tabVisibility.tasks && (
          <TabsContent value="tasks">
            <div className="space-y-6">
              <TaskSubmissionForm agentType={config.agentType} />
              <TaskQueueTable agentType={config.agentType} />
            </div>
          </TabsContent>
        )}

        {/* Insights Tab */}
        {tabVisibility.insights && (
          <TabsContent value="insights">
            <InsightTable agentType={config.agentType} />
          </TabsContent>
        )}

        {/* Memory Tab */}
        {tabVisibility.memory && (
          <TabsContent value="memory">
            <MemoryViewer agentType={config.agentType} />
          </TabsContent>
        )}

        {/* Config Tab */}
        {tabVisibility.config && (
          <TabsContent value="config">
            <ConfigurationPanel agentType={config.agentType} />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {tabVisibility.analytics && (
          <TabsContent value="analytics">
            <PerformanceCharts agentType={config.agentType} />
          </TabsContent>
        )}

        {/* Logs Tab */}
        {tabVisibility.logs && (
          <TabsContent value="logs">
            <LogViewer agentType={config.agentType} />
          </TabsContent>
        )}

        {/* Custom Tabs */}
        {config.customTabs?.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {/* Additional children content */}
      {children}
    </div>
  );
}
