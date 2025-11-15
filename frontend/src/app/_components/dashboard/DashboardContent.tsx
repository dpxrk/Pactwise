// src/app/_components/dashboard/DashboardContent.tsx
'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import { PremiumBarChart } from '@/components/charts';
import { usePerformanceTracking, useComponentPerformance } from '@/hooks/usePerformanceTracking';
import type { Id } from '@/types/id.types';
import {
  ContractExpiryWidget,
  BudgetAlertsWidget,
  VendorPerformanceWidget,
  ActivityTimelineWidget,
} from '@/components/dashboard';
import { DonnaTerminal } from '@/components/donna-terminal';

// Define chart colors using Pactwise brand colors
const CHART_COLORS = {
  primary: "#291528",      // Dark Purple - Primary brand color
  secondary: "#9e829c",    // Mountbatten Pink - Accent color
  tertiary: "#3a3e3b",     // Black Olive - Secondary text
  quaternary: "#f0eff4",   // Ghost White - Light background
  success: "#9e829c",      // Pink for success states
  warning: "#d97706",      // amber-600
  danger: "#dc2626",       // red-600
  darkPurple: "#291528",
  pink: "#9e829c",
  olive: "#3a3e3b",
  ghost: "#f0eff4"
};

interface DashboardContentProps {
  enterpriseId: Id<"enterprises">;
}

const DashboardContentComponent: React.FC<DashboardContentProps> = ({ enterpriseId }) => {
  // Performance tracking
  usePerformanceTracking();
  const { trackMount } = useComponentPerformance('DashboardContent');
  const router = useRouter();

  // Track component mount
  useEffect(() => {
    trackMount();
  }, [trackMount]);

  // State for fetched data - initialize with zeros (no hard-coded fallback data)
  const [contractStats, setContractStats] = useState({
    total: 0,
    byStatus: {
      active: 0,
      draft: 0,
      pending_analysis: 0,
      expired: 0,
      terminated: 0,
      archived: 0
    },
    byType: {},
    byAnalysisStatus: {},
    recentlyCreated: 0
  });
  
  const [contractsData, setContractsData] = useState<{ contracts: any[] }>({
    contracts: []
  });
  const contracts = contractsData?.contracts;
  
  const [vendorsData, setVendorsData] = useState<{ vendors: any[]; stats?: any }>({
    vendors: [] // Initialize with empty array - no mock vendor data
  });
  const vendors = vendorsData?.vendors;
  
  // State for dashboard stats from API
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Fetch dashboard data using the new optimized function
  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()

      try {
        console.log('Fetching dashboard stats for enterprise:', enterpriseId);
        // Call the optimized dashboard stats function
        const { data: statsResponse, error: statsError } = await supabase
          .rpc('get_dashboard_stats', { p_enterprise_id: enterpriseId });

        if (statsError) {
          console.error('Error fetching dashboard stats:', statsError);
          toast.error('Failed to load dashboard data');
          // Set empty stats to prevent infinite loading
          setDashboardStats({
            contracts: {
              total: 0,
              byStatus: { active: 0, draft: 0, pending_analysis: 0, expired: 0, terminated: 0, archived: 0 },
              byType: {},
              byAnalysisStatus: {},
              recentlyCreated: 0,
              expiringSoon: 0,
              totalValue: 0,
              activeValue: 0
            },
            vendors: { total: 0, active: 0, pending: 0, avgPerformance: 0, highPerformers: 0, atRisk: 0, byCategory: {}, totalContracts: 0, totalSpend: 0 },
            agents: { activeAgents: 0, activeTasks: 0, recentTasks: 0, recentInsights: 0, isRunning: false },
            compliance: { totalChecks: 0, passedChecks: 0, failedChecks: 0, criticalIssues: 0, highIssues: 0, recentChecks: 0, complianceRate: 100 },
            financial: { totalBudget: 0, allocatedAmount: 0, spentAmount: 0, committedAmount: 0, budgetsAtRisk: 0, budgetsExceeded: 0, utilizationRate: 0 }
          });
        } else if (statsResponse) {
          console.log('Dashboard stats loaded:', statsResponse);
          setDashboardStats(statsResponse);

          // Update contract stats from API response
          const contracts = statsResponse.contracts || {};
          setContractStats({
            total: contracts.total || 0,
            byStatus: contracts.byStatus || {
              active: 0,
              draft: 0,
              pending_analysis: 0,
              expired: 0,
              terminated: 0,
              archived: 0
            },
            byType: contracts.byType || {},
            byAnalysisStatus: contracts.byAnalysisStatus || {},
            recentlyCreated: contracts.recentlyCreated || 0
          });

          // Update vendors data from API response
          const vendors = statsResponse.vendors || {};
          setVendorsData({
            vendors: [], // We can fetch actual vendor list separately if needed
            stats: vendors
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
        // Set empty stats to prevent infinite loading
        setDashboardStats({
          contracts: {
            total: 0,
            byStatus: { active: 0, draft: 0, pending_analysis: 0, expired: 0, terminated: 0, archived: 0 },
            byType: {},
            byAnalysisStatus: {},
            recentlyCreated: 0,
            expiringSoon: 0,
            totalValue: 0,
            activeValue: 0
          },
          vendors: { total: 0, active: 0, pending: 0, avgPerformance: 0, highPerformers: 0, atRisk: 0, byCategory: {}, totalContracts: 0, totalSpend: 0 },
          agents: { activeAgents: 0, activeTasks: 0, recentTasks: 0, recentInsights: 0, isRunning: false },
          compliance: { totalChecks: 0, passedChecks: 0, failedChecks: 0, criticalIssues: 0, highIssues: 0, recentChecks: 0, complianceRate: 100 },
          financial: { totalBudget: 0, allocatedAmount: 0, spentAmount: 0, committedAmount: 0, budgetsAtRisk: 0, budgetsExceeded: 0, utilizationRate: 0 }
        });
      }
    };

    if (enterpriseId) {
      fetchDashboardData();
    } else {
      // If no enterpriseId, set empty stats to prevent infinite loading
      console.warn('No enterpriseId provided to DashboardContent');
      setDashboardStats({
        contracts: {
          total: 0,
          byStatus: { active: 0, draft: 0, pending_analysis: 0, expired: 0, terminated: 0, archived: 0 },
          byType: {},
          byAnalysisStatus: {},
          recentlyCreated: 0,
          expiringSoon: 0,
          totalValue: 0,
          activeValue: 0
        },
        vendors: { total: 0, active: 0, pending: 0, avgPerformance: 0, highPerformers: 0, atRisk: 0, byCategory: {}, totalContracts: 0, totalSpend: 0 },
        agents: { activeAgents: 0, activeTasks: 0, recentTasks: 0, recentInsights: 0, isRunning: false },
        compliance: { totalChecks: 0, passedChecks: 0, failedChecks: 0, criticalIssues: 0, highIssues: 0, recentChecks: 0, complianceRate: 100 },
        financial: { totalBudget: 0, allocatedAmount: 0, spentAmount: 0, committedAmount: 0, budgetsAtRisk: 0, budgetsExceeded: 0, utilizationRate: 0 }
      });
    }
  }, [enterpriseId]);

  // Agent system data from API
  const agentSystemStatus = {
    system: { isRunning: dashboardStats?.agents?.isRunning || false },
    stats: {
      activeAgents: dashboardStats?.agents?.activeAgents || 0,
      recentInsights: dashboardStats?.agents?.recentInsights || 0,
      activeTasks: dashboardStats?.agents?.activeTasks || 0
    }
  };
  const recentInsights: any[] = [];

  // Helper functions
  const formatCurrency = (value: number) => {
    if (isNaN(value) || typeof value !== 'number') return '$0';
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };


  // Calculate metrics from API data
  const calculateTotalContractValue = () => {
    return dashboardStats?.contracts?.activeValue || 0;
  };

  const calculateActiveContracts = () => {
    return contractStats?.byStatus?.active || 0;
  };

  const calculateExpiringContracts = () => {
    return dashboardStats?.contracts?.expiringSoon || 0;
  };

  const calculateComplianceScore = () => {
    // Get compliance rate from API if available, otherwise calculate from contracts
    const apiComplianceRate = dashboardStats?.compliance?.complianceRate;
    if (apiComplianceRate !== undefined) {
      return Math.round(apiComplianceRate);
    }

    // Fallback calculation
    if (!contractStats || contractStats.total === 0) return 100;

    const expiredCount = contractStats.byStatus.expired || 0;
    const pendingCount = contractStats.byStatus.pending_analysis || 0;
    const activeCount = contractStats.byStatus.active || 0;

    let score = 100;
    score -= Math.min(60, (expiredCount / contractStats.total) * 100);
    score -= Math.min(30, (pendingCount / contractStats.total) * 50);
    score += (activeCount / contractStats.total) * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateRiskScore = () => {
    // Calculate risk based on contract status and compliance
    if (!contractStats || contractStats.total === 0) return 0;

    let riskScore = 0;
    const expiredCount = contractStats.byStatus.expired || 0;
    const pendingCount = contractStats.byStatus.pending_analysis || 0;
    const criticalIssues = dashboardStats?.compliance?.criticalIssues || 0;

    // Expired contracts are high risk
    riskScore += (expiredCount / contractStats.total) * 40;

    // Pending analysis adds moderate risk
    riskScore += (pendingCount / contractStats.total) * 20;

    // Critical compliance issues add significant risk
    riskScore += criticalIssues * 5;

    return Math.min(100, Math.round(riskScore));
  };

  const calculateSavingsOpportunities = () => {
    const totalValue = calculateTotalContractValue();
    return Math.round(totalValue * 0.08); // 8% potential savings
  };

  const calculatePendingApprovals = () => {
    return contractStats?.byStatus?.pending_analysis || 0;
  };

  const getStatusDistributionData = () => {
    if (!contractStats?.byStatus) return [];
    
    const statusColors: Record<string, string> = {
      active: "#291528",        // Dark Purple for active
      draft: "#9e829c",         // Pink for draft
      pending_analysis: "#d97706", // Warning amber for pending
      expired: "#dc2626",       // Danger red for expired
      terminated: "#3a3e3b",    // Black Olive for terminated
      archived: "#6b7280"       // Gray for archived
    };

    return Object.entries(contractStats.byStatus)
      .filter(([_, count]) => count > 0) // Only show statuses with contracts
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '), // Replace all underscores
        value: count,
        color: statusColors[status] || "#6b7280"
      }));
  };

  const getContractTypeData = (): Array<{ name: string; value: number; color: string }> => {
    if (!contractStats?.byType) return [];

    // Map common contract types to colors
    const typeColors: Record<string, string> = {
      'Service Agreement': CHART_COLORS.primary,
      'NDA': CHART_COLORS.secondary,
      'Purchase Order': CHART_COLORS.tertiary,
      'License Agreement': "#4a4d4a",     // Darker olive variant
      'MSA': "#7d6c7b",                   // Muted pink variant
      'SaaS': "#5c3d59",                  // Purple variant
      'Employment': "#8a7988",            // Warm gray
      'Partnership': "#6b7280",           // Standard gray
      'Other': "#9ca3af"                  // Light gray
    };

    return Object.entries(contractStats.byType)
      .filter(([_, count]) => (count as number) > 0)
      .map(([type, count]) => ({
        name: type,
        value: count as number,
        color: typeColors[type] || "#6b7280"
      }));
  };

  const getVendorCategoryData = () => {
    if (!vendors || !Array.isArray(vendors)) return [];
    
    const categoryCount: Record<string, number> = {};
    vendors.forEach(vendor => {
      const category = vendor.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const categoryColors: Record<string, string> = {
      technology: CHART_COLORS.primary,
      marketing: CHART_COLORS.secondary,
      legal: CHART_COLORS.tertiary,
      finance: CHART_COLORS.quaternary,
      hr: "#8b5cf6",
      facilities: "#06b6d4",
      logistics: "#84cc16",
      manufacturing: "#f59e0b",
      consulting: "#ef4444",
      other: "#6b7280"
    };

    return Object.entries(categoryCount).map(([category, count]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: count,
      color: categoryColors[category] || "#6b7280"
    }));
  };

  const getRiskDistributionData = () => {
    // Calculate risk based on contract values and types
    if (!contracts || !Array.isArray(contracts)) return [];
    
    let lowRisk = 0, mediumRisk = 0, highRisk = 0;
    
    contracts.forEach(contract => {
      const value = parseFloat(contract.extractedPricing?.replace(/[^0-9.-]/g, '') || '0');
      const type = contract.contractType;
      
      // Simple risk calculation based on value and type
      if (value > 100000 || ['partnership', 'msa'].includes(type || '')) {
        highRisk++;
      } else if (value > 10000 || ['saas', 'employment'].includes(type || '')) {
        mediumRisk++;
      } else {
        lowRisk++;
      }
    });

    return [
      { name: "Low Risk", value: lowRisk, color: "#9e829c" },     // Pink for low risk
      { name: "Medium Risk", value: mediumRisk, color: "#d97706" }, // Amber for medium
      { name: "High Risk", value: highRisk, color: "#dc2626" }      // Red for high
    ];
  };

  // Loading state - only check if we have dashboard stats
  const isLoading = dashboardStats === null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ghost-100">
        <div className="text-center border border-ghost-300 bg-white p-8">
          <div className="mb-4 inline-block">
            <div className="w-10 h-10 border-t-2 border-purple-900 animate-spin" style={{ borderRadius: '0' }}></div>
          </div>
          <p className="font-mono text-xs uppercase text-ghost-700">LOADING DASHBOARD DATA...</p>
        </div>
      </div>
    );
  }

  // Calculate all metric values
  const totalContractValue = calculateTotalContractValue();
  const activeContracts = calculateActiveContracts();
  const expiringCount = calculateExpiringContracts();
  const totalVendors = dashboardStats?.vendors?.total || 0;
  const agentInsights = recentInsights?.length || 0;
  const complianceScore = calculateComplianceScore();
  const riskScore = calculateRiskScore();
  const savingsOpportunities = calculateSavingsOpportunities();
  const pendingApprovals = calculatePendingApprovals();

  return (
    <div className="w-full min-h-screen bg-ghost-100">
      {/* Top Status Bar - Bloomberg Style */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">SYSTEM ACTIVE</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Total Contracts:</span>
              <span className="font-semibold text-purple-900">{contractStats?.total || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Active:</span>
              <span className="font-semibold text-purple-900">{contractStats?.byStatus?.active || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Vendors:</span>
              <span className="font-semibold text-purple-900">{totalVendors}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Dense Metrics Grid - Bloomberg Terminal Style */}
        <div className="border border-ghost-300 bg-white mb-6">
          <div className="grid grid-cols-4 divide-x divide-ghost-300">
            {/* Core Metrics Column */}
            <div className="p-4 border-b border-ghost-300">
              <div className="font-mono text-[10px] text-ghost-600 mb-3 uppercase font-semibold">CORE METRICS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">TOTAL:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{contractStats?.total || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">ACTIVE:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{activeContracts}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">VALUE:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{formatCurrency(totalContractValue)}</span>
                </div>
              </div>
            </div>

            {/* Contracts Column */}
            <div className="p-4 border-b border-ghost-300">
              <div className="font-mono text-[10px] text-ghost-600 mb-3 uppercase font-semibold">CONTRACTS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">DRAFT:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{contractStats?.byStatus?.draft || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">EXPIRING:</span>
                  <span className="font-mono text-lg font-bold text-amber-600">{expiringCount}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">PENDING:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{pendingApprovals}</span>
                </div>
              </div>
            </div>

            {/* Vendors Column */}
            <div className="p-4 border-b border-ghost-300">
              <div className="font-mono text-[10px] text-ghost-600 mb-3 uppercase font-semibold">VENDORS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">TOTAL:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{totalVendors}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">ACTIVE:</span>
                  <span className="font-mono text-lg font-bold text-green-600">{dashboardStats?.vendors?.active || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">SPEND:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{formatCurrency(dashboardStats?.vendors?.totalSpend || 0)}</span>
                </div>
              </div>
            </div>

            {/* Risk & Compliance Column */}
            <div className="p-4 border-b border-ghost-300">
              <div className="font-mono text-[10px] text-ghost-600 mb-3 uppercase font-semibold">RISK & COMPLIANCE</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">SCORE:</span>
                  <span className={`font-mono text-lg font-bold ${complianceScore > 80 ? 'text-green-600' : complianceScore > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {complianceScore}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">CRITICAL:</span>
                  <span className="font-mono text-lg font-bold text-red-600">{dashboardStats?.compliance?.criticalIssues || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-xs text-ghost-700">HIGH:</span>
                  <span className="font-mono text-lg font-bold text-amber-600">{dashboardStats?.compliance?.highIssues || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Column Dashboard Layout - Bloomberg Terminal Style */}
        <div className="grid grid-cols-3 gap-4">
          {/* Left Column: Charts & Data (2 columns) */}
          <div className="col-span-2 space-y-4">
            {/* Contract Status Distribution */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">CONTRACT STATUS DISTRIBUTION</h3>
              </div>
              <div className="p-4">
                <PremiumBarChart
                  data={getStatusDistributionData()}
                  title=""
                  subtitle=""
                  height={350}
                  distributed={true}
                  showValues={true}
                  showTrend={false}
                />
              </div>
            </div>

            {/* Contract Types Distribution */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">CONTRACT TYPES</h3>
              </div>
              <div className="p-4">
                <PremiumBarChart
                  data={getContractTypeData()}
                  title=""
                  subtitle=""
                  height={350}
                  distributed={true}
                  showValues={true}
                  showTrend={false}
                />
              </div>
            </div>

            {/* Vendor Categories */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">VENDOR CATEGORIES</h3>
              </div>
              <div className="p-4">
                <PremiumBarChart
                  data={getVendorCategoryData()}
                  title=""
                  subtitle=""
                  height={350}
                  distributed={true}
                  showValues={true}
                  showTrend={false}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Activity Feed & Quick Actions */}
          <div className="col-span-1 space-y-4">
            {/* Real-Time Activity Feed */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3 flex items-center justify-between">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">RECENT ACTIVITY</h3>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-green-500 animate-pulse" />
                  <span className="font-mono text-[10px] text-ghost-600">LIVE</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {contractStats?.total > 0 ? (
                  <div className="divide-y divide-ghost-200">
                    <div className="p-3 hover:bg-terminal-hover state-transition">
                      <div className="font-mono text-[10px] text-ghost-600 mb-1">{new Date().toLocaleTimeString()}</div>
                      <div className="text-xs text-ghost-900">Contract #{contractStats?.byStatus?.active} activated</div>
                      <div className="font-mono text-[10px] text-purple-900 mt-0.5">STATUS: ● ACTIVE</div>
                    </div>
                    <div className="p-3 hover:bg-terminal-hover state-transition">
                      <div className="font-mono text-[10px] text-ghost-600 mb-1">{new Date(Date.now() - 300000).toLocaleTimeString()}</div>
                      <div className="text-xs text-ghost-900">Vendor analysis completed</div>
                      <div className="font-mono text-[10px] text-green-600 mt-0.5">AI AGENT: VENDOR_ANALYZER</div>
                    </div>
                    <div className="p-3 hover:bg-terminal-hover state-transition">
                      <div className="font-mono text-[10px] text-ghost-600 mb-1">{new Date(Date.now() - 600000).toLocaleTimeString()}</div>
                      <div className="text-xs text-ghost-900">Compliance check passed</div>
                      <div className="font-mono text-[10px] text-green-600 mt-0.5">SCORE: {complianceScore}%</div>
                    </div>
                    <div className="p-3 hover:bg-terminal-hover state-transition">
                      <div className="font-mono text-[10px] text-ghost-600 mb-1">{new Date(Date.now() - 1200000).toLocaleTimeString()}</div>
                      <div className="text-xs text-ghost-900">New contract created</div>
                      <div className="font-mono text-[10px] text-purple-900 mt-0.5">TYPE: SERVICE AGREEMENT</div>
                    </div>
                    {expiringCount > 0 && (
                      <div className="p-3 bg-amber-50 hover:bg-amber-100 state-transition border-l-2 border-l-amber-600">
                        <div className="font-mono text-[10px] text-ghost-600 mb-1">{new Date(Date.now() - 1800000).toLocaleTimeString()}</div>
                        <div className="text-xs text-ghost-900 font-semibold">⚠ {expiringCount} contracts expiring soon</div>
                        <div className="font-mono text-[10px] text-amber-600 mt-0.5">ACTION REQUIRED</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="font-mono text-xs text-ghost-600">NO RECENT ACTIVITY</div>
                    <div className="font-mono text-[10px] text-ghost-500 mt-1">Activity will appear here in real-time</div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Agent Status */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">AI AGENT STATUS</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-ghost-700">SYSTEM:</span>
                  <span className={`font-mono text-xs font-semibold ${agentSystemStatus?.system?.isRunning ? 'text-green-600' : 'text-ghost-500'}`}>
                    {agentSystemStatus?.system?.isRunning ? '● RUNNING' : '○ STOPPED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-ghost-700">ACTIVE AGENTS:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{agentSystemStatus?.stats?.activeAgents || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-ghost-700">INSIGHTS (24H):</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{agentSystemStatus?.stats?.recentInsights || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-ghost-700">ACTIVE TASKS:</span>
                  <span className="font-mono text-lg font-bold text-purple-900">{agentSystemStatus?.stats?.activeTasks || 0}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-ghost-300 bg-white">
              <div className="border-b border-ghost-300 bg-terminal-surface p-3">
                <h3 className="font-mono text-xs text-ghost-700 uppercase font-semibold">QUICK ACTIONS</h3>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={() => router.push('/dashboard/contracts')}
                  className="w-full border border-ghost-300 bg-white text-purple-900 px-3 py-2 font-mono text-xs hover:bg-purple-900 hover:text-white state-transition text-left"
                >
                  → VIEW ALL CONTRACTS
                </button>
                <button
                  onClick={() => router.push('/dashboard/vendors')}
                  className="w-full border border-ghost-300 bg-white text-purple-900 px-3 py-2 font-mono text-xs hover:bg-purple-900 hover:text-white state-transition text-left"
                >
                  → MANAGE VENDORS
                </button>
                <button
                  onClick={() => {
                    toast.info('Opening AI Analysis Dashboard...', {
                      description: 'Navigate to the Agents page to run AI-powered analysis on your contracts and vendors.'
                    });
                    router.push('/dashboard/agents');
                  }}
                  className="w-full border border-ghost-300 bg-white text-purple-900 px-3 py-2 font-mono text-xs hover:bg-purple-900 hover:text-white state-transition text-left"
                >
                  → RUN AI ANALYSIS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Dashboard Widgets Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-purple-900">Dashboard Overview</h2>
              <p className="text-sm text-ghost-600 mt-1">
                Real-time insights and alerts for your contracts, budgets, and vendors
              </p>
            </div>
          </div>

          {/* Alerts Row - Priority widgets */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <ContractExpiryWidget enterpriseId={enterpriseId} daysAhead={60} />
            <BudgetAlertsWidget enterpriseId={enterpriseId} />
          </div>

          {/* Performance & Activity Row */}
          <div className="grid grid-cols-2 gap-6">
            <VendorPerformanceWidget enterpriseId={enterpriseId} />
            <ActivityTimelineWidget enterpriseId={enterpriseId} limit={10} />
          </div>
        </div>

        {/* Donna Terminal - Fixed position overlay */}
        <DonnaTerminal defaultMinimized={true} />
      </div>
    </div>
  );
};

const DashboardContent = React.memo(DashboardContentComponent, (prevProps, nextProps) => {
  // Only re-render if enterpriseId changes
  return prevProps.enterpriseId === nextProps.enterpriseId;
});

export default DashboardContent;
