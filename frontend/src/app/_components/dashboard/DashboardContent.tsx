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

import DynamicChart from "@/app/_components/common/DynamicCharts";
import { MetricCard } from "@/app/_components/common/MetricCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceTracking, useComponentPerformance } from '@/hooks/usePerformanceTracking';
import type { Id } from '@/types/id.types';

import { DashboardCustomizationMenu } from "./DashboardCustomizationMenu";
import { DraggableChartCard } from "./DraggableChartCard";
import { DraggableMetricCard } from "./DraggableMetricCard";

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
  
  // Default metrics to show
  const defaultMetrics: MetricId[] = [
    "total-contracts",
    "active-contracts",
    "expiring-soon",
    "total-value",
    "compliance-score",
    "vendors",
    "risk-score",
    "savings-opportunities",
    "pending-approvals",
    "recent-activity",
    "contract-status-chart",
    "risk-distribution-chart"
  ];

  // State for metric order and enabled metrics
  const [enabledMetrics, setEnabledMetrics] = useState<MetricId[]>(defaultMetrics);
  const [metricOrder, setMetricOrder] = useState<MetricId[]>(defaultMetrics);

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setEnabledMetrics(userPreferences.enabledMetrics);
      setMetricOrder(userPreferences.metricOrder);
    } else {
      // Use defaults if no preferences
      setEnabledMetrics(defaultMetrics);
      setMetricOrder(defaultMetrics);
    }
  }, [userPreferences]);

  // State for fetched data with sample fallback
  const [contractStats, setContractStats] = useState({
    total: 12,
    byStatus: {
      active: 5,
      draft: 2,
      pending_analysis: 3,
      expired: 1,
      terminated: 0,
      archived: 1
    },
    byType: {
      'Service Agreement': 4,
      'NDA': 3,
      'Purchase Order': 2,
      'License Agreement': 2,
      'Other': 1
    },
    byAnalysisStatus: {
      'Analyzed': 7,
      'Pending': 3,
      'Failed': 0,
      'Not Required': 2
    },
    recentlyCreated: 3
  });
  
  const [contractsData, setContractsData] = useState({
    contracts: []
  });
  const contracts = contractsData?.contracts;
  
  const [vendorsData, setVendorsData] = useState({
    vendors: [
      { id: 1, name: 'Acme Corp', category: 'Technology', contractCount: 3, status: 'Active' },
      { id: 2, name: 'Global Services Inc', category: 'Consulting', contractCount: 2, status: 'Active' },
      { id: 3, name: 'Supply Chain Co', category: 'Logistics', contractCount: 1, status: 'Active' },
      { id: 4, name: 'Marketing Pro', category: 'Marketing', contractCount: 2, status: 'Active' },
      { id: 5, name: 'Legal Associates', category: 'Legal', contractCount: 4, status: 'Active' }
    ]
  });
  const vendors = vendorsData?.vendors;
  
  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient()
      
      try {
        // Fetch contracts
        const { data: contractsResponse, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('enterprise_id', enterpriseId);
        
        if (contractsError) {
          console.error('Error fetching contracts:', contractsError);
        } else if (contractsResponse) {
          // Calculate contract stats
          const byType: Record<string, number> = {};
          const byAnalysisStatus: Record<string, number> = {};
          
          contractsResponse.forEach(contract => {
            // Count by type
            const type = contract.contract_type || 'Other';
            byType[type] = (byType[type] || 0) + 1;
            
            // Count by analysis status
            const analysisStatus = contract.analysis_status || 'pending';
            byAnalysisStatus[analysisStatus] = (byAnalysisStatus[analysisStatus] || 0) + 1;
          });
          
          const stats = {
            total: contractsResponse.length,
            byStatus: {
              active: contractsResponse.filter(c => c.status === 'active').length,
              draft: contractsResponse.filter(c => c.status === 'draft').length,
              pending_analysis: contractsResponse.filter(c => c.status === 'pending_analysis').length,
              expired: contractsResponse.filter(c => c.status === 'expired').length,
              terminated: contractsResponse.filter(c => c.status === 'terminated').length,
              archived: contractsResponse.filter(c => c.status === 'archived').length
            },
            byType,
            byAnalysisStatus,
            recentlyCreated: contractsResponse.filter(c => {
              const createdDate = new Date(c.created_at);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return createdDate > weekAgo;
            }).length
          };
          
          setContractStats(stats);
          setContractsData({ contracts: contractsResponse });
        }
        
        // Fetch vendors
        const { data: vendorsResponse, error: vendorsError } = await supabase
          .from('vendors')
          .select('*')
          .eq('enterprise_id', enterpriseId);
        
        if (vendorsError) {
          console.error('Error fetching vendors:', vendorsError);
        } else if (vendorsResponse) {
          // Process vendor data
          // For now, we'll calculate contract counts separately if needed
          const vendorsWithCounts = vendorsResponse.map(vendor => ({
            ...vendor,
            contractCount: 0, // This would need a separate query to count contracts per vendor
            status: vendor.status || 'Active'
          }));
          
          setVendorsData({ vendors: vendorsWithCounts });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };
    
    if (enterpriseId) {
      fetchDashboardData();
    }
  }, [enterpriseId]);
  
  // Agent system data
  const agentSystemStatus = {
    system: { isRunning: false },
    stats: {
      activeAgents: 0,
      recentInsights: 0,
      activeTasks: 0
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
      setMetricOrder((items) => {
        const oldIndex = items.indexOf(active.id as MetricId);
        const newIndex = items.indexOf(over?.id as MetricId);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to database asynchronously
        savePreferences({
          enabledMetrics,
          metricOrder: newOrder,
        });
        
        return newOrder;
      });
    }
  };

  // Handle removing a metric
  const handleRemoveMetric = async (metricId: MetricId) => {
    const newEnabledMetrics = enabledMetrics.filter(id => id !== metricId);
    setEnabledMetrics(newEnabledMetrics);
    
    // Save to database
    await savePreferences({
      enabledMetrics: newEnabledMetrics,
      metricOrder: metricOrder,
    });
    
    toast.success("Card removed from dashboard");
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


  // Calculate metrics from actual data
  const calculateTotalContractValue = () => {
    if (!contracts || !Array.isArray(contracts)) return 0;
    return contracts.reduce((total, contract) => {
      const value = parseFloat(contract.extractedPricing?.replace(/[^0-9.-]/g, '') || '0');
      return total + (isNaN(value) ? 0 : value);
    }, 0);
  };

  const calculateActiveContracts = () => {
    return contractStats?.byStatus?.active || 0;
  };

  const calculateExpiringContracts = () => {
    if (!contracts || !Array.isArray(contracts)) return 0;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return contracts.filter(contract => {
      if (!contract.extractedEndDate) return false;
      const endDate = new Date(contract.extractedEndDate);
      return endDate <= thirtyDaysFromNow && endDate > new Date();
    }).length;
  };

  const calculateComplianceScore = () => {
    // Calculate compliance score based on completed checks
    if (!contracts || !Array.isArray(contracts)) return 100;
    const activeContracts = contracts.filter(c => c.status === 'active');
    if (activeContracts.length === 0) return 100;
    
    // Simple scoring: 100 - (expired contracts percentage * 2)
    const expiredCount = contracts.filter(c => c.status === 'expired').length;
    const score = Math.max(0, 100 - (expiredCount / contracts.length) * 200);
    return Math.round(score);
  };

  const calculateRiskScore = () => {
    // Calculate risk based on high-value contracts without proper analysis
    if (!contracts || !Array.isArray(contracts)) return 0;
    
    let riskScore = 0;
    contracts.forEach(contract => {
      const value = parseFloat(contract.extractedPricing?.replace(/[^0-9.-]/g, '') || '0');
      if (value > 100000 && contract.analysisStatus !== 'completed') {
        riskScore += 20;
      }
      if (contract.status === 'expired') {
        riskScore += 10;
      }
    });
    
    return Math.min(100, riskScore);
  };

  const calculateSavingsOpportunities = () => {
    // Mock calculation - in real app would analyze contract spend patterns
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

  // Loading state
  const isLoading = contractStats === undefined || contractsData === undefined || vendorsData === undefined || userPreferences === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <div className="text-center">
          <div className="mb-4 p-3 inline-block">
            <div className="w-10 h-10 border-t-2 animate-spin rounded-full" style={{ borderColor: '#291528' }}></div>
          </div>
          <p style={{ color: '#9e829c' }}>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Calculate all metric values
  const totalContractValue = calculateTotalContractValue();
  const activeContracts = calculateActiveContracts();
  const expiringCount = calculateExpiringContracts();
  const totalVendors = (vendors && Array.isArray(vendors)) ? vendors.length : 0;
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
      trend: 8.2,
      changeType: "positive",
      description: "Currently active contracts"
    },
    "expiring-soon": {
      id: "expiring-soon",
      title: "Expiring Soon",
      value: expiringCount.toString(),
      icon: Calendar,
      trend: -5.7,
      changeType: expiringCount > 5 ? "negative" : "positive",
      description: "Contracts expiring in 30 days"
    },
    "total-value": {
      id: "total-value",
      title: "Total Contract Value",
      value: formatCurrency(totalContractValue),
      icon: DollarSign,
      trend: 12.5,
      changeType: "positive",
      description: "Total portfolio value"
    },
    "compliance-score": {
      id: "compliance-score",
      title: "Compliance Score",
      value: `${complianceScore}%`,
      icon: Shield,
      trend: complianceScore > 80 ? 5 : -5,
      changeType: complianceScore > 80 ? "positive" : "negative",
      description: "Overall compliance health"
    },
    "vendors": {
      id: "vendors",
      title: "Total Vendors",
      value: totalVendors.toString(),
      icon: Users,
      trend: 15.3,
      changeType: "positive",
      description: "Vendor relationships"
    },
    "risk-score": {
      id: "risk-score",
      title: "Risk Score",
      value: `${riskScore}%`,
      icon: AlertCircle,
      trend: riskScore > 50 ? -10 : 5,
      changeType: riskScore > 50 ? "negative" : "positive",
      description: "Portfolio risk assessment"
    },
    "savings-opportunities": {
      id: "savings-opportunities",
      title: "Savings Opportunities",
      value: formatCurrency(savingsOpportunities),
      icon: PiggyBank,
      trend: 22.4,
      changeType: "positive",
      description: "Potential cost savings"
    },
    "pending-approvals": {
      id: "pending-approvals",
      title: "Pending Approvals",
      value: pendingApprovals.toString(),
      icon: Clock,
      trend: pendingApprovals > 10 ? -15 : 0,
      changeType: pendingApprovals > 10 ? "negative" : "neutral",
      description: "Awaiting approval"
    },
    "recent-activity": {
      id: "recent-activity",
      title: "AI Insights",
      value: agentInsights.toString(),
      icon: Activity,
      trend: 25.4,
      changeType: "positive",
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
            <DynamicChart 
              type="pie" 
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
            <DynamicChart 
              type="pie" 
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
  const displayItems = metricOrder
    .filter(id => enabledMetrics.includes(id))
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
    <div className="w-full min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col space-y-4 px-4 py-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="overview">Executive Summary</TabsTrigger>
              <TabsTrigger value="contracts">Contract Analytics</TabsTrigger>
              <TabsTrigger value="vendors">Vendor Insights</TabsTrigger>
              <TabsTrigger value="agents">AI Agents</TabsTrigger>
            </TabsList>
            {/* Dashboard customization menu */}
            <DashboardCustomizationMenu
              enabledMetrics={enabledMetrics}
              onMetricsChange={(metrics) => {
                setEnabledMetrics(metrics);
                setMetricOrder(metrics);
              }}
            />
          </div>

          {/* Alert for expiring contracts */}
          {expiringCount > 0 && (
            <Alert className="mb-4 border-[#9e829c]/30 bg-[#9e829c]/10">
              <AlertCircle className="h-4 w-4 text-[#291528]" />
              <AlertTitle className="text-[#291528]">Attention Required</AlertTitle>
              <AlertDescription className="text-[#3a3e3b]">
                {expiringCount} {expiringCount === 1 ? 'contract expires' : 'contracts expire'} in the next 30 days.
                <Button variant="link" className="p-0 h-auto text-[#291528] font-medium hover:text-[#291528]/80 ml-1">
                  View Expiring Contracts
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Unified Draggable Dashboard Grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayItems.map(item => item.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {displayItems.map((item) => {
                    if (item.type === "metric") {
                      return (
                        <DraggableMetricCard
                          key={item.id}
                          id={item.id}
                          title={item.title}
                          value={item.value!}
                          change={item.trend}
                          trend={item.changeType === "positive" ? "up" : item.changeType === "negative" ? "down" : undefined}
                          icon={item.icon}
                          description={item.description}
                          changeType={item.changeType}
                          onRemove={handleRemoveMetric}
                        />
                      );
                    } else {
                      // Chart card takes up 2 columns
                      return (
                        <div key={item.id} className="lg:col-span-2">
                          <DraggableChartCard
                            id={item.id}
                            title={item.title}
                            onRemove={handleRemoveMetric}
                          >
                            {item.chartContent}
                          </DraggableChartCard>
                        </div>
                      );
                    }
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contractsTabMetrics.map((metric, index) => (
                <MetricCard 
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  description={metric.description}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white border border-[#291528]/10 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#291528]">Contract Types Distribution</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72 overflow-hidden">
                    <DynamicChart 
                      type="bar" 
                      data={getContractTypeData()} 
                      colors={[CHART_COLORS.primary]}
                      height={280} 
                      showGrid={true} 
                      showLegend={false} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#291528]/10 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#291528]">Analysis Status</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72 overflow-hidden">
                    <DynamicChart 
                      type="pie" 
                      data={Object.entries(contractStats?.byAnalysisStatus || {}).map(([status, count]) => ({
                        name: status.charAt(0).toUpperCase() + status.slice(1),
                        value: count,
                        color: status === 'completed' ? CHART_COLORS.success : 
                               status === 'failed' ? CHART_COLORS.danger : 
                               status === 'processing' ? CHART_COLORS.warning : CHART_COLORS.primary
                      }))} 
                      height={280} 
                      showLegend={true} 
                      pieConfig={{ 
                        innerRadius: 50, 
                        outerRadius: 100 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendorsTabMetrics.map((metric, index) => (
                <MetricCard 
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  description={metric.description}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white border border-[#291528]/10 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#291528]">Vendor Categories</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72 overflow-hidden">
                    <DynamicChart 
                      type="bar" 
                      data={getVendorCategoryData()} 
                      series={[{ dataKey: "value", name: "Vendors", fill: CHART_COLORS.secondary }]} 
                      xAxisKey="name" 
                      height={280} 
                      showGrid={true} 
                      showLegend={false} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-[#291528]/10 shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#291528]">Top Vendors by Contract Count</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-72 overflow-hidden">
                    <DynamicChart 
                      type="bar" 
                      data={(vendors && Array.isArray(vendors)) ? vendors
                        .sort((a, b) => (b.contractCount || 0) - (a.contractCount || 0))
                        .slice(0, 5)
                        .map(vendor => ({
                          name: vendor.name.length > 15 ? vendor.name.substring(0, 15) + '...' : vendor.name,
                          value: vendor.contractCount || 0
                        })) : []
                      } 
                      series={[{ dataKey: "value", name: "Contracts", fill: CHART_COLORS.tertiary }]} 
                      xAxisKey="name" 
                      height={280} 
                      showGrid={true} 
                      showLegend={false} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {agentsTabMetrics.map((metric, index) => (
                <MetricCard 
                  key={index}
                  title={metric.title}
                  value={metric.value}
                  icon={metric.icon}
                  description={metric.description}
                />
              ))}
            </div>

            {/* Recent AI Insights */}
            <Card className="bg-white border border-[#291528]/10 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#291528]">Recent AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {recentInsights && recentInsights.length > 0 ? (
                    recentInsights.slice(0, 5).map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          insight.priority === 'critical' ? 'bg-[#dc2626]' :
                          insight.priority === 'high' ? 'bg-[#291528]' :
                          insight.priority === 'medium' ? 'bg-[#9e829c]' : 'bg-[#3a3e3b]'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                            <span>{insight.agentName}</span>
                            <span>•</span>
                            <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No recent AI insights available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

const DashboardContent = React.memo(DashboardContentComponent, (prevProps, nextProps) => {
  // Only re-render if enterpriseId changes
  return prevProps.enterpriseId === nextProps.enterpriseId;
});

export default DashboardContent;
