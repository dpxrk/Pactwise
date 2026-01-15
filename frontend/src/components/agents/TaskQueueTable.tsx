'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  PlayCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { AgentType, AgentTask } from '@/types/agents.types';
import { createClient } from '@/utils/supabase/client';


interface TaskQueueTableProps {
  agentType: AgentType;
  limit?: number;
}

/**
 * Task queue table with Bloomberg Terminal aesthetic
 * Dense, monospace data, sharp edges, high information density
 */
export default function TaskQueueTable({ agentType, limit = 50 }: TaskQueueTableProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const enterpriseId = user?.user_metadata?.enterprise_id;

  // Load tasks
  useEffect(() => {
    loadTasks();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`tasks-${agentType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_tasks',
          filter: `enterprise_id=eq.${enterpriseId}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agentType, enterpriseId]);

  const loadTasks = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent ID for this type
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single() as { data: { id: string } | null };

      if (!agentData) {
        setTasks([]);
        return;
      }

      // Fetch tasks for this agent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setTasks((data as AgentTask[]) || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('agent_tasks')
        .update({ status: 'pending', retry_count: 0 })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task queued for retry');
      loadTasks();
    } catch (error) {
      console.error('Error retrying task:', error);
      toast.error('Failed to retry task');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('agent_tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('Task cancelled');
      loadTasks();
    } catch (error) {
      console.error('Error cancelling task:', error);
      toast.error('Failed to cancel task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase.from('agent_tasks').delete().eq('id', taskId);

      if (error) throw error;

      toast.success('Task deleted');
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="w-4 h-4 text-error" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-text-muted" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'text-error';
    if (priority >= 7) return 'text-warning';
    if (priority >= 5) return 'text-purple-500';
    return 'text-text-muted';
  };

  if (loading) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-3 text-text-muted">Loading tasks...</span>
        </div>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="text-center py-12 text-text-muted">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No tasks found. Submit a task to get started.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-ghost-300">
      {/* Header */}
      <div className="border-b border-ghost-300 px-6 py-4 bg-ghost-100">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-3">Task</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">Retry</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y divide-ghost-200">
        {tasks.map((task) => {
          const isExpanded = expandedTask === task._id;
          const createdAt = new Date(task.createdAt);
          const duration = task.completedAt
            ? Math.round((new Date(task.completedAt).getTime() - createdAt.getTime()) / 1000)
            : task.startedAt
            ? Math.round((Date.now() - new Date(task.startedAt).getTime()) / 1000)
            : null;

          return (
            <div key={task._id}>
              {/* Main Row */}
              <div className="grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-ghost-50 transition-colors text-sm">
                {/* Status */}
                <div className="col-span-1 flex items-center gap-2">
                  {getStatusIcon(task.status)}
                </div>

                {/* Priority */}
                <div className="col-span-1">
                  <span className={`font-mono font-semibold ${getPriorityColor(Number(task.priority) || 5)}`}>
                    P{task.priority || 5}
                  </span>
                </div>

                {/* Task Title/Type */}
                <div className="col-span-3">
                  <div className="font-medium text-text-primary truncate">
                    {task.title || task.taskType}
                  </div>
                  {task.description && (
                    <div className="text-xs text-text-tertiary truncate mt-0.5">
                      {task.description}
                    </div>
                  )}
                </div>

                {/* Created Time */}
                <div className="col-span-2 text-text-secondary font-mono text-xs">
                  {formatDistanceToNow(createdAt, { addSuffix: true })}
                </div>

                {/* Duration */}
                <div className="col-span-2 font-mono text-xs text-text-secondary">
                  {duration !== null ? `${Math.round(duration)}s` : '-'}
                </div>

                {/* Retry Count */}
                <div className="col-span-2 font-mono text-xs text-text-secondary">
                  {task.retryCount || 0}/{task.maxRetries || 3}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedTask(isExpanded ? null : task._id)}
                    className="h-7 w-7 p-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  {(task.status === 'failed' || task.status === 'timeout') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRetryTask(task._id)}
                      className="h-7 w-7 p-0"
                      title="Retry task"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </Button>
                  )}

                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelTask(task._id)}
                      className="h-7 w-7 p-0 text-error"
                      title="Cancel task"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTask(task._id)}
                    className="h-7 w-7 p-0 text-error"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 py-4 bg-terminal-surface border-t border-ghost-200">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                          Task ID
                        </div>
                        <div className="font-mono text-xs text-text-secondary">{task._id}</div>
                      </div>

                      {task.data && (
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                            Task Data
                          </div>
                          <pre className="font-mono text-xs text-purple-500 bg-ghost-100 p-2 border border-ghost-300 overflow-x-auto">
                            {JSON.stringify(task.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      {task.status === 'completed' && task.result && (
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                            Result
                          </div>
                          <pre className="font-mono text-xs text-success bg-ghost-100 p-2 border border-ghost-300 overflow-x-auto max-h-64">
                            {JSON.stringify(task.result, null, 2)}
                          </pre>
                        </div>
                      )}

                      {(task.status === 'failed' || task.status === 'timeout') && task.errorMessage && (
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                            Error
                          </div>
                          <div className="font-mono text-xs text-error bg-error/10 p-2 border border-error/30">
                            {task.errorMessage}
                          </div>
                        </div>
                      )}

                      {task.scheduledFor && (
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                            Scheduled For
                          </div>
                          <div className="font-mono text-xs text-text-secondary">
                            {new Date(task.scheduledFor).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-ghost-300 px-6 py-3 bg-ghost-50">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <div>Showing {tasks.length} tasks</div>
          <div className="flex items-center gap-4">
            <Badge className="bg-success/20 text-success border-success/30 px-2 py-0.5">
              {tasks.filter((t) => t.status === 'completed').length} Completed
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 px-2 py-0.5">
              {tasks.filter((t) => t.status === 'in_progress').length} In Progress
            </Badge>
            <Badge className="bg-error/20 text-error border-error/30 px-2 py-0.5">
              {tasks.filter((t) => t.status === 'failed' || t.status === 'timeout').length} Failed
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
