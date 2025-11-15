// @ts-nocheck
'use client';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

import { logger } from '@/lib/logger';
import { trackBusinessMetric } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/id.types';

interface VendorMetrics {
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

interface SpendTrend {
  month: string;
  spend: number;
  contracts: number;
}

interface CategorySpend {
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
  const [selectedMetric, setSelectedMetric] = useState<string>('spend');
  const [comparisonMode, setComparisonMode] = useState(false);

  // const vendorMetrics = useQuery(api.vendors.getAnalytics, {
  //   vendorId,
  //   enterpriseId,
  //   period: selectedPeriod
  // });

  // const spendTrends = useQuery(api.vendors.getSpendTrends, {
  //   vendorId,
  //   enterpriseId,
  //   period: selectedPeriod
  // });

  // const categoryBreakdown = useQuery(api.vendors.getCategoryBreakdown, {
  //   vendorId,
  //   enterpriseId
  // });

  // const performanceComparison = useQuery(api.vendors.getPerformanceComparison, {
  //   vendorId,
  //   enterpriseId
  // });
  
  const vendorMetrics = null; // TODO: Replace with actual data fetching
  const spendTrends = null; // TODO: Replace with actual data fetching  
  const categoryBreakdown = null; // TODO: Replace with actual data fetching
  const performanceComparison = null; // TODO: Replace with actual data fetching

  // Mock data for demonstration
  const mockMetrics: VendorMetrics = {
    totalSpend: 1250000,
    activeContracts: 12,
    avgContractValue: 104166,
    performanceScore: 85,
    complianceScore: 92,
    riskScore: 25,
    onTimeDelivery: 94,
    qualityScore: 88,
    responseTime: 4.5,
    disputeRate: 2,
    renewalRate: 78,
    savingsAchieved: 125000
  };

  const mockSpendTrends: SpendTrend[] = [
    { month: 'Jan', spend: 95000, contracts: 10 },
    { month: 'Feb', spend: 102000, contracts: 11 },
    { month: 'Mar', spend: 98000, contracts: 10 },
    { month: 'Apr', spend: 110000, contracts: 12 },
    { month: 'May', spend: 105000, contracts: 12 },
    { month: 'Jun', spend: 115000, contracts: 13 },
    { month: 'Jul', spend: 108000, contracts: 12 },
    { month: 'Aug', spend: 112000, contracts: 12 },
    { month: 'Sep', spend: 106000, contracts: 11 },
    { month: 'Oct', spend: 103000, contracts: 11 },
    { month: 'Nov', spend: 98000, contracts: 10 },
    { month: 'Dec', spend: 98000, contracts: 10 }
  ];

  const mockCategorySpend: CategorySpend[] = [
    { category: 'Software Licenses', value: 450000, percentage: 36 },
    { category: 'Professional Services', value: 312500, percentage: 25 },
    { category: 'Support & Maintenance', value: 250000, percentage: 20 },
    { category: 'Hardware', value: 187500, percentage: 15 },
    { category: 'Other', value: 50000, percentage: 4 }
  ];

  const mockPerformanceMetrics: PerformanceMetric[] = [
    { metric: 'Delivery', score: 94, benchmark: 85 },
    { metric: 'Quality', score: 88, benchmark: 80 },
    { metric: 'Communication', score: 90, benchmark: 75 },
    { metric: 'Flexibility', score: 82, benchmark: 70 },
    { metric: 'Innovation', score: 78, benchmark: 65 },
    { metric: 'Value', score: 85, benchmark: 75 }
  ];

  const metrics = vendorMetrics || mockMetrics;
  const trends = spendTrends || mockSpendTrends;
  const categories = categoryBreakdown || mockCategorySpend;
  const performance = performanceComparison || mockPerformanceMetrics;

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

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!metrics) {
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
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="Spend ($)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="contracts"
                    stroke="#3b82f6"
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
                      label={({ category, percentage }) => `${category}: ${percentage}%`}
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
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Industry Benchmark"
                    dataKey="benchmark"
                    stroke="#3b82f6"
                    fill="#3b82f6"
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
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981' }}
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
                    <Bar dataKey="current" fill="#10b981" name="Current Vendor" />
                    <Bar dataKey="average" fill="#3b82f6" name="Category Average" />
                    <Bar dataKey="best" fill="#f59e0b" name="Best in Class" />
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
