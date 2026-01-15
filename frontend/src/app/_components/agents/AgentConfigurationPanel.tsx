'use client';

import { 
  DollarSign, 
  Shield, 
  BarChart3, 
  AlertCircle, 
  Users, 
  Building2, 
  Bot, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  RotateCcw,
  Save 
} from 'lucide-react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';


// Types

// UI Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  AGENT_TYPE_LABELS, 
  STATUS_COLORS,
  taskPriorityOptions 
} from '@/types/agents.types';
import type { 
  Agent, 
  AgentType, 
  TaskPriority 
} from '@/types/agents.types';
import { createClient } from '@/utils/supabase/client';

interface AgentConfigurationPanelProps {
  className?: string;
}

interface ConfigFormData {
  runIntervalMinutes: number;
  retryAttempts: number;
  timeoutMinutes: number;
  enabled: boolean;
  priority: TaskPriority;
  maxConcurrentTasks: number;
  riskThreshold: number;
  autoRestart: boolean;
  notificationSettings: {
    onSuccess: boolean;
    onFailure: boolean;
    onCriticalError: boolean;
  };
  customSettings: Record<string, unknown>;
}

const defaultConfig: ConfigFormData = {
  runIntervalMinutes: 60,
  retryAttempts: 3,
  timeoutMinutes: 30,
  enabled: true,
  priority: 'medium',
  maxConcurrentTasks: 5,
  riskThreshold: 75,
  autoRestart: false,
  notificationSettings: {
    onSuccess: false,
    onFailure: true,
    onCriticalError: true,
  },
  customSettings: {},
};

const agentTypeConfigs: Partial<Record<AgentType, {
  icon: typeof Shield;
  color: string;
  description: string;
  defaultSettings: Record<string, unknown>;
}>> = {
  financial: {
    icon: DollarSign,
    color: 'text-green-600',
    description: 'Handles financial analysis, cost optimization, and risk assessment',
    defaultSettings: {
      riskThresholds: { low: 25, medium: 50, high: 75 },
      currencyConversion: true,
      reportingFrequency: 'weekly'
    }
  },
  legal: {
    icon: Shield,
    color: 'text-blue-600',
    description: 'Manages legal compliance, contract analysis, and regulatory monitoring',
    defaultSettings: {
      jurisdictions: ['US', 'EU'],
      complianceFrameworks: ['GDPR', 'SOX'],
      autoReviewEnabled: true
    }
  },
  analytics: {
    icon: BarChart3,
    color: 'text-purple-600',
    description: 'Provides data analysis, insights generation, and performance metrics',
    defaultSettings: {
      reportTypes: ['monthly_summary', 'performance_dashboard'],
      realTimeAnalysis: true,
      machineLearningEnabled: false
    }
  },
  notifications: {
    icon: AlertCircle,
    color: 'text-orange-600',
    description: 'Manages alerts, communications, and notification delivery',
    defaultSettings: {
      channels: { email: true, slack: false, webhook: false },
      urgencyLevels: { critical: { delay: 0, retries: 3 } }
    }
  },
  manager: {
    icon: Users,
    color: 'text-indigo-600',
    description: 'Orchestrates system operations, health monitoring, and agent coordination',
    defaultSettings: {
      healthCheckIntervalMinutes: 5,
      taskCleanupHours: 24,
      systemMetricsCollection: true
    }
  },
  vendor: {
    icon: Building2,
    color: 'text-cyan-600',
    description: 'Manages vendor relationships, deduplication, and performance tracking',
    defaultSettings: {
      matchThreshold: 0.85,
      autoMergeEnabled: false,
      performanceTrackingEnabled: true
    }
  }
};

export const AgentConfigurationPanel: React.FC<AgentConfigurationPanelProps> = ({ className }) => {
  // Temporary placeholder - removed Clerk user
  const { user: _user, userProfile, isLoading: _authLoading } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [configFormData, setConfigFormData] = useState<ConfigFormData>(defaultConfig);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get enterprise ID from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // State for agents
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Fetch agents from Supabase
  useEffect(() => {
    const fetchAgents = async () => {
      if (!enterpriseId) {
        setIsLoadingAgents(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await (supabase as any)
          .from('agents')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching agents:', error);
          setAgentsList([]);
        } else {
          // Map database fields to Agent type
          const mappedAgents: Agent[] = (data || []).map((agent: any) => ({
            _id: agent.id,
            name: agent.name || 'Unnamed Agent',
            type: agent.type || 'manager',
            status: agent.status || 'inactive',
            isEnabled: agent.is_enabled ?? false,
            runCount: agent.run_count || 0,
            errorCount: agent.error_count || 0,
            lastError: agent.last_error,
            lastRunAt: agent.last_run_at,
            createdAt: agent.created_at,
          }));
          setAgentsList(mappedAgents);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        setAgentsList([]);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [enterpriseId]);

  const [isTogglingAgent, setIsTogglingAgent] = useState(false);

  const toggleAgent = {
    execute: async (params: { agentId: string; enabled: boolean }) => {
      if (!enterpriseId) return;
      setIsTogglingAgent(true);
      try {
        const supabase = createClient();
        const { error } = await (supabase as any)
          .from('agents')
          .update({ is_enabled: params.enabled, updated_at: new Date().toISOString() })
          .eq('id', params.agentId)
          .eq('enterprise_id', enterpriseId);

        if (error) throw error;

        // Update local state
        setAgentsList(prev => prev.map(agent =>
          agent._id === params.agentId
            ? { ...agent, isEnabled: params.enabled }
            : agent
        ));
      } finally {
        setIsTogglingAgent(false);
      }
    },
    isLoading: isTogglingAgent
  };

  const handleAgentSelect = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    
    // Populate form with current agent config
    setConfigFormData({
      runIntervalMinutes: 60,
      retryAttempts: 3,
      timeoutMinutes: 30,
      enabled: false,
      priority: 'medium',
      maxConcurrentTasks: 5,
      riskThreshold: 75,
      autoRestart: false,
      notificationSettings: defaultConfig.notificationSettings,
      customSettings: {},
    });
    
    setIsConfigDialogOpen(true);
  }, []);

  const handleConfigSubmit = useCallback(async () => {
    if (!selectedAgent) return;

    try {
      setMessage(null);
      
      // For now, just toggle the agent's enabled state
      // In the future, when updateAgentConfig is implemented, we can update the full config
      if (selectedAgent.isEnabled !== configFormData.enabled) {
        await toggleAgent.execute({
          agentId: selectedAgent._id,
          enabled: configFormData.enabled
        });
      }

      setMessage({ type: 'success', text: 'Agent configuration updated successfully' });
      setIsConfigDialogOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent configuration';
      setMessage({ type: 'error', text: errorMessage });
    }
  }, [selectedAgent, configFormData, toggleAgent]);

  const handleToggleAgent = useCallback(async (agentId: string, enabled: boolean) => {
    try {
      await toggleAgent.execute({ agentId, enabled });
      setMessage({ 
        type: 'success', 
        text: `Agent ${enabled ? 'enabled' : 'disabled'} successfully` 
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle agent';
      setMessage({ type: 'error', text: errorMessage });
    }
  }, [toggleAgent]);

  const handleRestartAgent = useCallback(async () => {
    try {
      // For now, we'll just show a message that this feature is not yet implemented
      setMessage({ type: 'error', text: 'Agent restart functionality is not yet implemented' });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart agent';
      setMessage({ type: 'error', text: errorMessage });
    }
  }, []);

  const getAgentPerformanceScore = useCallback((agent: { runCount: number; errorCount: number }): number => {
    if (agent.runCount === 0) return 0;
    return Math.round(((agent.runCount - agent.errorCount) / agent.runCount) * 100);
  }, []);

  const getAgentTypeInfo = useCallback((type: AgentType) => {
    return agentTypeConfigs[type] || {
      icon: Bot,
      color: 'text-gray-600',
      description: 'General purpose agent',
      defaultSettings: {}
    };
  }, []);

  const filteredAgentsByCategory = useMemo(() => {
    const categories = {
      core: ['manager', 'secretary', 'vendor'],
      analysis: ['financial', 'legal', 'analytics'],
      operations: ['notifications', 'workflow', 'monitor'],
      compliance: ['compliance', 'risk', 'audit'],
      system: ['integration', 'scheduler', 'backup']
    };

    return Object.entries(categories).map(([category, types]) => ({
      category,
      agents: agentsList.filter((agent) => types.includes(agent.type))
    }));
  }, [agentsList]);

  if (isLoadingAgents) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading agent configuration...</p>
      </div>
    );
  }

  // Temporary placeholder - removed enterprise check

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Configuration</h1>
            <p className="text-muted-foreground">
              Configure and manage AI agents for your enterprise
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {agentsList.filter((a) => a.isEnabled).length}/{agentsList.length} Active
          </Badge>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{message.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Management</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Total Agents</p>
                    <p className="text-2xl font-bold">{agentsList.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Active Agents</p>
                    <p className="text-2xl font-bold">
                      {agentsList.filter((a) => a.isEnabled && a.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Avg Performance</p>
                    <p className="text-2xl font-bold">
                      {agentsList.length === 0 ? 0 : Math.round(agentsList.reduce((acc, agent) => 
                        acc + getAgentPerformanceScore({ runCount: agent.runCount, errorCount: agent.errorCount }), 0) / agentsList.length)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Error Count</p>
                    <p className="text-2xl font-bold">
                      {agentsList.reduce((acc, agent) => acc + agent.errorCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Categories */}
          {filteredAgentsByCategory.map(({ category, agents }) => (
            <Card key={category} className="border-border dark:border-border/50 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="capitalize text-lg">{category} Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((agent) => {
                    const typeInfo = getAgentTypeInfo(agent.type);
                    const performanceScore = getAgentPerformanceScore({ runCount: agent.runCount, errorCount: agent.errorCount });
                    const Icon = typeInfo.icon;

                    return (
                      <Card key={agent._id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-5 w-5", typeInfo.color)} />
                              <div>
                                <h4 className="font-medium text-sm">{agent.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {AGENT_TYPE_LABELS[agent.type as AgentType]}
                                </p>
                              </div>
                            </div>
                            <Badge className={STATUS_COLORS[agent.status as keyof typeof STATUS_COLORS]} variant="outline">
                              {agent.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Performance</span>
                              <span className={cn(
                                "font-medium",
                                performanceScore >= 90 ? "text-green-600" :
                                performanceScore >= 75 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {performanceScore}%
                              </span>
                            </div>
                            <Progress value={performanceScore} className="h-1.5" />
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <Switch
                              checked={agent.isEnabled}
                              onCheckedChange={(checked) => handleToggleAgent(agent._id, checked)}
                              disabled={toggleAgent.isLoading}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAgentSelect(agent)}
                              className="h-7 px-2"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agentsList.map((agent: Agent) => {
              const typeInfo = getAgentTypeInfo(agent.type);
              const performanceScore = getAgentPerformanceScore({ runCount: agent.runCount, errorCount: agent.errorCount });
              const Icon = typeInfo.icon;

              return (
                <Card key={agent._id} className="border-border dark:border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-6 w-6", typeInfo.color)} />
                        <div>
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {AGENT_TYPE_LABELS[agent.type as AgentType]}
                          </p>
                        </div>
                      </div>
                      <Badge className={STATUS_COLORS[agent.status as keyof typeof STATUS_COLORS]}>
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {typeInfo.description}
                    </p>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Performance Score</span>
                        <span className={cn(
                          "font-medium",
                          performanceScore >= 90 ? "text-green-600" :
                          performanceScore >= 75 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {performanceScore}%
                        </span>
                      </div>
                      <Progress value={performanceScore} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Runs:</span>
                        <span className="font-medium">{agent.runCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Errors:</span>
                        <span className={cn(
                          "font-medium",
                          agent.errorCount > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {agent.errorCount}
                        </span>
                      </div>
                    </div>

                    {agent.lastError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {agent.lastError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={agent.isEnabled}
                          onCheckedChange={(checked) => handleToggleAgent(agent._id, checked)}
                          disabled={toggleAgent.isLoading}
                        />
                        <Label className="text-sm">Enabled</Label>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAgentSelect(agent)}
                          disabled={false}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestartAgent()}
                          disabled={false}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>System-wide configuration settings</p>
                <p className="text-sm">Coming soon in future release</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Real-time monitoring dashboard</p>
                <p className="text-sm">Coming soon in future release</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configure {selectedAgent?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAgent && (
            <div className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agent Status</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={configFormData.enabled}
                          onCheckedChange={(checked) => 
                            setConfigFormData(prev => ({ ...prev, enabled: checked }))
                          }
                        />
                        <Label>Enabled</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select
                        value={configFormData.priority}
                        onValueChange={(value) => 
                          setConfigFormData(prev => ({ ...prev, priority: value as TaskPriority }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taskPriorityOptions.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Run Interval (minutes)</Label>
                      <Input
                        type="number"
                        value={configFormData.runIntervalMinutes}
                        onChange={(e) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            runIntervalMinutes: parseInt(e.target.value) || 0 
                          }))
                        }
                        min={1}
                        max={1440}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Timeout (minutes)</Label>
                      <Input
                        type="number"
                        value={configFormData.timeoutMinutes}
                        onChange={(e) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            timeoutMinutes: parseInt(e.target.value) || 0 
                          }))
                        }
                        min={1}
                        max={120}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Retry Attempts</Label>
                      <Input
                        type="number"
                        value={configFormData.retryAttempts}
                        onChange={(e) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            retryAttempts: parseInt(e.target.value) || 0 
                          }))
                        }
                        min={0}
                        max={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Concurrent Tasks</Label>
                      <Input
                        type="number"
                        value={configFormData.maxConcurrentTasks}
                        onChange={(e) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            maxConcurrentTasks: parseInt(e.target.value) || 0 
                          }))
                        }
                        min={1}
                        max={20}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Risk Threshold: {configFormData.riskThreshold}%</Label>
                      <Input
                        type="range"
                        value={configFormData.riskThreshold}
                        onChange={(e) => 
                          setConfigFormData(prev => ({ ...prev, riskThreshold: parseInt(e.target.value) }))
                        }
                        max={100}
                        step={5}
                        className="mt-2 w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Auto Restart on Failure</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={configFormData.autoRestart}
                          onCheckedChange={(checked) => 
                            setConfigFormData(prev => ({ ...prev, autoRestart: checked }))
                          }
                        />
                        <Label>Enabled</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Notify on Success</Label>
                      <Switch
                        checked={configFormData.notificationSettings.onSuccess}
                        onCheckedChange={(checked) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            notificationSettings: { 
                              ...prev.notificationSettings, 
                              onSuccess: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Notify on Failure</Label>
                      <Switch
                        checked={configFormData.notificationSettings.onFailure}
                        onCheckedChange={(checked) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            notificationSettings: { 
                              ...prev.notificationSettings, 
                              onFailure: checked 
                            }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Notify on Critical Error</Label>
                      <Switch
                        checked={configFormData.notificationSettings.onCriticalError}
                        onCheckedChange={(checked) => 
                          setConfigFormData(prev => ({ 
                            ...prev, 
                            notificationSettings: { 
                              ...prev.notificationSettings, 
                              onCriticalError: checked 
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfigSubmit}
              disabled={false}
            >
              {false ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentConfigurationPanel;