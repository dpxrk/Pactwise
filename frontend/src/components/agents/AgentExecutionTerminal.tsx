'use client';

import React, { useState } from 'react';

import type { AgentType, LogLevel } from '@/types/agents.types';

export interface ExecutionLog {
  id: string;
  agentName: string;
  agentType: AgentType;
  level: LogLevel;
  message: string;
  tool?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  timestamp: string;
  error?: string;
  step?: number;
  totalSteps?: number;
}

export interface AgentExecutionTerminalProps {
  logs: ExecutionLog[];
  isLive?: boolean;
  maxHeight?: string;
}

const AgentExecutionTerminal: React.FC<AgentExecutionTerminalProps> = ({
  logs,
  isLive = false,
  maxHeight = '600px'
}) => {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleExpanded = (logId: string) => {
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

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'text-ghost-500';
      case 'info':
        return 'text-purple-500';
      case 'warn':
        return 'text-warning';
      case 'error':
      case 'critical':
        return 'text-error';
      default:
        return 'text-text-secondary';
    }
  };

  const getLevelBadgeColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
      case 'info':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'warn':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'error':
      case 'critical':
        return 'bg-error/20 text-error border-error/30';
      default:
        return 'bg-text-secondary/20 text-text-secondary border-text-secondary/30';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="terminal-panel rounded overflow-hidden">
      {/* Header */}
      <div className="border-b border-terminal-border bg-terminal-surface px-4 py-3 flex items-center justify-between">
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
          <h3 className="text-sm font-semibold text-text-primary">Agent Execution Monitor</h3>
        </div>

        {isLive && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success status-pulse" />
            <span className="text-xs text-text-tertiary">Live</span>
          </div>
        )}
      </div>

      {/* Log Stream */}
      <div
        className="terminal-scrollbar overflow-y-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No execution logs</p>
            <p className="text-xs text-text-muted mt-1">Logs will appear here when agents run</p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const hasDetails = log.parameters || log.result || log.error;

            return (
              <div
                key={log.id}
                className="border-b border-terminal-border last:border-b-0 hover:bg-terminal-hover state-transition"
              >
                {/* Main Log Line */}
                <div
                  className={`p-3 ${hasDetails ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDetails && toggleExpanded(log.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Timestamp */}
                    <span className="text-text-muted shrink-0 w-24">
                      {formatTimestamp(log.timestamp)}
                    </span>

                    {/* Level Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase border shrink-0 ${getLevelBadgeColor(log.level)}`}
                    >
                      {log.level}
                    </span>

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-purple-500 font-semibold">
                          [{log.agentType}]
                        </span>
                        <span className="text-text-secondary">{log.agentName}</span>
                        {log.step && log.totalSteps && (
                          <span className="text-text-muted">
                            ({log.step}/{log.totalSteps})
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <div className={`${getLevelColor(log.level)}`}>
                        {log.tool && (
                          <span className="text-success mr-2">
                            ▸ {log.tool}
                          </span>
                        )}
                        {log.message}
                      </div>

                      {/* Duration */}
                      {log.duration && (
                        <span className="text-text-muted ml-2">
                          ({formatDuration(log.duration)})
                        </span>
                      )}
                    </div>

                    {/* Expand Icon */}
                    {hasDetails && (
                      <svg
                        className={`w-4 h-4 text-text-tertiary shrink-0 state-transition ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && hasDetails && (
                  <div className="px-3 pb-3 border-t border-terminal-border bg-terminal-surface">
                    {log.parameters && (
                      <div className="mt-2">
                        <div className="text-text-tertiary mb-1">Parameters:</div>
                        <pre className="text-purple-500 ml-4 overflow-x-auto">
                          {String(JSON.stringify(log.parameters, null, 2))}
                        </pre>
                      </div>
                    )}

                    {log.result ? (
                      <div className="mt-2">
                        <div className="text-text-tertiary mb-1">Result:</div>
                        <pre className="text-success ml-4 overflow-x-auto">
                          {String(JSON.stringify(log.result, null, 2))}
                        </pre>
                      </div>
                    ) : null}

                    {log.error && (
                      <div className="mt-2">
                        <div className="text-error mb-1">Error:</div>
                        <pre className="text-error ml-4 overflow-x-auto whitespace-pre-wrap">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgentExecutionTerminal;
