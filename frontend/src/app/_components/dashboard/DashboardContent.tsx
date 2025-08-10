// src/app/_components/dashboard/DashboardContent.tsx
'use client';

import React, { useState, useEffect } from "react";
import { usePerformanceTracking, useComponentPerformance } from '@/hooks/usePerformanceTracking';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  DollarSign,
  TrendingUp,
  Building,
  Target,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  Shield,
  PiggyBank,
  Clock
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../convex/_generated/api";
// import { Id } from "../../../../convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableMetricCard } from "./DraggableMetricCard";
import { DraggableChartCard } from "./DraggableChartCard";
import { DashboardCustomizationMenu } from "./DashboardCustomizationMenu";
// import { MetricId } from "../../../../convex/dashboardPreferences";
import DynamicChart from "@/app/_components/common/DynamicCharts";
import { MetricCard } from "@/app/_components/common/MetricCard";
import { toast } from "sonner";

// Define chart colors for consistency
const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  tertiary: "hsl(var(--chart-3))",
  quaternary: "hsl(var(--chart-4))",
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
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

  // Fetch user preferences
//   const userPreferences = useQuery(api.dashboardPreferences.getUserPreferences);
//   const savePreferences = useMutation(api.dashboardPreferences.saveUserPreferences);
  
  // State for metric order and enabled metrics
  const [enabledMetrics, setEnabledMetrics] = useState<MetricId[]>([]);
  const [metricOrder, setMetricOrder] = useState<MetricId[]>([]);

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setEnabledMetrics(userPreferences.enabledMetrics);
      setMetricOrder(userPreferences.metricOrder);
    }
  }, [userPreferences]);

  // Fetch data from Convex backend
  // const contractStats = useQuery(api.contracts.getContractStats, { enterpriseId });
  // const contractsData = useQuery(api.contracts.getContracts, { 
  //   enterpriseId,
  //   status: "all",
  //   contractType: "all"
  // });
  const contractsData = null;
  const contracts = contractsData?.contracts;
  // const vendorsData = useQuery(api.vendors.getVendors, { 
  //   enterpriseId,
  //   category: "all"
  // });
  const vendorsData = null;
  const vendors = vendorsData?.vendors;
  
  // Agent system data
//   const agentSystemStatus = useQuery(api.agents.manager.getAgentSystemStatus, {});
//   const recentInsights = useQuery(api.agents.manager.getRecentInsights, { limit: 10 });

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
      active: "#10b981",
      draft: "#60a5fa", 
      pending_analysis: "#f59e0b",
      expired: "#ef4444",
      terminated: "#8b5cf6",
      archived: "#6b7280"
    };

    return Object.entries(contractStats.byStatus).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
      value: count,
      color: statusColors[status] || "#6b7280"
    }));
  };

  const getContractTypeData = () => {
    if (!contractStats?.byType) return [];
    
    const typeColors: Record<string, string> = {
      nda: CHART_COLORS.primary,
      msa: CHART_COLORS.secondary,
      saas: CHART_COLORS.tertiary,
      sow: CHART_COLORS.quaternary,
      lease: "#8b5cf6",
      employment: "#06b6d4",
      partnership: "#84cc16",
      other: "#6b7280"
    };

    return Object.entries(contractStats.byType).map(([type, count]) => ({
      name: type.toUpperCase(),
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
      { name: "Low Risk", value: lowRisk, color: CHART_COLORS.success },
      { name: "Medium Risk", value: mediumRisk, color: CHART_COLORS.warning },
      { name: "High Risk", value: highRisk, color: CHART_COLORS.danger }
    ];
  };

  // Loading state
  const isLoading = contractStats === undefined || contractsData === undefined || vendorsData === undefined || userPreferences === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="mb-4 p-3 bg-primary/5 rounded-sm inline-block">
            <div className="w-10 h-10 border-t-2 border-primary animate-spin rounded-full"></div>
          </div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
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
        <div className="h-[300px] w-full">
          <DynamicChart 
            type="pie" 
            data={getStatusDistributionData()} 
            height={300} 
            showLegend={false} 
            colors={getStatusDistributionData().map(item => item.color)}
            pieConfig={{ 
              innerRadius: 60, 
              outerRadius: 100
            }}
          />
          <div className="flex justify-center mt-2 flex-wrap gap-2">
            {getStatusDistributionData().map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                <span className="text-xs">{item.name} ({item.value})</span>
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
        <div className="h-[300px] w-full">
          <DynamicChart 
            type="pie" 
            data={getRiskDistributionData()} 
            height={300} 
            showLegend={false} 
            colors={getRiskDistributionData().map(item => item.color)}
            pieConfig={{ 
              innerRadius: 60, 
              outerRadius: 100
            }}
          />
          <div className="flex justify-center mt-2 space-x-4">
            {getRiskDistributionData().map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
                <span className="text-xs">{item.name} ({item.value})</span>
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
    <div className="w-full min-h-screen bg-background">
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col space-y-4 px-4 py-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-background-light">
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
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Attention Required</AlertTitle>
              <AlertDescription className="text-amber-700">
                {expiringCount} {expiringCount === 1 ? 'contract expires' : 'contracts expire'} in the next 30 days.
                <Button variant="link" className="p-0 h-auto text-amber-800 font-medium hover:text-amber-900 ml-1">
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
              <Card>
                <CardHeader>
                  <CardTitle>Contract Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <DynamicChart 
                      type="bar" 
                      data={getContractTypeData()} 
                      colors={[CHART_COLORS.primary]}
                      height={320} 
                      showGrid={true} 
                      showLegend={false} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analysis Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <DynamicChart 
                      type="pie" 
                      data={Object.entries(contractStats?.byAnalysisStatus || {}).map(([status, count]) => ({
                        name: status.charAt(0).toUpperCase() + status.slice(1),
                        value: count,
                        color: status === 'completed' ? CHART_COLORS.success : 
                               status === 'failed' ? CHART_COLORS.danger : 
                               status === 'processing' ? CHART_COLORS.warning : CHART_COLORS.primary
                      }))} 
                      height={320} 
                      showLegend={true} 
                      pieConfig={{ 
                        innerRadius: 60, 
                        outerRadius: 120 
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
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <DynamicChart 
                      type="bar" 
                      data={getVendorCategoryData()} 
                      series={[{ dataKey: "value", name: "Vendors", fill: CHART_COLORS.secondary }]} 
                      xAxisKey="name" 
                      height={320} 
                      showGrid={true} 
                      showLegend={false} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Vendors by Contract Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
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
                      height={320} 
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
            <Card>
              <CardHeader>
                <CardTitle>Recent AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentInsights && recentInsights.length > 0 ? (
                    recentInsights.slice(0, 5).map((insight, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          insight.priority === 'critical' ? 'bg-red-500' :
                          insight.priority === 'high' ? 'bg-orange-500' :
                          insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
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