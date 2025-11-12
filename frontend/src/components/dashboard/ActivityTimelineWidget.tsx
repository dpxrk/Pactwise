'use client';

import {
  FileText,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { useDashboardActivity } from '@/hooks/queries/useDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityTimelineWidgetProps {
  enterpriseId: string;
  limit?: number;
}

export function ActivityTimelineWidget({
  enterpriseId,
  limit = 10,
}: ActivityTimelineWidgetProps) {
  const { data: activities, isLoading, error } = useDashboardActivity(enterpriseId, limit);

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
          <p>Failed to load activity</p>
        </div>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="p-6 border-ghost-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Activity className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Recent Activity</h3>
            <p className="text-sm text-ghost-600">Latest updates</p>
          </div>
        </div>
        <div className="text-center py-8 text-ghost-500">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm mt-1">Activity will appear here as things happen</p>
        </div>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return <FileText className="h-4 w-4" />;
      case 'vendor':
        return <Users className="h-4 w-4" />;
      case 'budget':
        return <DollarSign className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'contract':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'vendor':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'budget':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'approval':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-ghost-100 text-ghost-700 border-ghost-200';
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'contract':
        return 'Contract';
      case 'vendor':
        return 'Vendor';
      case 'budget':
        return 'Budget';
      case 'approval':
        return 'Approval';
      default:
        return 'Activity';
    }
  };

  const getActivityLink = (activity: any) => {
    const metadata = activity.metadata || {};

    if (activity.type === 'contract' && metadata.contract_id) {
      return `/dashboard/contracts/${metadata.contract_id}`;
    }
    if (activity.type === 'vendor' && metadata.vendor_id) {
      return `/dashboard/vendors/${metadata.vendor_id}`;
    }
    if (activity.type === 'budget' && metadata.budget_id) {
      return `/dashboard/budgets/${metadata.budget_id}`;
    }
    if (activity.type === 'approval' && metadata.approval_id) {
      return `/dashboard/approvals/${metadata.approval_id}`;
    }

    return null;
  };

  return (
    <Card className="p-6 border-ghost-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Activity className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Recent Activity</h3>
            <p className="text-sm text-ghost-600">
              Last {activities.length} update{activities.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/activity"
          className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Activity Timeline */}
      <ScrollArea className="h-[450px] pr-4">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-ghost-200" />

          {/* Activity Items */}
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const activityLink = getActivityLink(activity);
              const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
                addSuffix: true,
              });

              const ActivityWrapper = activityLink ? Link : 'div';
              const wrapperProps = activityLink
                ? {
                    href: activityLink,
                    className:
                      'block transition-all hover:bg-ghost-50 rounded-lg p-3 -m-3',
                  }
                : { className: 'p-3 -m-3' };

              return (
                <ActivityWrapper key={activity.id} {...wrapperProps}>
                  <div className="flex items-start gap-4 relative">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${getActivityColor(
                        activity.type
                      )}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      {/* Type Badge & Time */}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                        >
                          {getActivityTypeLabel(activity.type)}
                        </Badge>
                        <span className="text-xs text-ghost-500">{timeAgo}</span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-ghost-900 font-medium mb-1">
                        {activity.description}
                      </p>

                      {/* User Name */}
                      {activity.user_name && (
                        <p className="text-xs text-ghost-600">
                          by {activity.user_name}
                        </p>
                      )}

                      {/* Additional Metadata */}
                      {activity.metadata && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {activity.metadata.status && (
                            <Badge
                              variant={
                                activity.metadata.status === 'completed' ||
                                activity.metadata.status === 'approved'
                                  ? 'default'
                                  : activity.metadata.status === 'pending'
                                  ? 'warning'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {activity.metadata.status}
                            </Badge>
                          )}
                          {activity.metadata.value && (
                            <span className="text-xs text-ghost-600 bg-ghost-100 px-2 py-1 rounded">
                              ${activity.metadata.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  {index < activities.length - 1 && (
                    <div className="h-4" />
                  )}
                </ActivityWrapper>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-ghost-200">
        <div className="flex items-center justify-between text-xs text-ghost-600">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Updates in real-time</span>
          </div>
          <Link
            href="/dashboard/activity"
            className="font-medium text-purple-900 hover:text-purple-700 transition-colors"
          >
            View Full History →
          </Link>
        </div>
      </div>
    </Card>
  );
}
