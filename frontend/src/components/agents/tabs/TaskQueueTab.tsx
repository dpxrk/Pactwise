'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import { toast } from 'sonner';
import TaskQueueTable from '@/components/agents/TaskQueueTable';
import TaskSubmissionForm from '@/components/agents/TaskSubmissionForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListTodo, Plus, Play, Pause, X, RefreshCw } from 'lucide-react';
import type { AgentType } from '@/types/agents.types';

export default function TaskQueueTab() {
  const { userProfile } = useAuth();
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('secretary');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const agentTypes: { value: AgentType; label: string }[] = [
    { value: 'secretary', label: 'Document Secretary' },
    { value: 'financial', label: 'Financial Analyst' },
    { value: 'legal', label: 'Legal Analyst' },
    { value: 'compliance', label: 'Compliance Monitor' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'vendor', label: 'Vendor Manager' },
    { value: 'analytics', label: 'Analytics Engine' },
    { value: 'notifications', label: 'Notification Manager' },
    { value: 'manager', label: 'System Manager' },
    { value: 'workflow', label: 'Workflow Engine' },
    { value: 'data-quality', label: 'Data Quality Monitor' },
    { value: 'integration', label: 'Integration Hub' },
  ];

  const handleBulkAction = async (action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    if (selectedTasks.size === 0 || !userProfile?.enterprise_id) return;

    try {
      await agentsAPI.bulkUpdateTasks({
        taskIds: Array.from(selectedTasks),
        action,
        enterpriseId: userProfile.enterprise_id,
      });

      toast.success(`Successfully ${action}d ${selectedTasks.size} task(s)`);
      setSelectedTasks(new Set());

      // Trigger refresh of TaskQueueTable
      window.location.reload(); // Simple approach
    } catch (error) {
      console.error(`Failed to ${action} tasks:`, error);
      toast.error(`Failed to ${action} tasks`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Agent Selector and Actions */}
      <Card className="bg-white border-ghost-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <ListTodo className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 font-mono">AGENT TASK QUEUE</h2>
              <p className="text-sm text-ghost-600 mt-1">
                Monitor and manage agent tasks with priority-based processing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedAgentType} onValueChange={(value) => setSelectedAgentType(value as AgentType)}>
              <SelectTrigger className="w-64 border-ghost-300 font-mono">
                <SelectValue placeholder="Select Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono">
                  All Agents
                </SelectItem>
                {agentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="font-mono">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowSubmitForm(true)}
              className="bg-purple-900 hover:bg-purple-800 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Task
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions Bar (shows when tasks are selected) */}
      {selectedTasks.size > 0 && (
        <Card className="bg-purple-500/5 border-purple-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-900 text-white font-mono">
                {selectedTasks.size} TASKS SELECTED
              </Badge>
              <span className="text-xs text-ghost-600 font-mono">Bulk Actions:</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('pause')}
                className="border-ghost-300 hover:border-warning hover:text-warning"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('resume')}
                className="border-ghost-300 hover:border-success hover:text-success"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('retry')}
                className="border-ghost-300 hover:border-purple-500 hover:text-purple-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('cancel')}
                className="border-ghost-300 hover:border-error hover:text-error"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <div className="w-px h-6 bg-ghost-300 mx-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTasks(new Set())}
                className="text-ghost-600 hover:text-ghost-900"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Task Performance Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-ghost-300 p-4">
          <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">AVG PROCESSING TIME</div>
          <div className="text-2xl font-bold text-purple-900 font-mono">2.3s</div>
          <div className="text-xs text-success mt-1 font-mono">↓ 15% from last week</div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">SUCCESS RATE</div>
          <div className="text-2xl font-bold text-success font-mono">98.7%</div>
          <div className="text-xs text-success mt-1 font-mono">↑ 2.1% from last week</div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">QUEUE DEPTH</div>
          <div className="text-2xl font-bold text-ghost-700 font-mono">12</div>
          <div className="text-xs text-ghost-600 mt-1 font-mono">pending tasks</div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">RETRY RATE</div>
          <div className="text-2xl font-bold text-warning font-mono">1.3%</div>
          <div className="text-xs text-ghost-600 mt-1 font-mono">of total tasks</div>
        </Card>
      </div>

      {/* Task Queue Table */}
      <TaskQueueTable agentType={selectedAgentType} limit={100} />

      {/* Task Submission Modal/Form */}
      {showSubmitForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-ghost-300 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-ghost-300 bg-ghost-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-purple-900 font-mono">SUBMIT NEW TASK</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubmitForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <TaskSubmissionForm
                agentType={selectedAgentType}
                onTaskCreated={(taskId: string) => {
                  console.log('Task created:', taskId);
                  toast.success('Task submitted successfully');
                  setShowSubmitForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
