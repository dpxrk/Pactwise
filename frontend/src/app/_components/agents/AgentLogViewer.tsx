'use client'

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Zap,
  Search,
  Filter,
  Download,
  Clock,
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { LogLevel, LOG_LEVEL_COLORS } from "@/types/agents.types";
import { cn } from "@/lib/utils";

interface LogEntry {
  _id: string;
  agentId: string;
  agentName: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  taskId?: string;
  category?: string;
  source?: string;
  data?: unknown;
}

interface AgentLogViewerProps {
  logs: LogEntry[];
  onRefresh?: () => void;
  onExportLogs?: () => void;
  loading?: boolean;
}

export const AgentLogViewer: React.FC<AgentLogViewerProps> = ({
  logs,
  onRefresh,
  onExportLogs,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warn':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'debug':
        return <Bug className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Get unique agents for filter
  const uniqueAgents = Array.from(new Set(logs.map(log => log.agentName))).sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesAgent = agentFilter === 'all' || log.agentName === agentFilter;
    
    return matchesSearch && matchesLevel && matchesAgent;
  });

  // Group logs by level for stats
  const logStats = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<LogLevel, number>);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Agent System Logs</span>
              <Badge variant="outline">
                {filteredLogs.length} of {logs.length}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportLogs}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Log Level Stats */}
          <div className="flex items-center space-x-4">
            {Object.entries(logStats).map(([level, count]) => (
              <div
                key={level}
                className="flex items-center space-x-2"
              >
                {getLogIcon(level as LogLevel)}
                <Badge className={LOG_LEVEL_COLORS[level as LogLevel]}>
                  {level.toUpperCase()}: {count}
                </Badge>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Log Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {uniqueAgents.map(agent => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log._id);
            const hasExtraData = log.data && Object.keys(log.data).length > 0;
            
            return (
              <Card
                key={log._id}
                className={cn(
                  "transition-all duration-200",
                  log.level === 'error' && 'border-red-200 bg-red-50/50',
                  log.level === 'critical' && 'border-red-300 bg-red-100/50',
                  log.level === 'warn' && 'border-yellow-200 bg-yellow-50/50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        LOG_LEVEL_COLORS[log.level]
                      )}>
                        {getLogIcon(log.level)}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={LOG_LEVEL_COLORS[log.level]}
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-sm">{log.agentName}</span>
                          {log.category && (
                            <Badge variant="outline" className="text-xs">
                              {log.category}
                            </Badge>
                          )}
                          {log.taskId && (
                            <Badge variant="outline" className="text-xs">
                              Task: {log.taskId.slice(-8)}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm">
                          {log.message}
                        </p>
                        
                        {isExpanded && hasExtraData && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Additional Data:</h4>
                            <pre className="text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                      <span className="text-gray-400">
                        ({formatTimeAgo(log.timestamp)})
                      </span>
                      
                      {hasExtraData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLogExpansion(log._id)}
                          className="h-6 w-6 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {logs.length === 0 ? "No logs available." : "No logs match your filter criteria."}
              </p>
              {searchTerm || levelFilter !== 'all' || agentFilter !== 'all' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setLevelFilter("all");
                    setAgentFilter("all");
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AgentLogViewer;