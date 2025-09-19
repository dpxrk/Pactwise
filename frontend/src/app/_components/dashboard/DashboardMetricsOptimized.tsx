"use client";

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Users, 
  AlertCircle, 
  Building,
  CheckCircle,
  Clock,
  Archive,
  XCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

// Use optimized stores and React Query hooks
import { useContractList } from '@/hooks/queries/useContracts';
import { useVendors, useVendorLoading } from '@/stores/vendor-store-optimized';
import { useBudgetAnalytics } from '@/hooks/useBudgets';
import { useDepartmentStats } from '@/hooks/useDepartments';
import type { Id } from '@/types/id.types';

interface MetricCardData {
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

interface DashboardMetricsProps {
  enterpriseId: Id<"enterprises">;
}

// Memoized metric card component
const MetricCard = React.memo<MetricCardData>(({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  description, 
  progress,
  color = "text-gray-900",
  bgColor = "bg-gray-100"
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`${bgColor} p-2 rounded-lg`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>
          {value}
        </div>
        {change !== undefined && (
          <div className="flex items-center mt-2 text-sm">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(change)}%
            </span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {progress !== undefined && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

export function DashboardMetricsOptimized({ enterpriseId }: DashboardMetricsProps) {
  const { userProfile } = useAuth();

  // Use React Query for contracts
  const { 
    data: contracts = [], 
    isLoading: contractsLoading 
  } = useContractList(enterpriseId);

  // Use optimized vendor store
  const vendors = useVendors();
  const vendorsLoading = useVendorLoading();

  // Keep existing hooks for budgets and departments
  const { analytics, isLoading: analyticsLoading } = useBudgetAnalytics();
  const { stats: departmentStats, isLoading: departmentsLoading } = useDepartmentStats();

  // Memoized calculations for better performance
  const metrics = useMemo(() => {
    // Contract metrics
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const pendingContracts = contracts.filter(c => c.status === 'pending').length;
    const expiringContracts = contracts.filter(c => {
      if (!c.extractedEndDate) return false;
      const endDate = new Date(c.extractedEndDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return endDate <= thirtyDaysFromNow && endDate >= new Date();
    }).length;

    // Vendor metrics
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const totalVendorSpend = vendors.reduce((sum, v) => sum + (v.total_spend || 0), 0);
    const highRiskVendors = vendors.filter(v => v.risk_level === 'high').length;

    // Contract value calculations
    const totalContractValue = contracts.reduce((sum, c) => {
      const value = c.extractedPricing || c.value;
      if (typeof value === 'string') {
        const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
        return sum + (isNaN(numValue) ? 0 : numValue);
      }
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    // Budget utilization
    const budgetUtilization = analytics?.utilizationPercentage || 0;
    const remainingBudget = analytics?.remainingBudget || 0;

    // Compliance score average
    const avgComplianceScore = vendors.length > 0
      ? vendors.reduce((sum, v) => sum + (v.compliance_score || 0), 0) / vendors.length
      : 0;

    return {
      activeContracts,
      pendingContracts,
      expiringContracts,
      activeVendors,
      totalVendorSpend,
      highRiskVendors,
      totalContractValue,
      budgetUtilization,
      remainingBudget,
      avgComplianceScore,
      totalContracts: contracts.length,
      totalVendors: vendors.length,
    };
  }, [contracts, vendors, analytics]);

  // Calculate month-over-month changes (mock data for now)
  const changes = useMemo(() => ({
    contracts: 12,
    vendors: 5,
    spend: -8,
    compliance: 3,
  }), []);

  const isLoading = contractsLoading || vendorsLoading || analyticsLoading || departmentsLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards: MetricCardData[] = [
    {
      title: "Total Contracts",
      value: metrics.totalContracts,
      change: changes.contracts,
      trend: changes.contracts > 0 ? 'up' : 'down',
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      description: `${metrics.activeContracts} active, ${metrics.pendingContracts} pending`,
      bgColor: "bg-blue-100",
      color: "text-blue-900"
    },
    {
      title: "Active Vendors",
      value: metrics.activeVendors,
      change: changes.vendors,
      trend: changes.vendors > 0 ? 'up' : 'down',
      icon: <Building className="h-4 w-4 text-purple-600" />,
      description: `${metrics.totalVendors} total vendors`,
      bgColor: "bg-purple-100",
      color: "text-purple-900"
    },
    {
      title: "Total Contract Value",
      value: `$${(metrics.totalContractValue / 1000000).toFixed(2)}M`,
      change: changes.spend,
      trend: changes.spend > 0 ? 'up' : 'down',
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      bgColor: "bg-green-100",
      color: "text-green-900"
    },
    {
      title: "Compliance Score",
      value: `${metrics.avgComplianceScore.toFixed(1)}%`,
      change: changes.compliance,
      trend: changes.compliance > 0 ? 'up' : 'down',
      icon: <CheckCircle className="h-4 w-4 text-indigo-600" />,
      progress: metrics.avgComplianceScore,
      bgColor: "bg-indigo-100",
      color: "text-indigo-900"
    },
    {
      title: "Expiring Soon",
      value: metrics.expiringContracts,
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      description: "Contracts expiring in 30 days",
      bgColor: "bg-amber-100",
      color: metrics.expiringContracts > 5 ? "text-amber-700" : "text-gray-900"
    },
    {
      title: "High Risk Vendors",
      value: metrics.highRiskVendors,
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
      description: "Require immediate attention",
      bgColor: "bg-red-100",
      color: metrics.highRiskVendors > 0 ? "text-red-700" : "text-gray-900"
    },
    {
      title: "Budget Utilization",
      value: `${metrics.budgetUtilization.toFixed(1)}%`,
      icon: <TrendingUp className="h-4 w-4 text-cyan-600" />,
      progress: metrics.budgetUtilization,
      description: `$${(metrics.remainingBudget / 1000).toFixed(0)}k remaining`,
      bgColor: "bg-cyan-100",
      color: "text-cyan-900"
    },
    {
      title: "Departments Active",
      value: departmentStats?.totalDepartments || 0,
      icon: <Users className="h-4 w-4 text-slate-600" />,
      description: "Across all divisions",
      bgColor: "bg-slate-100",
      color: "text-slate-900"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.slice(0, 4).map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
      
      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.slice(4).map((metric, index) => (
          <MetricCard key={index + 4} {...metric} />
        ))}
      </div>
    </div>
  );
}

export default DashboardMetricsOptimized;