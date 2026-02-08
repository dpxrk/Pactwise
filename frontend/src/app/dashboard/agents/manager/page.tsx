'use client';

import {
  Network,
  Activity,
  ListChecks,
  BarChart3,
  GitBranch,
  ArrowLeft,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { agentsAPI } from '@/lib/api/agents';

import { SwarmDebugPanel } from '@/components/agents/SwarmDebugPanel';
interface ProcessingResult {
  status: 'success' | 'error' | 'processing';
  data?: any;
  error?: string;
  processingTime?: number;
}

interface AgentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageProcessingTime: number;
  lastHeartbeat: string;
}

interface QueuedTask {
  id: string;
  agentType: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  assignedTo?: string;
  estimatedTime?: number;
}

interface WorkflowStep {
  order: number;
  agent: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

interface PerformanceMetric {
  agent: string;
  completionRate: number;
  averageTime: number;
  errorRate: number;
  tasksToday: number;
  trend: 'up' | 'down' | 'stable';
}

export default function ManagerAgentPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [managerQuery, setManagerQuery] = useState<string>('');
  const [activeCapability, setActiveCapability] = useState<string>('workflow-orchestration');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'workflow-orchestration',
      name: 'Workflow Orchestration',
      icon: GitBranch,
      description: 'Coordinate multi-agent workflows for complex processes',
    },
    {
      id: 'system-health',
      name: 'System Health',
      icon: Activity,
      description: 'Monitor health and performance of all agents',
    },
    {
      id: 'task-queue',
      name: 'Task Queue Management',
      icon: ListChecks,
      description: 'View and optimize the task queue across all agents',
    },
    {
      id: 'agent-performance',
      name: 'Agent Performance',
      icon: BarChart3,
      description: 'Analyze individual agent performance metrics',
    },
    {
      id: 'workflow-analytics',
      name: 'Workflow Analytics',
      icon: Network,
      description: 'Generate reports on multi-agent workflow efficiency',
    },
  ];

  const activeCapabilityData = capabilities.find((c) => c.id === activeCapability);

  const handleProcess = async () => {
    if (!managerQuery.trim()) {
      toast.error('Please enter a manager query or parameter');
      return;
    }

    if (!userProfile?.id || !userProfile?.enterprise_id) {
      toast.error('User profile not loaded');
      return;
    }

    setProcessing(true);
    setResult({ status: 'processing' });

    try {
      const task = await agentsAPI.createAgentTask({
        type: 'manager',
        data: {
          capability: activeCapability,
          query: managerQuery.trim(),
        },
        priority: 9,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
        swarmMode: true, // Enable swarm orchestration
      });

      toast.success('Manager task created');

      const pollInterval = setInterval(async () => {
        try {
          const status = await agentsAPI.getTaskStatus(task.id);

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              status: 'success',
              data: status.result,
              processingTime: status.processing_time_ms ?? undefined,
            });
            setProcessing(false);
            toast.success('Manager task completed');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              status: 'error',
              error: status.error || 'Manager task failed',
            });
            setProcessing(false);
            toast.error('Manager task failed');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

      setTimeout(() => {
        if (processing) {
          clearInterval(pollInterval);
          setProcessing(false);
          setResult({
            status: 'error',
            error: 'Task timeout - taking longer than expected',
          });
          toast.error('Task timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Manager error:', error);
      setProcessing(false);
      setResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process manager task',
      });
      toast.error('Failed to start manager task');
    }
  };

  const handleDownload = () => {
    if (!result?.data) return;

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager-${activeCapability}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'degraded':
      case 'in_progress':
      case 'processing':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'down':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-ghost-500" />;
    }
  };

  const renderAgentHealth = (agents: AgentHealth[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">AGENT HEALTH</h4>
      {agents.map((agent, index) => (
        <div key={index} className="border border-ghost-300 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(agent.status)}
              <div>
                <h5 className="font-semibold text-purple-900">{agent.name}</h5>
                <div className="text-xs text-ghost-600 font-mono">
                  Uptime: {agent.uptime}% • Last: {new Date(agent.lastHeartbeat).toLocaleString()}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                agent.status === 'healthy'
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : agent.status === 'degraded'
                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                  : 'border-red-500 text-red-700 bg-red-50'
              }`}
            >
              {agent.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-ghost-600">Completed: </span>
              <span className="text-green-700 font-bold">{agent.tasksCompleted}</span>
            </div>
            <div>
              <span className="text-ghost-600">In Progress: </span>
              <span className="text-yellow-700 font-bold">{agent.tasksInProgress}</span>
            </div>
            <div>
              <span className="text-ghost-600">Failed: </span>
              <span className="text-red-700 font-bold">{agent.tasksFailed}</span>
            </div>
            <div>
              <span className="text-ghost-600">Avg Time: </span>
              <span className="text-purple-900 font-bold">{agent.averageProcessingTime}ms</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTaskQueue = (tasks: QueuedTask[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">TASK QUEUE</h4>
      {tasks.map((task) => (
        <div key={task.id} className="border border-ghost-300 bg-white p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              {getStatusIcon(task.status)}
              <div>
                <h5 className="font-semibold text-purple-900 capitalize">{task.agentType} Task</h5>
                <div className="text-xs text-ghost-600 font-mono">ID: {task.id.slice(0, 8)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${
                  task.priority >= 8
                    ? 'border-red-500 text-red-700 bg-red-50'
                    : task.priority >= 5
                    ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                    : 'border-blue-500 text-blue-700 bg-blue-50'
                }`}
              >
                P{task.priority}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${
                  task.status === 'completed'
                    ? 'border-green-500 text-green-700'
                    : task.status === 'processing'
                    ? 'border-yellow-500 text-yellow-700'
                    : task.status === 'failed'
                    ? 'border-red-500 text-red-700'
                    : 'border-ghost-400 text-ghost-600'
                }`}
              >
                {task.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-ghost-600">
            <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
            {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
            {task.estimatedTime && <span>Est. {task.estimatedTime}ms</span>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderWorkflowSteps = (workflow: { name: string; steps: WorkflowStep[] }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        WORKFLOW: {workflow.name.toUpperCase()}
      </h4>
      <div className="space-y-2">
        {workflow.steps.map((step, index) => (
          <div key={index} className="border border-ghost-300 bg-white p-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold font-mono flex-shrink-0">
                {step.order}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-purple-900">{step.action}</h5>
                    <div className="text-xs text-ghost-600 font-mono">Agent: {step.agent}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      step.status === 'completed'
                        ? 'border-green-500 text-green-700 bg-green-50'
                        : step.status === 'in_progress'
                        ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                        : step.status === 'failed'
                        ? 'border-red-500 text-red-700 bg-red-50'
                        : 'border-ghost-400 text-ghost-600'
                    }`}
                  >
                    {step.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                {(step.startedAt || step.completedAt) && (
                  <div className="text-xs font-mono text-ghost-600 space-y-1">
                    {step.startedAt && (
                      <div>Started: {new Date(step.startedAt).toLocaleString()}</div>
                    )}
                    {step.completedAt && (
                      <div>
                        Completed: {new Date(step.completedAt).toLocaleString()}
                        {step.duration && ` (${step.duration}ms)`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformanceMetrics = (metrics: PerformanceMetric[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        AGENT PERFORMANCE METRICS
      </h4>
      {metrics.map((metric, index) => (
        <div key={index} className="border border-ghost-300 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <h5 className="font-semibold text-purple-900">{metric.agent}</h5>
            <div className="flex items-center gap-1 text-xs font-mono">
              {metric.trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : metric.trend === 'down' ? (
                <XCircle className="w-3 h-3 text-red-600" />
              ) : (
                <Zap className="w-3 h-3 text-ghost-500" />
              )}
              <span
                className={
                  metric.trend === 'up'
                    ? 'text-green-700'
                    : metric.trend === 'down'
                    ? 'text-red-700'
                    : 'text-ghost-600'
                }
              >
                {metric.trend.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-ghost-200 bg-ghost-50 p-3">
              <div className="text-xs text-ghost-600 font-mono mb-1">COMPLETION RATE</div>
              <div className="text-lg font-bold text-green-700 font-mono">
                {metric.completionRate}%
              </div>
            </div>
            <div className="border border-ghost-200 bg-ghost-50 p-3">
              <div className="text-xs text-ghost-600 font-mono mb-1">AVG TIME</div>
              <div className="text-lg font-bold text-purple-900 font-mono">
                {metric.averageTime}ms
              </div>
            </div>
            <div className="border border-ghost-200 bg-ghost-50 p-3">
              <div className="text-xs text-ghost-600 font-mono mb-1">ERROR RATE</div>
              <div className="text-lg font-bold text-red-700 font-mono">{metric.errorRate}%</div>
            </div>
            <div className="border border-ghost-200 bg-ghost-50 p-3">
              <div className="text-xs text-ghost-600 font-mono mb-1">TASKS TODAY</div>
              <div className="text-lg font-bold text-purple-900 font-mono">
                {metric.tasksToday}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderResults = () => {
    if (!result) return null;

    if (result.status === 'processing') {
      return (
        <div className="border border-ghost-300 bg-white p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-ghost-600 font-mono text-sm">Processing manager task...</p>
        </div>
      );
    }

    if (result.status === 'error') {
      return (
        <div className="border border-red-300 bg-red-50 p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Task Failed</span>
          </div>
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      );
    }

    if (result.status === 'success' && result.data) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-green-300 bg-green-50">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Task Completed</span>
            </div>
            {result.processingTime && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-mono">
                <Clock className="w-3 h-3" />
                {result.processingTime}ms
              </div>
            )}
          </div>

          {/* Swarm Status Indicators */}
          {result.data.metadata?.swarmOptimized && (
            <div className="flex flex-wrap gap-2 p-4 border border-purple-300 bg-purple-50">
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-400">
                <Zap className="w-3 h-3 mr-1" />
                PSO Optimized
              </Badge>

              {result.data.metadata.psoIterations && (
                <Badge variant="outline" className="bg-ghost-100 text-ghost-700 border-ghost-300">
                  {result.data.metadata.psoIterations} iterations
                </Badge>
              )}

              {result.data.metadata.consensusReached && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Consensus: {(result.data.metadata.consensusScore * 100).toFixed(1)}%
                </Badge>
              )}

              {result.data.metadata.acoPathOptimized && (
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <GitBranch className="w-3 h-3 mr-1" />
                  ACO Path Optimized
                </Badge>
              )}

              {result.data.metadata.votingAgents?.length > 0 && (
                <Badge variant="outline" className="bg-ghost-100 text-ghost-700 border-ghost-300">
                  {result.data.metadata.votingAgents.length} agents voted
                </Badge>
              )}
            </div>
          )}

          <div className="border border-ghost-300 bg-ghost-50 p-6">
            {/* Workflow Orchestration Results */}
            {activeCapability === 'workflow-orchestration' && result.data.workflow && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Workflow Orchestration
                </h3>
                {result.data.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">TOTAL STEPS</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.totalSteps || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">COMPLETED</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.completed || 0}
                      </div>
                    </div>
                    <div className="border border-yellow-300 bg-yellow-50 p-4">
                      <div className="text-xs text-yellow-600 font-mono mb-1">IN PROGRESS</div>
                      <div className="text-2xl font-bold text-yellow-700 font-mono">
                        {result.data.summary.inProgress || 0}
                      </div>
                    </div>
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">PENDING</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.pending || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderWorkflowSteps(result.data.workflow)}
              </>
            )}

            {/* System Health Results */}
            {activeCapability === 'system-health' && result.data.agents && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">System Health Status</h3>
                {result.data.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">HEALTHY</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.healthy || 0}
                      </div>
                    </div>
                    <div className="border border-yellow-300 bg-yellow-50 p-4">
                      <div className="text-xs text-yellow-600 font-mono mb-1">DEGRADED</div>
                      <div className="text-2xl font-bold text-yellow-700 font-mono">
                        {result.data.summary.degraded || 0}
                      </div>
                    </div>
                    <div className="border border-red-300 bg-red-50 p-4">
                      <div className="text-xs text-red-600 font-mono mb-1">DOWN</div>
                      <div className="text-2xl font-bold text-red-700 font-mono">
                        {result.data.summary.down || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderAgentHealth(result.data.agents)}
              </>
            )}

            {/* Task Queue Results */}
            {activeCapability === 'task-queue' && result.data.tasks && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">Task Queue Status</h3>
                {result.data.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">TOTAL TASKS</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.total || 0}
                      </div>
                    </div>
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">PENDING</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.pending || 0}
                      </div>
                    </div>
                    <div className="border border-yellow-300 bg-yellow-50 p-4">
                      <div className="text-xs text-yellow-600 font-mono mb-1">PROCESSING</div>
                      <div className="text-2xl font-bold text-yellow-700 font-mono">
                        {result.data.summary.processing || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">COMPLETED</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.completed || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderTaskQueue(result.data.tasks)}
              </>
            )}

            {/* Agent Performance Results */}
            {activeCapability === 'agent-performance' && result.data.metrics && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">Agent Performance</h3>
                {result.data.summary && (
                  <div className="border border-purple-300 bg-purple-50 p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          AVG COMPLETION RATE
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.avgCompletionRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          AVG PROCESSING TIME
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.avgProcessingTime}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          TOTAL TASKS TODAY
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.totalTasks}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          AVG ERROR RATE
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.avgErrorRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {renderPerformanceMetrics(result.data.metrics)}
              </>
            )}

            {/* Workflow Analytics Results */}
            {activeCapability === 'workflow-analytics' && result.data.analytics && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">Workflow Analytics</h3>
                {result.data.analytics.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">
                        WORKFLOWS ANALYZED
                      </div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.analytics.summary.total || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">SUCCESS RATE</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.analytics.summary.successRate}%
                      </div>
                    </div>
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">AVG DURATION</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.analytics.summary.avgDuration}ms
                      </div>
                    </div>
                    <div className="border border-yellow-300 bg-yellow-50 p-4">
                      <div className="text-xs text-yellow-600 font-mono mb-1">BOTTLENECKS</div>
                      <div className="text-2xl font-bold text-yellow-700 font-mono">
                        {result.data.analytics.summary.bottlenecks || 0}
                      </div>
                    </div>
                  </div>
                )}

                {result.data.analytics.recommendations && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
                      OPTIMIZATION RECOMMENDATIONS
                    </h4>
                    {result.data.analytics.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="border border-ghost-300 bg-white p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-purple-900">{rec.title}</h5>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              rec.priority === 'high'
                                ? 'border-red-500 text-red-700 bg-red-50'
                                : rec.priority === 'medium'
                                ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                                : 'border-blue-500 text-blue-700 bg-blue-50'
                            }`}
                          >
                            {rec.priority.toUpperCase()} PRIORITY
                          </Badge>
                        </div>
                        <p className="text-sm text-ghost-600 mb-2">{rec.description}</p>
                        {rec.estimatedImprovement && (
                          <div className="text-xs font-mono text-green-700">
                            Est. Improvement: {rec.estimatedImprovement}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Raw JSON fallback */}
            {!result.data.workflow &&
              !result.data.agents &&
              !result.data.tasks &&
              !result.data.metrics &&
              !result.data.analytics && (
                <>
                  <h3 className="text-lg font-bold text-purple-900 mb-4">Results</h3>
                  <pre className="bg-white border border-ghost-300 p-4 text-xs font-mono overflow-auto max-h-96 text-ghost-700">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </>
              )}
          </div>

          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Results (JSON)
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(210, 209, 222) 1px, transparent 1px),
            linear-gradient(90deg, rgb(210, 209, 222) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div className="relative">
        <div className="container mx-auto px-6 py-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/agents')}
            className="mb-6 text-purple-900 hover:text-purple-700 hover:bg-ghost-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-purple-900 mb-2 tracking-tight">
                  System Manager
                </h1>
                <p className="text-ghost-600 text-lg">
                  System coordination, workflow orchestration, and multi-agent task management
                </p>
              </div>
              <div className="text-6xl">🎯</div>
            </div>

            {/* USE WHEN panel */}
            <Card className="border-purple-500 bg-white p-6">
              <h3 className="text-sm font-semibold text-purple-900 font-mono mb-2">
                USE WHEN
              </h3>
              <p className="text-ghost-600 leading-relaxed">
                The System Manager runs continuously 24/7, coordinating all other agents,
                monitoring system health, and orchestrating complex multi-step workflows. It
                automatically optimizes task priorities, manages agent workloads, handles failures
                and recovery, and ensures smooth operation of the entire agent ecosystem. Use this
                agent when you need to monitor system health, coordinate complex workflows, or
                analyze agent performance across your organization.
              </p>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Capabilities */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <button
                      key={capability.id}
                      onClick={() => {
                        setActiveCapability(capability.id);
                        setResult(null);
                      }}
                      className={`w-full text-left border p-4 transition-all ${
                        activeCapability === capability.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-ghost-300 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            activeCapability === capability.id
                              ? 'text-purple-600'
                              : 'text-ghost-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold mb-1 ${
                              activeCapability === capability.id
                                ? 'text-purple-900'
                                : 'text-ghost-700'
                            }`}
                          >
                            {capability.name}
                          </h3>
                          <p className="text-xs text-ghost-600 leading-relaxed">
                            {capability.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column - Input and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Input section */}
              <Card className="border-ghost-300 bg-white p-6">
                <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                  MANAGER PARAMETERS
                </h2>
                {activeCapabilityData && (
                  <div className="mb-4 p-4 bg-ghost-50 border border-ghost-200">
                    <div className="flex items-start gap-3">
                      {React.createElement(activeCapabilityData.icon, {
                        className: 'w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0',
                      })}
                      <div>
                        <h3 className="font-semibold text-purple-900 mb-1">
                          {activeCapabilityData.name}
                        </h3>
                        <p className="text-sm text-ghost-600">
                          {activeCapabilityData.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ghost-700 mb-2">
                      Query or Parameter
                    </label>
                    <input
                      type="text"
                      value={managerQuery}
                      onChange={(e) => setManagerQuery(e.target.value)}
                      placeholder="e.g., current, all agents, contract renewal workflow"
                      className="w-full px-4 py-3 border border-ghost-300 bg-white text-ghost-900 placeholder-ghost-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      disabled={processing}
                    />
                    <p className="text-xs text-ghost-500 mt-2">
                      Enter the scope, workflow name, or specific parameters
                    </p>
                  </div>

                  <Button
                    onClick={handleProcess}
                    disabled={processing || !managerQuery.trim()}
                    className="w-full bg-purple-900 hover:bg-purple-800 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Task
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Results section */}
              {result && (
                <Card className="border-ghost-300 bg-white p-6">
                  <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                    RESULTS
                  </h2>
                  {renderResults()}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <SwarmDebugPanel />
    </div>
  );
}
