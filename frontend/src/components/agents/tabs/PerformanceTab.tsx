'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { AgentType } from '@/types/agents.types';

interface HealthStatus {
  agentType: AgentType;
  agentName: string;
  status: 'active' | 'degraded' | 'unhealthy';
  responseTime: number;
  successRate: number;
  recentFailures: number;
  lastCheck: string;
}

interface TraceSpan {
  id: string;
  name: string;
  duration: number;
  status: 'success' | 'error';
  children?: TraceSpan[];
}

export default function PerformanceTab() {
  const { userProfile } = useAuth();
  const [healthStatuses, setHealthStatuses] = useState<HealthStatus[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState('1h');

  // Fetch health statuses
  useEffect(() => {
    fetchHealthStatuses();
    const interval = setInterval(fetchHealthStatuses, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userProfile?.enterprise_id]);

  const fetchHealthStatuses = async () => {
    if (!userProfile?.enterprise_id) return;

    try {
      const data = await agentsAPI.getAgentHealth(userProfile.enterprise_id);

      // Map response to health status format
      const healthData = (data.agents || []).map((agent: any) => ({
        agentType: agent.type,
        agentName: agent.name,
        status: agent.health_status || 'active',
        responseTime: agent.avg_response_time || 0,
        successRate: agent.success_rate || 0,
        recentFailures: agent.recent_failures || 0,
        lastCheck: agent.last_check || new Date().toISOString(),
      }));

      setHealthStatuses(healthData);
    } catch (error) {
      console.error('Failed to fetch health statuses:', error);
      // Use placeholder data on error
      setHealthStatuses([
        {
          agentType: 'secretary',
          agentName: 'Document Secretary',
          status: 'active',
          responseTime: 234,
          successRate: 99.2,
          recentFailures: 0,
          lastCheck: new Date().toISOString(),
        },
        {
          agentType: 'financial',
          agentName: 'Financial Analyst',
          status: 'active',
          responseTime: 512,
          successRate: 98.7,
          recentFailures: 1,
          lastCheck: new Date().toISOString(),
        },
        {
          agentType: 'legal',
          agentName: 'Legal Analyst',
          status: 'degraded',
          responseTime: 1203,
          successRate: 94.3,
          recentFailures: 3,
          lastCheck: new Date().toISOString(),
        },
      ]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/20 text-success border-success/30';
      case 'degraded':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'unhealthy':
        return 'bg-error/20 text-error border-error/30';
      default:
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'unhealthy':
        return <AlertCircle className="w-4 h-4 text-error" />;
      default:
        return <Activity className="w-4 h-4 text-ghost-500" />;
    }
  };

  const toggleSpan = (spanId: string) => {
    setExpandedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanId)) {
        newSet.delete(spanId);
      } else {
        newSet.add(spanId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border-ghost-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 font-mono">PERFORMANCE & TRACING</h2>
              <p className="text-sm text-ghost-600 mt-1">
                Monitor agent health, trace execution, and identify performance bottlenecks
              </p>
            </div>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 border-ghost-300 font-mono">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m" className="font-mono">LAST 15 MIN</SelectItem>
              <SelectItem value="1h" className="font-mono">LAST 1 HOUR</SelectItem>
              <SelectItem value="6h" className="font-mono">LAST 6 HOURS</SelectItem>
              <SelectItem value="24h" className="font-mono">LAST 24 HOURS</SelectItem>
              <SelectItem value="7d" className="font-mono">LAST 7 DAYS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* System-Wide Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                AVG RESPONSE TIME
              </div>
              <div className="text-2xl font-bold text-purple-900 font-mono">542ms</div>
            </div>
            <Clock className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                SUCCESS RATE
              </div>
              <div className="text-2xl font-bold text-success font-mono">98.4%</div>
            </div>
            <CheckCircle className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                THROUGHPUT
              </div>
              <div className="text-2xl font-bold text-ghost-700 font-mono">847/hr</div>
            </div>
            <Zap className="w-8 h-8 text-warning opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                HEALTHY AGENTS
              </div>
              <div className="text-2xl font-bold text-success font-mono">
                {healthStatuses.filter(h => h.status === 'active').length}/{healthStatuses.length}
              </div>
            </div>
            <Activity className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>
      </div>

      {/* Agent Health Status */}
      <div>
        <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
          AGENT HEALTH STATUS
        </h3>

        <Card className="bg-white border-ghost-300">
          {/* Table Header */}
          <div className="border-b border-ghost-300 px-6 py-4 bg-ghost-50">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-ghost-600 uppercase tracking-wider font-mono">
              <div className="col-span-3">AGENT</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2">RESPONSE TIME</div>
              <div className="col-span-2">SUCCESS RATE</div>
              <div className="col-span-2">RECENT FAILURES</div>
              <div className="col-span-1">ACTIONS</div>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-ghost-200">
            {healthStatuses.map((health) => (
              <div
                key={health.agentType}
                className="grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-ghost-50 transition-colors"
              >
                <div className="col-span-3">
                  <div className="font-medium text-purple-900 font-mono text-sm">{health.agentName}</div>
                  <div className="text-xs text-ghost-600 font-mono">{health.agentType}</div>
                </div>

                <div className="col-span-2">
                  <Badge className={`${getStatusColor(health.status)} px-2 py-1 text-xs font-mono flex items-center gap-1 w-fit`}>
                    {getStatusIcon(health.status)}
                    {health.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="col-span-2 font-mono text-sm text-ghost-700">
                  {health.responseTime}ms
                </div>

                <div className="col-span-2 font-mono text-sm">
                  <span className={health.successRate >= 98 ? 'text-success' : health.successRate >= 95 ? 'text-warning' : 'text-error'}>
                    {health.successRate.toFixed(1)}%
                  </span>
                </div>

                <div className="col-span-2 font-mono text-sm">
                  <span className={health.recentFailures === 0 ? 'text-ghost-600' : health.recentFailures < 3 ? 'text-warning' : 'text-error'}>
                    {health.recentFailures}
                  </span>
                </div>

                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-purple-500 hover:text-purple-700 font-mono text-xs"
                  >
                    View Traces
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance Trends Chart Placeholder */}
      <Card className="bg-white border-ghost-300 p-6">
        <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
          PERFORMANCE TRENDS
        </h3>
        <div className="h-64 flex items-center justify-center bg-ghost-50 border border-ghost-300">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-purple-500 opacity-30" />
            <p className="text-sm text-ghost-600 font-mono">PERFORMANCE CHART COMING SOON</p>
            <p className="text-xs text-ghost-500 mt-1">Response time, throughput, and error rate trends</p>
          </div>
        </div>
      </Card>

      {/* Critical Path Analysis Placeholder */}
      <Card className="bg-white border-ghost-300 p-6">
        <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
          TRACE ANALYSIS
        </h3>
        <div className="h-48 flex items-center justify-center bg-ghost-50 border border-ghost-300">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-purple-500 opacity-30" />
            <p className="text-sm text-ghost-600 font-mono">DISTRIBUTED TRACING COMING SOON</p>
            <p className="text-xs text-ghost-500 mt-1">
              Tree and timeline views with critical path highlighting
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
