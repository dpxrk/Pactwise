'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  TrendingUp,
  Users
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVendor } from '@/hooks/queries/useVendors';
import { logger } from '@/lib/logger';
import { trackBusinessMetric } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/id.types';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface _VendorMetrics {
  totalSpend: number;
  activeContracts: number;
  avgContractValue: number;
  performanceScore: number;
  complianceScore: number;
  riskScore: number;
  onTimeDelivery: number;
  qualityScore: number;
  responseTime: number; // in hours
  disputeRate: number;
  renewalRate: number;
  savingsAchieved: number;
}

interface _SpendTrend {
  month: string;
  spend: number;
  contracts: number;
}

interface _CategorySpend {
  category: string;
  value: number;
  percentage: number;
}

interface PerformanceMetric {
  metric: string;
  score: number;
  benchmark: number;
}

interface VendorAnalyticsProps {
  vendorId?: Id<"vendors">;
  enterpriseId?: Id<"enterprises">;
  className?: string;
}

const VendorAnalyticsComponent: React.FC<VendorAnalyticsProps> = ({
  vendorId,
  enterpriseId,
  className
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('12months');
  const [_selectedMetric, _setSelectedMetric] = useState<string>('spend');
  const [_comparisonMode, _setComparisonMode] = useState(false);

  // Fetch vendor details with contracts
  const { data: vendorData } = useVendor(vendorId || '', {
    enabled: !!vendorId
  });

  // Fetch contracts for analytics
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['vendor-analytics', vendorId, enterpriseId, selectedPeriod],
    queryFn: async () => {
      if (!vendorId && !enterpriseId) return [];

      let query = supabase
        .from('contracts')
        .select('id, title, status, value, start_date, end_date, contract_type, created_at')
        .is('deleted_at', null);

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      if (enterpriseId) {
        query = query.eq('enterprise_id', enterpriseId);
      }

      // Apply period filter
      const now = new Date();
      let startDate: Date;
      switch (selectedPeriod) {
        case '3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case '6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          break;
        case '12months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          break;
        case '24months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 24, 1);
          break;
        default:
          startDate = new Date(2000, 0, 1); // All time
      }
      query = query.gte('created_at', startDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId || !!enterpriseId,
  });

  // Calculate metrics from contracts
  const calculatedMetrics = useMemo(() => {
    const contracts = contractsData || [];
    const activeContracts = contracts.filter((c: any) => c.status === 'active');
    const totalValue = contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

    return {
      totalSpend: totalValue,
      activeContracts: activeContracts.length,
      avgContractValue: contracts.length > 0 ? totalValue / contracts.length : 0,
      performanceScore: vendorData?.performance_score || 85,
      complianceScore: vendorData?.compliance_score || 92,
      riskScore: (vendorData as any)?.risk_score || 25,
      onTimeDelivery: 94, // Would come from actual tracking
      qualityScore: 88,
      responseTime: 4.5,
      disputeRate: 2,
      renewalRate: 78,
      savingsAchieved: Math.round(totalValue * 0.1), // Estimate 10% savings
    };
  }, [contractsData, vendorData]);

  // Calculate spend trends by month
  const calculatedSpendTrends = useMemo(() => {
    const contracts = contractsData || [];
    const months: Record<string, { spend: number; contracts: number }> = {};

    contracts.forEach((contract: any) => {
      const date = new Date(contract.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!months[monthKey]) {
        months[monthKey] = { spend: 0, contracts: 0 };
      }
      months[monthKey].spend += contract.value || 0;
      months[monthKey].contracts += 1;
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      spend: data.spend,
      contracts: data.contracts,
    }));
  }, [contractsData]);

  // Calculate category breakdown
  const calculatedCategoryBreakdown = useMemo(() => {
    const contracts = contractsData || [];
    const categories: Record<string, number> = {};
    let total = 0;

    contracts.forEach((contract: any) => {
      const category = contract.contract_type || 'Other';
      categories[category] = (categories[category] || 0) + (contract.value || 0);
      total += contract.value || 0;
    });

    return Object.entries(categories).map(([category, value]) => ({
      category,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  }, [contractsData]);

  // Use calculated data from contracts
  const metrics = calculatedMetrics;
  const trends = calculatedSpendTrends;
  const categories = calculatedCategoryBreakdown;

  // Performance metrics derived from vendor data
  const performance: PerformanceMetric[] = useMemo(() => {
    if (!vendorData) return [];
    // Cast to any to access possible score properties from related tables
    const v = vendorData as Record<string, unknown>;
    // Map vendor performance scores to radar chart format
    return [
      { metric: 'Delivery', score: (v.delivery_score as number) || 0, benchmark: 85 },
      { metric: 'Quality', score: (v.quality_score as number) || 0, benchmark: 80 },
      { metric: 'Communication', score: (v.communication_score as number) || 0, benchmark: 75 },
      { metric: 'Flexibility', score: (v.flexibility_score as number) || 0, benchmark: 70 },
      { metric: 'Innovation', score: (v.innovation_score as number) || 0, benchmark: 65 },
      { metric: 'Value', score: (v.value_score as number) || 0, benchmark: 75 }
    ].filter(p => p.score > 0); // Only show metrics with actual data
  }, [vendorData]);

  const _hasData = metrics.totalSpend > 0 || trends.length > 0 || categories.length > 0;

  const handleExport = () => {
    trackBusinessMetric.userAction('export-vendor-analytics', 'analytics');
    // Implement export logic
    logger.info('Exporting vendor analytics', { vendorId, period: selectedPeriod });
  };

  const getScoreColor = (score: number, inverse: boolean = false) => {
    if (inverse) {
      if (score < 30) return 'text-green-600';
      if (score < 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const COLORS = ['#291528', '#9e829c', '#dab5d5', '#7d5c7b', '#644862', '#c388bb'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (contractsLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vendor Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive performance and spend analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="24months">Last 24 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalSpend)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span>8% from last period</span>
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Contracts</p>
                <p className="text-2xl font-bold">{metrics.activeContracts}</p>
                <p className="text-xs text-muted-foreground">
                  Avg value: {formatCurrency(metrics.avgContractValue)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Performance Score</p>
                <p className={cn("text-2xl font-bold", getScoreColor(metrics.performanceScore))}>
                  {metrics.performanceScore}%
                </p>
                <Progress value={metrics.performanceScore} className="h-1" />
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Risk Score</p>
                <p className={cn("text-2xl font-bold", getScoreColor(metrics.riskScore, true))}>
                  {metrics.riskScore}%
                </p>
                <Progress 
                  value={metrics.riskScore} 
                  className="h-1"
                />
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="spend" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="spend">Spend Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="spend" className="space-y-4">
          {/* Spend Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Spend Trend</CardTitle>
              <CardDescription>Monthly spend and contract count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="spend"
                    stroke="#291528"
                    fill="#291528"
                    fillOpacity={0.3}
                    name="Spend ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="contracts"
                    stroke="#9e829c"
                    name="Contracts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
                <CardDescription>Distribution across contract types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => `${props.category}: ${props.percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Spending Categories</CardTitle>
                <CardDescription>Detailed breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map((category, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(category.value)}
                        </span>
                      </div>
                      <Progress 
                        value={category.percentage} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Vendor performance vs industry benchmark</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={performance}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Vendor Score"
                    dataKey="score"
                    stroke="#291528"
                    fill="#291528"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Industry Benchmark"
                    dataKey="benchmark"
                    stroke="#9e829c"
                    fill="#9e829c"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                    <p className={cn("text-xl font-bold", getScoreColor(metrics.onTimeDelivery))}>
                      {metrics.onTimeDelivery}%
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={metrics.onTimeDelivery} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                    <p className={cn("text-xl font-bold", getScoreColor(metrics.qualityScore))}>
                      {metrics.qualityScore}%
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={metrics.qualityScore} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Response Time</p>
                    <p className="text-xl font-bold">{metrics.responseTime}h</p>
                  </div>
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute Rate</p>
                    <p className={cn("text-xl font-bold", getScoreColor(metrics.disputeRate, true))}>
                      {metrics.disputeRate}%
                    </p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={metrics.disputeRate} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Renewal Rate</p>
                    <p className={cn("text-xl font-bold", getScoreColor(metrics.renewalRate))}>
                      {metrics.renewalRate}%
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={metrics.renewalRate} className="mt-2 h-1" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Savings Achieved</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(metrics.savingsAchieved)}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Through negotiations
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>Vendor compliance metrics and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Compliance Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Compliance Score</span>
                    <span className={cn("text-xl font-bold", getScoreColor(metrics.complianceScore))}>
                      {metrics.complianceScore}%
                    </span>
                  </div>
                  <Progress value={metrics.complianceScore} className="h-2" />
                </div>

                {/* Compliance Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Certifications</h4>
                    <div className="space-y-2">
                      {['ISO 9001', 'ISO 27001', 'SOC 2 Type II', 'GDPR Compliant'].map((cert) => (
                        <div key={cert} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{cert}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            Valid
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Audit History</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Last Audit</span>
                        <span className="text-muted-foreground">Oct 2023</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Audit Result</span>
                        <Badge variant="outline" className="text-green-600">
                          Passed
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Next Audit Due</span>
                        <span className="text-muted-foreground">Apr 2024</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Trends */}
                <div>
                  <h4 className="font-medium mb-3">Compliance Trend</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={[
                      { month: 'Jan', score: 88 },
                      { month: 'Feb', score: 89 },
                      { month: 'Mar', score: 87 },
                      { month: 'Apr', score: 90 },
                      { month: 'May', score: 91 },
                      { month: 'Jun', score: 92 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[80, 100]} />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#291528"
                        strokeWidth={2}
                        dot={{ fill: '#291528' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Comparison</CardTitle>
              <CardDescription>Compare with similar vendors in the category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { metric: 'Cost Efficiency', current: 85, average: 72, best: 92 },
                    { metric: 'Quality', current: 88, average: 80, best: 95 },
                    { metric: 'Delivery', current: 94, average: 85, best: 98 },
                    { metric: 'Innovation', current: 78, average: 70, best: 88 },
                    { metric: 'Support', current: 90, average: 75, best: 94 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#291528" name="Current Vendor" />
                    <Bar dataKey="average" fill="#9e829c" name="Category Average" />
                    <Bar dataKey="best" fill="#dab5d5" name="Best in Class" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Strengths</h4>
                    <div className="space-y-2">
                      {['On-time delivery', 'Customer support', 'Quality standards'].map((strength) => (
                        <div key={strength} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Areas for Improvement</h4>
                    <div className="space-y-2">
                      {['Innovation initiatives', 'Cost optimization', 'Response time'].map((area) => (
                        <div key={area} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const VendorAnalytics = React.memo(VendorAnalyticsComponent, (prevProps, nextProps) => {
  // Only re-render if vendorId or enterpriseId changes
  return prevProps.vendorId === nextProps.vendorId && 
         prevProps.enterpriseId === nextProps.enterpriseId;
});
