'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { AgentType } from '@/types/agents.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PerformanceMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgExecutionTime: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
  dailyStats: Array<{
    date: string;
    completed: number;
    failed: number;
    avgTime: number;
  }>;
}

interface PerformanceChartsProps {
  agentType: AgentType;
}

/**
 * Performance analytics with Bloomberg Terminal aesthetic
 * Dense charts, monospace metrics, purple/pink color scheme
 */
export default function PerformanceCharts({ agentType }: PerformanceChartsProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
    successRate: 0,
    trend: 'stable',
    dailyStats: [],
  });

  const enterpriseId = user?.user_metadata?.enterprise_id;

  useEffect(() => {
    loadPerformanceData();
  }, [agentType, enterpriseId, timeRange]);

  const loadPerformanceData = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single();

      if (!agentData) return;

      // Calculate date range
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch tasks in range
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('agent_id', agentData.id)
        .gte('created_at', startDate.toISOString());

      if (!tasks) return;

      // Calculate metrics
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const failed = tasks.filter((t) => t.status === 'failed' || t.status === 'timeout').length;

      const executionTimes = tasks
        .filter((t) => t.started_at && t.completed_at)
        .map((t) => {
          const start = new Date(t.started_at!).getTime();
          const end = new Date(t.completed_at!).getTime();
          return (end - start) / 1000; // seconds
        });

      const avgTime =
        executionTimes.length > 0
          ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
          : 0;

      // Calculate trend (compare last week vs previous week)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const lastWeekCompleted = tasks.filter(
        (t) => t.status === 'completed' && new Date(t.created_at) >= weekAgo
      ).length;
      const prevWeekCompleted = tasks.filter(
        (t) =>
          t.status === 'completed' &&
          new Date(t.created_at) >= twoWeeksAgo &&
          new Date(t.created_at) < weekAgo
      ).length;

      const trend =
        lastWeekCompleted > prevWeekCompleted * 1.1
          ? 'up'
          : lastWeekCompleted < prevWeekCompleted * 0.9
          ? 'down'
          : 'stable';

      // Build daily stats (simple aggregation)
      const dailyMap = new Map<string, { completed: number; failed: number; times: number[] }>();
      tasks.forEach((task) => {
        const date = new Date(task.created_at).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { completed: 0, failed: 0, times: [] });
        }
        const stats = dailyMap.get(date)!;
        if (task.status === 'completed') stats.completed++;
        if (task.status === 'failed' || task.status === 'timeout') stats.failed++;
        if (task.started_at && task.completed_at) {
          const time = (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000;
          stats.times.push(time);
        }
      });

      const dailyStats = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          completed: stats.completed,
          failed: stats.failed,
          avgTime: stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-daysAgo);

      setMetrics({
        totalTasks: tasks.length,
        completedTasks: completed,
        failedTasks: failed,
        avgExecutionTime: avgTime,
        successRate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
        trend,
        dailyStats,
      });
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="text-center py-12 text-text-muted">Loading analytics...</div>
      </Card>
    );
  }

  const maxCompletedInDay = Math.max(...metrics.dailyStats.map((d) => d.completed), 1);
  const maxFailedInDay = Math.max(...metrics.dailyStats.map((d) => d.failed), 1);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-purple-900">Performance Analytics</h3>
        <Select
          value={timeRange}
          onValueChange={(v: '7d' | '30d' | '90d') => setTimeRange(v)}
        >
          <SelectTrigger className="w-40 border-ghost-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-muted uppercase tracking-wider">Total Tasks</div>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-900 metric-value">{metrics.totalTasks}</div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-muted uppercase tracking-wider">Success Rate</div>
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-bold text-success metric-value">
            {metrics.successRate.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1 mt-1">
            {metrics.trend === 'up' ? (
              <TrendingUp className="w-3 h-3 text-success" />
            ) : metrics.trend === 'down' ? (
              <TrendingDown className="w-3 h-3 text-error" />
            ) : (
              <Activity className="w-3 h-3 text-text-muted" />
            )}
            <span className="text-xs text-text-muted">
              {metrics.trend === 'up' ? 'Improving' : metrics.trend === 'down' ? 'Declining' : 'Stable'}
            </span>
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-muted uppercase tracking-wider">Avg Exec Time</div>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-text-primary metric-value">
            {metrics.avgExecutionTime.toFixed(1)}s
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-muted uppercase tracking-wider">Failed Tasks</div>
            <XCircle className="w-4 h-4 text-error" />
          </div>
          <div className="text-2xl font-bold text-error metric-value">{metrics.failedTasks}</div>
        </Card>
      </div>

      {/* Daily Task Chart - Bloomberg style simple bars */}
      <Card className="bg-white border-ghost-300 p-6">
        <h4 className="text-sm font-semibold text-text-primary mb-4">Daily Task Execution</h4>

        {metrics.dailyStats.length > 0 ? (
          <div className="space-y-6">
            {/* Chart */}
            <div className="h-48 flex items-end justify-between gap-1">
              {metrics.dailyStats.map((stat, idx) => {
                const completedHeight = (stat.completed / maxCompletedInDay) * 100;
                const failedHeight = (stat.failed / maxFailedInDay) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    {/* Bars */}
                    <div className="w-full flex flex-col items-center gap-0.5">
                      {stat.completed > 0 && (
                        <div
                          className="w-full bg-purple-500 transition-all hover:bg-purple-600"
                          style={{ height: `${completedHeight}%` }}
                          title={`${stat.completed} completed`}
                        />
                      )}
                      {stat.failed > 0 && (
                        <div
                          className="w-full bg-error transition-all hover:bg-error/80"
                          style={{ height: `${failedHeight}%` }}
                          title={`${stat.failed} failed`}
                        />
                      )}
                    </div>

                    {/* Date Label */}
                    <div className="text-[9px] text-text-muted font-mono transform -rotate-45 origin-top-left whitespace-nowrap mt-2">
                      {new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500" />
                <span className="text-text-muted">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-error" />
                <span className="text-text-muted">Failed</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            No task data available for selected period.
          </div>
        )}
      </Card>

      {/* Performance Summary Table */}
      <Card className="bg-white border-ghost-300">
        <div className="border-b border-ghost-300 px-6 py-3 bg-ghost-100">
          <h4 className="text-sm font-semibold text-text-primary">Recent Daily Stats</h4>
        </div>
        <div className="divide-y divide-ghost-200">
          {metrics.dailyStats.slice(-7).reverse().map((stat, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 px-6 py-3 text-sm hover:bg-ghost-50">
              <div className="font-mono text-text-secondary">
                {new Date(stat.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 px-2 py-0.5">
                  {stat.completed} Completed
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-error/20 text-error border-error/30 px-2 py-0.5">
                  {stat.failed} Failed
                </Badge>
              </div>
              <div className="font-mono text-text-secondary text-right">
                {stat.avgTime > 0 ? `${stat.avgTime.toFixed(1)}s avg` : '-'}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
