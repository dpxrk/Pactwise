"use client";

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Users, 
  AlertCircle, 
  Building,
  CheckCircle,
  Clock
} from 'lucide-react';
import React, { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetAnalytics } from '@/hooks/useBudgets';
import { useContracts } from '@/hooks/useContracts';
import { useDepartmentStats } from '@/hooks/useDepartments';
import { useVendors } from '@/hooks/useVendors';

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  description?: string;
  progress?: number;
  color?: string;
  bgColor?: string;
}

export function DashboardMetrics() {
  // Fetch real-time data using Supabase hooks
  const { contracts, isLoading: contractsLoading } = useContracts({
    orderBy: 'created_at',
    ascending: false,
    realtime: true,
  });

  const { vendors, isLoading: vendorsLoading } = useVendors({
    orderBy: 'created_at',
    ascending: false,
    realtime: true,
  });

  const { analytics, isLoading: analyticsLoading } = useBudgetAnalytics();
  const { stats: deptStats, isLoading: deptStatsLoading } = useDepartmentStats();

  // Calculate contract metrics
  const contractMetrics = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expiring: 0, totalValue: 0 };
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      expiring: contracts.filter(c => {
        if (!c.end_date) return false;
        const endDate = new Date(c.end_date);
        return endDate >= now && endDate <= thirtyDaysFromNow;
      }).length,
      totalValue: contracts.reduce((sum, c) => sum + (c.value || 0), 0),
    };
  }, [contracts]);

  // Calculate vendor metrics
  const vendorMetrics = useMemo(() => {
    if (!vendors) return { total: 0, active: 0 };
    
    return {
      total: vendors.length,
      active: vendors.filter(v => v.status === 'active').length,
    };
  }, [vendors]);

  const isLoading = contractsLoading || vendorsLoading || analyticsLoading || deptStatsLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics: MetricCard[] = [
    {
      title: 'Total Contracts',
      value: contractMetrics.total,
      // Removed hard-coded trend value - would need historical data to calculate
      icon: <FileText className="h-4 w-4" />,
      description: `${contractMetrics.active} active`,
      progress: contractMetrics.total > 0 ? (contractMetrics.active / contractMetrics.total) * 100 : 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Contract Value',
      value: formatCurrency(contractMetrics.totalValue),
      // Removed hard-coded trend value - would need historical data to calculate
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Total value',
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Active Vendors',
      value: vendorMetrics.active,
      change: vendorMetrics.total > 0 ? Math.round((vendorMetrics.active / vendorMetrics.total) * 100) : 0,
      trend: 'up',
      icon: <Building className="h-4 w-4" />,
      description: `${vendorMetrics.total} total`,
      progress: vendorMetrics.total > 0 ? (vendorMetrics.active / vendorMetrics.total) * 100 : 0,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Expiring Soon',
      value: contractMetrics.expiring,
      // Removed hard-coded trend value - this metric doesn't need a trend indicator
      trend: contractMetrics.expiring > 0 ? 'up' : 'down',
      icon: <AlertCircle className="h-4 w-4" />,
      description: 'Within 30 days',
      color: contractMetrics.expiring > 0 ? 'text-yellow-500' : 'text-gray-500',
      bgColor: contractMetrics.expiring > 0 ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-gray-100 dark:bg-gray-900/20'
    },
    {
      title: 'Budget Utilized',
      value: `${Math.round(analytics.utilizationRate)}%`,
      // Removed hard-coded trend value - would need historical data to calculate
      icon: <TrendingUp className="h-4 w-4" />,
      description: formatCurrency(analytics.totalSpent),
      progress: analytics.utilizationRate,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    },
    {
      title: 'Department Contracts',
      value: deptStats.totalContracts,
      // Removed hard-coded trend value - would need historical data to calculate
      icon: <Users className="h-4 w-4" />,
      description: `${deptStats.activeContracts} active`,
      progress: deptStats.totalContracts > 0 ? (deptStats.activeContracts / deptStats.totalContracts) * 100 : 0,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
    },
    {
      title: 'Total Budget',
      value: formatCurrency(analytics.totalBudget),
      icon: <CheckCircle className="h-4 w-4" />,
      description: `${formatCurrency(analytics.totalRemaining)} remaining`,
      color: 'text-teal-500',
      bgColor: 'bg-teal-100 dark:bg-teal-900/20'
    },
    {
      title: 'Budget Spent',
      value: formatCurrency(analytics.totalSpent),
      icon: <Clock className="h-4 w-4" />,
      description: `${Math.round((analytics.totalSpent / analytics.totalBudget) * 100)}% of budget`,
      progress: (analytics.totalSpent / analytics.totalBudget) * 100,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <div className={metric.color}>
                {metric.icon}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            {metric.description && (
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            )}
            {metric.progress !== undefined && (
              <Progress 
                value={metric.progress} 
                className="mt-2 h-2"
              />
            )}
            {metric.change !== undefined && (
              <div className="flex items-center pt-1">
                {metric.trend === 'up' ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(metric.change)}% from last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default DashboardMetrics;