'use client';

import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Key,
  User,
  Building2,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCertificateList,
  useCertificateStats,
  useRevokeCertificate,
  useDownloadCertificate,
} from '@/hooks/queries/useCertificates';
import { cn } from '@/lib/utils';
import type { CertificateStatus, CertificateType } from '@/types/signature-management.types';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const statusConfig: Record<
  CertificateStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  active: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: ShieldCheck,
  },
  expired: {
    label: 'Expired',
    color: 'text-ghost-600',
    bgColor: 'bg-ghost-100',
    icon: ShieldAlert,
  },
  revoked: {
    label: 'Revoked',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: ShieldX,
  },
};

// ============================================================================
// CERTIFICATES PAGE
// ============================================================================

export default function CertificatesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CertificateType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | 'all'>('all');

  // Fetch data
  const {
    data: certificates,
    isLoading: certificatesLoading,
    refetch,
  } = useCertificateList(enterpriseId || '', {
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useCertificateStats(enterpriseId || '');

  // Mutations
  const revokeMutation = useRevokeCertificate();
  const downloadMutation = useDownloadCertificate();

  // Separate CAs and user certificates
  const { cas, userCerts } = useMemo(() => {
    if (!certificates) return { cas: [], userCerts: [] };
    return {
      cas: certificates.filter((c) => c.type === 'ca'),
      userCerts: certificates.filter((c) => c.type === 'user'),
    };
  }, [certificates]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get days until expiry
  const getDaysUntilExpiry = (validUntil: string) => {
    const days = Math.ceil(
      (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">
                CERTIFICATE MANAGEMENT
              </span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              PKI INFRASTRUCTURE
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active CAs:</span>
              <span className="font-semibold text-green-600">
                {stats?.active_cas || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">User Certs:</span>
              <span className="font-semibold text-purple-900">
                {stats?.active_user_certs || 0}
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
                PKI CERTIFICATES
              </h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Manage Certificate Authorities and user certificates
              </p>
            </div>
            {/* For now, CA creation would be done via API/admin */}
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
                label="Total CAs"
                value={stats?.total_cas || 0}
                color="text-purple-900"
                icon={Building2}
              />
              <StatCard
                label="Active CAs"
                value={stats?.active_cas || 0}
                color="text-green-600"
                icon={ShieldCheck}
              />
              <StatCard
                label="User Certs"
                value={stats?.total_user_certs || 0}
                color="text-blue-600"
                icon={User}
              />
              <StatCard
                label="Active Certs"
                value={stats?.active_user_certs || 0}
                color="text-green-600"
                icon={ShieldCheck}
              />
              <StatCard
                label="Expired"
                value={stats?.expired_certs || 0}
                color="text-ghost-500"
                icon={ShieldAlert}
              />
              <StatCard
                label="Revoked"
                value={stats?.revoked_certs || 0}
                color="text-red-600"
                icon={ShieldX}
              />
              <StatCard
                label="Expiring Soon"
                value={stats?.expiring_soon || 0}
                color="text-orange-600"
                icon={AlertTriangle}
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
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-ghost-300 font-mono text-sm focus:border-purple-900 focus:outline-none"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-ghost-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CertificateType | 'all')}
                className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="ca">Certificate Authorities</option>
                <option value="user">User Certificates</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CertificateStatus | 'all')}
              className="border border-ghost-300 px-3 py-2 font-mono text-sm focus:border-purple-900 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="border border-ghost-300 p-2 hover:border-purple-900 hover:bg-ghost-50"
            >
              <RefreshCw className="h-4 w-4 text-ghost-600" />
            </button>
          </div>
        </div>

        {/* Certificate Authorities Section */}
        {(typeFilter === 'all' || typeFilter === 'ca') && (
          <div className="border border-ghost-300 bg-white mb-6">
            <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
              <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Certificate Authorities ({cas.length})
              </h2>
            </div>

            {certificatesLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : cas.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                <p className="font-mono text-sm text-ghost-500">
                  No Certificate Authorities found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ghost-200">
                {cas.map((cert) => (
                  <CertificateRow
                    key={cert.id}
                    certificate={cert}
                    onView={() =>
                      router.push(`/dashboard/contracts/certificates/ca/${cert.id}`)
                    }
                    onRevoke={() =>
                      revokeMutation.mutate({
                        certId: cert.id,
                        reason: 'Revoked by admin',
                      })
                    }
                    formatDate={formatDate}
                    getDaysUntilExpiry={getDaysUntilExpiry}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Certificates Section */}
        {(typeFilter === 'all' || typeFilter === 'user') && (
          <div className="border border-ghost-300 bg-white">
            <div className="px-4 py-3 border-b border-ghost-300 bg-ghost-50">
              <h2 className="font-mono text-sm font-semibold text-purple-900 uppercase flex items-center gap-2">
                <User className="h-4 w-4" />
                User Certificates ({userCerts.length})
              </h2>
            </div>

            {certificatesLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : userCerts.length === 0 ? (
              <div className="p-8 text-center">
                <User className="h-8 w-8 text-ghost-300 mx-auto mb-2" />
                <p className="font-mono text-sm text-ghost-500">
                  No user certificates found
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ghost-200">
                {userCerts.map((cert) => (
                  <CertificateRow
                    key={cert.id}
                    certificate={cert}
                    onView={() =>
                      router.push(`/dashboard/contracts/certificates/user/${cert.id}`)
                    }
                    onRevoke={() =>
                      revokeMutation.mutate({
                        certId: cert.id,
                        reason: 'Revoked by admin',
                      })
                    }
                    onDownload={() => downloadMutation.mutate(cert.id)}
                    formatDate={formatDate}
                    getDaysUntilExpiry={getDaysUntilExpiry}
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
        highlight && 'border-orange-300 bg-orange-50'
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
// CERTIFICATE ROW
// ============================================================================

interface CertificateRowProps {
  certificate: {
    id: string;
    type: CertificateType;
    subject_cn: string;
    email?: string;
    status: CertificateStatus;
    valid_from: string;
    valid_until: string;
    issued_by?: string;
    fingerprint?: string;
  };
  onView: () => void;
  onRevoke: () => void;
  onDownload?: () => void;
  formatDate: (date: string) => string;
  getDaysUntilExpiry: (date: string) => number;
}

function CertificateRow({
  certificate,
  onView,
  onRevoke,
  onDownload,
  formatDate,
  getDaysUntilExpiry,
}: CertificateRowProps) {
  const config = statusConfig[certificate.status];
  const StatusIcon = config.icon;
  const daysUntilExpiry = getDaysUntilExpiry(certificate.valid_until);
  const isExpiringSoon = certificate.status === 'active' && daysUntilExpiry <= 30;

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
              certificate.type === 'ca' ? 'bg-purple-100' : 'bg-blue-100'
            )}
          >
            {certificate.type === 'ca' ? (
              <Shield className="h-5 w-5 text-purple-600" />
            ) : (
              <Key className="h-5 w-5 text-blue-600" />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="font-mono text-sm font-medium text-ghost-900 group-hover:underline">
              {certificate.subject_cn}
            </div>
            {certificate.email && (
              <div className="font-mono text-xs text-ghost-500">{certificate.email}</div>
            )}
            {certificate.issued_by && (
              <div className="font-mono text-xs text-ghost-400">
                Issued by: {certificate.issued_by}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Validity */}
          <div className="text-right">
            <div className="font-mono text-xs text-ghost-500">
              {formatDate(certificate.valid_from)} - {formatDate(certificate.valid_until)}
            </div>
            {isExpiringSoon && (
              <div className="font-mono text-xs text-orange-600 flex items-center gap-1 justify-end">
                <AlertTriangle className="h-3 w-3" />
                {daysUntilExpiry} days left
              </div>
            )}
          </div>

          {/* Status */}
          <Badge
            className={cn(
              'font-mono text-xs flex items-center gap-1 min-w-[80px] justify-center',
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
                View Details
              </DropdownMenuItem>
              {onDownload && certificate.type === 'user' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PEM
                </DropdownMenuItem>
              )}
              {certificate.status === 'active' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevoke();
                  }}
                  className="text-red-600"
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Revoke Certificate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
