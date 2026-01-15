'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  FileSearch,
  Scale,
  DollarSign,
  Building2,
  BarChart3,
  Shield,
  Bell,
  Workflow,
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Settings,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useAgentPreferencesStore,
  useActiveTasksCount,
  useProcessingTasks,
  type ActiveAgentTask,
} from '@/stores/agentPreferencesStore';
import type { AgentType } from '@/types/agents.types';

// ============================================================================
// AGENT ICONS & COLORS
// ============================================================================

const agentIcons: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  manager: Workflow,
  theory_of_mind_manager: Brain,
  workflow: Workflow,
  secretary: FileSearch,
  continual_secretary: FileSearch,
  metacognitive_secretary: FileSearch,
  legal: Scale,
  compliance: Shield,
  risk_assessment: Shield,
  financial: DollarSign,
  causal_financial: DollarSign,
  quantum_financial: DollarSign,
  vendor: Building2,
  analytics: BarChart3,
  notifications: Bell,
  'data-quality': BarChart3,
  integration: Workflow,
};

const agentColors: Record<AgentType, string> = {
  manager: 'text-purple-600',
  theory_of_mind_manager: 'text-violet-600',
  workflow: 'text-indigo-600',
  secretary: 'text-blue-600',
  continual_secretary: 'text-blue-500',
  metacognitive_secretary: 'text-blue-700',
  legal: 'text-amber-600',
  compliance: 'text-emerald-600',
  risk_assessment: 'text-orange-600',
  financial: 'text-green-600',
  causal_financial: 'text-green-500',
  quantum_financial: 'text-green-700',
  vendor: 'text-cyan-600',
  analytics: 'text-pink-600',
  notifications: 'text-red-500',
  'data-quality': 'text-teal-600',
  integration: 'text-slate-600',
};

const agentLabels: Record<AgentType, string> = {
  manager: 'Manager',
  theory_of_mind_manager: 'ToM Manager',
  workflow: 'Workflow',
  secretary: 'Secretary',
  continual_secretary: 'Learning Secretary',
  metacognitive_secretary: 'Meta Secretary',
  legal: 'Legal',
  compliance: 'Compliance',
  risk_assessment: 'Risk',
  financial: 'Financial',
  causal_financial: 'Causal Finance',
  quantum_financial: 'Quantum Finance',
  vendor: 'Vendor',
  analytics: 'Analytics',
  notifications: 'Notifications',
  'data-quality': 'Data Quality',
  integration: 'Integration',
};

// ============================================================================
// TASK ITEM COMPONENT
// ============================================================================

interface TaskItemProps {
  task: ActiveAgentTask;
  onDismiss?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDismiss }) => {
  const Icon = agentIcons[task.agentType] || Bot;
  const colorClass = agentColors[task.agentType] || 'text-gray-600';
  const label = agentLabels[task.agentType] || task.agentType;

  const statusIcon = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-gray-400" />,
    processing: <Loader2 className="h-3 w-3 animate-spin text-purple-500" />,
    completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    failed: <XCircle className="h-3 w-3 text-red-500" />,
  };

  const elapsedTime = Math.round((Date.now() - task.startedAt.getTime()) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-ghost-50 border border-ghost-200 hover:border-purple-300 transition-colors"
    >
      <div className={cn('p-1.5 rounded-md bg-white shadow-sm', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ghost-800 truncate">
            {label}
          </span>
          {statusIcon[task.status]}
        </div>
        <div className="flex items-center gap-2 text-xs text-ghost-500">
          <span className="truncate">{task.message || task.taskType}</span>
          {task.status === 'processing' && (
            <span className="text-purple-500 font-mono">{elapsedTime}s</span>
          )}
        </div>
        {task.progress !== undefined && task.status === 'processing' && (
          <Progress value={task.progress} className="h-1 mt-1" />
        )}
      </div>

      {(task.status === 'completed' || task.status === 'failed') && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-ghost-400 hover:text-ghost-600"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AgentActivityIndicator: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeTasksCount = useActiveTasksCount();
  const processingTasks = useProcessingTasks();
  const {
    showActivityIndicator,
    activeTasks,
    removeActiveTask,
    globalMode,
  } = useAgentPreferencesStore();

  const allTasks = Array.from(activeTasks.values()).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  );

  // Don't render if hidden or no tasks
  if (!showActivityIndicator || activeTasksCount === 0) {
    return null;
  }

  // Don't show real-time indicator if in silent mode
  if (globalMode === 'silent') {
    return null;
  }

  const hasProcessing = processingTasks.length > 0;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-6 z-50"
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            // Expanded panel
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="w-80 shadow-xl border-purple-200 bg-white/95 backdrop-blur-sm">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-ghost-200">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Bot className="h-5 w-5 text-purple-600" />
                      {hasProcessing && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                      )}
                    </div>
                    <span className="font-semibold text-ghost-800">
                      Agent Activity
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {activeTasksCount}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsExpanded(false)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Task list */}
                <ScrollArea className="max-h-64">
                  <div className="p-2 space-y-2">
                    <AnimatePresence>
                      {allTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onDismiss={() => removeActiveTask(task.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="flex items-center justify-between p-2 border-t border-ghost-200 text-xs text-ghost-500">
                  <span>
                    {processingTasks.length} processing
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-ghost-500 hover:text-purple-600"
                    onClick={() => window.location.href = '/dashboard/agents'}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            // Collapsed badge
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsExpanded(true)}
                    className={cn(
                      'relative h-12 px-4 rounded-full shadow-lg',
                      'bg-purple-900 hover:bg-purple-800 text-white',
                      'border border-purple-700'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Bot className="h-5 w-5" />
                        {hasProcessing && (
                          <motion.span
                            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-pink-400"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                        )}
                      </div>
                      <span className="font-medium">
                        {processingTasks.length > 0
                          ? `${processingTasks.length} running`
                          : `${activeTasksCount} tasks`
                        }
                      </span>
                      <ChevronUp className="h-4 w-4 opacity-60" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>View agent activity</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
};

export default AgentActivityIndicator;
