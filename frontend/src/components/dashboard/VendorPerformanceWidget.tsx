'use client';

import { TrendingUp, TrendingDown, Award, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { useVendorPerformanceSummary } from '@/hooks/queries/useDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';

interface VendorPerformance {
  id: string;
  name: string;
  status: string | null;
  risk_level: string | null;
  performance_score: number | null;
  contracts?: unknown[];
}

interface VendorPerformanceWidgetProps {
  enterpriseId: string;
}

export function VendorPerformanceWidget({ enterpriseId }: VendorPerformanceWidgetProps) {
  const { data: vendors, isLoading, error } = useVendorPerformanceSummary(enterpriseId);

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
          <AlertTriangle className="h-5 w-5" />
          <p>Failed to load vendor performance</p>
        </div>
      </Card>
    );
  }

  if (!vendors || vendors.length === 0) {
    return (
      <Card className="p-6 border-ghost-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <Users className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Top Vendors</h3>
            <p className="text-sm text-ghost-600">Performance tracking</p>
          </div>
        </div>
        <div className="text-center py-8 text-ghost-500">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No vendor performance data</p>
          <p className="text-sm mt-1">Add vendors to track performance</p>
        </div>
      </Card>
    );
  }

  const getRiskColor = (riskLevel: string | null) => {
    if (!riskLevel) return 'text-ghost-600';
    if (riskLevel === 'critical' || riskLevel === 'high') return 'text-red-600';
    if (riskLevel === 'medium') return 'text-amber-600';
    return 'text-green-600';
  };

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return { label: 'No Data', variant: 'secondary' as const };
    if (riskLevel === 'critical') return { label: 'Critical', variant: 'error' as const };
    if (riskLevel === 'high') return { label: 'High Risk', variant: 'error' as const };
    if (riskLevel === 'medium') return { label: 'Medium', variant: 'warning' as const };
    return { label: 'Low Risk', variant: 'default' as const };
  };

  const getPerformanceIcon = (score: number | null) => {
    if (!score || score < 70) return <TrendingDown className="h-5 w-5 text-red-600" />;
    if (score >= 90) return <Award className="h-5 w-5 text-purple-600" />;
    return <TrendingUp className="h-5 w-5 text-green-600" />;
  };

  const getPerformanceColor = (score: number | null) => {
    if (!score) return 'text-ghost-600';
    if (score >= 90) return 'text-purple-600';
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number | null) => {
    if (!score) return 'bg-ghost-400';
    if (score >= 90) return 'bg-purple-600';
    if (score >= 70) return 'bg-green-600';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-600';
  };

  // Calculate average performance
  const avgScore = vendors.reduce((sum: number, v: VendorPerformance) => sum + (v.performance_score || 0), 0) / vendors.length;
  const topPerformers = vendors.filter((v: VendorPerformance) => v.performance_score && v.performance_score >= 90);
  const atRisk = vendors.filter((v: VendorPerformance) => v.risk_level === 'high' || v.risk_level === 'critical');

  return (
    <Card className="p-6 border-ghost-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Users className="h-5 w-5 text-purple-900" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Top Vendors</h3>
            <p className="text-sm text-ghost-600">
              Top {vendors.length} by performance
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/vendors?sort=performance"
          className="text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-700" />
            <p className="text-xs font-medium text-purple-700">Avg Score</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">{avgScore.toFixed(0)}</p>
          <p className="text-xs text-purple-600">out of 100</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-purple-700" />
            <p className="text-xs font-medium text-purple-700">Top Tier</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">{topPerformers.length}</p>
          <p className="text-xs text-purple-600">≥90 score</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <p className="text-xs font-medium text-red-700">At Risk</p>
          </div>
          <p className="text-2xl font-bold text-red-900">{atRisk.length}</p>
          <p className="text-xs text-red-600">high risk</p>
        </div>
      </div>

      {/* Vendor Performance List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {vendors.map((vendor: VendorPerformance, index: number) => {
          const riskBadge = getRiskBadge(vendor.risk_level);
          const performanceScore = vendor.performance_score || 0;

          return (
            <Link
              key={vendor.id}
              href={`/dashboard/vendors/${vendor.id}`}
              className="block p-4 rounded-lg border border-ghost-300 bg-white transition-all hover:shadow-md hover:border-purple-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Rank & Vendor Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        index === 0
                          ? 'bg-purple-100 text-purple-900'
                          : index === 1
                          ? 'bg-purple-50 text-purple-800'
                          : 'bg-ghost-100 text-ghost-700'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate text-ghost-900">{vendor.name}</h4>
                        <Badge variant={riskBadge.variant} className="text-xs">
                          {riskBadge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-ghost-600 mt-1">
                        <span className="capitalize">{vendor.status}</span>
                        {vendor.contracts && Array.isArray(vendor.contracts) && (
                          <>
                            <span>•</span>
                            <span>
                              {vendor.contracts.length} contract{vendor.contracts.length !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium text-ghost-700">Performance Score</span>
                      <span className={`font-bold ${getPerformanceColor(performanceScore)}`}>
                        {performanceScore}/100
                      </span>
                    </div>
                    <Progress
                      value={performanceScore}
                      className="h-2"
                      indicatorClassName={getProgressColor(performanceScore)}
                    />
                  </div>

                  {/* Performance Indicators */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      {getPerformanceIcon(performanceScore)}
                      <span
                        className={`font-medium ${getPerformanceColor(performanceScore)}`}
                      >
                        {performanceScore >= 90
                          ? 'Excellent'
                          : performanceScore >= 70
                          ? 'Good'
                          : performanceScore >= 50
                          ? 'Fair'
                          : 'Needs Improvement'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-4xl font-bold ${getPerformanceColor(performanceScore)}`}
                  >
                    {performanceScore}
                  </div>
                  <p className="text-xs text-ghost-600 mt-1">score</p>
                  {index === 0 && (
                    <Badge className="mt-2 bg-purple-100 text-purple-900 border-purple-300">
                      🏆 #1
                    </Badge>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-3 pt-3 border-t border-ghost-200">
                <div className="flex items-center justify-between text-xs">
                  <span className={getRiskColor(vendor.risk_level)}>
                    {vendor.risk_level === 'low' && '✓ Low risk profile'}
                    {vendor.risk_level === 'medium' && '⚠ Monitor closely'}
                    {(vendor.risk_level === 'high' || vendor.risk_level === 'critical') &&
                      '⚠ Requires attention'}
                    {!vendor.risk_level && 'No risk assessment'}
                  </span>
                  <div className="flex items-center gap-1 text-purple-900 font-medium hover:text-purple-700">
                    View details
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {vendors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ghost-200">
          <Link
            href="/dashboard/vendors"
            className="block text-center text-sm font-medium text-purple-900 hover:text-purple-700 transition-colors"
          >
            View All Vendors →
          </Link>
        </div>
      )}
    </Card>
  );
}
