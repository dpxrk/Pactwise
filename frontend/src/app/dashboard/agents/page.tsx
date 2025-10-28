'use client';

import React, { useState, useCallback } from "react";
import { Bot, AlertCircle, Loader2, Activity, Settings, Brain, FileText } from "lucide-react";

import AgentCard from "@/app/_components/agents/AgentCard";
import AgentConfigurationPanel from "@/app/_components/agents/AgentConfigurationPanel";
import AgentLogViewer from "@/app/_components/agents/AgentLogViewer";
import AgentSystemStatus from "@/app/_components/agents/AgentSystemStatus";
import InsightCard from "@/app/_components/agents/InsightCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Agent, AgentSystemStatusResponse } from "@/types/agents.types";
import type { Id } from '@/types/id.types';

const AgentDashboard = () => {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data until API is connected
  const systemStatusQuery = {
    system: {
      isRunning: false,
      status: 'stopped' // Fix: Added missing status field
    },
    stats: {
      activeAgents: 0,
      activeTasks: 0,
      recentInsights: 0,
      processedTasks: 0
    },
    agents: []
  };
  const systemStatus = systemStatusQuery;
  const isLoading = false;
  const error = null;

  // Fetch recent insights
  const recentInsights: any[] = [];

  // Fetch recent logs  
  const recentLogs: any[] = [];

  // Mock mutations until API is connected
  const placeholder = { execute: async () => ({}), isLoading: false };
  const initializeSystem = placeholder;
  const startSystem = placeholder;
  const stopSystem = placeholder;
  const toggleAgent = placeholder;
  const createTestInsight = placeholder;
  const markInsightAsRead = placeholder;

  const handleInitialize = async () => {
    setMessage(null);
    try {
      // Mock implementation
      setMessage({ type: 'success', text: 'System initialized successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to initialize' });
    }
  };

  const handleStartSystem = async () => {
    try {
      // Mock implementation
      setMessage({ type: 'success', text: 'System started successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start system' });
    }
  };

  const handleStopSystem = async () => {
    try {
      // Mock implementation
      setMessage({ type: 'success', text: 'System stopped successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to stop system' });
    }
  };

  const handleToggleAgent = async (agentId: string, enabled: boolean) => {
    try {
      // Mock implementation
      setMessage({ type: 'success', text: `Agent ${enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to toggle agent' });
    }
  };

  const handleCreateTestInsight = async () => {
    try {
      // Mock implementation
      setMessage({ type: 'success', text: 'Test insight created successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create test insight' });
    }
  };

  const handleMarkAsRead = async (insightId: string) => {
    try {
      // Mock implementation
      console.log('Marking insight as read:', insightId);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to mark insight as read' });
    }
  };

  const handleRefreshStatus = useCallback(async () => {
    setMessage(null);
    setIsRefreshing(true);
    
    // we simulate a refresh with a brief loading state and success message
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief loading
      setMessage({ type: 'success', text: 'Status refreshed successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to refresh status' });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleExportLogs = () => {
    // Export logs functionality
    setMessage({ type: 'success', text: 'Log export feature coming soon' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen bg-ghost-100">
        <div className="border border-ghost-300 bg-white p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-900" />
          <p className="font-mono text-xs uppercase text-ghost-700">Loading agent system...</p>
        </div>
      </div>
    );
  }

  // Remove error handling since we're not using a separate error state

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 ${systemStatus?.system?.isRunning ? 'bg-green-500 animate-pulse' : 'bg-ghost-400'}`}></div>
              <span className="font-mono text-xs text-ghost-700 uppercase">
                {systemStatus?.system?.isRunning ? 'AGENT SYSTEM ACTIVE' : 'AGENT SYSTEM STOPPED'}
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active Agents:</span>
              <span className="font-semibold text-purple-900">{systemStatus?.stats?.activeAgents || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active Tasks:</span>
              <span className="font-semibold text-purple-900">{systemStatus?.stats?.activeTasks || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Insights:</span>
              <span className="font-semibold text-purple-900">{systemStatus?.stats?.recentInsights || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-purple-900" />
            <div>
              <h1 className="text-2xl font-bold text-purple-900">AI AGENT MANAGEMENT</h1>
              <p className="font-mono text-xs text-ghost-600 uppercase mt-1">System configuration and monitoring</p>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`border-l-4 ${message.type === 'error' ? 'border-red-600' : 'border-green-600'} bg-white border border-ghost-300 p-4`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={`h-5 w-5 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
              <div>
                <div className="font-mono text-xs uppercase text-ghost-700 mb-1">
                  {message.type === 'error' ? 'ERROR' : 'SUCCESS'}
                </div>
                <div className="text-sm text-ghost-900">{message.text}</div>
              </div>
            </div>
          </div>
        )}

      {/* System Status */}
      <AgentSystemStatus
        systemStatus={systemStatus as AgentSystemStatusResponse || null}
        onStartSystem={handleStartSystem}
        onStopSystem={handleStopSystem}
        onInitializeSystem={handleInitialize}
        onRefreshStatus={handleRefreshStatus}
        loading={isLoading || isRefreshing}
        startLoading={startSystem.isLoading}
        stopLoading={stopSystem.isLoading}
        initLoading={initializeSystem.isLoading}
      />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span>Agents</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Insights</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Agents */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Agent Activity</h3>
              {systemStatus?.agents && systemStatus.agents.length > 0 ? (
                <div className="space-y-3">
                  {systemStatus.agents.slice(0, 3).map((agent) => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      onToggleAgent={handleToggleAgent}
                      loading={toggleAgent.isLoading}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No agents available</p>
              )}
            </div>

            {/* Recent Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Latest Insights</h3>
              {recentInsights && recentInsights.length > 0 ? (
                <div className="space-y-3">
                  {recentInsights.slice(0, 3).map((insight) => (
                    <InsightCard
                      key={insight._id}
                      insight={insight}
                      onMarkAsRead={handleMarkAsRead}
                      loading={markInsightAsRead.isLoading}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No insights generated yet</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemStatus?.agents && systemStatus.agents.length > 0 ? (
              systemStatus.agents.map((agent) => (
                <AgentCard
                  key={agent._id}
                  agent={agent}
                  onToggleAgent={handleToggleAgent}
                  loading={toggleAgent.isLoading}
                />
              ))
            ) : (
              <div className="col-span-full border border-ghost-300 bg-white p-12 text-center">
                <Bot className="h-12 w-12 text-ghost-400 mx-auto mb-4" />
                <p className="font-mono text-xs uppercase text-ghost-600">No agents found. Initialize the system to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <AgentConfigurationPanel />
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {recentInsights && recentInsights.length > 0 ? (
            <div className="space-y-4">
              {recentInsights.map((insight) => (
                <InsightCard
                  key={insight._id}
                  insight={insight}
                  onMarkAsRead={handleMarkAsRead}
                  loading={markInsightAsRead.isLoading}
                />
              ))}
            </div>
          ) : (
            <div className="border border-ghost-300 bg-white p-12 text-center">
              <Brain className="h-12 w-12 text-ghost-400 mx-auto mb-4" />
              <p className="font-mono text-xs uppercase text-ghost-700 mb-2">No insights generated yet.</p>
              <p className="font-mono text-xs text-ghost-600">
                Insights will appear here once the agent system is running.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <AgentLogViewer
            logs={recentLogs || []}
            onRefresh={handleRefreshStatus}
            onExportLogs={handleExportLogs}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
};

export default AgentDashboard;
