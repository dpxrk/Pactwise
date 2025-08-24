'use client';

import React, { useState, useEffect, useMemo } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../convex/_generated/api";
// import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Building,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  Shield,
  PiggyBank,
} from "lucide-react";
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
// import { MetricId } from "../../../../convex/dashboardPreferences";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/premium";
import { useStaggerReveal } from "@/hooks/usePremiumEffects";

// Mock types - replace with actual imports
type Id<T extends string> = string & { __tableName: T };
type MetricId = string;

interface Stats {
  totalValue: number;
  active: number;
  avgValue: number;
  expiringSoon: number;
  byStatus: Record<string, number>;
  total: number;
}

interface Contract {
  _id: Id<"contracts">;
  title: string;
  status: string;
}

interface Vendor {
  _id: Id<"vendors">;
  name: string;
}

interface SpendAnalysis {
  totalSpend: number;
  topVendors: { vendorId: Id<"vendors">; name: string; amount: number }[];
}

interface RiskAlert {
  title: string;
  severity: 'high' | 'medium' | 'low';
}

interface RiskAlerts {
  alerts: RiskAlert[];
}

interface DashboardData {
  stats: Stats;
  contracts: Contract[];
  vendors: Vendor[];
  spendAnalysis: SpendAnalysis;
  riskAlerts: RiskAlerts;
}

interface OptimizedDashboardContentProps {
  enterpriseId: Id<"enterprises">;
}

/**
 * Optimized Dashboard Content with batched queries
 * Uses a single query to fetch all dashboard data
 */
export const OptimizedDashboardContent: React.FC<OptimizedDashboardContentProps> = ({ 
  enterpriseId 
}) => {
  // Fetch all dashboard data in a single batched query
  // TODO: Implement dashboard data fetching with Supabase
  const dashboardData: DashboardData | undefined = undefined;
  // const dashboardData = useDashboardData({ enterpriseId });
  
  // User preferences
//   const userPreferences = useQuery(api.dashboardPreferences.getUserPreferences);
//   const savePreferences = useMutation(api.dashboardPreferences.saveUserPreferences);
  
  // State for metric order and enabled metrics
  const [enabledMetrics, setEnabledMetrics] = useState<MetricId[]>([]);
  const [metricOrder, setMetricOrder] = useState<MetricId[]>([]);
  const { items: revealedItems } = useStaggerReveal(metricOrder.length);

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setEnabledMetrics(userPreferences.enabledMetrics);
      setMetricOrder(userPreferences.metricOrder);
    }
  }, [userPreferences]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoized metrics calculations
  const metrics = useMemo(() => {
    if (!dashboardData) return null;
    
    const { stats, vendors, spendAnalysis, riskAlerts } = dashboardData;
    
    return {
      totalContractValue: {
        id: "totalContractValue" as MetricId,
        title: "Total Contract Value",
        value: formatCurrency(stats.totalValue),
        icon: DollarSign,
        trend: 12.5,
        changeType: "positive" as const,
        description: "Total value across all contracts"
      },
      activeContracts: {
        id: "activeContracts" as MetricId,
        title: "Active Contracts",
        value: stats.active,
        icon: FileText,
        trend: 5.2,
        changeType: "positive" as const,
        description: "Currently active contracts"
      },
      activeVendors: {
        id: "activeVendors" as MetricId,
        title: "Active Vendors",
        value: vendors.length,
        icon: Building,
        trend: 3.1,
        changeType: "positive" as const,
        description: "Vendors with active relationships"
      },
      avgContractValue: {
        id: "avgContractValue" as MetricId,
        title: "Avg Contract Value",
        value: formatCurrency(stats.avgValue),
        icon: TrendingUp,
        trend: 8.3,
        changeType: "positive" as const,
        description: "Average value per contract"
      },
      expiringContracts: {
        id: "expiringContracts" as MetricId,
        title: "Expiring Soon",
        value: stats.expiringSoon,
        icon: Calendar,
        trend: stats.expiringSoon > 5 ? -15 : 0,
        changeType: stats.expiringSoon > 5 ? "negative" : "neutral" as const,
        description: "Contracts expiring within 30 days"
      },
      complianceScore: {
        id: "complianceScore" as MetricId,
        title: "Compliance Score",
        value: `${calculateComplianceScore(stats)}%`,
        icon: Shield,
        trend: 2.1,
        changeType: "positive" as const,
        description: "Overall compliance rating"
      },
      riskScore: {
        id: "riskScore" as MetricId,
        title: "Risk Alerts",
        value: riskAlerts.alerts.length,
        icon: AlertCircle,
        trend: riskAlerts.alerts.length > 10 ? -25 : 5,
        changeType: riskAlerts.alerts.length > 10 ? "negative" : "neutral" as const,
        description: "Active risk alerts requiring attention"
      },
      totalSavings: {
        id: "totalSavings" as MetricId,
        title: "Total Savings",
        value: formatCurrency(spendAnalysis.totalSpend * 0.15), // Estimated 15% savings
        icon: PiggyBank,
        trend: 18.7,
        changeType: "positive" as const,
        description: "Identified cost savings opportunities"
      }
    };
  }, [dashboardData]);

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
    
    await savePreferences({
      enabledMetrics: newEnabledMetrics,
      metricOrder: metricOrder,
    });
    
    toast.success("Card removed from dashboard");
  };

  // Loading state
  if (!dashboardData || !metrics) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const orderedMetrics = metricOrder
    .filter(id => enabledMetrics.includes(id))
    .map(id => metrics[id as keyof typeof metrics])
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={metricOrder}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {orderedMetrics.map((metric, index) => (
              <DraggableMetricCard
                key={metric.id}
                id={metric.id}
                metric={metric}
                onRemove={handleRemoveMetric}
                isRevealed={revealedItems.includes(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <ContractStatusChart data={dashboardData.stats} />
            <SpendAnalysisChart data={dashboardData.spendAnalysis} />
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <RecentContractsList contracts={dashboardData.contracts} />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <TopVendorsList vendors={dashboardData.spendAnalysis.topVendors} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskAlertsList alerts={dashboardData.riskAlerts.alerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateComplianceScore(stats: Stats): number {
  const total = stats.total || 1;
  const expired = stats.byStatus?.expired || 0;
  const score = Math.max(0, 100 - (expired / total) * 200);
  return Math.round(score);
}

// Chart components (simplified for brevity)
const ContractStatusChart: React.FC<{ data: Stats }> = ({ data }) => (
  <Card>
    <CardHeader>
      <CardTitle>Contract Status Distribution</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Chart implementation */}
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Chart: {JSON.stringify(data.byStatus)}
      </div>
    </CardContent>
  </Card>
);

const SpendAnalysisChart: React.FC<{ data: SpendAnalysis }> = ({ data }) => (
  <Card>
    <CardHeader>
      <CardTitle>Spend by Category</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Total Spend: {formatCurrency(data.totalSpend)}
      </div>
    </CardContent>
  </Card>
);

const RecentContractsList: React.FC<{ contracts: Contract[] }> = ({ contracts }) => (
  <Card>
    <CardHeader>
      <CardTitle>Recent Contracts</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {contracts.slice(0, 5).map((contract) => (
          <div key={contract._id} className="flex justify-between items-center">
            <span className="font-medium">{contract.title}</span>
            <span className="text-sm text-muted-foreground">{contract.status}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const TopVendorsList: React.FC<{ vendors: { vendorId: Id<"vendors">; name: string; amount: number }[] }> = ({ vendors }) => (
  <Card>
    <CardHeader>
      <CardTitle>Top Vendors by Spend</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {vendors.map((vendor) => (
          <div key={vendor.vendorId} className="flex justify-between items-center">
            <span className="font-medium">{vendor.name}</span>
            <span className="text-sm">{formatCurrency(vendor.amount)}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const RiskAlertsList: React.FC<{ alerts: RiskAlert[] }> = ({ alerts }) => (
  <Card>
    <CardHeader>
      <CardTitle>Risk Alerts</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert, index) => (
          <div key={index} className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${
              alert.severity === 'high' ? 'text-red-500' :
              alert.severity === 'medium' ? 'text-yellow-500' :
              'text-blue-500'
            }`} />
            <span className="text-sm">{alert.title}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Mock implementations for useQuery and useMutation
const useQuery: <T extends (...args: any) => any>(query: T, args?: Parameters<T>[0]) => ReturnType<T> | undefined = (query, args) => {
  return undefined;
};

const useMutation: <T extends (...args: any) => any>(query: T) => T = (query) => {
  return query;
};

// Mock API object
const api = {
  dashboard: {
    batchedQueries: {
      getAllDashboardData: (args: { enterpriseId: Id<"enterprises"> }) => ({} as DashboardData),
    },
  },
  dashboardPreferences: {
    getUserPreferences: () => ({ enabledMetrics: [], metricOrder: [] }),
    saveUserPreferences: (args: { enabledMetrics: MetricId[], metricOrder: MetricId[] }) => (Promise.resolve()),
  },
};

export default OptimizedDashboardContent;
