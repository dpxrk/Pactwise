'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Play,
  StopCircle,
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Clock,
  Activity,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSessionList,
  useSessionStats,
  useEndSession,
} from '@/hooks/queries/useSessions';
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
import type { SessionStatus } from '@/types/signature-management.types';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  SessionStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: Play,
  },
  ended: {
    label: 'Ended',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: StopCircle,
  },
};

// ============================================================================
// SESSIONS PAGE
// ============================================================================

export default function SessionsPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');

  // Fetch data
  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch,
  } = useSessionList(enterpriseId || '', {
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useSessionStats(enterpriseId || '');

  // Mutations
  const endSessionMutation = useEndSession();

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (!searchQuery) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        s.document_title.toLowerCase().includes(query) ||
        s.contract_title.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  // Separate active and ended sessions
  const { activeSessions, endedSessions } = useMemo(() => {
    if (!filteredSessions)
      return { activeSessions: [], endedSessions: [] };
    return {
      activeSessions: filteredSessions.filter((s) => s.status === 'active'),
      endedSessions: filteredSessions.filter((s) => s.status === 'ended'),
    };
  }, [filteredSessions]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                COLLABORATIVE SESSIONS
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              REAL-TIME EDITING
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active:</span>
              <span className="font-semibold text-green-600">
                {stats?.active || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Avg Participants:</span>
              <span className="font-semibold text-purple-900">
                {stats?.average_participants?.toFixed(1) || 0}
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
                COLLABORATIVE SESSIONS
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Real-time document collaboration with CRDT sync
              </p>
            </div>
            {/* Sessions are typically created from contract detail page */}
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
                label="Total Sessions"
                value={stats?.total || 0}
                color="text-purple-900"
                icon={FileText}
              />
              <StatCard
                label="Active Now"
                value={stats?.active || 0}
                color="text-green-600"
                icon={Play}
                highlight={stats?.active ? stats.active > 0 : false}
              />
              <StatCard
                label="Ended Today"
                value={stats?.ended_today || 0}
                color="text-ghost-600"
                icon={Clock}
              />
              <StatCard
                label="This Week"
                value={stats?.ended_this_week || 0}
                color="text-blue-600"
                icon={Activity}
              />
              <StatCard
                label="Avg Participants"
                value={parseFloat((stats?.average_participants || 0).toFixed(1))}
                color="text-purple-600"
                icon={Users}
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
                placeholder="Search by document or contract..."
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
                onChange={(e) => setStatusFilter(e.target.value as SessionStatus | 'all')}
                className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
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

        {/* Active Sessions */}
        {(statusFilter === 'all' || statusFilter === 'active') && (
          <div className="border border-ghost-300 bg-white mb-6">
            <div className="px-4 py-3 border-b border-ghost-300 bg-green-50">
              <h2 className="font-mono text-sm font-semibold text-green-800 uppercase flex items-center gap-2">
                <Play className="h-4 w-4" />
                Active Sessions ({activeSessions.length})
              </h2>
            </div>

            {sessionsLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                <p className="font-mono text-sm text-ghost-500">
                  No active sessions
                </p>
                <p className="font-mono text-xs text-ghost-400 mt-1">
                  Start a collaboration from a contract&apos;s detail page
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ghost-200">
                {activeSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onView={() =>
                      router.push(`/dashboard/contracts/sessions/${session.id}`)
                    }
                    onEnd={() => endSessionMutation.mutate(session.id)}
                    formatDate={formatDate}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ended Sessions */}
        {(statusFilter === 'all' || statusFilter === 'ended') && (
          <div className="border border-ghost-300 bg-white">
            <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
              <h2 className="font-mono text-sm font-semibold text-ghost-700 uppercase flex items-center gap-2">
                <StopCircle className="h-4 w-4" />
                Recent Sessions ({endedSessions.length})
              </h2>
            </div>

            {sessionsLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : endedSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                <p className="font-mono text-sm text-ghost-500">
                  No recent sessions
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ghost-200">
                {endedSessions.slice(0, 20).map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onView={() =>
                      router.push(`/dashboard/contracts/sessions/${session.id}`)
                    }
                    formatDate={formatDate}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            )}
          </div>
        )}
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
  icon: LucideIcon;
  highlight?: boolean;
}

function StatCard({ label, value, color, icon: Icon, highlight }: StatCardProps) {
  return (
    <div
      className={cn(
        'border border-ghost-300 bg-white p-4',
        highlight && 'border-green-300 bg-green-50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="font-mono text-xs text-ghost-600 uppercase">{label}</span>
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  );
}

// ============================================================================
// SESSION ROW
// ============================================================================

interface SessionRowProps {
  session: {
    id: string;
    document_title: string;
    contract_id: string;
    contract_title: string;
    status: SessionStatus;
    participant_count: number;
    created_at: string;
    updated_at: string;
  };
  onView: () => void;
  onEnd?: () => void;
  formatDate: (date: string) => string;
  formatRelativeTime: (date: string) => string;
}

function SessionRow({
  session,
  onView,
  onEnd,
  formatDate,
  formatRelativeTime,
}: SessionRowProps) {
  const config = statusConfig[session.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="px-4 py-4 hover:bg-ghost-50 cursor-pointer group"
      onClick={onView}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded flex items-center justify-center',
              session.status === 'active' ? 'bg-green-100' : 'bg-ghost-100'
            )}
          >
            <FileText
              className={cn(
                'h-5 w-5',
                session.status === 'active' ? 'text-green-600' : 'text-ghost-500'
              )}
            />
          </div>

          {/* Info */}
          <div>
            <div className="font-mono text-sm font-medium text-ghost-900 group-hover:underline">
              {session.document_title}
            </div>
            <div className="font-mono text-xs text-ghost-500">
              {session.contract_title}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-xs text-ghost-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {session.participant_count} participants
              </span>
              <span className="font-mono text-xs text-ghost-400">
                Updated {formatRelativeTime(session.updated_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status */}
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

          {/* Actions */}
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
                {session.status === 'active' ? 'Join Session' : 'View Details'}
              </DropdownMenuItem>
              {session.status === 'active' && onEnd && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnd();
                  }}
                  className="text-red-600"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Session
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
