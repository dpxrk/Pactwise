'use client';

import React, { useState, useCallback } from "react";
import { Bot, AlertCircle, Loader2 } from "lucide-react";

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
    system: { isRunning: false },
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading agent system...</p>
      </div>
    );
  }

  // Remove error handling since we're not using a separate error state

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Bot className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">AI Agent Management</h1>
      </div>

      {/* Message Display */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
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
              <div className="col-span-full text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No agents found. Initialize the system to get started.</p>
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
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No insights generated yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
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
  );
};

export default AgentDashboard;
