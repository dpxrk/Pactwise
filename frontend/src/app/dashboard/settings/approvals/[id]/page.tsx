'use client';

import {
  ArrowLeft,
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Settings,
  Workflow,
  Copy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, use } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  useApprovalMatrix,
  useUpdateApprovalMatrix,
  useDeleteApprovalMatrix,
  useCreateApprovalRule,
  useUpdateApprovalRule,
  useDeleteApprovalRule,
} from '@/hooks/queries/useApprovals';
import { cn } from '@/lib/utils';
import type {
  ApprovalMatrixRule,
  ApprovalAction,
  ApprovalMode,
  ConditionGroup,
  Approver,
  ApproverType,
  ConditionOperator,
  MatrixStatus,
} from '@/types/approvals.types';
import {
  appliesToLabels,
  approvalActionLabels,
  approvalModeLabels,
  approverTypeLabels,
  conditionOperatorLabels,
  commonConditionFields,
} from '@/types/approvals.types';


// ============================================================================
// STATUS CONFIG
// ============================================================================

const matrixStatusConfig: Record<
  MatrixStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: Play,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: Pause,
  },
  draft: {
    label: 'Draft',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: Edit,
  },
};

// ============================================================================
// APPROVAL MATRIX DETAIL PAGE
// ============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ApprovalMatrixDetailPage({ params }: PageProps) {
  const { id: matrixId } = use(params);
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;

  const [activeTab, setActiveTab] = useState('rules');
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'matrix' | 'rule'; id: string } | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalMatrixRule | null>(null);

  // Fetch data
  const { data: matrix, isLoading } = useApprovalMatrix(matrixId);

  // Mutations
  const updateMatrixMutation = useUpdateApprovalMatrix();
  const deleteMatrixMutation = useDeleteApprovalMatrix();
  const createRuleMutation = useCreateApprovalRule();
  const updateRuleMutation = useUpdateApprovalRule();
  const deleteRuleMutation = useDeleteApprovalRule();

  const toggleRuleExpanded = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const handleToggleStatus = async () => {
    if (!matrix) return;
    const newStatus = matrix.status === 'active' ? 'inactive' : 'active';
    await updateMatrixMutation.mutateAsync({
      matrixId: matrix.id,
      data: { status: newStatus },
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'matrix') {
      await deleteMatrixMutation.mutateAsync(deleteTarget.id);
      router.push('/dashboard/settings/approvals');
    } else {
      await deleteRuleMutation.mutateAsync({
        ruleId: deleteTarget.id,
        matrixId,
      });
    }

    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleToggleRuleStatus = async (rule: ApprovalMatrixRule) => {
    await updateRuleMutation.mutateAsync({
      ruleId: rule.id,
      matrixId,
      data: { is_active: !rule.is_active },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!enterpriseId) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">No enterprise selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <Skeleton className="h-12 mb-6" />
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <div className="text-center">
          <GitBranch className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
          <p className="font-mono text-sm text-ghost-600 mb-2">Matrix not found</p>
          <button
            onClick={() => router.push('/dashboard/settings/approvals')}
            className="font-mono text-xs text-purple-900 hover:underline"
          >
            Return to matrices
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = matrixStatusConfig[matrix.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/settings/approvals')}
              className="p-2 hover:bg-ghost-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                APPROVAL MATRIX
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-500 truncate max-w-md">
              {matrix.name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn('font-mono text-xs flex items-center gap-1', statusConfig.bgColor, statusConfig.color)}>
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100">
                <GitBranch className="h-6 w-6 text-purple-900" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-purple-900">
                    {matrix.name}
                  </h1>
                  {matrix.is_default && (
                    <Badge className="font-mono text-[10px] bg-purple-100 text-purple-700">
                      DEFAULT
                    </Badge>
                  )}
                </div>
                {matrix.description && (
                  <p className="font-mono text-sm text-ghost-600 mb-3">
                    {matrix.description}
                  </p>
                )}
                <div className="flex items-center gap-4 font-mono text-xs text-ghost-500">
                  <span>Applies to: {appliesToLabels[matrix.applies_to]}</span>
                  <span>Priority: {matrix.priority}</span>
                  <span>Rules: {matrix.rules?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStatus}
                className={cn(
                  'border px-4 py-2 font-mono text-xs flex items-center gap-2',
                  matrix.status === 'active'
                    ? 'border-ghost-300 hover:border-ghost-500'
                    : 'border-green-600 text-green-700 hover:bg-green-50'
                )}
              >
                {matrix.status === 'active' ? (
                  <>
                    <Pause className="h-3 w-3" />
                    DEACTIVATE
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    ACTIVATE
                  </>
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="border border-ghost-300 p-2 hover:border-ghost-500">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/dashboard/settings/approvals/${matrix.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Matrix
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteTarget({ type: 'matrix', id: matrix.id });
                      setDeleteDialogOpen(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Matrix
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border border-ghost-300 bg-white p-1 w-full justify-start gap-0 h-auto">
            <TabsTrigger
              value="rules"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              <Workflow className="h-3 w-3" />
              Rules ({matrix.rules?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              <Settings className="h-3 w-3" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Approval Rules
                </h3>
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setRuleModalOpen(true);
                  }}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  ADD RULE
                </button>
              </div>

              {!matrix.rules || matrix.rules.length === 0 ? (
                <div className="p-12 text-center">
                  <Workflow className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No rules configured yet
                  </p>
                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setRuleModalOpen(true);
                    }}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Add your first approval rule
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {matrix.rules.map((rule, index) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      index={index}
                      isExpanded={expandedRules.has(rule.id)}
                      onToggleExpand={() => toggleRuleExpanded(rule.id)}
                      onEdit={() => {
                        setEditingRule(rule);
                        setRuleModalOpen(true);
                      }}
                      onToggleStatus={() => handleToggleRuleStatus(rule)}
                      onDelete={() => {
                        setDeleteTarget({ type: 'rule', id: rule.id });
                        setDeleteDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matrix Info */}
              <div className="border border-ghost-300 bg-white p-6">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-4">
                  Matrix Information
                </h3>
                <div className="space-y-4">
                  <InfoRow label="ID" value={matrix.id} mono />
                  <InfoRow label="Created" value={formatDate(matrix.created_at)} />
                  <InfoRow label="Last Updated" value={formatDate(matrix.updated_at)} />
                  <InfoRow label="Created By" value={matrix.creator?.full_name || 'Unknown'} />
                </div>
              </div>

              {/* Configuration */}
              <div className="border border-ghost-300 bg-white p-6">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase mb-4">
                  Configuration
                </h3>
                <div className="space-y-4">
                  <InfoRow label="Applies To" value={appliesToLabels[matrix.applies_to]} />
                  <InfoRow label="Priority" value={matrix.priority.toString()} />
                  <InfoRow
                    label="Default Matrix"
                    value={matrix.is_default ? 'Yes' : 'No'}
                    valueColor={matrix.is_default ? 'text-green-600' : 'text-ghost-600'}
                  />
                  <InfoRow label="Status" value={statusConfig.label} valueColor={statusConfig.color} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-lg text-purple-900">
              Delete {deleteTarget?.type === 'matrix' ? 'Approval Matrix' : 'Rule'}
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-ghost-600">
              {deleteTarget?.type === 'matrix'
                ? 'Are you sure you want to delete this approval matrix? This will also delete all associated rules and cannot be undone.'
                : 'Are you sure you want to delete this rule? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
            >
              CANCEL
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMatrixMutation.isPending || deleteRuleMutation.isPending}
              className="border border-red-600 bg-red-600 text-white px-4 py-2 font-mono text-xs hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMatrixMutation.isPending || deleteRuleMutation.isPending ? 'DELETING...' : 'DELETE'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Modal */}
      <RuleModal
        open={ruleModalOpen}
        onClose={() => {
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        matrixId={matrixId}
        onSave={async (data) => {
          if (editingRule) {
            await updateRuleMutation.mutateAsync({
              ruleId: editingRule.id,
              matrixId,
              data,
            });
          } else {
            await createRuleMutation.mutateAsync({
              ...data,
              matrix_id: matrixId,
            });
          }
          setRuleModalOpen(false);
          setEditingRule(null);
        }}
        isSaving={createRuleMutation.isPending || updateRuleMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// INFO ROW
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}

function InfoRow({ label, value, mono, valueColor = 'text-purple-900' }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-ghost-100 last:border-0">
      <span className="font-mono text-xs text-ghost-600 uppercase">{label}</span>
      <span className={cn('font-mono text-sm', valueColor, mono && 'text-xs bg-ghost-100 px-2 py-1')}>
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// RULE ROW
// ============================================================================

interface RuleRowProps {
  rule: ApprovalMatrixRule;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function RuleRow({
  rule,
  index,
  isExpanded,
  onToggleExpand,
  onEdit,
  onToggleStatus,
  onDelete,
}: RuleRowProps) {
  return (
    <div className="border-l-2 border-transparent hover:border-purple-500">
      {/* Rule Header */}
      <div
        className="px-4 py-4 cursor-pointer hover:bg-ghost-50 flex items-center gap-4"
        onClick={onToggleExpand}
      >
        <button className="p-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-ghost-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ghost-500" />
          )}
        </button>

        <div className="font-mono text-xs text-ghost-400 w-8">#{index + 1}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-medium text-purple-900">{rule.name}</span>
            <Badge
              className={cn(
                'font-mono text-[10px]',
                rule.is_active ? 'bg-green-100 text-green-700' : 'bg-ghost-100 text-ghost-500'
              )}
            >
              {rule.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {rule.description && (
            <div className="font-mono text-xs text-ghost-500">{rule.description}</div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <Badge className="font-mono text-xs bg-purple-100 text-purple-700">
              {approvalActionLabels[rule.action]}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-ghost-500">
            <Users className="h-3 w-3" />
            <span className="font-mono text-xs">{rule.approvers?.length || 0}</span>
          </div>

          {rule.sla_hours && (
            <div className="flex items-center gap-1 text-ghost-500">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs">{rule.sla_hours}h</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-ghost-100 rounded"
            >
              <MoreHorizontal className="h-4 w-4 text-ghost-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Rule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus}>
                {rule.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Rule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 ml-12 border-t border-ghost-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            {/* Conditions */}
            <div>
              <h4 className="font-mono text-xs font-semibold text-ghost-700 uppercase mb-3">
                Conditions
              </h4>
              <ConditionsDisplay conditions={rule.conditions} />
            </div>

            {/* Approvers */}
            <div>
              <h4 className="font-mono text-xs font-semibold text-ghost-700 uppercase mb-3">
                Approvers ({approvalModeLabels[rule.approval_mode]})
              </h4>
              <div className="space-y-2">
                {rule.approvers?.map((approver, i) => (
                  <ApproverDisplay key={i} approver={approver} index={i} />
                )) || (
                  <p className="font-mono text-xs text-ghost-500">No approvers configured</p>
                )}
              </div>
            </div>

            {/* Escalation & SLA */}
            <div>
              <h4 className="font-mono text-xs font-semibold text-ghost-700 uppercase mb-3">
                SLA & Escalation
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-ghost-400" />
                  <span className="font-mono text-xs text-ghost-600">
                    SLA: {rule.sla_hours ? `${rule.sla_hours} hours` : 'No SLA'}
                  </span>
                </div>
                {rule.escalation_rules ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="font-mono text-xs text-ghost-600">
                        Escalate after {rule.escalation_rules.escalate_after_hours}h
                      </span>
                    </div>
                    <div className="font-mono text-xs text-ghost-500 ml-5">
                      Max escalations: {rule.escalation_rules.max_escalations}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-ghost-300" />
                    <span className="font-mono text-xs text-ghost-500">
                      No escalation configured
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONDITIONS DISPLAY
// ============================================================================

function ConditionsDisplay({ conditions }: { conditions: ConditionGroup }) {
  if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
    return <p className="font-mono text-xs text-ghost-500">No conditions (always matches)</p>;
  }

  return (
    <div className="space-y-2">
      {conditions.conditions.map((condition, i) => {
        if ('logic' in condition) {
          // Nested group
          return (
            <div key={i} className="pl-2 border-l border-ghost-200">
              <span className="font-mono text-[10px] text-ghost-400 uppercase">
                {condition.logic}
              </span>
              <ConditionsDisplay conditions={condition} />
            </div>
          );
        }

        // Simple condition
        const fieldLabel = commonConditionFields.find(f => f.value === condition.field)?.label || condition.field;

        return (
          <div key={i} className="flex items-center gap-1 flex-wrap">
            {i > 0 && (
              <span className="font-mono text-[10px] text-ghost-400 uppercase pr-1">
                {conditions.logic}
              </span>
            )}
            <span className="font-mono text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5">
              {fieldLabel}
            </span>
            <span className="font-mono text-xs text-ghost-500">
              {conditionOperatorLabels[condition.operator]}
            </span>
            <span className="font-mono text-xs text-ghost-700 bg-ghost-100 px-1.5 py-0.5">
              {JSON.stringify(condition.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// APPROVER DISPLAY
// ============================================================================

function ApproverDisplay({ approver, index }: { approver: Approver; index: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 bg-ghost-100 flex items-center justify-center">
        <span className="font-mono text-xs text-ghost-600">{index + 1}</span>
      </div>
      <div>
        <div className="flex items-center gap-1">
          <Badge className="font-mono text-[10px] bg-ghost-100 text-ghost-600">
            {approverTypeLabels[approver.type]}
          </Badge>
          {approver.is_required && (
            <Badge className="font-mono text-[10px] bg-amber-100 text-amber-700">Required</Badge>
          )}
        </div>
        <span className="font-mono text-xs text-ghost-700">{approver.value}</span>
      </div>
    </div>
  );
}

// ============================================================================
// RULE MODAL
// ============================================================================

interface RuleModalProps {
  open: boolean;
  onClose: () => void;
  rule: ApprovalMatrixRule | null;
  matrixId: string;
  onSave: (data: {
    name: string;
    description?: string;
    priority?: number;
    conditions: ConditionGroup;
    action: ApprovalAction;
    approvers: Approver[];
    approval_mode: ApprovalMode;
    approval_percentage?: number;
    sla_hours?: number;
  }) => Promise<void>;
  isSaving: boolean;
}

function RuleModal({ open, onClose, rule, onSave, isSaving }: RuleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 0,
    action: 'require_approval' as ApprovalAction,
    approval_mode: 'any' as ApprovalMode,
    approval_percentage: 50,
    sla_hours: 24,
    // Simplified condition entry
    condition_field: 'contract_value',
    condition_operator: 'greater_than' as ConditionOperator,
    condition_value: '',
    // Simplified approver entry
    approver_type: 'role' as ApproverType,
    approver_value: '',
    approvers: [] as Approver[],
  });

  // Reset form when rule changes
  useState(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        priority: rule.priority,
        action: rule.action,
        approval_mode: rule.approval_mode,
        approval_percentage: rule.approval_percentage || 50,
        sla_hours: rule.sla_hours || 24,
        condition_field: 'contract_value',
        condition_operator: 'greater_than',
        condition_value: '',
        approver_type: 'role',
        approver_value: '',
        approvers: rule.approvers || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        priority: 0,
        action: 'require_approval',
        approval_mode: 'any',
        approval_percentage: 50,
        sla_hours: 24,
        condition_field: 'contract_value',
        condition_operator: 'greater_than',
        condition_value: '',
        approver_type: 'role',
        approver_value: '',
        approvers: [],
      });
    }
  });

  const handleAddApprover = () => {
    if (!formData.approver_value.trim()) return;
    setFormData({
      ...formData,
      approvers: [
        ...formData.approvers,
        {
          type: formData.approver_type,
          value: formData.approver_value,
          order: formData.approvers.length,
          is_required: true,
        },
      ],
      approver_value: '',
    });
  };

  const handleRemoveApprover = (index: number) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const conditions: ConditionGroup = {
      logic: 'and',
      conditions: formData.condition_value
        ? [
            {
              field: formData.condition_field,
              operator: formData.condition_operator,
              value: isNaN(Number(formData.condition_value))
                ? formData.condition_value
                : Number(formData.condition_value),
            },
          ]
        : [],
    };

    await onSave({
      name: formData.name,
      description: formData.description || undefined,
      priority: formData.priority,
      conditions,
      action: formData.action,
      approvers: formData.approvers,
      approval_mode: formData.approval_mode,
      approval_percentage:
        formData.approval_mode === 'percentage' ? formData.approval_percentage : undefined,
      sla_hours: formData.sla_hours || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-purple-900">
            {rule ? 'Edit Approval Rule' : 'Create Approval Rule'}
          </DialogTitle>
          <DialogDescription className="font-mono text-sm text-ghost-600">
            Configure when this rule triggers and who needs to approve
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., High Value Contracts"
                required
                className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                className="w-full px-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
              Condition (when to trigger)
            </label>
            <div className="flex gap-2">
              <select
                value={formData.condition_field}
                onChange={(e) => setFormData({ ...formData, condition_field: e.target.value })}
                className="flex-1 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {commonConditionFields.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                value={formData.condition_operator}
                onChange={(e) =>
                  setFormData({ ...formData, condition_operator: e.target.value as ConditionOperator })
                }
                className="flex-1 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {Object.entries(conditionOperatorLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formData.condition_value}
                onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
                placeholder="Value..."
                className="flex-1 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>
            <p className="font-mono text-xs text-ghost-500 mt-1">
              Leave empty to always trigger this rule
            </p>
          </div>

          {/* Action */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Action *
              </label>
              <select
                value={formData.action}
                onChange={(e) =>
                  setFormData({ ...formData, action: e.target.value as ApprovalAction })
                }
                className="w-full px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {Object.entries(approvalActionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
                Approval Mode
              </label>
              <select
                value={formData.approval_mode}
                onChange={(e) =>
                  setFormData({ ...formData, approval_mode: e.target.value as ApprovalMode })
                }
                className="w-full px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {Object.entries(approvalModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Approvers */}
          <div>
            <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
              Approvers
            </label>
            <div className="flex gap-2 mb-2">
              <select
                value={formData.approver_type}
                onChange={(e) =>
                  setFormData({ ...formData, approver_type: e.target.value as ApproverType })
                }
                className="w-40 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                {Object.entries(approverTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formData.approver_value}
                onChange={(e) => setFormData({ ...formData, approver_value: e.target.value })}
                placeholder="e.g., legal_manager, finance_head..."
                className="flex-1 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddApprover}
                className="px-3 py-2 border border-ghost-300 hover:border-purple-900 font-mono text-xs"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {formData.approvers.length > 0 && (
              <div className="space-y-2 p-3 bg-ghost-50 border border-ghost-200">
                {formData.approvers.map((approver, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ghost-500">{i + 1}.</span>
                      <Badge className="font-mono text-xs bg-ghost-100 text-ghost-600">
                        {approverTypeLabels[approver.type]}
                      </Badge>
                      <span className="font-mono text-sm text-purple-900">{approver.value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveApprover(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SLA */}
          <div>
            <label className="block font-mono text-xs font-semibold text-ghost-700 uppercase mb-2">
              SLA (hours)
            </label>
            <input
              type="number"
              value={formData.sla_hours}
              onChange={(e) => setFormData({ ...formData, sla_hours: parseInt(e.target.value) || 0 })}
              min={0}
              className="w-32 px-3 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
            />
            <p className="font-mono text-xs text-ghost-500 mt-1">
              Time allowed for approval before escalation
            </p>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-ghost-300 px-4 py-2 font-mono text-xs hover:border-ghost-500"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name.trim()}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 disabled:opacity-50"
            >
              {isSaving ? 'SAVING...' : rule ? 'UPDATE RULE' : 'CREATE RULE'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
