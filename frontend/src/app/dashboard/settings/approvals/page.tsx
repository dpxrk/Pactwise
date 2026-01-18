'use client';

import {
  Plus,
  Search,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Users,
  ArrowRight,
  Play,
  Pause,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

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
  useApprovalMatrixList,
  useApprovalStats,
  usePendingApprovals,
  useDelegations,
  useDeleteApprovalMatrix,
  useUpdateApprovalMatrix,
} from '@/hooks/queries/useApprovals';
import { cn } from '@/lib/utils';
import type {
  ApprovalMatrixListItem,
  PendingApproval,
  ApprovalDelegation,
  AppliesTo,
  MatrixStatus,
} from '@/types/approvals.types';
import { appliesToLabels } from '@/types/approvals.types';

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

// Utility function hoisted outside component to avoid recreation on every render
// Reference: Vercel Best Practices - Section 7.4 "Cache Repeated Function Calls"
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================================================
// APPROVAL MATRIX PAGE
// ============================================================================

export default function ApprovalMatrixPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const userId = userProfile?.id || '';
  const enterpriseId = userProfile?.enterprise_id;

  const [activeTab, setActiveTab] = useState('matrices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MatrixStatus | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matrixToDelete, setMatrixToDelete] = useState<string | null>(null);

  // Fetch data
  const { data: matrices, isLoading: matricesLoading, refetch } = useApprovalMatrixList(
    enterpriseId || '',
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    }
  );
  const { data: stats, isLoading: statsLoading } = useApprovalStats(enterpriseId || '');
  const { data: pending, isLoading: pendingLoading } = usePendingApprovals(
    enterpriseId || '',
    userId
  );
  const { data: delegations, isLoading: delegationsLoading } = useDelegations(enterpriseId || '');

  // Mutations
  const deleteMutation = useDeleteApprovalMatrix();
  const updateMutation = useUpdateApprovalMatrix();

  // Filter matrices
  const filteredMatrices = useMemo(() => {
    if (!matrices) return [];
    if (!searchQuery) return matrices;
    const query = searchQuery.toLowerCase();
    return matrices.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        (m.description?.toLowerCase().includes(query) ?? false)
    );
  }, [matrices, searchQuery]);

  // Handlers
  const handleDelete = async () => {
    if (!matrixToDelete) return;
    await deleteMutation.mutateAsync(matrixToDelete);
    setDeleteDialogOpen(false);
    setMatrixToDelete(null);
  };

  const handleToggleStatus = async (matrixId: string, currentStatus: MatrixStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateMutation.mutateAsync({
      matrixId,
      data: { status: newStatus },
    });
  };

  if (!enterpriseId) {
    return (
      <div className="min-h-screen bg-ghost-100 flex items-center justify-center">
        <p className="font-mono text-sm text-ghost-600">No enterprise selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-purple-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                APPROVAL MATRIX
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Pending:</span>
              <span className="font-semibold text-amber-600">
                {stats?.pending || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Overdue:</span>
              <span className="font-semibold text-red-600">
                {stats?.overdue || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-1">
                APPROVAL MATRIX
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Configure approval workflows and routing rules
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings/approvals/new')}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
            >
              <Plus className="h-3 w-3" />
              NEW MATRIX
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {statsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : (
            <>
              <StatCard
                label="Pending"
                value={stats?.pending || 0}
                color="text-amber-600"
                icon={Clock}
              />
              <StatCard
                label="Approved Today"
                value={stats?.approved_today || 0}
                color="text-green-600"
                icon={CheckCircle2}
              />
              <StatCard
                label="Rejected Today"
                value={stats?.rejected_today || 0}
                color="text-red-600"
                icon={XCircle}
              />
              <StatCard
                label="Overdue"
                value={stats?.overdue || 0}
                color="text-red-600"
                icon={AlertTriangle}
              />
              <StatCard
                label="Avg. Time (hrs)"
                value={stats?.average_approval_time_hours || 0}
                color="text-purple-600"
                icon={Clock}
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border border-ghost-300 bg-white p-1 w-full justify-start gap-0 h-auto">
            <TabsTrigger
              value="matrices"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Matrices
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none flex items-center gap-2"
            >
              My Pending
              {pending && pending.length > 0 && (
                <Badge className="font-mono text-[10px] bg-amber-500 text-white">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="delegations"
              className="font-mono text-xs uppercase px-4 py-2 data-[state=active]:bg-purple-900 data-[state=active]:text-white rounded-none"
            >
              Delegations
            </TabsTrigger>
          </TabsList>

          {/* Matrices Tab */}
          <TabsContent value="matrices" className="mt-6">
            {/* Filters */}
            <div className="border border-ghost-300 bg-white p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
                  <input
                    type="text"
                    placeholder="Search matrices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-ghost-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as MatrixStatus | 'all')}
                    className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <button
                  onClick={() => refetch()}
                  className="border border-ghost-300 p-2 hover:border-purple-900 hover:bg-ghost-50"
                >
                  <RefreshCw className="h-4 w-4 text-ghost-600" />
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-ghost-300 bg-white">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-ghost-300 bg-ghost-50">
                <div className="col-span-4 font-mono text-xs font-semibold text-ghost-700 uppercase">
                  Matrix
                </div>
                <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
                  Applies To
                </div>
                <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
                  Status
                </div>
                <div className="col-span-1 font-mono text-xs font-semibold text-ghost-700 uppercase">
                  Rules
                </div>
                <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
                  Updated
                </div>
                <div className="col-span-1 font-mono text-xs font-semibold text-ghost-700 uppercase text-right">
                  Actions
                </div>
              </div>

              {matricesLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredMatrices.length === 0 ? (
                <div className="p-12 text-center">
                  <GitBranch className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No approval matrices found
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/settings/approvals/new')}
                    className="font-mono text-xs text-purple-900 hover:underline"
                  >
                    Create your first matrix
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {filteredMatrices.map((matrix) => (
                    <MatrixRow
                      key={matrix.id}
                      matrix={matrix}
                      onView={() => router.push(`/dashboard/settings/approvals/${matrix.id}`)}
                      onEdit={() => router.push(`/dashboard/settings/approvals/${matrix.id}/edit`)}
                      onToggleStatus={() => handleToggleStatus(matrix.id, matrix.status)}
                      onDelete={() => {
                        setMatrixToDelete(matrix.id);
                        setDeleteDialogOpen(true);
                      }}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Pending Approvals ({pending?.length || 0})
                </h3>
              </div>

              {pendingLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !pending || pending.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    All caught up!
                  </p>
                  <p className="font-mono text-xs text-ghost-400">
                    No pending approvals at the moment
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {pending.map((item) => (
                    <PendingApprovalRow
                      key={item.id}
                      item={item}
                      onClick={() => {
                        // Navigate to the entity detail page
                        if (item.entity_type === 'contracts') {
                          router.push(`/dashboard/contracts/${item.entity_id}`);
                        } else if (item.entity_type === 'intake_submissions') {
                          router.push(`/dashboard/contracts/intake/submissions/${item.entity_id}`);
                        }
                      }}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Delegations Tab */}
          <TabsContent value="delegations" className="mt-6">
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 px-4 py-3 flex justify-between items-center">
                <h3 className="font-mono text-sm font-semibold text-purple-900 uppercase">
                  Active Delegations
                </h3>
                <button
                  onClick={() => router.push('/dashboard/settings/approvals/delegations/new')}
                  className="border border-ghost-300 px-3 py-1.5 font-mono text-xs hover:border-purple-900 hover:bg-ghost-50 flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  NEW DELEGATION
                </button>
              </div>

              {delegationsLoading ? (
                <div className="p-4 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : !delegations || delegations.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
                  <p className="font-mono text-sm text-ghost-600 mb-2">
                    No delegations configured
                  </p>
                  <p className="font-mono text-xs text-ghost-400">
                    Set up delegations when you&apos;re unavailable
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-ghost-200">
                  {delegations.map((delegation) => (
                    <DelegationRow
                      key={delegation.id}
                      delegation={delegation}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-lg text-purple-900">
              Delete Approval Matrix
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-ghost-600">
              Are you sure you want to delete this approval matrix? This action cannot
              be undone and will affect all associated rules.
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
              disabled={deleteMutation.isPending}
              className="border border-red-600 bg-red-600 text-white px-4 py-2 font-mono text-xs hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'DELETING...' : 'DELETE'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}

function StatCard({ label, value, color, icon: Icon }: StatCardProps) {
  return (
    <div className="border border-ghost-300 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <span className="font-mono text-xs text-ghost-600 uppercase">{label}</span>
    </div>
  );
}

// ============================================================================
// MATRIX ROW
// ============================================================================

interface MatrixRowProps {
  matrix: ApprovalMatrixListItem;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

function MatrixRow({
  matrix,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  formatDate,
}: MatrixRowProps) {
  const config = matrixStatusConfig[matrix.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-ghost-50 cursor-pointer group"
      onClick={onView}
    >
      <div className="col-span-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="font-mono text-sm font-medium text-purple-900 group-hover:underline">
            {matrix.name}
          </div>
          {matrix.is_default && (
            <Badge className="font-mono text-[10px] bg-purple-100 text-purple-700">
              DEFAULT
            </Badge>
          )}
        </div>
        {matrix.description && (
          <div className="font-mono text-xs text-ghost-500 line-clamp-1">
            {matrix.description}
          </div>
        )}
      </div>

      <div className="col-span-2 flex items-center">
        <Badge className="font-mono text-xs bg-ghost-100 text-ghost-700">
          {appliesToLabels[matrix.applies_to]}
        </Badge>
      </div>

      <div className="col-span-2 flex items-center">
        <Badge
          className={cn('font-mono text-xs flex items-center gap-1', config.bgColor, config.color)}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      <div className="col-span-1 flex items-center">
        <span className="font-mono text-sm text-ghost-600">{matrix.rules_count}</span>
      </div>

      <div className="col-span-2 flex items-center">
        <span className="font-mono text-xs text-ghost-500">
          {formatDate(matrix.updated_at)}
        </span>
      </div>

      <div className="col-span-1 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-2 hover:bg-ghost-100 rounded"
          >
            <MoreHorizontal className="h-4 w-4 text-ghost-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleStatus}>
              {matrix.status === 'active' ? (
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
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// PENDING APPROVAL ROW
// ============================================================================

interface PendingApprovalRowProps {
  item: PendingApproval;
  onClick: () => void;
  formatDate: (date: string) => string;
}

function PendingApprovalRow({ item, onClick, formatDate }: PendingApprovalRowProps) {
  return (
    <div
      className="px-4 py-4 hover:bg-ghost-50 cursor-pointer flex items-center gap-4"
      onClick={onClick}
    >
      <div className={cn('p-2', item.is_overdue ? 'bg-red-100' : 'bg-amber-100')}>
        {item.is_overdue ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <Clock className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-medium text-purple-900">
            {item.entity_title}
          </span>
          {item.is_overdue && (
            <Badge className="font-mono text-[10px] bg-red-100 text-red-700">
              OVERDUE
            </Badge>
          )}
        </div>
        <div className="font-mono text-xs text-ghost-500">
          {appliesToLabels[item.entity_type]} - {item.rule_name}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-xs text-ghost-600">
          Requested {formatDate(item.requested_at)}
        </div>
        {item.due_at && (
          <div className="font-mono text-xs text-ghost-400">
            Due {formatDate(item.due_at)}
          </div>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-ghost-400" />
    </div>
  );
}

// ============================================================================
// DELEGATION ROW
// ============================================================================

interface DelegationRowProps {
  delegation: ApprovalDelegation;
  formatDate: (date: string) => string;
}

function DelegationRow({ delegation, formatDate }: DelegationRowProps) {
  const isActive = delegation.is_active &&
    new Date(delegation.start_date) <= new Date() &&
    new Date(delegation.end_date) >= new Date();

  return (
    <div className="px-4 py-4 flex items-center gap-4">
      <div className={cn('p-2', isActive ? 'bg-green-100' : 'bg-ghost-100')}>
        <Users className={cn('h-4 w-4', isActive ? 'text-green-600' : 'text-ghost-500')} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-medium text-purple-900">
            {delegation.delegator?.full_name || 'Unknown'}
          </span>
          <ArrowRight className="h-3 w-3 text-ghost-400" />
          <span className="font-mono text-sm font-medium text-purple-900">
            {delegation.delegate?.full_name || 'Unknown'}
          </span>
        </div>
        <div className="font-mono text-xs text-ghost-500">
          {appliesToLabels[delegation.applies_to as AppliesTo] || 'All Types'}
          {delegation.reason && ` - ${delegation.reason}`}
        </div>
      </div>
      <div className="text-right">
        <Badge className={cn(
          'font-mono text-xs',
          isActive ? 'bg-green-100 text-green-700' : 'bg-ghost-100 text-ghost-600'
        )}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
        <div className="font-mono text-xs text-ghost-400 mt-1">
          {formatDate(delegation.start_date)} - {formatDate(delegation.end_date)}
        </div>
      </div>
    </div>
  );
}
