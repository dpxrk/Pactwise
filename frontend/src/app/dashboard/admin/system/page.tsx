"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Shield,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "@/lib/date";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

type TimeRange = "1h" | "24h" | "7d" | "30d";

export default function SystemHealthPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Mock system health data - replace with Supabase implementation
  const systemHealth = {
    status: 'healthy',
    checks: {
      database: { status: 'healthy', latency: 45 },
      storage: { status: 'healthy', latency: 23 },
      authentication: { status: 'healthy', latency: 67 },
      aiServices: { status: 'healthy', latency: 123 }
    }
  };

  // Mock system metrics data - replace with Supabase implementation
  const systemMetrics = {
    usage: {
      apiCalls: 1250,
      successfulCalls: 1180,
      failedCalls: 70,
      storageUsedMB: 850,
      bandwidthMB: 450
    },
    performance: {
      avgResponseTime: 145,
      errorRate: 5.6,
      uptime: 99.8,
      errorCount: 12,
      errorBreakdown: {
        '4xx': 8,
        '5xx': 4
      }
    },
    activity: {
      uniqueVisitors: 45,
      pageViews: 1230,
      contractsCreated: 28,
      vendorsCreated: 12
    }
  };

  // Mock performance stats - replace with Supabase implementation
  const performanceStats = {
    topOperations: [
      { operation: 'contract.create', count: 150, successRate: 98.5 },
      { operation: 'vendor.update', count: 89, successRate: 96.2 },
      { operation: 'ai.analyze', count: 245, successRate: 94.8 },
      { operation: 'user.authenticate', count: 567, successRate: 99.1 }
    ]
  };

  // Mock error logs - replace with Supabase implementation
  const errorLogs = {
    errors: [
      {
        message: 'Database connection timeout',
        url: '/api/contracts',
        severity: 'error',
        userName: 'System',
        timestamp: Date.now() - 300000
      },
      {
        message: 'AI service rate limit exceeded',
        url: '/api/ai/analyze',
        severity: 'warning',
        userName: 'john@example.com',
        timestamp: Date.now() - 600000
      }
    ]
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setRefreshKey((k) => k + 1);
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh]);

  if (!systemHealth || !systemMetrics || !performanceStats) {
    return <SystemHealthSkeleton />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-yellow-500";
      case "unhealthy":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  // Prepare chart data
  const usageChartData = [
    { name: "API Calls", value: systemMetrics.usage.apiCalls },
    { name: "Successful", value: systemMetrics.usage.successfulCalls },
    { name: "Failed", value: systemMetrics.usage.failedCalls },
  ];

  const activityChartData = [
    { name: "Page Views", value: systemMetrics.activity.pageViews },
    { name: "Contracts", value: systemMetrics.activity.contractsCreated },
    { name: "Vendors", value: systemMetrics.activity.vendorsCreated },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Health & Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Monitor system performance and health metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto-refreshing" : "Auto-refresh"}
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Overall health: <span className={cn("font-semibold", getStatusColor(systemHealth.status))}>
              {systemHealth.status.toUpperCase()}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth.checks.database.status)}
                <span className={getStatusColor(systemHealth.checks.database.status)}>
                  {systemHealth.checks.database.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.checks.database.latency}ms latency
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth.checks.storage.status)}
                <span className={getStatusColor(systemHealth.checks.storage.status)}>
                  {systemHealth.checks.storage.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {systemMetrics.usage.storageUsedMB}MB used
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth.checks.authentication.status)}
                <span className={getStatusColor(systemHealth.checks.authentication.status)}>
                  {systemHealth.checks.authentication.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.checks.authentication.latency}ms latency
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">AI Services</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth.checks.aiServices.status)}
                <span className={getStatusColor(systemHealth.checks.aiServices.status)}>
                  {systemHealth.checks.aiServices.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.checks.aiServices.latency}ms latency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.performance.avgResponseTime}ms
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.performance.errorRate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {systemMetrics.performance.errorCount} errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {systemMetrics.performance.uptime}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last {timeRange}
                </p>
              </CardContent>
            </Card>
          </div>

          {performanceStats && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Performance</CardTitle>
                <CardDescription>
                  Success rates by operation type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceStats.topOperations.map((op) => (
                    <div key={op.operation} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{op.operation}</span>
                        <span className="text-muted-foreground">
                          {op.count} total • {op.successRate.toFixed(1)}% success
                        </span>
                      </div>
                      <Progress 
                        value={op.successRate} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usageChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Storage</span>
                    <span className="text-sm font-medium">
                      {systemMetrics.usage.storageUsedMB}MB / 5GB
                    </span>
                  </div>
                  <Progress 
                    value={(systemMetrics.usage.storageUsedMB / 5120) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Bandwidth</span>
                    <span className="text-sm font-medium">
                      {systemMetrics.usage.bandwidthMB}MB
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((systemMetrics.usage.bandwidthMB / 1000) * 100, 100)} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">API Calls</span>
                    <span className="text-sm font-medium">
                      {systemMetrics.usage.apiCalls} / 10K
                    </span>
                  </div>
                  <Progress 
                    value={(systemMetrics.usage.apiCalls / 10000) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          {errorLogs && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(systemMetrics.performance.errorBreakdown).map(
                          ([key, value]) => ({ name: key, value })
                        )}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {Object.entries(systemMetrics.performance.errorBreakdown).map(
                          (_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Errors</CardTitle>
                  <CardDescription>
                    Latest error logs from the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {errorLogs.errors.map((error, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{error.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {error.url}
                              </p>
                            </div>
                            <Badge
                              variant={
                                error.severity === "critical"
                                  ? "error"
                                  : error.severity === "error"
                                  ? "warning"
                                  : "outline"
                              }
                            >
                              {error.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{error.userName}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(error.timestamp))} ago</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {systemMetrics.activity.uniqueVisitors}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {systemMetrics.activity.pageViews}
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">New Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {systemMetrics.activity.contractsCreated}
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">New Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {systemMetrics.activity.vendorsCreated}
                  </div>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SystemHealthSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
