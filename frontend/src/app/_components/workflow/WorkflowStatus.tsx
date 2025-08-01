'use client';

import React, { useMemo } from 'react';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw,
  ArrowRight,
  User,
  Users,
  Zap,
  AlertTriangle,
  Calendar,
  Timer,
  Activity,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Workflow execution status
export type WorkflowExecutionStatus = 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

// Workflow step status
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting_approval';

// Workflow step definition
export interface WorkflowStep {
  id: string;
  title: string;
  type: 'start' | 'approval' | 'condition' | 'action' | 'end';
  status: WorkflowStepStatus;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
  duration?: number; // in milliseconds
  output?: unknown;
  error?: string;
  comments?: {
    id: string;
    author: string;
    content: string;
    timestamp: Date;
  }[];
}

// Workflow execution instance
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  steps: WorkflowStep[];
  currentStepIndex: number;
  triggeredBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  context: {
    entityType: 'contract' | 'vendor' | 'general';
    entityId?: string;
    entityTitle?: string;
  };
  metadata?: Record<string, unknown>;
}

// Step status configurations
const stepStatusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Pending'
  },
  running: {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Running'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Completed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Failed'
  },
  skipped: {
    icon: ArrowRight,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    label: 'Skipped'
  },
  waiting_approval: {
    icon: Users,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Waiting for Approval'
  }
};

// Workflow status component props
export interface WorkflowStatusProps {
  execution: WorkflowExecution;
  variant?: 'full' | 'compact' | 'minimal';
  showDetails?: boolean;
  onStepClick?: (step: WorkflowStep) => void;
  onViewExecution?: (execution: WorkflowExecution) => void;
  className?: string;
}

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  execution,
  variant = 'full',
  showDetails = true,
  onStepClick,
  onViewExecution,
  className
}) => {
  // Calculate workflow progress
  const progress = useMemo(() => {
    const completedSteps = execution.steps.filter(step => 
      step.status === 'completed' || step.status === 'skipped'
    ).length;
    return (completedSteps / execution.steps.length) * 100;
  }, [execution.steps]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!execution.completedAt) return null;
    return execution.completedAt.getTime() - execution.startedAt.getTime();
  }, [execution.startedAt, execution.completedAt]);

  // Get estimated completion
  const getEstimatedCompletion = () => {
    if (execution.status === 'completed') return null;
    if (execution.estimatedCompletion) return execution.estimatedCompletion;
    
    // Simple estimation based on average step duration
    const completedSteps = execution.steps.filter(s => s.completedAt && s.startedAt);
    if (completedSteps.length === 0) return null;
    
    const avgDuration = completedSteps.reduce((sum, step) => 
      sum + (step.completedAt!.getTime() - step.startedAt!.getTime()), 0
    ) / completedSteps.length;
    
    const remainingSteps = execution.steps.length - execution.currentStepIndex;
    return new Date(Date.now() + (avgDuration * remainingSteps));
  };

  // Get current step
  const currentStep = execution.steps[execution.currentStepIndex];

  // Step component
  const WorkflowStepComponent: React.FC<{ 
    step: WorkflowStep; 
    index: number; 
    isActive: boolean;
    isLast: boolean;
  }> = ({ step, index, isActive, isLast }) => {
    const config = stepStatusConfig[step.status];
    const IconComponent = config.icon;
    const isOverdue = step.dueDate && isAfter(new Date(), step.dueDate) && step.status !== 'completed';

    return (
      <TooltipProvider>
        <div className="flex items-start gap-3">
          {/* Step indicator */}
          <div className="flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer',
                    config.bgColor,
                    isActive && 'ring-2 ring-primary ring-offset-1',
                    isOverdue && 'ring-2 ring-red-300'
                  )}
                  onClick={() => onStepClick?.(step)}
                >
                  <IconComponent className={cn('h-4 w-4', config.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-xs">{config.label}</p>
                  {step.dueDate && (
                    <p className="text-xs">Due: {format(step.dueDate, 'MMM dd, HH:mm')}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Connection line */}
            {!isLast && (
              <div className={cn(
                'w-0.5 h-8 mt-2 transition-colors',
                step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
              )} />
            )}
          </div>

          {/* Step content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={cn(
                  'font-medium text-sm',
                  isActive && 'text-primary'
                )}>
                  {step.title}
                </h4>
                
                {/* Step details */}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className={cn('text-xs', config.color)}>
                    {config.label}
                  </Badge>
                  
                  {step.assignedTo && step.assignedTo.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{step.assignedTo.map(a => a.name).join(', ')}</span>
                    </div>
                  )}
                  
                  {step.duration && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      <span>{Math.round(step.duration / 1000 / 60)}m</span>
                    </div>
                  )}
                </div>

                {/* Error message */}
                {step.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {step.error}
                  </div>
                )}

                {/* Overdue warning */}
                {isOverdue && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue by {formatDistanceToNow(step.dueDate!)}
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="text-right text-xs text-muted-foreground">
                {step.startedAt && (
                  <div>Started: {format(step.startedAt, 'HH:mm')}</div>
                )}
                {step.completedAt && (
                  <div>Completed: {format(step.completedAt, 'HH:mm')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
            onClick={() => onViewExecution?.(execution)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-3 h-3 rounded-full',
                execution.status === 'running' && 'bg-blue-500',
                execution.status === 'completed' && 'bg-green-500',
                execution.status === 'failed' && 'bg-red-500',
                execution.status === 'paused' && 'bg-yellow-500'
              )} />
              
              <div>
                <p className="font-medium text-sm">{execution.workflowName}</p>
                <p className="text-xs text-muted-foreground">
                  {execution.context.entityTitle || execution.context.entityType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-20 h-2" />
              <span className="text-xs text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn(
          'w-2 h-2 rounded-full',
          execution.status === 'running' && 'bg-blue-500 animate-pulse',
          execution.status === 'completed' && 'bg-green-500',
          execution.status === 'failed' && 'bg-red-500',
          execution.status === 'paused' && 'bg-yellow-500'
        )} />
        <span className="text-sm text-muted-foreground">
          Workflow {execution.status}
        </span>
      </div>
    );
  }

  // Full variant
  const estimatedCompletion = getEstimatedCompletion();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{execution.workflowName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'}>
                {execution.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                for {execution.context.entityTitle || execution.context.entityType}
              </span>
            </div>
          </div>

          {onViewExecution && (
            <Button variant="outline" size="sm" onClick={() => onViewExecution(execution)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>

        {/* Progress overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="text-muted-foreground">
              {execution.steps.filter(s => s.status === 'completed').length} of {execution.steps.length} steps
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Timing information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Started</p>
            <p className="font-medium">{format(execution.startedAt, 'MMM dd, HH:mm')}</p>
          </div>
          
          {execution.completedAt && (
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="font-medium">{format(execution.completedAt, 'MMM dd, HH:mm')}</p>
            </div>
          )}
          
          {totalDuration && (
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">
                {Math.round(totalDuration / 1000 / 60)} minutes
              </p>
            </div>
          )}
          
          {estimatedCompletion && execution.status === 'running' && (
            <div>
              <p className="text-muted-foreground">Est. Completion</p>
              <p className="font-medium">{format(estimatedCompletion, 'HH:mm')}</p>
            </div>
          )}
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="pt-0">
          {/* Current step highlight */}
          {currentStep && execution.status === 'running' && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Currently Running</span>
              </div>
              <p className="text-sm text-blue-800">{currentStep.title}</p>
              {currentStep.assignedTo && currentStep.assignedTo.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-blue-700">Assigned to:</span>
                  <div className="flex gap-1">
                    {currentStep.assignedTo.map(assignee => (
                      <Avatar key={assignee.id} className="h-5 w-5">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Steps timeline */}
          <div className="space-y-0">
            {execution.steps.map((step, index) => (
              <WorkflowStepComponent
                key={step.id}
                step={step}
                index={index}
                isActive={index === execution.currentStepIndex}
                isLast={index === execution.steps.length - 1}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Workflow status list component
export interface WorkflowStatusListProps {
  executions: WorkflowExecution[];
  variant?: 'full' | 'compact';
  onExecutionClick?: (execution: WorkflowExecution) => void;
  className?: string;
}

export const WorkflowStatusList: React.FC<WorkflowStatusListProps> = ({
  executions,
  variant = 'compact',
  onExecutionClick,
  className
}) => {
  if (executions.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No active workflows</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {executions.map(execution => (
        <WorkflowStatus
          key={execution.id}
          execution={execution}
          variant={variant}
          {...(onExecutionClick && { onViewExecution: onExecutionClick })}
          showDetails={variant === 'full'}
        />
      ))}
    </div>
  );
};

export default WorkflowStatus;