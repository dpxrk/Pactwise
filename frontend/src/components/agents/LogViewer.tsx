'use client';

import { Pause, Play, Trash2, Download } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { AgentType, LogLevel } from '@/types/agents.types';
import { createClient } from '@/utils/supabase/client';

interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  category?: string;
  source?: string;
  task_id?: string;
}

interface LogViewerProps {
  agentType: AgentType;
  maxLogs?: number;
}

/**
 * Real-time log viewer with Bloomberg Terminal aesthetic
 * Monospace terminal-style display with filtering
 */
export default function LogViewer({ agentType, maxLogs = 100 }: LogViewerProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const enterpriseId = user?.user_metadata?.enterprise_id;

  useEffect(() => {
    loadLogs();

    if (!isPaused) {
      // Subscribe to real-time updates
      const channel = supabase
        .channel(`logs-${agentType}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_logs',
            filter: `enterprise_id=eq.${enterpriseId}`,
          },
          (payload) => {
            const newLog = payload.new as LogEntry;

            // Check if it's for this agent type
            if (filterLevel === 'all' || newLog.level === filterLevel) {
              setLogs((prev) => {
                const updated = [...prev, newLog].slice(-maxLogs);
                return updated;
              });
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }

    return undefined;
  }, [agentType, enterpriseId, isPaused, filterLevel]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogs = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single() as { data: { id: string } | null };

      if (!agentData) return;

      // Fetch logs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('agent_logs')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('agent_id', agentData.id)
        .order('timestamp', { ascending: true })
        .limit(maxLogs);

      if (filterLevel !== 'all') {
        query = query.eq('level', filterLevel);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data as LogEntry[]) || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const clearLogs = () => {
    if (confirm('Clear all logs?')) {
      setLogs([]);
    }
  };

  const exportLogs = () => {
    const logText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}${
            log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''
          }`
      )
      .join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentType}-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'critical':
        return 'text-error font-semibold';
      case 'error':
        return 'text-error';
      case 'warn':
        return 'text-warning';
      case 'info':
        return 'text-purple-500';
      default:
        return 'text-text-muted';
    }
  };

  const getLevelBadgeColor = (level: LogLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-error text-white';
      case 'error':
        return 'bg-error/80 text-white';
      case 'warn':
        return 'bg-warning/80 text-white';
      case 'info':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-ghost-600 text-white';
    }
  };

  return (
    <Card className="bg-white border-ghost-300">
      {/* Controls */}
      <div className="border-b border-ghost-300 px-6 py-3 bg-ghost-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-text-primary">Execution Logs</h3>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 border-ghost-300"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              className="h-8 border-ghost-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              className="h-8 border-ghost-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select value={filterLevel} onValueChange={(v: LogLevel | 'all') => setFilterLevel(v)}>
            <SelectTrigger className="w-40 h-8 border-ghost-300 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-ghost-300"
            />
            Auto-scroll
          </label>

          <Badge className="bg-ghost-700 text-white px-2 py-1 font-mono text-xs">
            {logs.length} / {maxLogs}
          </Badge>
        </div>
      </div>

      {/* Log Display - Terminal Style */}
      <div className="bg-terminal-surface h-96 overflow-y-auto font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted">
            No logs available. Logs will appear here as the agent executes tasks.
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {logs.map((log) => {
              const timestamp = new Date(log.timestamp);

              return (
                <div key={log.id} className="flex items-start gap-3 hover:bg-ghost-100/50 px-2 py-1">
                  {/* Timestamp */}
                  <span className="text-text-muted whitespace-nowrap">
                    {timestamp.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>

                  {/* Level Badge */}
                  <span
                    className={`${getLevelBadgeColor(
                      log.level
                    )} px-2 py-0.5 uppercase text-[10px] font-semibold whitespace-nowrap`}
                  >
                    {log.level}
                  </span>

                  {/* Category */}
                  {log.category && (
                    <span className="text-purple-500 whitespace-nowrap">[{log.category}]</span>
                  )}

                  {/* Message */}
                  <span className={getLevelColor(log.level)}>{log.message}</span>

                  {/* Data (if present) */}
                  {log.data && Object.keys(log.data).length > 0 && (
                    <details className="text-text-muted cursor-pointer ml-4">
                      <summary className="text-purple-500 hover:text-purple-600">
                        +data
                      </summary>
                      <pre className="mt-1 ml-4 text-[10px] overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-ghost-300 px-6 py-2 bg-ghost-50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-text-muted">
          <span className="font-mono">
            Debug: <span className="text-text-secondary">{logs.filter((l) => l.level === 'debug').length}</span>
          </span>
          <span className="font-mono">
            Info: <span className="text-purple-500">{logs.filter((l) => l.level === 'info').length}</span>
          </span>
          <span className="font-mono">
            Warn: <span className="text-warning">{logs.filter((l) => l.level === 'warn').length}</span>
          </span>
          <span className="font-mono">
            Error: <span className="text-error">{logs.filter((l) => l.level === 'error' || l.level === 'critical').length}</span>
          </span>
        </div>

        <div className="text-text-muted">
          {isPaused ? (
            <span className="text-warning">● Paused</span>
          ) : (
            <span className="text-success">● Live</span>
          )}
        </div>
      </div>
    </Card>
  );
}
