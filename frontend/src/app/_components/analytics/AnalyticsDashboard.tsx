'use client'

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import { DateRange } from "./DateRangePicker";
import DateRangePicker from "./DateRangePicker";
import dynamic from "next/dynamic";
import LoadingSpinner from "../common/LoadingSpinner";
import { ChartDataPoint, ChartSeries } from "./InteractiveChart";
import { KPIData } from "./AdvancedKPICard";

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
}

// Mock data generators
const generateMockKPIData = (): KPIData[] => [
  {
    id: "total-contracts",
    title: "Total Contract Value",
    value: 2450000,
    previousValue: 2100000,
    target: 3000000,
    format: "currency",
    trend: {
      direction: "up",
      percentage: 16.7,
      period: "vs last quarter",
    },
    status: "good",
    description: "Total value of all active contracts",
    lastUpdated: new Date().toISOString(),
    drillDownData: Array.from({ length: 25 }, (_, i) => ({
      id: `contract-${i}`,
      name: `Contract ${i + 1}`,
      value: Math.floor(Math.random() * 200000) + 50000,
      category: "contracts",
      status: ["active", "pending", "expired"][Math.floor(Math.random() * 3)],
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    })),
  },
  {
    id: "active-contracts",
    title: "Active Contracts",
    value: 156,
    previousValue: 142,
    target: 200,
    format: "number",
    trend: {
      direction: "up",
      percentage: 9.9,
      period: "vs last month",
    },
    status: "good",
    description: "Currently active contracts",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "compliance-score",
    title: "Compliance Score",
    value: 87.5,
    previousValue: 82.1,
    target: 95,
    format: "percentage",
    trend: {
      direction: "up",
      percentage: 6.6,
      period: "vs last quarter",
    },
    status: "warning",
    description: "Overall compliance across all contracts",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "vendor-count",
    title: "Active Vendors",
    value: 89,
    previousValue: 94,
    target: 100,
    format: "number",
    trend: {
      direction: "down",
      percentage: 5.3,
      period: "vs last month",
    },
    status: "neutral",
    description: "Number of active vendor relationships",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "renewal-rate",
    title: "Contract Renewal Rate",
    value: 92.3,
    previousValue: 88.7,
    target: 95,
    format: "percentage",
    trend: {
      direction: "up",
      percentage: 4.1,
      period: "vs last year",
    },
    status: "good",
    description: "Percentage of contracts successfully renewed",
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "risk-contracts",
    title: "High-Risk Contracts",
    value: 12,
    previousValue: 8,
    target: 5,
    format: "number",
    trend: {
      direction: "up",
      percentage: 50,
      period: "vs last month",
    },
    status: "critical",
    description: "Contracts requiring immediate attention",
    lastUpdated: new Date().toISOString(),
  },
];

const generateMockChartData = (type: string): ChartDataPoint[] => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  switch (type) {
    case "contract-value":
      return months.map(month => ({
        name: month,
        value: Math.floor(Math.random() * 500000) + 200000,
        new_contracts: Math.floor(Math.random() * 100000) + 50000,
        renewals: Math.floor(Math.random() * 300000) + 100000,
        category: "financial",
      }));
    
    case "vendor-performance":
      return [
        { name: "Technology", value: 89, category: "vendor" },
        { name: "Consulting", value: 76, category: "vendor" },
        { name: "Manufacturing", value: 92, category: "vendor" },
        { name: "Services", value: 85, category: "vendor" },
        { name: "Legal", value: 94, category: "vendor" },
        { name: "Marketing", value: 81, category: "vendor" },
      ];
    
    case "risk-distribution":
      return [
        { name: "Low Risk", value: 134, category: "risk" },
        { name: "Medium Risk", value: 45, category: "risk" },
        { name: "High Risk", value: 12, category: "risk" },
        { name: "Critical", value: 3, category: "risk" },
      ];
    
    default:
      return [];
  }
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className,
}) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [selectedKPI, setSelectedKPI] = useState<string>("overview");
  const [drillDownData, setDrillDownData] = useState<unknown>(null);
  const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock data
  const kpiData = useMemo(() => generateMockKPIData(), []);
  const contractValueData = useMemo(() => generateMockChartData("contract-value"), []);
  const vendorPerformanceData = useMemo(() => generateMockChartData("vendor-performance"), []);
  const riskDistributionData = useMemo(() => generateMockChartData("risk-distribution"), []);

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
        data: kpi.drillDownData,
      });
      setIsDrillDownOpen(true);
    }
  };

  const handleChartDrillDown = (category: string, value: unknown) => {
    // Generate mock drill-down data based on category
    const mockData = Array.from({ length: 20 }, (_, i) => ({
      id: `${category}-${i}`,
      name: `${category} Item ${i + 1}`,
      value: Math.floor(Math.random() * 100000) + 10000,
      category,
      status: ["active", "pending", "expired"][Math.floor(Math.random() * 3)],
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      trend: (Math.random() - 0.5) * 20,
    }));

    setDrillDownData({
      title: "Detailed Analysis",
      category,
      data: mockData,
    });
    setIsDrillDownOpen(true);
  };

  const handleRefresh = async (kpiId?: string) => {
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
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your contract and vendor performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={true}
            />
            
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" onClick={() => handleRefresh()}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.critical > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Issues Detected</AlertTitle>
            <AlertDescription>
              {alerts.critical} critical and {alerts.warning} warning indicators require immediate attention.
            </AlertDescription>
          </Alert>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Revenue Impact</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$2.4M</div>
                    <p className="text-sm text-muted-foreground">Total contract value</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Growth Rate</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+16.7%</div>
                    <p className="text-sm text-muted-foreground">Quarter over quarter</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Pipeline Value</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$850K</div>
                    <p className="text-sm text-muted-foreground">Pending contracts</p>
                  </CardContent>
                </Card>
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
              
              <Card>
                <CardHeader>
                  <CardTitle>Risk Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Critical Risks</span>
                      <Badge variant="destructive">3</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>High Risks</span>
                      <Badge variant="secondary">12</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Medium Risks</span>
                      <Badge variant="outline">45</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Low Risks</span>
                      <Badge variant="outline">134</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
          onNavigateToDetail={(id) => {
            console.log("Navigate to detail:", id);
            // Handle navigation to detailed view
          }}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;