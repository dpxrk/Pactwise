// src/app/_components/dashboard/DashboardContent.tsx
'use client';

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";


import { AgentActivityTerminal } from '@/app/_components/dashboard/AgentActivityTerminal';
import { ResizablePanel } from '@/app/_components/dashboard/ResizablePanel';
import {
  ContractExpiryWidget,
  BudgetAlertsWidget,
  VendorPerformanceWidget,
  ActivityTimelineWidget,
} from '@/components/dashboard';
import { DonnaTerminal } from '@/components/donna-terminal';
import { useTheme } from '@/contexts/ThemeContext';
import { usePerformanceTracking, useComponentPerformance } from '@/hooks/usePerformanceTracking';
import type { Id } from '@/types/id.types';
import { createClient } from "@/utils/supabase/client";

interface DashboardContentProps {
  enterpriseId: Id<"enterprises">;
}

const DashboardContentComponent: React.FC<DashboardContentProps> = ({ enterpriseId }) => {
  // Performance tracking
  usePerformanceTracking();
  const { trackMount } = useComponentPerformance('DashboardContent');
  const router = useRouter();
  const { isDark } = useTheme();

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
  
  // State for dashboard stats from API
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Fetch dashboard data using the new optimized function
  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()

      try {
        // Call the optimized dashboard stats function
        const { data: statsResponse, error: statsError } = await supabase
          .rpc('get_dashboard_stats', { p_enterprise_id: enterpriseId } as any);

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
          setDashboardStats(statsResponse);

          // Update contract stats from API response
          const contracts = (statsResponse as any).contracts || {};
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
  const _recentInsights: any[] = [];

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

  const calculatePendingApprovals = () => {
    return contractStats?.byStatus?.pending_analysis || 0;
  };

  // Loading state - only check if we have dashboard stats
  const isLoading = dashboardStats === null;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? "bg-terminal-bg" : "bg-ghost-100"}`}>
        <div className={`text-center border p-8 ${isDark ? "border-terminal-border bg-terminal-panel" : "border-ghost-300 bg-white"}`}>
          <div className="mb-4 inline-block">
            <div className={`w-10 h-10 border-t-2 animate-spin ${isDark ? "border-purple-400" : "border-purple-900"}`} style={{ borderRadius: '0' }}></div>
          </div>
          <p className={`font-mono text-xs uppercase ${isDark ? "text-text-secondary" : "text-ghost-700"}`}>LOADING DASHBOARD DATA...</p>
        </div>
      </div>
    );
  }

  // Calculate all metric values
  const totalContractValue = calculateTotalContractValue();
  const activeContracts = calculateActiveContracts();
  const expiringCount = calculateExpiringContracts();
  const totalVendors = dashboardStats?.vendors?.total || 0;
  const complianceScore = calculateComplianceScore();
  const pendingApprovals = calculatePendingApprovals();

  return (
    <div className={`relative w-full min-h-screen transition-colors duration-300 ${
      isDark ? "bg-terminal-bg" : "bg-ghost-100"
    }`}>
      {/* Grid background pattern - matching landing page */}
      <div
        className={`absolute inset-0 opacity-30 pointer-events-none ${isDark ? "" : ""}`}
        style={isDark ? {
          backgroundImage: "linear-gradient(rgba(42, 42, 46, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 42, 46, 0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        } : {
          backgroundImage: "linear-gradient(#d2d1de 1px, transparent 1px), linear-gradient(90deg, #d2d1de 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Top Status Bar - Bloomberg Style */}
      <div className={`relative border-b px-6 py-3 sticky top-0 z-10 transition-colors duration-300 ${
        isDark
          ? "bg-terminal-surface border-terminal-border"
          : "bg-white border-ghost-300"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className={`font-mono text-xs uppercase ${isDark ? "text-text-secondary" : "text-ghost-700"}`}>SYSTEM ACTIVE</span>
            </div>
            <div className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-600"}`}>
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className={`uppercase ${isDark ? "text-text-muted" : "text-ghost-600"}`}>Total Contracts:</span>
              <span className={`font-semibold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{contractStats?.total || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`uppercase ${isDark ? "text-text-muted" : "text-ghost-600"}`}>Active:</span>
              <span className={`font-semibold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{contractStats?.byStatus?.active || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`uppercase ${isDark ? "text-text-muted" : "text-ghost-600"}`}>Vendors:</span>
              <span className={`font-semibold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{totalVendors}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative p-6">
        {/* Dense Metrics Grid - Bloomberg Terminal Style */}
        <div className={`border mb-6 transition-colors duration-300 ${
          isDark
            ? "bg-terminal-panel border-terminal-border"
            : "bg-white border-ghost-300"
        }`}>
          <div className={`grid grid-cols-4 divide-x ${isDark ? "divide-terminal-border" : "divide-ghost-300"}`}>
            {/* Core Metrics Column */}
            <div className={`p-4 border-b ${isDark ? "border-terminal-border" : "border-ghost-300"}`}>
              <div className={`font-mono text-[10px] mb-3 uppercase font-semibold ${isDark ? "text-text-muted" : "text-ghost-600"}`}>CORE METRICS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>TOTAL:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{contractStats?.total || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>ACTIVE:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{activeContracts}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>VALUE:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{formatCurrency(totalContractValue)}</span>
                </div>
              </div>
            </div>

            {/* Contracts Column */}
            <div className={`p-4 border-b ${isDark ? "border-terminal-border" : "border-ghost-300"}`}>
              <div className={`font-mono text-[10px] mb-3 uppercase font-semibold ${isDark ? "text-text-muted" : "text-ghost-600"}`}>CONTRACTS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>DRAFT:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{contractStats?.byStatus?.draft || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>EXPIRING:</span>
                  <span className="font-mono text-lg font-bold text-amber-500">{expiringCount}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>PENDING:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{pendingApprovals}</span>
                </div>
              </div>
            </div>

            {/* Vendors Column */}
            <div className={`p-4 border-b ${isDark ? "border-terminal-border" : "border-ghost-300"}`}>
              <div className={`font-mono text-[10px] mb-3 uppercase font-semibold ${isDark ? "text-text-muted" : "text-ghost-600"}`}>VENDORS</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>TOTAL:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{totalVendors}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>ACTIVE:</span>
                  <span className="font-mono text-lg font-bold text-green-500">{dashboardStats?.vendors?.active || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>SPEND:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{formatCurrency(dashboardStats?.vendors?.totalSpend || 0)}</span>
                </div>
              </div>
            </div>

            {/* Risk & Compliance Column */}
            <div className={`p-4 border-b ${isDark ? "border-terminal-border" : "border-ghost-300"}`}>
              <div className={`font-mono text-[10px] mb-3 uppercase font-semibold ${isDark ? "text-text-muted" : "text-ghost-600"}`}>RISK & COMPLIANCE</div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>SCORE:</span>
                  <span className={`font-mono text-lg font-bold ${complianceScore > 80 ? 'text-green-500' : complianceScore > 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {complianceScore}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>CRITICAL:</span>
                  <span className="font-mono text-lg font-bold text-red-500">{dashboardStats?.compliance?.criticalIssues || 0}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>HIGH:</span>
                  <span className="font-mono text-lg font-bold text-amber-500">{dashboardStats?.compliance?.highIssues || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Agent Activity Terminal */}
        <AgentActivityTerminal
          className={`border mb-6 ${isDark ? "border-terminal-border" : "border-ghost-300"}`}
          maxHeight="300px"
          title="agent-activity"
        />

        {/* Dashboard Overview Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xl font-bold font-mono ${isDark ? "text-text-primary" : "text-purple-900"}`}>
                DASHBOARD OVERVIEW
              </h2>
              <p className={`text-xs font-mono mt-1 ${isDark ? "text-text-muted" : "text-ghost-600"}`}>
                Real-time insights and alerts for your contracts, budgets, and vendors
              </p>
            </div>
          </div>

          {/* Alerts Row - Priority widgets */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ResizablePanel
              title="CONTRACT EXPIRY ALERTS"
              defaultHeight={300}
              minHeight={200}
              maxHeight={500}
              storageKey="contract-expiry-widget"
            >
              <div className="p-4 h-full">
                <ContractExpiryWidget enterpriseId={enterpriseId} daysAhead={60} />
              </div>
            </ResizablePanel>
            <ResizablePanel
              title="BUDGET ALERTS"
              defaultHeight={300}
              minHeight={200}
              maxHeight={500}
              storageKey="budget-alerts-widget"
            >
              <div className="p-4 h-full">
                <BudgetAlertsWidget enterpriseId={enterpriseId} />
              </div>
            </ResizablePanel>
          </div>

          {/* Performance & Activity Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <ResizablePanel
              title="VENDOR PERFORMANCE"
              defaultHeight={350}
              minHeight={200}
              maxHeight={600}
              storageKey="vendor-performance-widget"
            >
              <div className="p-4 h-full">
                <VendorPerformanceWidget enterpriseId={enterpriseId} />
              </div>
            </ResizablePanel>
            <ResizablePanel
              title="ACTIVITY TIMELINE"
              defaultHeight={350}
              minHeight={200}
              maxHeight={600}
              storageKey="activity-timeline-widget"
            >
              <div className="p-4 h-full">
                <ActivityTimelineWidget enterpriseId={enterpriseId} limit={10} />
              </div>
            </ResizablePanel>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-3 gap-4">
            <ResizablePanel
              title="RECENT ACTIVITY"
              defaultHeight={250}
              minHeight={150}
              maxHeight={400}
              storageKey="recent-activity"
            >
              <div className="h-full">
                {contractStats?.total > 0 ? (
                  <div className={`divide-y ${isDark ? "divide-terminal-border" : "divide-ghost-200"}`}>
                    <div className={`p-3 ${isDark ? "hover:bg-terminal-hover" : "hover:bg-ghost-100"} state-transition`}>
                      <div className={`font-mono text-[10px] mb-1 ${isDark ? "text-text-muted" : "text-ghost-600"}`}>{new Date().toLocaleTimeString()}</div>
                      <div className={`text-xs ${isDark ? "text-text-secondary" : "text-ghost-900"}`}>Contract #{contractStats?.byStatus?.active} activated</div>
                      <div className={`font-mono text-[10px] mt-0.5 ${isDark ? "text-purple-400" : "text-purple-900"}`}>STATUS: ● ACTIVE</div>
                    </div>
                    <div className={`p-3 ${isDark ? "hover:bg-terminal-hover" : "hover:bg-ghost-100"} state-transition`}>
                      <div className={`font-mono text-[10px] mb-1 ${isDark ? "text-text-muted" : "text-ghost-600"}`}>{new Date(Date.now() - 300000).toLocaleTimeString()}</div>
                      <div className={`text-xs ${isDark ? "text-text-secondary" : "text-ghost-900"}`}>Vendor analysis completed</div>
                      <div className="font-mono text-[10px] text-green-500 mt-0.5">AI AGENT: VENDOR_ANALYZER</div>
                    </div>
                    <div className={`p-3 ${isDark ? "hover:bg-terminal-hover" : "hover:bg-ghost-100"} state-transition`}>
                      <div className={`font-mono text-[10px] mb-1 ${isDark ? "text-text-muted" : "text-ghost-600"}`}>{new Date(Date.now() - 600000).toLocaleTimeString()}</div>
                      <div className={`text-xs ${isDark ? "text-text-secondary" : "text-ghost-900"}`}>Compliance check passed</div>
                      <div className="font-mono text-[10px] text-green-500 mt-0.5">SCORE: {complianceScore}%</div>
                    </div>
                    {expiringCount > 0 && (
                      <div className={`p-3 border-l-2 border-l-amber-500 ${isDark ? "bg-amber-900/20 hover:bg-amber-900/30" : "bg-amber-50 hover:bg-amber-100"} state-transition`}>
                        <div className={`font-mono text-[10px] mb-1 ${isDark ? "text-text-muted" : "text-ghost-600"}`}>{new Date(Date.now() - 1800000).toLocaleTimeString()}</div>
                        <div className={`text-xs font-semibold ${isDark ? "text-text-secondary" : "text-ghost-900"}`}>{expiringCount} contracts expiring soon</div>
                        <div className="font-mono text-[10px] text-amber-500 mt-0.5">ACTION REQUIRED</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-600"}`}>NO RECENT ACTIVITY</div>
                    <div className={`font-mono text-[10px] mt-1 ${isDark ? "text-text-tertiary" : "text-ghost-500"}`}>Activity will appear here in real-time</div>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizablePanel
              title="AI AGENT STATUS"
              defaultHeight={250}
              minHeight={150}
              maxHeight={400}
              storageKey="ai-agent-status"
            >
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>SYSTEM:</span>
                  <span className={`font-mono text-xs font-semibold ${agentSystemStatus?.system?.isRunning ? 'text-green-500' : isDark ? 'text-text-tertiary' : 'text-ghost-500'}`}>
                    {agentSystemStatus?.system?.isRunning ? '● RUNNING' : '○ STOPPED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>ACTIVE AGENTS:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{agentSystemStatus?.stats?.activeAgents || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>INSIGHTS (24H):</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{agentSystemStatus?.stats?.recentInsights || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`font-mono text-xs ${isDark ? "text-text-muted" : "text-ghost-700"}`}>ACTIVE TASKS:</span>
                  <span className={`font-mono text-lg font-bold ${isDark ? "text-purple-400" : "text-purple-900"}`}>{agentSystemStatus?.stats?.activeTasks || 0}</span>
                </div>
              </div>
            </ResizablePanel>

            <ResizablePanel
              title="QUICK ACTIONS"
              defaultHeight={250}
              minHeight={150}
              maxHeight={400}
              storageKey="quick-actions"
            >
              <div className="p-3 space-y-2">
                <button
                  onClick={() => router.push('/dashboard/contracts')}
                  className={`w-full border px-3 py-2 font-mono text-xs state-transition text-left ${
                    isDark
                      ? "border-terminal-border bg-terminal-surface text-purple-400 hover:bg-purple-900/30 hover:border-purple-500"
                      : "border-ghost-300 bg-white text-purple-900 hover:bg-purple-900 hover:text-white"
                  }`}
                >
                  → VIEW ALL CONTRACTS
                </button>
                <button
                  onClick={() => router.push('/dashboard/vendors')}
                  className={`w-full border px-3 py-2 font-mono text-xs state-transition text-left ${
                    isDark
                      ? "border-terminal-border bg-terminal-surface text-purple-400 hover:bg-purple-900/30 hover:border-purple-500"
                      : "border-ghost-300 bg-white text-purple-900 hover:bg-purple-900 hover:text-white"
                  }`}
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
                  className={`w-full border px-3 py-2 font-mono text-xs state-transition text-left ${
                    isDark
                      ? "border-terminal-border bg-terminal-surface text-purple-400 hover:bg-purple-900/30 hover:border-purple-500"
                      : "border-ghost-300 bg-white text-purple-900 hover:bg-purple-900 hover:text-white"
                  }`}
                >
                  → RUN AI ANALYSIS
                </button>
              </div>
            </ResizablePanel>
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
