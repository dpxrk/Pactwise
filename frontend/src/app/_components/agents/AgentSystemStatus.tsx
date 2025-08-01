'use client'

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  TrendingUp,
  Users,
  Brain,
  Play,
  Square,
  Settings,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { AgentSystem, AgentSystemStatusResponse } from "@/types/agents.types";
import { cn } from "@/lib/utils";

interface AgentSystemStatusProps {
  systemStatus: AgentSystemStatusResponse | null;
  onStartSystem?: () => void;
  onStopSystem?: () => void;
  onInitializeSystem?: () => void;
  onRefreshStatus?: () => void;
  loading?: boolean;
  startLoading?: boolean;
  stopLoading?: boolean;
  initLoading?: boolean;
}

export const AgentSystemStatus: React.FC<AgentSystemStatusProps> = ({
  systemStatus,
  onStartSystem,
  onStopSystem,
  onInitializeSystem,
  onRefreshStatus,
  loading = false,
  startLoading = false,
  stopLoading = false,
  initLoading = false,
}) => {
  if (!systemStatus) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Agent System Not Initialized</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            The AI agent system hasn't been set up yet. Initialize it to start getting AI-powered 
            insights and automated contract analysis.
          </p>
          <Button 
            onClick={onInitializeSystem}
            disabled={initLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {initLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Initialize Agent System
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { system, stats } = systemStatus;
  
  if (!system) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">System Data Unavailable</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Unable to load agent system information. Please try refreshing.
          </p>
          <Button onClick={onRefreshStatus} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'starting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSystemStatusIcon = () => {
    if (!system) return <Activity className="h-5 w-5 text-gray-600" />;
    switch (system.status) {
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'stopped':
        return <Clock className="h-5 w-5 text-red-600" />;
      case 'starting':
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatUptime = () => {
    if (!system || !system.lastStarted || !system.isRunning) return "N/A";
    
    const startTime = new Date(system.lastStarted);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAgentHealthPercentage = () => {
    if (stats.totalAgents === 0) return 0;
    return Math.round((stats.activeAgents / stats.totalAgents) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Main System Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getSystemStatusIcon()}
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Agent System Status</span>
                  <Badge className={getSystemStatusColor(system.status)}>
                    {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered contract intelligence system
                </p>
              </div>
            </div>
            
            {/* System Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshStatus}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              
              {system.isRunning ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onStopSystem}
                  disabled={stopLoading}
                >
                  {stopLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Stop System
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onStartSystem}
                  disabled={startLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {startLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start System
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* System Uptime */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">System Uptime</span>
              </div>
              <p className="text-2xl font-bold">{formatUptime()}</p>
              {system.lastStarted && (
                <p className="text-xs text-muted-foreground">
                  Started: {new Date(system.lastStarted).toLocaleString()}
                </p>
              )}
            </div>

            {/* Agent Health */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Agent Health</span>
              </div>
              <p className="text-2xl font-bold">{getAgentHealthPercentage()}%</p>
              <div className="space-y-1">
                <Progress value={getAgentHealthPercentage()} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.activeAgents} of {stats.totalAgents} agents active
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Insights</span>
              </div>
              <p className="text-2xl font-bold">{stats.recentInsights}</p>
              <p className="text-xs text-muted-foreground">
                Generated in last 24h
              </p>
            </div>

            {/* Task Queue */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Task Queue</span>
              </div>
              <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              <p className="text-xs text-muted-foreground">
                Pending tasks
              </p>
            </div>
          </div>

          {/* Error Message */}
          {system.errorMessage && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">System Error</p>
                  <p className="text-sm text-red-700 mt-1">{system.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* System Metrics */}
          {system.metrics && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>System Metrics</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total Tasks Processed</span>
                  <p className="font-semibold">{system.metrics.totalTasksProcessed.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total Insights</span>
                  <p className="font-semibold">{system.metrics.totalInsightsGenerated.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Avg Task Duration</span>
                  <p className="font-semibold">
                    {system.metrics.averageTaskDuration 
                      ? `${Math.round(system.metrics.averageTaskDuration / 1000)}s`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Error Rate</span>
                  <p className={cn(
                    "font-semibold",
                    (system.metrics.errorRate || 0) > 0.1 ? "text-red-600" : "text-green-600"
                  )}>
                    {system.metrics.errorRate 
                      ? `${Math.round((system.metrics.errorRate || 0) * 100)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentSystemStatus;