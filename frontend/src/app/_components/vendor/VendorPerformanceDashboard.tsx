// @ts-nocheck
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, Award, Shield, MessageSquare, AlertTriangle, CheckCircle, XCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

// UI Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, subMonths } from '@/lib/date';

import { cn } from '@/lib/utils';
import type { Id } from '@/types/id.types';
import { VendorType } from '@/types/vendor.types';

interface VendorPerformanceDashboardProps {
  vendor: VendorType;
  vendorId: Id<"vendors">;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target: number;
  category: 'financial' | 'operational' | 'quality' | 'risk';
  trend: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
  format: 'percentage' | 'currency' | 'number' | 'score';
}

interface TimeSeriesData {
  date: string;
  value: number;
  category: string;
}

interface ContractPerformance {
  contractId: string;
  contractTitle: string;
  performanceScore: number;
  deliveryScore: number;
  qualityScore: number;
  costEfficiency: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

// No more mock data - fetching from API

export const VendorPerformanceDashboard: React.FC<VendorPerformanceDashboardProps> = ({
  vendor,
  vendorId
}) => {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30d' | '90d' | '12m'>('90d');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'financial' | 'operational' | 'quality' | 'risk'>('all');
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get enterpriseId from userProfile
  const enterpriseId = userProfile?.enterprise_id as Id<"enterprises"> | undefined;

  // Fetch vendor performance data from API
  useEffect(() => {
    const fetchVendorPerformance = async () => {
      if (!vendorId || !enterpriseId) {
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      setError(null);
      const supabase = createClient();

      try {
        const { data, error: rpcError } = await supabase.rpc('get_vendor_performance_stats', {
          p_vendor_id: vendorId,
          p_enterprise_id: enterpriseId,
          p_time_range: selectedTimeRange
        } as any);

        if (rpcError) {
          console.error('Error fetching vendor performance:', rpcError);
          setError('Failed to load vendor performance data');
          toast.error('Failed to load vendor performance data');
        } else {
          setVendorStats(data);
        }
      } catch (err) {
        console.error('Error fetching vendor performance:', err);
        setError('Failed to load vendor performance data');
        toast.error('Failed to load vendor performance data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchVendorPerformance();
  }, [vendorId, enterpriseId, selectedTimeRange]);

  // Helper to calculate trend based on current vs previous
  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  // Transform API data into component format
  const performanceData: PerformanceMetric[] = useMemo(() => {
    if (!vendorStats?.performance) return [];

    const perf = vendorStats.performance;
    const prevPerf = vendorStats.previousPeriod || {}; // Historical data from previous period

    return [
      {
        id: 'overall_score',
        name: 'Overall Performance',
        value: perf.overallScore || 0,
        previousValue: prevPerf.overallScore || perf.overallScore || 0,
        target: 90,
        category: 'quality',
        trend: calculateTrend(perf.overallScore || 0, prevPerf.overallScore || 0),
        icon: TrendingUp,
        color: 'text-yellow-600',
        format: 'score' as const
      },
      {
        id: 'cost_efficiency',
        name: 'Cost Efficiency',
        value: perf.costEfficiency || 0,
        previousValue: prevPerf.costEfficiency || perf.costEfficiency || 0,
        target: 95,
        category: 'financial',
        trend: calculateTrend(perf.costEfficiency || 0, prevPerf.costEfficiency || 0),
        icon: DollarSign,
        color: 'text-green-600',
        format: 'percentage' as const
      },
      {
        id: 'delivery_timeliness',
        name: 'Delivery Timeliness',
        value: perf.deliveryTimeliness || 0,
        previousValue: prevPerf.deliveryTimeliness || perf.deliveryTimeliness || 0,
        target: 90,
        category: 'operational',
        trend: calculateTrend(perf.deliveryTimeliness || 0, prevPerf.deliveryTimeliness || 0),
        icon: Clock,
        color: 'text-blue-600',
        format: 'percentage' as const
      },
      {
        id: 'quality_score',
        name: 'Quality Score',
        value: perf.qualityScore || 0,
        previousValue: prevPerf.qualityScore || perf.qualityScore || 0,
        target: 95,
        category: 'quality',
        trend: calculateTrend(perf.qualityScore || 0, prevPerf.qualityScore || 0),
        icon: Award,
        color: 'text-purple-600',
        format: 'score' as const
      },
      {
        id: 'risk_assessment',
        name: 'Risk Assessment',
        value: perf.riskAssessment || 0,
        previousValue: prevPerf.riskAssessment || perf.riskAssessment || 0,
        target: 10,
        category: 'risk',
        trend: calculateTrend(prevPerf.riskAssessment || 0, perf.riskAssessment || 0), // Inverted: lower is better
        icon: Shield,
        color: 'text-red-600',
        format: 'score' as const
      },
      {
        id: 'communication',
        name: 'Communication',
        value: perf.communicationScore || 0,
        previousValue: prevPerf.communicationScore || perf.communicationScore || 0,
        target: 90,
        category: 'operational',
        trend: calculateTrend(perf.communicationScore || 0, prevPerf.communicationScore || 0),
        icon: MessageSquare,
        color: 'text-indigo-600',
        format: 'score' as const
      }
    ];
  }, [vendorStats]);

  const timeSeriesData: TimeSeriesData[] = useMemo(() => {
    if (!vendorStats?.timeSeries) return [];

    return vendorStats.timeSeries.map((item: any) => ({
      date: item.date,
      value: item.value,
      category: 'performance'
    }));
  }, [vendorStats]);

  const contractPerformance: ContractPerformance[] = useMemo(() => {
    if (!vendorStats?.contractPerformance) return [];

    return vendorStats.contractPerformance.map((item: any) => ({
      contractId: item.contractId,
      contractTitle: item.contractTitle,
      performanceScore: item.performanceScore,
      deliveryScore: item.deliveryScore,
      qualityScore: item.qualityScore,
      costEfficiency: item.costEfficiency,
      riskLevel: item.riskLevel,
      lastUpdated: item.lastUpdated
    }));
  }, [vendorStats]);

  const filteredMetrics = useMemo(() => {
    if (selectedCategory === 'all') return performanceData;
    return performanceData.filter(metric => metric.category === selectedCategory);
  }, [performanceData, selectedCategory]);

  const formatValue = (value: number, format: PerformanceMetric['format']): string => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'score':
        return `${value}/100`;
      default:
        return value.toString();
    }
  };

  const getTrendIcon = (trend: PerformanceMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskColor = (level: ContractPerformance['riskLevel']) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading performance data...</p>
      </div>
    );
  }

  if (!enterpriseId) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Enterprise information is missing for your user account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive performance analytics for {vendor.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as "30d" | "90d" | "12m")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as "all" | "quality" | "delivery" | "compliance" | "financial")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="contracts">Contract Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMetrics.map((metric) => {
              const Icon = metric.icon;
              const change = metric.value - metric.previousValue;
              const changePercentage = ((change / metric.previousValue) * 100).toFixed(1);

              return (
                <Card key={metric.id} className="border-border dark:border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-muted", metric.color)}>
                          {React.createElement(Icon, { className: "h-5 w-5" })}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                          <p className="text-2xl font-bold text-foreground">
                            {formatValue(metric.value, metric.format)}
                          </p>
                        </div>
                      </div>
                      {getTrendIcon(metric.trend)}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-medium">{formatValue(metric.target, metric.format)}</span>
                      </div>
                      <Progress 
                        value={(metric.value / metric.target) * 100} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>vs. previous period: {changePercentage}%</span>
                        <span>{Math.round((metric.value / metric.target) * 100)}% of target</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Performance Summary */}
          <Card className="border-border dark:border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Strengths</h4>
                  <div className="space-y-2">
                    {performanceData
                      .filter(m => m.value >= m.target * 0.9)
                      .map(metric => (
                        <div key={metric.id} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-foreground">{metric.name}</span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {formatValue(metric.value, metric.format)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {performanceData
                      .filter(m => m.value < m.target * 0.9)
                      .map(metric => (
                        <div key={metric.id} className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-foreground">{metric.name}</span>
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            {formatValue(metric.value, metric.format)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMetrics.map((metric) => {
              const Icon = metric.icon;
              
              return (
                <Card key={metric.id} className="border-border dark:border-border/50 bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {React.createElement(Icon, { className: cn("h-5 w-5", metric.color) })}
                      {metric.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-foreground">
                        {formatValue(metric.value, metric.format)}
                      </span>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(metric.trend)}
                          <span className="text-sm text-muted-foreground">
                            {((metric.value - metric.previousValue) / metric.previousValue * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">vs. previous</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current</span>
                        <span className="font-medium">{formatValue(metric.value, metric.format)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-medium">{formatValue(metric.target, metric.format)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Previous</span>
                        <span className="font-medium">{formatValue(metric.previousValue, metric.format)}</span>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(metric.value / metric.target) * 100} 
                      className="h-3"
                    />
                    
                    <p className="text-xs text-muted-foreground">
                      {Math.round((metric.value / metric.target) * 100)}% of target achieved
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Contract Performance Breakdown</h3>
              <Badge variant="outline">
                {contractPerformance.length} active contracts
              </Badge>
            </div>
            
            {contractPerformance.map((contract) => (
              <Card key={contract.contractId} className="border-border dark:border-border/50 bg-card shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{contract.contractTitle}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Last updated: {format(new Date(contract.lastUpdated), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(contract.riskLevel)}>
                        {contract.riskLevel} risk
                      </Badge>
                      <Badge variant="outline" className={getPerformanceColor(contract.performanceScore)}>
                        {contract.performanceScore}% overall
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Performance</p>
                      <p className={cn("text-xl font-bold", getPerformanceColor(contract.performanceScore))}>
                        {contract.performanceScore}%
                      </p>
                      <Progress value={contract.performanceScore} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Delivery</p>
                      <p className={cn("text-xl font-bold", getPerformanceColor(contract.deliveryScore))}>
                        {contract.deliveryScore}%
                      </p>
                      <Progress value={contract.deliveryScore} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Quality</p>
                      <p className={cn("text-xl font-bold", getPerformanceColor(contract.qualityScore))}>
                        {contract.qualityScore}%
                      </p>
                      <Progress value={contract.qualityScore} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Cost Efficiency</p>
                      <p className={cn("text-xl font-bold", getPerformanceColor(contract.costEfficiency))}>
                        {contract.costEfficiency}%
                      </p>
                      <Progress value={contract.costEfficiency} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Performance Trend Chart */}
          <Card className="border-border dark:border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-muted-foreground">Performance trend chart would be displayed here</p>
                  <p className="text-sm text-muted-foreground/70">Integration with charting library required</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trend Analysis */}
          <Card className="border-border dark:border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Improving Metrics</h4>
                  <div className="space-y-3">
                    {performanceData
                      .filter(m => m.trend === 'up')
                      .map(metric => (
                        <div key={metric.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-foreground">{metric.name}</span>
                          </div>
                          <span className="text-sm text-green-600 font-medium">
                            +{((metric.value - metric.previousValue) / metric.previousValue * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Declining Metrics</h4>
                  <div className="space-y-3">
                    {performanceData
                      .filter(m => m.trend === 'down')
                      .map(metric => (
                        <div key={metric.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-foreground">{metric.name}</span>
                          </div>
                          <span className="text-sm text-red-600 font-medium">
                            {((metric.value - metric.previousValue) / metric.previousValue * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
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

export default VendorPerformanceDashboard;
