'use client';

import {
  Scale,
  Shield,
  DollarSign,
  Building2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Sparkles,
  FileSearch,
  BarChart3,
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useFullDocumentPipeline } from '@/hooks/useFullDocumentPipeline';
import { cn } from '@/lib/utils';
import type { AgentType } from '@/types/agents.types';

// ============================================================================
// TYPES
// ============================================================================

interface AgentAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  agent: AgentType;
  color: string;
}

interface AgentQuickActionsProps {
  /** The type of entity being analyzed */
  entityType: 'contract' | 'vendor';
  /** The ID of the entity */
  entityId: string;
  /** Optional: Additional class names */
  className?: string;
  /** Optional: Compact mode (icon only) */
  compact?: boolean;
  /** Optional: Callback when an action starts */
  onActionStart?: (action: AgentAction) => void;
  /** Optional: Callback when an action completes */
  onActionComplete?: (action: AgentAction, result: unknown) => void;
  /** Optional: Callback when an action fails */
  onActionError?: (action: AgentAction, error: Error) => void;
}

// ============================================================================
// AGENT ACTIONS
// ============================================================================

const CONTRACT_ACTIONS: AgentAction[] = [
  {
    id: 'legal_analysis',
    label: 'Legal Analysis',
    description: 'Analyze clauses, risks, and obligations',
    icon: Scale,
    agent: 'legal',
    color: 'text-amber-600',
  },
  {
    id: 'compliance_check',
    label: 'Compliance Check',
    description: 'Check regulatory and policy compliance',
    icon: Shield,
    agent: 'compliance',
    color: 'text-emerald-600',
  },
  {
    id: 'financial_analysis',
    label: 'Financial Analysis',
    description: 'Analyze costs, ROI, and budget impact',
    icon: DollarSign,
    agent: 'financial',
    color: 'text-green-600',
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment',
    description: 'Comprehensive risk evaluation',
    icon: AlertTriangle,
    agent: 'risk_assessment',
    color: 'text-orange-600',
  },
];

const VENDOR_ACTIONS: AgentAction[] = [
  {
    id: 'vendor_evaluation',
    label: 'Evaluate Vendor',
    description: 'Performance and relationship analysis',
    icon: Building2,
    agent: 'vendor',
    color: 'text-cyan-600',
  },
  {
    id: 'compliance_check',
    label: 'Compliance Check',
    description: 'Verify vendor compliance status',
    icon: Shield,
    agent: 'compliance',
    color: 'text-emerald-600',
  },
  {
    id: 'risk_assessment',
    label: 'Risk Assessment',
    description: 'Vendor risk evaluation',
    icon: AlertTriangle,
    agent: 'risk_assessment',
    color: 'text-orange-600',
  },
  {
    id: 'analytics',
    label: 'Analytics Review',
    description: 'Spending patterns and insights',
    icon: BarChart3,
    agent: 'analytics',
    color: 'text-pink-600',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const AgentQuickActions: React.FC<AgentQuickActionsProps> = ({
  entityType,
  entityId,
  className,
  compact = false,
  onActionStart,
  onActionComplete,
  onActionError,
}) => {
  const { userProfile } = useAuth();
  const { analyzeExisting, isProcessing } = useFullDocumentPipeline();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const actions = entityType === 'contract' ? CONTRACT_ACTIONS : VENDOR_ACTIONS;

  const handleAction = async (action: AgentAction) => {
    if (!userProfile?.enterprise_id || isProcessing) return;

    setActiveAction(action.id);
    onActionStart?.(action);

    try {
      const results = await analyzeExisting(entityType, entityId, [action.agent]);

      const result = results[0];
      if (result.status === 'completed') {
        onActionComplete?.(action, result.result);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (err) {
      onActionError?.(action, err as Error);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRunAll = async () => {
    if (!userProfile?.enterprise_id || isProcessing) return;

    setActiveAction('all');

    try {
      const agents = actions.map((a) => a.agent);
      const results = await analyzeExisting(entityType, entityId, agents);

      // Notify for each result
      results.forEach((result, index) => {
        const action = actions[index];
        if (result.status === 'completed') {
          onActionComplete?.(action, result.result);
        } else {
          onActionError?.(action, new Error(result.error || 'Analysis failed'));
        }
      });
    } catch (err) {
      console.error('Run all failed:', err);
    } finally {
      setActiveAction(null);
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-8 w-8 p-0', className)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-600" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Analysis
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = activeAction === action.id;

            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isProcessing}
                className="flex items-center gap-2 cursor-pointer"
              >
                {isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={cn('h-4 w-4', action.color)} />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{action.label}</span>
                  <span className="text-xs text-ghost-500">{action.description}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRunAll}
            disabled={isProcessing}
            className="flex items-center gap-2 cursor-pointer text-purple-600"
          >
            {activeAction === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4" />
            )}
            <span className="font-medium">Run All Analyses</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-600" />
            )}
            <span>AI Analysis</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Run Analysis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = activeAction === action.id;

            return (
              <DropdownMenuItem
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isProcessing}
                className="flex items-start gap-3 py-2 cursor-pointer"
              >
                <div
                  className={cn(
                    'p-1.5 rounded-md bg-ghost-100',
                    isActive && 'animate-pulse'
                  )}
                >
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  ) : (
                    <Icon className={cn('h-4 w-4', action.color)} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{action.label}</span>
                  <span className="text-xs text-ghost-500">{action.description}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleRunAll}
            disabled={isProcessing}
            className="flex items-center gap-3 py-2 cursor-pointer"
          >
            <div className="p-1.5 rounded-md bg-purple-100">
              {activeAction === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
              ) : (
                <FileSearch className="h-4 w-4 text-purple-600" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-purple-600">Run All Analyses</span>
              <span className="text-xs text-ghost-500">
                Execute all {actions.length} analysis types
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AgentQuickActions;
