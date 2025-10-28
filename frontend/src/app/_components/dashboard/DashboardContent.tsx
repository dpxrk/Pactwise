// src/app/_components/dashboard/DashboardContent.tsx
'use client';

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FileText,
  Activity,
  Calendar,
  DollarSign,
  Shield,
  Users,
  AlertCircle,
  PiggyBank,
  Clock,
  Building,
  Target,
  TrendingUp,
  BarChart,
  LineChart,
  PieChart,
  Bot,
  Briefcase,
  ChevronDown,
  Download,
  Filter,
  MoreVertical,
  RefreshCw,
  Search,
  Settings,
  Zap,
} from "lucide-react";

import { PremiumBarChart, PremiumPieChart } from '@/components/charts';
import { MetricCard } from "@/app/_components/common/MetricCard";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceTracking, useComponentPerformance } from '@/hooks/usePerformanceTracking';
import type { Id } from '@/types/id.types';

import { DashboardCustomizationMenu } from "./DashboardCustomizationMenu";
import { DraggableChartCard } from "./DraggableChartCard";
import { DraggableMetricCard } from "./DraggableMetricCard";
import { DraggableSection } from "./DraggableSection";

// Define MetricId type
type MetricId = string;



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

// Define metric data interface
interface MetricData {
  id: MetricId;
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  changeType?: "positive" | "negative" | "neutral";
  description?: string;
}

// Define dashboard item type that can be either metric or chart
interface DashboardItem {
  id: MetricId;
  type: "metric" | "chart";
  title: string;
  // For metrics
  value?: string | number;
  icon?: React.ElementType;
  trend?: number;
  changeType?: "positive" | "negative" | "neutral";
  description?: string;
  // For charts
  chartContent?: React.ReactNode;
}

const DashboardContentComponent: React.FC<DashboardContentProps> = ({ enterpriseId }) => {
  // Performance tracking
  usePerformanceTracking();
  const { trackMount } = useComponentPerformance('DashboardContent');

  // Track component mount
  useEffect(() => {
    trackMount();
  }, [trackMount]);

  // Fetch user preferences (temporarily disabled - using defaults)
  const userPreferences = null;
  const savePreferences = async (prefs: any) => {
    console.log('Saving preferences:', prefs);
    // TODO: Implement preference saving
  };
  
  // Default sections to show
  const defaultSections: MetricId[] = [
    "hero-section",
    "quick-stats",
    "whats-happening",
    "by-the-numbers",
    "risk-compliance",
    "contract-types-chart",
    "analysis-status-chart",
    "vendor-categories-chart",
    "top-vendors-chart"
  ];

  // State for section order and enabled sections
  const [enabledSections, setEnabledSections] = useState<MetricId[]>(defaultSections);
  const [sectionOrder, setSectionOrder] = useState<MetricId[]>(defaultSections);

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setEnabledSections(userPreferences.enabledSections || defaultSections);
      setSectionOrder(userPreferences.sectionOrder || defaultSections);
    } else {
      // Use defaults if no preferences
      setEnabledSections(defaultSections);
      setSectionOrder(defaultSections);
    }
  }, [userPreferences]);

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
  
  const [contractsData, setContractsData] = useState({
    contracts: []
  });
  const contracts = contractsData?.contracts;
  
  const [vendorsData, setVendorsData] = useState<{ vendors: any[] }>({
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as MetricId);
        const newIndex = items.indexOf(over?.id as MetricId);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to database asynchronously
        savePreferences({
          enabledSections,
          sectionOrder: newOrder,
        });
        
        return newOrder;
      });
    }
  };

  // Handle removing a section
  const handleRemoveSection = async (sectionId: MetricId) => {
    const newEnabledSections = enabledSections.filter(id => id !== sectionId);
    setEnabledSections(newEnabledSections);
    
    // Save to database
    await savePreferences({
      enabledSections: newEnabledSections,
      sectionOrder: sectionOrder,
    });
    
    toast.success("Section removed from dashboard");
  };

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

  const getContractTypeData = () => {
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
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        name: type,
        value: count,
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

  // Define all available metrics
  const allMetrics: Record<MetricId, MetricData> = {
    "total-contracts": {
      id: "total-contracts",
      title: "Total Contracts",
      value: contractStats?.total?.toString() || "0",
      icon: FileText,
      description: "All contracts in system"
    },
    "active-contracts": {
      id: "active-contracts",
      title: "Active Contracts",
      value: activeContracts.toString(),
      icon: Activity,
      // Trend data would come from historical comparison in API
      changeType: "neutral",
      description: "Currently active contracts"
    },
    "expiring-soon": {
      id: "expiring-soon",
      title: "Expiring Soon",
      value: expiringCount.toString(),
      icon: Calendar,
      // Trend data would come from historical comparison in API
      changeType: expiringCount > 5 ? "negative" : "positive",
      description: "Contracts expiring in 30 days"
    },
    "total-value": {
      id: "total-value",
      title: "Total Contract Value",
      value: formatCurrency(totalContractValue),
      icon: DollarSign,
      // Trend data would come from historical comparison in API
      changeType: "neutral",
      description: "Total portfolio value"
    },
    "compliance-score": {
      id: "compliance-score",
      title: "Compliance Score",
      value: `${complianceScore}%`,
      icon: Shield,
      // Trend data would come from historical comparison in API
      changeType: complianceScore > 80 ? "positive" : "negative",
      description: "Overall compliance health"
    },
    "vendors": {
      id: "vendors",
      title: "Total Vendors",
      value: totalVendors.toString(),
      icon: Users,
      // Trend data would come from historical comparison in API
      changeType: "neutral",
      description: "Vendor relationships"
    },
    "risk-score": {
      id: "risk-score",
      title: "Risk Score",
      value: `${riskScore}%`,
      icon: AlertCircle,
      // Trend data would come from historical comparison in API
      changeType: riskScore > 50 ? "negative" : "positive",
      description: "Portfolio risk assessment"
    },
    "savings-opportunities": {
      id: "savings-opportunities",
      title: "Savings Opportunities",
      value: formatCurrency(savingsOpportunities),
      icon: PiggyBank,
      // Trend data would come from historical comparison in API
      changeType: "neutral",
      description: "Potential cost savings"
    },
    "pending-approvals": {
      id: "pending-approvals",
      title: "Pending Approvals",
      value: pendingApprovals.toString(),
      icon: Clock,
      // Trend data would come from historical comparison in API
      changeType: pendingApprovals > 10 ? "negative" : "neutral",
      description: "Awaiting approval"
    },
    "recent-activity": {
      id: "recent-activity",
      title: "AI Insights",
      value: agentInsights.toString(),
      icon: Activity,
      // Trend data would come from historical comparison in API
      changeType: "neutral",
      description: "Recent AI analysis insights"
    }
  };

  // Define all dashboard items (metrics and charts)
  const allDashboardItems: Record<MetricId, DashboardItem> = {
    // Metrics
    ...Object.entries(allMetrics).reduce((acc, [id, metric]) => ({
      ...acc,
      [id]: {
        ...metric,
        type: "metric" as const
      }
    }), {}),
    // Charts
    "contract-status-chart": {
      id: "contract-status-chart",
      type: "chart",
      title: "Contract Status Distribution",
      chartContent: (
        <div className="h-[280px] w-full flex flex-col">
          <div className="flex-1 min-h-0">
            <PremiumPieChart 
              data={getStatusDistributionData()} 
              height={220} 
              showLegend={false} 
              colors={getStatusDistributionData().map(item => item.color)}
              pieConfig={{ 
                innerRadius: 50, 
                outerRadius: 80
              }}
            />
          </div>
          <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 px-2 mt-2">
            {getStatusDistributionData().map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-[#3a3e3b]">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    "risk-distribution-chart": {
      id: "risk-distribution-chart",
      type: "chart",
      title: "Risk Distribution",
      chartContent: (
        <div className="h-[280px] w-full flex flex-col">
          <div className="flex-1 min-h-0">
            <PremiumPieChart 
              data={getRiskDistributionData()} 
              height={220} 
              showLegend={false} 
              colors={getRiskDistributionData().map(item => item.color)}
              pieConfig={{ 
                innerRadius: 50, 
                outerRadius: 80
              }}
            />
          </div>
          <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 px-2 mt-2">
            {getRiskDistributionData().map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-[#3a3e3b]">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  // Get only enabled items in the correct order
  const displayItems = sectionOrder
    .filter(id => enabledSections.includes(id))
    .map(id => allDashboardItems[id])
    .filter(Boolean);

  // Dynamic metric configuration for tabs

  const contractsTabMetrics = [
    {
      title: "Total Contracts",
      value: contractStats?.total?.toString() || "0",
      icon: FileText,
      description: "All contracts in system"
    },
    {
      title: "Active Contracts",
      value: contractStats?.byStatus?.active?.toString() || "0",
      icon: Activity,
      description: "Currently active contracts"
    },
    {
      title: "Draft Contracts",
      value: contractStats?.byStatus?.draft?.toString() || "0",
      icon: Activity,
      description: "Contracts in draft status"
    },
    {
      title: "Recently Created",
      value: contractStats?.recentlyCreated?.toString() || "0",
      icon: Calendar,
      description: "Created in last 7 days"
    }
  ];

  const vendorsTabMetrics = [
    {
      title: "Total Vendors",
      value: totalVendors.toString(),
      icon: Building,
      description: "Registered vendor relationships"
    },
    {
      title: "Active Relationships",
      value: (vendors && Array.isArray(vendors)) ? vendors.filter(v => v.contractCount > 0).length.toString() : "0",
      icon: Activity,
      description: "Vendors with active contracts"
    },
    {
      title: "Avg Contracts per Vendor",
      value: (totalVendors > 0 ? ((contractStats?.total || 0) / totalVendors).toFixed(1) : "0"),
      icon: Target,
      description: "Average contracts per vendor"
    }
  ];

  const agentsTabMetrics = [
    {
      title: "System Status",
      value: agentSystemStatus?.system?.isRunning ? "Running" : "Stopped",
      icon: Activity,
      description: "AI agent system status"
    },
    {
      title: "Active Agents",
      value: agentSystemStatus?.stats?.activeAgents?.toString() || "0",
      icon: Users,
      description: "Currently running agents"
    },
    {
      title: "Recent Insights",
      value: agentSystemStatus?.stats?.recentInsights?.toString() || "0",
      icon: TrendingUp,
      description: "Insights generated (24h)"
    },
    {
      title: "Active Tasks",
      value: agentSystemStatus?.stats?.activeTasks?.toString() || "0",
      icon: Calendar,
      description: "Tasks being processed"
    }
  ];

  return (
    <div className="w-full min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
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

      <div className="flex flex-col space-y-6 px-4 py-6">
        {/* Dashboard customization menu */}
        <div className="flex justify-end">
          <DashboardCustomizationMenu
            enabledMetrics={enabledSections}
            onMetricsChange={(sections) => {
              setEnabledSections(sections);
              setSectionOrder(sections);
            }}
          />
        </div>

        {/* Draggable Dashboard Sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sectionOrder.filter(id => enabledSections.includes(id))}
            strategy={verticalListSortingStrategy}
          >
            {sectionOrder.filter(id => enabledSections.includes(id)).map((sectionId) => {
              switch (sectionId) {
                case 'hero-section':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <ExecutiveSummary
                        contractStats={contractStats}
                        totalContractValue={totalContractValue}
                        expiringCount={expiringCount}
                        totalVendors={totalVendors}
                        complianceScore={complianceScore}
                        riskScore={riskScore}
                        sectionsToShow={['hero']}
                      />
                    </DraggableSection>
                  );
                
                case 'quick-stats':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <ExecutiveSummary
                        contractStats={contractStats}
                        totalContractValue={totalContractValue}
                        expiringCount={expiringCount}
                        totalVendors={totalVendors}
                        complianceScore={complianceScore}
                        riskScore={riskScore}
                        sectionsToShow={['quickStats']}
                      />
                    </DraggableSection>
                  );
                
                case 'whats-happening':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <ExecutiveSummary
                        contractStats={contractStats}
                        totalContractValue={totalContractValue}
                        expiringCount={expiringCount}
                        totalVendors={totalVendors}
                        complianceScore={complianceScore}
                        riskScore={riskScore}
                        sectionsToShow={['whatsHappening']}
                      />
                    </DraggableSection>
                  );
                
                case 'by-the-numbers':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <ExecutiveSummary
                        contractStats={contractStats}
                        totalContractValue={totalContractValue}
                        expiringCount={expiringCount}
                        totalVendors={totalVendors}
                        complianceScore={complianceScore}
                        riskScore={riskScore}
                        sectionsToShow={['byTheNumbers']}
                      />
                    </DraggableSection>
                  );
                
                case 'risk-compliance':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <ExecutiveSummary
                        contractStats={contractStats}
                        totalContractValue={totalContractValue}
                        expiringCount={expiringCount}
                        totalVendors={totalVendors}
                        complianceScore={complianceScore}
                        riskScore={riskScore}
                        sectionsToShow={['riskCompliance']}
                      />
                    </DraggableSection>
                  );
                
                case 'contract-types-chart':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <PremiumBarChart
                        data={getContractTypeData()}
                        title="Contract Types Distribution"
                        subtitle="Distribution of contracts by type"
                        height={350}
                        distributed={true}
                        showValues={false}
                        showTrend={false}
                      />
                    </DraggableSection>
                  );
                
                case 'analysis-status-chart':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <PremiumPieChart
                        data={Object.entries(contractStats?.byAnalysisStatus || {}).map(([status, count]) => ({
                          name: status.charAt(0).toUpperCase() + status.slice(1),
                          value: count,
                          color: status === 'completed' ? CHART_COLORS.success : 
                                 status === 'failed' ? CHART_COLORS.danger : 
                                 status === 'processing' ? CHART_COLORS.warning : CHART_COLORS.primary
                        }))}
                        title="Analysis Status"
                        subtitle="Contract analysis completion status"
                        height={350}
                        donut={true}
                        showLegend={true}
                      />
                    </DraggableSection>
                  );
                
                case 'vendor-categories-chart':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <PremiumBarChart
                        data={getVendorCategoryData()}
                        title="Vendor Categories"
                        subtitle="Distribution of vendors by category"
                        height={350}
                        distributed={true}
                        showValues={false}
                        showTrend={false}
                      />
                    </DraggableSection>
                  );
                
                case 'top-vendors-chart':
                  return (
                    <DraggableSection key={sectionId} id={sectionId} onRemove={handleRemoveSection}>
                      <PremiumBarChart
                        data={(vendors && Array.isArray(vendors)) ? vendors
                          .sort((a, b) => (b.contractCount || 0) - (a.contractCount || 0))
                          .slice(0, 5)
                          .map(vendor => ({
                            name: vendor.name.length > 15 ? vendor.name.substring(0, 15) + '...' : vendor.name,
                            value: vendor.contractCount || 0
                          })) : []
                        }
                        title="Top Vendors by Contract Count"
                        subtitle="Top 5 vendors ranked by active contracts"
                        height={350}
                        orientation="horizontal"
                        showValues={true}
                        showTrend={false}
                      />
                    </DraggableSection>
                  );
                
                default:
                  return null;
              }
            })}
          </SortableContext>
        </DndContext>

      </div>
    </div>
  );
};

const DashboardContent = React.memo(DashboardContentComponent, (prevProps, nextProps) => {
  // Only re-render if enterpriseId changes
  return prevProps.enterpriseId === nextProps.enterpriseId;
});

export default DashboardContent;
