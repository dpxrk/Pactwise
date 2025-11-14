'use client';

import { AlertCircle, Calendar, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';

import { useExpiringContracts } from '@/hooks/queries/useDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ContractExpiryWidgetProps {
  enterpriseId: string;
  daysAhead?: number;
}

export function ContractExpiryWidget({
  enterpriseId,
  daysAhead = 60,
}: ContractExpiryWidgetProps) {
  const { data: expiringContracts, isLoading, error } = useExpiringContracts(
    enterpriseId,
    daysAhead
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load expiring contracts</p>
        </div>
      </Card>
    );
  }

  if (!expiringContracts || expiringContracts.length === 0) {
    return (
      <Card className="p-6 border-ghost-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Calendar className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Expiring Contracts</h3>
            <p className="text-sm text-ghost-600">Next {daysAhead} days</p>
          </div>
        </div>
        <div className="text-center py-8 text-ghost-500">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No contracts expiring soon</p>
          <p className="text-sm mt-1">All contracts are up to date</p>
        </div>
      </Card>
    );
  }

  // Group contracts by urgency
  const critical = expiringContracts.filter((c) => c.days_until_expiry <= 7);
  const urgent = expiringContracts.filter(
    (c) => c.days_until_expiry > 7 && c.days_until_expiry <= 14
  );
  const upcoming = expiringContracts.filter(
    (c) => c.days_until_expiry > 14 && c.days_until_expiry <= 30
  );
  const later = expiringContracts.filter((c) => c.days_until_expiry > 30);

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'bg-red-100 text-red-800 border-red-200';
    if (days <= 14) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (days <= 30) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-ghost-100 text-ghost-700 border-ghost-200';
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return { label: 'Critical', variant: 'error' as const };
    if (days <= 14) return { label: 'Urgent', variant: 'warning' as const };
    if (days <= 30) return { label: 'Soon', variant: 'default' as const };
    return { label: 'Upcoming', variant: 'secondary' as const };
  };

  return (
    <Card className="p-6 border-ghost-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Calendar className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Expiring Contracts</h3>
            <p className="text-sm text-ghost-600">
              {expiringContracts.length} contract{expiringContracts.length !== 1 ? 's' : ''} expiring in {daysAhead} days
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/contracts?filter=expiring"
          className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs font-medium text-red-700 mb-1">≤ 7 Days</p>
          <p className="text-2xl font-bold text-red-900">{critical.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 mb-1">8-14 Days</p>
          <p className="text-2xl font-bold text-amber-900">{urgent.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs font-medium text-purple-700 mb-1">15-30 Days</p>
          <p className="text-2xl font-bold text-purple-900">{upcoming.length}</p>
        </div>
        <div className="bg-ghost-100 border border-ghost-200 rounded-lg p-3">
          <p className="text-xs font-medium text-ghost-700 mb-1">30+ Days</p>
          <p className="text-2xl font-bold text-ghost-900">{later.length}</p>
        </div>
      </div>

      {/* Contract List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {expiringContracts.map((contract) => {
          const urgency = getUrgencyBadge(contract.days_until_expiry);

          return (
            <Link
              key={contract.id}
              href={`/dashboard/contracts/${contract.id}`}
              className={`block p-4 rounded-lg border transition-all hover:shadow-md ${getUrgencyColor(
                contract.days_until_expiry
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold truncate">{contract.title}</h4>
                    <Badge variant={urgency.variant} className="text-xs">
                      {urgency.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    {contract.vendor && (
                      <span className="text-ghost-700 truncate">
                        {contract.vendor.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-ghost-600">
                      <DollarSign className="h-3 w-3" />
                      {contract.value
                        ? `$${contract.value.toLocaleString()}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {contract.days_until_expiry} day{contract.days_until_expiry !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-ghost-600">
                    {new Date(contract.end_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {expiringContracts.length > 5 && (
        <div className="mt-4 pt-4 border-t border-ghost-200">
          <Link
            href="/dashboard/contracts?filter=expiring"
            className="block text-center text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
          >
            View All {expiringContracts.length} Expiring Contracts →
          </Link>
        </div>
      )}
    </Card>
  );
}
