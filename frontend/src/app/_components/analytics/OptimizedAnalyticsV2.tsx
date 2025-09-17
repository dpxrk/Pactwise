'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';

import { PremiumLoader } from '@/components/premium';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsWorker } from '@/hooks/useWebWorker';

// Lazy load all analytics components
const SummaryCards = lazy(() => import('./components/SummaryCards').then(m => ({ default: m.SummaryCards })));
const SpendingAnalysis = lazy(() => import('./components/SpendingAnalysis').then(m => ({ default: m.SpendingAnalysis })));
const RiskAnalysisView = lazy(() => import('./components/RiskAnalysis').then(m => ({ default: m.RiskAnalysisView })));
const ForecastView = lazy(() => import('./components/ForecastView').then(m => ({ default: m.ForecastView })));
const InsightsView = lazy(() => import('./components/InsightsView').then(m => ({ default: m.InsightsView })));
const OverviewCharts = lazy(() => import('./components/OverviewCharts'));

interface OptimizedAnalyticsProps {
  enterpriseId: string;
}

// Loading component for lazy loaded sections
const TabContentLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const OptimizedAnalyticsV2 = React.memo<OptimizedAnalyticsProps>(() => {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [spendAnalysis, setSpendAnalysis] = useState<Record<string, unknown> | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<Record<string, unknown> | null>(null);
  const [forecast, setForecast] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const contractsData: { contracts: unknown[] } = { contracts: [] };
  const vendorsData: { vendors: unknown[] } = { vendors: [] };

  // Initialize Web Worker
  const {
    calculateStats,
    analyzeSpending,
    calculateRisk,
    generateForecast,
    isProcessing,
    error,
    progress
  } = useAnalyticsWorker();

  // Process data when it changes
  useEffect(() => {
    if (!contractsData?.contracts || !vendorsData?.vendors) return;

    const processAnalytics = async () => {
      try {
        // Run calculations in parallel using Web Workers
        const [statsResult, spendResult, riskResult] = await Promise.all([
          calculateStats(contractsData.contracts),
          analyzeSpending(contractsData.contracts, vendorsData.vendors),
          calculateRisk(contractsData.contracts, vendorsData.vendors)
        ]);

        setStats(statsResult);
        setSpendAnalysis(spendResult);
        setRiskAnalysis(riskResult);

        // Generate forecast based on historical data
        const forecastResult = await generateForecast({
          contracts: contractsData.contracts,
          period: 6
        });
        setForecast(forecastResult);
      } catch (err) {
        console.error('Analytics processing error:', err);
      }
    };

    processAnalytics();
  }, [calculateStats, analyzeSpending, calculateRisk, generateForecast]);

  // Memoized chart data
  const chartData = useMemo(() => {
    if (!stats || !spendAnalysis) return null;

    return {
      statusDistribution: Object.entries(stats.byStatus as Record<string, number>).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count as number,
        color: getStatusColor(status)
      })),
      valueDistribution: (stats.byValue as any)?.distribution || [],
      spendByCategory: Object.entries((spendAnalysis as any)?.byCategory || {}).map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: amount as number
      })),
      monthlyTrend: Object.entries((spendAnalysis as any)?.trends?.monthly || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, amount]) => ({
          month: formatMonth(month),
          amount: amount as number
        }))
    };
  }, [stats, spendAnalysis]);

  if (isProcessing && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <PremiumLoader size="lg" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Processing analytics data...</p>
          {progress > 0 && <Progress value={progress} className="w-48 mt-2" />}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error processing analytics: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats || !chartData) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Always visible */}
      <Suspense fallback={<TabContentLoader />}>
        <SummaryCards stats={stats as any} riskAnalysis={riskAnalysis as any} />
      </Suspense>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<TabContentLoader />}>
            <OverviewCharts chartData={chartData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="spending" className="space-y-4">
          <Suspense fallback={<TabContentLoader />}>
            <SpendingAnalysis 
              chartData={chartData} 
              spendAnalysis={spendAnalysis as any} 
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Suspense fallback={<TabContentLoader />}>
            <RiskAnalysisView analysis={riskAnalysis as any} />
          </Suspense>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Suspense fallback={<TabContentLoader />}>
            <ForecastView forecast={forecast as any} />
          </Suspense>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Suspense fallback={<TabContentLoader />}>
            <InsightsView 
              stats={stats as any} 
              spendAnalysis={spendAnalysis as any}
              riskAnalysis={riskAnalysis as any}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
});

OptimizedAnalyticsV2.displayName = 'OptimizedAnalyticsV2';

// Helper functions
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
    month: 'short', 
    year: '2-digit' 
  });
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#10b981',
    expired: '#ef4444',
    pending: '#f59e0b',
    draft: '#6b7280',
  };
  return colors[status] || '#6b7280';
}

export default OptimizedAnalyticsV2;