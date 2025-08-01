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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Settings,
  Pause,
  BarChart3,
} from "lucide-react";
import { Agent, AgentStatus, AGENT_TYPE_LABELS, STATUS_COLORS } from "@/types/agents.types";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: Agent;
  onToggleAgent?: (agentId: string, enabled: boolean) => void;
  onConfigureAgent?: (agentId: string) => void;
  onViewDetails?: (agentId: string) => void;
  loading?: boolean;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onToggleAgent,
  onConfigureAgent,
  onViewDetails,
  loading = false,
}) => {
  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'busy':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'disabled':
        return <Pause className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPerformanceScore = () => {
    if (agent.runCount === 0) return 0;
    const successRate = ((agent.runCount - agent.errorCount) / agent.runCount) * 100;
    return Math.round(successRate);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return "Never";
    const date = new Date(lastRun);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const performanceScore = getPerformanceScore();

  return (
    <Card className={cn(
      "transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 cursor-pointer group",
      !agent.isEnabled && "opacity-75",
      agent.status === 'error' && "border-red-200 bg-red-50/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bot className={cn(
                "h-8 w-8 transition-transform duration-300 group-hover:scale-110",
                agent.isEnabled ? "text-primary" : "text-gray-400"
              )} />
              <div className="absolute -bottom-1 -right-1">
                {getStatusIcon(agent.status)}
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                {agent.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {AGENT_TYPE_LABELS[agent.type]}
              </p>
            </div>
          </div>
          <Badge className={STATUS_COLORS[agent.status]}>
            {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {agent.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Performance</span>
            <span className={cn("text-sm font-bold", getPerformanceColor(performanceScore))}>
              {performanceScore}%
            </span>
          </div>
          <Progress 
            value={performanceScore} 
            className="h-2"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Runs:</span>
              <span className="font-medium">{agent.runCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Errors:</span>
              <span className={cn(
                "font-medium",
                agent.errorCount > 0 ? "text-red-600" : "text-green-600"
              )}>
                {agent.errorCount}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">{agent.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Run:</span>
              <span className="font-medium">{formatLastRun(agent.lastRun)}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {agent.lastError && agent.status === 'error' && (
          <div className="flex items-start space-x-2 p-2 bg-red-50 rounded-md border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 line-clamp-2">
              {agent.lastError}
            </p>
          </div>
        )}

        {/* Agent Metrics */}
        {agent.metrics && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Metrics</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {agent.metrics.insightsGenerated !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insights:</span>
                  <span className="font-medium">{agent.metrics.insightsGenerated}</span>
                </div>
              )}
              {agent.metrics.averageRunTime !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Time:</span>
                  <span className="font-medium">{Math.round(agent.metrics.averageRunTime / 1000)}s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleAgent?.(agent._id, !agent.isEnabled)}
            disabled={loading}
            className="flex items-center space-x-1"
          >
            {agent.isEnabled ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            <span>{agent.isEnabled ? 'Disable' : 'Enable'}</span>
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onConfigureAgent?.(agent._id)}
              disabled={loading}
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(agent._id)}
              disabled={loading}
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentCard;