'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  FileSignature,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSignatureRequestList,
  useSignatureStats,
  useCancelSignatureRequest,
  useResendSignatureRequest,
} from '@/hooks/queries/useSignatures';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type {
  SignatureRequestListItem,
  SignatureRequestStatus,
} from '@/types/signature-management.types';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  SignatureRequestStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  draft: {
    label: 'Draft',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: FileSignature,
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: RefreshCw,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: AlertTriangle,
  },
  declined: {
    label: 'Declined',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-ghost-500',
    bgColor: 'bg-ghost-50',
    icon: XCircle,
  },
};

// ============================================================================
// SIGNATURES PAGE
// ============================================================================

export default function SignaturesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SignatureRequestStatus | 'all'>('all');

  // Fetch data
  const {
    data: signatures,
    isLoading: signaturesLoading,
    refetch,
  } = useSignatureRequestList(enterpriseId || '', {
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useSignatureStats(enterpriseId || '');

  // Mutations
  const cancelMutation = useCancelSignatureRequest();
  const resendMutation = useResendSignatureRequest();

  // Filter signatures based on search
  const filteredSignatures = useMemo(() => {
    if (!signatures) return [];
    if (!searchQuery) return signatures;
    const query = searchQuery.toLowerCase();
    return signatures.filter(
      (sig) =>
        sig.title.toLowerCase().includes(query) ||
        sig.contract_title.toLowerCase().includes(query)
    );
  }, [signatures, searchQuery]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get days until expiry
  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const days = Math.ceil(
      (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
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
                SIGNATURE MANAGEMENT
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
              <span className="text-ghost-600 uppercase">Completed:</span>
              <span className="font-semibold text-green-600">
                {stats?.completed || 0}
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
                SIGNATURE REQUESTS
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Track and manage document signature requests
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/contracts/signatures/create')}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
            >
              <Plus className="h-3 w-3" />
              NEW REQUEST
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {statsLoading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : (
            <>
              <StatCard
                label="Total"
                value={stats?.total || 0}
                color="text-purple-900"
              />
              <StatCard
                label="Draft"
                value={stats?.draft || 0}
                color="text-ghost-600"
              />
              <StatCard
                label="Pending"
                value={stats?.pending || 0}
                color="text-amber-600"
              />
              <StatCard
                label="In Progress"
                value={stats?.in_progress || 0}
                color="text-blue-600"
              />
              <StatCard
                label="Completed"
                value={stats?.completed || 0}
                color="text-green-600"
              />
              <StatCard
                label="Expired"
                value={stats?.expired || 0}
                color="text-ghost-500"
              />
              <StatCard
                label="Expiring Soon"
                value={stats?.expiring_soon || 0}
                color="text-orange-600"
                highlight={stats?.expiring_soon ? stats.expiring_soon > 0 : false}
              />
            </>
          )}
        </div>

        {/* Filters */}
        <div className="border border-ghost-300 bg-white p-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
              <input
                type="text"
                placeholder="Search by title or contract..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-ghost-500" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as SignatureRequestStatus | 'all')
                }
                className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="border border-ghost-300 p-2 hover:border-purple-900 hover:bg-ghost-50"
            >
              <RefreshCw className="h-4 w-4 text-ghost-600" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-ghost-300 bg-white">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-ghost-300 bg-ghost-50">
            <div className="col-span-4 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Request
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Status
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Progress
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase">
              Expires
            </div>
            <div className="col-span-2 font-mono text-xs font-semibold text-ghost-700 uppercase text-right">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {signaturesLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredSignatures.length === 0 ? (
            <div className="p-12 text-center">
              <FileSignature className="h-12 w-12 text-ghost-300 mx-auto mb-4" />
              <p className="font-mono text-sm text-ghost-600 mb-2">
                No signature requests found
              </p>
              <button
                onClick={() => router.push('/dashboard/contracts/signatures/create')}
                className="font-mono text-xs text-purple-900 hover:underline"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ghost-200">
              {filteredSignatures.map((signature) => (
                <SignatureRow
                  key={signature.id}
                  signature={signature}
                  onView={() =>
                    router.push(`/dashboard/contracts/signatures/${signature.id}`)
                  }
                  onCancel={() => cancelMutation.mutate(signature.id)}
                  onResend={() => resendMutation.mutate(signature.id)}
                  formatDate={formatDate}
                  getDaysUntilExpiry={getDaysUntilExpiry}
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
  highlight?: boolean;
}

function StatCard({ label, value, color, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'border border-ghost-300 bg-white p-4',
        highlight && 'border-orange-300 bg-orange-50'
      )}
    >
      <span className="font-mono text-xs text-ghost-600 uppercase block mb-1">
        {label}
      </span>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  );
}

// ============================================================================
// SIGNATURE ROW
// ============================================================================

interface SignatureRowProps {
  signature: SignatureRequestListItem;
  onView: () => void;
  onCancel: () => void;
  onResend: () => void;
  formatDate: (date: string | null) => string;
  getDaysUntilExpiry: (date: string | null) => number | null;
}

function SignatureRow({
  signature,
  onView,
  onCancel,
  onResend,
  formatDate,
  getDaysUntilExpiry,
}: SignatureRowProps) {
  const config = statusConfig[signature.status];
  const StatusIcon = config.icon;
  const daysUntilExpiry = getDaysUntilExpiry(signature.expires_at);
  const progress =
    signature.signatories_count > 0
      ? Math.round((signature.signed_count / signature.signatories_count) * 100)
      : 0;

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-ghost-50 cursor-pointer group"
      onClick={onView}
    >
      {/* Request Info */}
      <div className="col-span-4">
        <div className="font-mono text-sm font-medium text-purple-900 group-hover:underline mb-1">
          {signature.title}
        </div>
        <div className="font-mono text-xs text-ghost-500">
          {signature.contract_title}
        </div>
        <div className="font-mono text-xs text-ghost-400 mt-1">
          Created {formatDate(signature.created_at)} by {signature.created_by.name}
        </div>
      </div>

      {/* Status */}
      <div className="col-span-2 flex items-center">
        <Badge
          className={cn(
            'font-mono text-xs flex items-center gap-1',
            config.bgColor,
            config.color
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      {/* Progress */}
      <div className="col-span-2 flex flex-col justify-center">
        <div className="font-mono text-xs text-ghost-600 mb-1">
          {signature.signed_count}/{signature.signatories_count} signed
        </div>
        <div className="h-1.5 bg-ghost-200 w-full">
          <div
            className={cn(
              'h-full transition-all',
              progress === 100 ? 'bg-green-500' : 'bg-purple-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Expires */}
      <div className="col-span-2 flex items-center">
        {signature.expires_at ? (
          <div
            className={cn(
              'font-mono text-xs',
              daysUntilExpiry !== null && daysUntilExpiry <= 7
                ? 'text-orange-600'
                : 'text-ghost-600'
            )}
          >
            {formatDate(signature.expires_at)}
            {daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
              <span className="block text-orange-600">
                ({daysUntilExpiry} days left)
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-xs text-ghost-400">No expiry</span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-2 flex items-center justify-end">
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
              View Details
            </DropdownMenuItem>
            {(signature.status === 'pending' ||
              signature.status === 'in_progress') && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onResend();
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend Reminder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
