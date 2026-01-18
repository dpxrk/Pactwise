'use client'

import { Download, RefreshCw, AlertTriangle, DollarSign, TrendingUp, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from '@/types/id.types';
import { createClient } from "@/utils/supabase/client";

import LoadingSpinner from "../common/LoadingSpinner";

import { KPIData } from "./AdvancedKPICard";
import { DateRange } from "./DateRangePicker";
import DateRangePicker from "./DateRangePicker";
import { ChartDataPoint, ChartSeries } from "./InteractiveChart";

// Lazy load heavy chart components
const InteractiveChart = dynamic(() => import("./InteractiveChart"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const DrillDownModal = dynamic(() => import("./DrillDownModal"), {
  loading: () => <div>Loading...</div>,
  ssr: false
});

const AdvancedKPICard = dynamic(() => import("./AdvancedKPICard"), {
  loading: () => <div className="h-48 animate-pulse bg-gray-200 rounded-lg" />,
  ssr: false
});

interface AnalyticsDashboardProps {
  className?: string;
  enterpriseId: Id<"enterprises">;
}

/** Stats for a specific metric category */
interface StatsSummary {
  total?: number;
  active?: number;
  pending?: number;
  value?: number;
  count?: number;
  rate?: number;
  score?: number;
  renewedCount?: number;
  expiredCount?: number;
  criticalIssues?: number;
  activeAgents?: number;
  completedTasks?: number;
  byMonth?: Record<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic API response keys
  [key: string]: any;
}

/** Time series data point */
interface TimeSeriesPoint {
  date?: string;
  month?: string;
  value: number;
}

/** Previous period data - can be accessed with category keys or direct values */
interface PreviousPeriodData {
  contracts?: StatsSummary;
  vendors?: StatsSummary;
  agents?: StatsSummary;
  compliance?: StatsSummary;
  financial?: StatsSummary;
  renewalRate?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic API response keys
  [key: string]: any;
}

interface DashboardStats {
  contracts: StatsSummary;
  vendors: StatsSummary;
  agents: StatsSummary;
  compliance: StatsSummary;
  financial: StatsSummary;
  timestamp: string;
  previousPeriod?: PreviousPeriodData;
  timeSeries?: {
    contractValue?: TimeSeriesPoint[];
    [key: string]: TimeSeriesPoint[] | undefined;
  };
}

/** Drill down item shape - must match DrillDownData from DrillDownModal */
interface DrillDownItem {
  id: string;
  name: string;
  value: number;
  category: string;
  date: string;
  status: string;
  trend?: number;
  subcategory?: string;
  details?: Record<string, unknown>;
}

/** Contract row from database */
interface ContractRow {
  id: string;
  title?: string | null;
  value?: number | null;
  status?: string | null;
  created_at?: string | null;
  contract_type?: string | null;
}

/** Vendor row from database */
interface VendorRow {
  id: string;
  name?: string | null;
  category?: string | null;
  status?: string | null;
  created_at?: string | null;
  performance_score?: number | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className,
  enterpriseId,
}) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [drillDownData, setDrillDownData] = useState<{ title?: string; category?: string; data?: DrillDownItem[] } | null>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Fetch dashboard statistics from API
  useEffect(() => {
    const fetchDashboardStats = async () => {
      const supabase = createClient();
      setLoading(true);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
        const { data, error } = await (supabase as any).rpc('get_dashboard_stats', {
          p_enterprise_id: enterpriseId
        });

        if (error) {
          console.error('Error fetching dashboard stats:', error);
          toast.error('Failed to load analytics data');
        } else {
          setDashboardStats(data as unknown as DashboardStats | null);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (enterpriseId) {
      fetchDashboardStats();
    }
  }, [enterpriseId]);

  // Helper to determine trend from current vs previous value
  const getTrend = (current: number, previous: number): { direction: 'up' | 'down' | 'stable'; percentage: number; period: string } | undefined => {
    if (previous === 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    const percentage = Math.abs(Math.round(change * 10) / 10);
    if (change > 5) return { direction: 'up', percentage, period: 'vs last period' };
    if (change < -5) return { direction: 'down', percentage, period: 'vs last period' };
    return { direction: 'stable', percentage, period: 'vs last period' };
  };

  // Transform API data into KPI format
  const kpiData = useMemo((): KPIData[] => {
    if (!dashboardStats) return [];

    const { contracts, vendors, compliance, financial: _financial } = dashboardStats;
    // Get previous period data for comparison (if available)
    const prev = dashboardStats.previousPeriod || {};

    // Calculate renewal rate from contracts data
    const renewedCount = contracts?.renewedCount || 0;
    const expiredCount = contracts?.expiredCount || 0;
    const renewalRate = (renewedCount + expiredCount) > 0
      ? Math.round((renewedCount / (renewedCount + expiredCount)) * 100)
      : 0;

    return [
      {
        id: "total-contracts",
        title: "Total Contract Value",
        value: contracts?.activeValue || 0,
        previousValue: prev.contracts?.activeValue || contracts?.activeValue || 0,
        target: contracts?.totalValue || 0,
        format: "currency" as const,
        trend: getTrend(contracts?.activeValue || 0, prev.contracts?.activeValue || 0),
        status: contracts?.activeValue > 0 ? "good" as const : "neutral" as const,
        description: "Total value of all active contracts",
        lastUpdated: dashboardStats.timestamp,
      },
      {
        id: "active-contracts",
        title: "Active Contracts",
        value: contracts?.byStatus?.active || 0,
        previousValue: prev.contracts?.byStatus?.active || contracts?.byStatus?.active || 0,
        target: contracts?.total || 0,
        format: "number" as const,
        trend: getTrend(contracts?.byStatus?.active || 0, prev.contracts?.byStatus?.active || 0),
        status: "good" as const,
        description: "Currently active contracts",
        lastUpdated: dashboardStats.timestamp,
      },
      {
        id: "compliance-score",
        title: "Compliance Score",
        value: compliance?.complianceRate || 0,
        previousValue: prev.compliance?.complianceRate || compliance?.complianceRate || 0,
        target: 95,
        format: "percentage" as const,
        trend: getTrend(compliance?.complianceRate || 0, prev.compliance?.complianceRate || 0),
        status: (compliance?.complianceRate || 0) >= 90 ? "good" as const :
                (compliance?.complianceRate || 0) >= 80 ? "warning" as const : "critical" as const,
        description: "Overall compliance across all contracts",
        lastUpdated: dashboardStats.timestamp,
      },
      {
        id: "vendor-count",
        title: "Active Vendors",
        value: vendors?.active || 0,
        previousValue: prev.vendors?.active || vendors?.active || 0,
        target: 100,
        format: "number" as const,
        trend: getTrend(vendors?.active || 0, prev.vendors?.active || 0),
        status: "neutral" as const,
        description: "Number of active vendor relationships",
        lastUpdated: dashboardStats.timestamp,
      },
      {
        id: "renewal-rate",
        title: "Contract Renewal Rate",
        value: renewalRate,
        previousValue: prev.renewalRate || renewalRate,
        target: 95,
        format: "percentage" as const,
        trend: getTrend(renewalRate, prev.renewalRate || 0),
        status: renewalRate >= 90 ? "good" as const : renewalRate >= 70 ? "warning" as const : "critical" as const,
        description: "Percentage of contracts successfully renewed",
        lastUpdated: dashboardStats.timestamp,
      },
      {
        id: "risk-contracts",
        title: "High-Risk Issues",
        value: compliance?.criticalIssues || 0,
        previousValue: prev.compliance?.criticalIssues || 0,
        target: 0,
        format: "number" as const,
        trend: getTrend(prev.compliance?.criticalIssues || 0, compliance?.criticalIssues || 0), // Inverted: lower is better
        status: (compliance?.criticalIssues || 0) > 0 ? "critical" as const : "good" as const,
        description: "Critical compliance issues requiring immediate attention",
        lastUpdated: dashboardStats.timestamp,
      },
    ];
  }, [dashboardStats]);

  // Transform API data into chart format
  const contractValueData = useMemo((): ChartDataPoint[] => {
    // Use time-series data from API if available, otherwise generate from contracts by month
    if (dashboardStats?.timeSeries?.contractValue) {
      return dashboardStats.timeSeries.contractValue.map((item) => ({
        name: item.date || item.month || '',
        value: item.value || 0,
        category: "contract",
      }));
    }

    // Fallback: aggregate contracts by month from contracts data
    if (dashboardStats?.contracts?.byMonth) {
      return Object.entries(dashboardStats.contracts.byMonth).map(([month, value]) => ({
        name: month,
        value: value as number,
        category: "contract",
      }));
    }

    return [];
  }, [dashboardStats]);

  const vendorPerformanceData = useMemo((): ChartDataPoint[] => {
    if (!dashboardStats?.vendors?.byCategory) return [];

    return Object.entries(dashboardStats.vendors.byCategory).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count as number,
      category: "vendor",
    }));
  }, [dashboardStats]);

  const riskDistributionData = useMemo((): ChartDataPoint[] => {
    if (!dashboardStats?.compliance) return [];

    const { criticalIssues = 0, highIssues = 0, failedChecks = 0, passedChecks = 0 } = dashboardStats.compliance;
    const mediumRisk = Math.max(0, failedChecks - criticalIssues - highIssues);

    return [
      { name: "Low Risk", value: passedChecks, category: "risk" },
      { name: "Medium Risk", value: mediumRisk, category: "risk" },
      { name: "High Risk", value: highIssues, category: "risk" },
      { name: "Critical", value: criticalIssues, category: "risk" },
    ].filter(item => item.value > 0);
  }, [dashboardStats]);

  // Chart series configuration
  const contractValueSeries: ChartSeries[] = [
    { key: "new_contracts", name: "New Contracts", color: "#8884d8", visible: true },
    { key: "renewals", name: "Renewals", color: "#82ca9d", visible: true },
  ];

  const handleKPIDrillDown = (kpi: KPIData) => {
    if (kpi.drillDownData) {
      setDrillDownData({
        title: kpi.title,
        category: kpi.id,
        // KPIData.drillDownData is Array<Record<string, unknown>>, cast to expected shape
        data: kpi.drillDownData as unknown as DrillDownItem[],
      });
      setIsDrillDownOpen(true);
    }
  };

  const handleChartDrillDown = async (category: string) => {
    // Fetch actual drill-down data from Supabase based on category
    const supabase = createClient();
    let drillDownItems: DrillDownItem[] = [];
    let title = "Detailed Analysis";

    try {
      if (category === 'contracts' || category.toLowerCase().includes('contract')) {
        title = "Contract Details";
        const { data } = await supabase
          .from('contracts')
          .select('id, title, value, status, created_at, contract_type')
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null)
          .order('value', { ascending: false })
          .limit(20);

        drillDownItems = ((data || []) as ContractRow[]).map((item) => ({
          id: item.id,
          name: item.title || 'Untitled Contract',
          value: item.value || 0,
          category: item.contract_type || 'Uncategorized',
          status: item.status || 'unknown',
          date: item.created_at || new Date().toISOString(),
          trend: 0,
        }));
      } else if (category === 'vendors' || category.toLowerCase().includes('vendor')) {
        title = "Vendor Details";
        const { data } = await supabase
          .from('vendors')
          .select('id, name, category, status, created_at, performance_score')
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null)
          .order('performance_score', { ascending: false })
          .limit(20);

        drillDownItems = ((data || []) as VendorRow[]).map((item) => ({
          id: item.id,
          name: item.name || 'Unnamed Vendor',
          value: item.performance_score || 0,
          category: item.category || 'Uncategorized',
          status: item.status || 'unknown',
          date: item.created_at || new Date().toISOString(),
          trend: 0,
        }));
      } else {
        // Generic category - fetch contracts filtered by contract_type
        title = `${category} Details`;
        const { data } = await supabase
          .from('contracts')
          .select('id, title, value, status, created_at, contract_type')
          .eq('enterprise_id', enterpriseId)
          .eq('contract_type', category)
          .is('deleted_at', null)
          .order('value', { ascending: false })
          .limit(20);

        drillDownItems = ((data || []) as ContractRow[]).map((item) => ({
          id: item.id,
          name: item.title || 'Untitled',
          value: item.value || 0,
          category: item.contract_type || category,
          status: item.status || 'unknown',
          date: item.created_at || new Date().toISOString(),
          trend: 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
      drillDownItems = [];
    }

    setDrillDownData({
      title,
      category,
      data: drillDownItems,
    });
    setIsDrillDownOpen(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleExportData = () => {
    // Export functionality
    const exportData = {
      dateRange,
      kpiData,
      chartData: {
        contractValue: contractValueData,
        vendorPerformance: vendorPerformanceData,
        riskDistribution: riskDistributionData,
      },
      generatedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate alerts
  const alerts = useMemo(() => {
    const criticalKPIs = kpiData.filter(kpi => kpi.status === "critical");
    const warningKPIs = kpiData.filter(kpi => kpi.status === "warning");
    
    return {
      critical: criticalKPIs.length,
      warning: warningKPIs.length,
      items: [...criticalKPIs, ...warningKPIs],
    };
  }, [kpiData]);

  return (
    <div className={`${className} bg-ghost-100 min-h-screen`}>
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">ANALYTICS SYSTEM</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={true}
            />
            <button
              onClick={handleExportData}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2"
            >
              <Download className="h-3 w-3" />
              EXPORT
            </button>
            <button
              onClick={() => handleRefresh()}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-1">ADVANCED ANALYTICS</h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Comprehensive insights into contract and vendor performance
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.critical > 0 && (
          <div className="border-l-4 border-red-600 bg-white border border-ghost-300 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-mono text-xs uppercase text-ghost-700 mb-1">CRITICAL ISSUES DETECTED</div>
                <div className="text-sm text-ghost-900">
                  {alerts.critical} critical and {alerts.warning} warning indicators require immediate attention.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiData.map((kpi) => (
            <AdvancedKPICard
              key={kpi.id}
              data={kpi}
              onDrillDown={handleKPIDrillDown}
              onRefresh={handleRefresh}
              loading={loading}
            />
          ))}
        </div>

        {/* Charts and Analysis */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveChart
                title="Contract Value Over Time"
                subtitle="Monthly breakdown of new contracts and renewals"
                data={contractValueData}
                type="area"
                series={contractValueSeries}
                height={350}
                onDrillDown={handleChartDrillDown}
              />
              
              <InteractiveChart
                title="Risk Distribution"
                subtitle="Current risk levels across all contracts"
                data={riskDistributionData}
                type="pie"
                height={350}
                onDrillDown={handleChartDrillDown}
              />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <InteractiveChart
                title="Financial Performance"
                subtitle="Contract values and financial metrics over time"
                data={contractValueData}
                type="bar"
                series={contractValueSeries}
                height={400}
                onDrillDown={handleChartDrillDown}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-ghost-300 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-purple-900" />
                    <span className="font-mono text-xs uppercase text-ghost-600">Revenue Impact</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(dashboardStats?.contracts?.activeValue || 0)}
                  </div>
                  <p className="font-mono text-xs text-ghost-600 mt-1">TOTAL CONTRACT VALUE</p>
                </div>

                <div className="border border-ghost-300 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-purple-900" />
                    <span className="font-mono text-xs uppercase text-ghost-600">Utilization Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-ghost-700">
                    {dashboardStats?.financial?.utilizationRate || 0}%
                  </div>
                  <p className="font-mono text-xs text-ghost-600 mt-1">BUDGET UTILIZATION</p>
                </div>

                <div className="border border-ghost-300 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-900" />
                    <span className="font-mono text-xs uppercase text-ghost-600">Pipeline Value</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(
                      (dashboardStats?.contracts?.totalValue || 0) - (dashboardStats?.contracts?.activeValue || 0)
                    )}
                  </div>
                  <p className="font-mono text-xs text-ghost-600 mt-1">NON-ACTIVE CONTRACTS</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <InteractiveChart
              title="Vendor Performance Scores"
              subtitle="Performance ratings by vendor category"
              data={vendorPerformanceData}
              type="bar"
              height={400}
              onDrillDown={handleChartDrillDown}
            />
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveChart
                title="Risk Distribution"
                subtitle="Breakdown of contract risk levels"
                data={riskDistributionData}
                type="pie"
                height={350}
                onDrillDown={handleChartDrillDown}
              />
              
              <div className="border border-ghost-300 bg-white p-6">
                <h3 className="font-mono text-xs uppercase text-ghost-700 mb-4">RISK SUMMARY</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-ghost-200">
                    <span className="font-mono text-xs text-ghost-900">CRITICAL RISKS</span>
                    <span className="font-mono text-sm font-bold text-red-600">
                      {dashboardStats?.compliance?.criticalIssues || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-ghost-200">
                    <span className="font-mono text-xs text-ghost-900">HIGH RISKS</span>
                    <span className="font-mono text-sm font-bold text-purple-900">
                      {dashboardStats?.compliance?.highIssues || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-ghost-200">
                    <span className="font-mono text-xs text-ghost-900">MEDIUM RISKS</span>
                    <span className="font-mono text-sm font-bold text-ghost-700">
                      {Math.max(0,
                        (dashboardStats?.compliance?.failedChecks || 0) -
                        (dashboardStats?.compliance?.criticalIssues || 0) -
                        (dashboardStats?.compliance?.highIssues || 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-mono text-xs text-ghost-900">LOW RISKS</span>
                    <span className="font-mono text-sm font-bold text-ghost-700">
                      {dashboardStats?.compliance?.passedChecks || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Drill Down Modal */}
        <DrillDownModal
          open={isDrillDownOpen}
          onOpenChange={setIsDrillDownOpen}
          title={drillDownData?.title || ""}
          category={drillDownData?.category || ""}
          data={drillDownData?.data || []}
          onNavigateToDetail={(_id) => {
            // Handle navigation to detailed view
          }}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;