'use client';

import { AlertTriangle, TrendingUp, DollarSign, AlertCircle, Wallet } from 'lucide-react';
import Link from 'next/link';

import { useBudgetAlerts } from '@/hooks/queries/useDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';

interface BudgetAlertsWidgetProps {
  enterpriseId: string;
}

export function BudgetAlertsWidget({ enterpriseId }: BudgetAlertsWidgetProps) {
  const { data: budgetAlerts, isLoading, error } = useBudgetAlerts(enterpriseId);

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
          <p>Failed to load budget alerts</p>
        </div>
      </Card>
    );
  }

  if (!budgetAlerts || budgetAlerts.length === 0) {
    return (
      <Card className="p-6 border-ghost-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Wallet className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Budget Alerts</h3>
            <p className="text-sm text-ghost-600">All budgets healthy</p>
          </div>
        </div>
        <div className="text-center py-8 text-ghost-500">
          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No budget alerts</p>
          <p className="text-sm mt-1">All budgets are within normal utilization</p>
        </div>
      </Card>
    );
  }

  // Categorize alerts by level
  const critical = budgetAlerts.filter((b) => b.alert_level === 'critical');
  const high = budgetAlerts.filter((b) => b.alert_level === 'high');
  const medium = budgetAlerts.filter((b) => b.alert_level === 'medium');

  const getAlertColor = (level: string) => {
    if (level === 'critical') return 'bg-red-100 text-red-800 border-red-200';
    if (level === 'high') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  const getAlertBadge = (level: string) => {
    if (level === 'critical') return { label: 'Over Budget', variant: 'error' as const };
    if (level === 'high') return { label: 'High Alert', variant: 'warning' as const };
    return { label: 'Warning', variant: 'default' as const };
  };

  const getAlertIcon = (level: string) => {
    if (level === 'critical') return <AlertCircle className="h-5 w-5" />;
    if (level === 'high') return <AlertTriangle className="h-5 w-5" />;
    return <TrendingUp className="h-5 w-5" />;
  };

  const getProgressColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-600';
    if (utilization >= 90) return 'bg-amber-500';
    return 'bg-purple-600';
  };

  return (
    <Card className="p-6 border-ghost-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Wallet className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Budget Alerts</h3>
            <p className="text-sm text-ghost-600">
              {budgetAlerts.length} budget{budgetAlerts.length !== 1 ? 's' : ''} need attention
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/budgets?filter=alerts"
          className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-700" />
            <p className="text-xs font-medium text-red-700">Critical</p>
          </div>
          <p className="text-2xl font-bold text-red-900">{critical.length}</p>
          <p className="text-xs text-red-600">≥100%</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <p className="text-xs font-medium text-amber-700">High</p>
          </div>
          <p className="text-2xl font-bold text-amber-900">{high.length}</p>
          <p className="text-xs text-amber-600">90-99%</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-700" />
            <p className="text-xs font-medium text-purple-700">Warning</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">{medium.length}</p>
          <p className="text-xs text-purple-600">80-89%</p>
        </div>
      </div>

      {/* Budget Alert List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {budgetAlerts.map((budget) => {
          const alertBadge = getAlertBadge(budget.alert_level);
          const remaining = budget.total_amount - budget.spent_amount;
          const isOverBudget = remaining < 0;

          return (
            <Link
              key={budget.id}
              href={`/dashboard/budgets/${budget.id}`}
              className={`block p-4 rounded-lg border transition-all hover:shadow-md ${getAlertColor(
                budget.alert_level
              )}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Budget Name & Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    {getAlertIcon(budget.alert_level)}
                    <h4 className="font-semibold truncate">{budget.name}</h4>
                    <Badge variant={alertBadge.variant} className="text-xs">
                      {alertBadge.label}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">
                        ${budget.spent_amount.toLocaleString()} spent
                      </span>
                      <span className="font-bold">
                        {budget.utilization_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(budget.utilization_percentage, 100)}
                      className="h-2"
                      indicatorClassName={getProgressColor(budget.utilization_percentage)}
                    />
                  </div>

                  {/* Budget Details */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-ghost-700">
                      <DollarSign className="h-3 w-3" />
                      Total: ${budget.total_amount.toLocaleString()}
                    </span>
                    <span className={isOverBudget ? 'text-red-700 font-medium' : 'text-ghost-600'}>
                      {isOverBudget ? 'Over by' : 'Remaining'}:{' '}
                      ${Math.abs(remaining).toLocaleString()}
                    </span>
                  </div>

                  {/* Period Info */}
                  {budget.period_start && budget.period_end && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-ghost-600">
                      <span>
                        {new Date(budget.period_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>→</span>
                      <span>
                        {new Date(budget.period_end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {budget.category && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{budget.category}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Alert Level Indicator */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-3xl font-bold ${
                      budget.alert_level === 'critical'
                        ? 'text-red-700'
                        : budget.alert_level === 'high'
                        ? 'text-amber-700'
                        : 'text-purple-700'
                    }`}
                  >
                    {budget.utilization_percentage.toFixed(0)}%
                  </div>
                  <p className="text-xs text-ghost-600 mt-1">utilized</p>
                </div>
              </div>

              {/* Recommendation */}
              {budget.alert_level === 'critical' && (
                <div className="mt-3 pt-3 border-t border-red-300">
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ Immediate action required - budget exceeded
                  </p>
                </div>
              )}
              {budget.alert_level === 'high' && (
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="text-xs text-amber-700 font-medium">
                    ⚡ Review spending - approaching budget limit
                  </p>
                </div>
              )}
              {budget.alert_level === 'medium' && (
                <div className="mt-3 pt-3 border-t border-purple-300">
                  <p className="text-xs text-purple-700 font-medium">
                    📊 Monitor closely - 80% threshold reached
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {budgetAlerts.length > 3 && (
        <div className="mt-4 pt-4 border-t border-ghost-200">
          <Link
            href="/dashboard/budgets?filter=alerts"
            className="block text-center text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
          >
            View All {budgetAlerts.length} Budget Alerts →
          </Link>
        </div>
      )}
    </Card>
  );
}
