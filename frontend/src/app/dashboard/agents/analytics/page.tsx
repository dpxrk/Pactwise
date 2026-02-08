'use client';

import {
  TrendingUp,
  DollarSign,
  LineChart,
  Activity,
  AlertTriangle,
  ArrowLeft,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { agentsAPI } from '@/lib/api/agents';

import { SwarmDebugPanel } from '@/components/agents/SwarmDebugPanel';
interface ProcessingResult {
  status: 'success' | 'error' | 'processing';
  data?: any;
  error?: string;
  processingTime?: number;
}

interface AnalysisMetric {
  name: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  unit?: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings?: number;
}

interface Anomaly {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detectedAt: string;
  value?: number;
  expected?: number;
}

export default function AnalyticsAgentPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [analysisQuery, setAnalysisQuery] = useState<string>('');
  const [activeCapability, setActiveCapability] = useState<string>('spending-patterns');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'spending-patterns',
      name: 'Spending Patterns',
      icon: TrendingUp,
      description: 'Analyze spending patterns and identify trends over time',
    },
    {
      id: 'cost-optimization',
      name: 'Cost Optimization',
      icon: DollarSign,
      description: 'Identify cost-saving opportunities and optimization strategies',
    },
    {
      id: 'predictive-forecast',
      name: 'Predictive Forecast',
      icon: LineChart,
      description: 'Generate forecasts for future spending and contract trends',
    },
    {
      id: 'kpi-dashboard',
      name: 'KPI Dashboard',
      icon: Activity,
      description: 'Track key performance indicators and metrics',
    },
    {
      id: 'anomaly-detection',
      name: 'Anomaly Detection',
      icon: AlertTriangle,
      description: 'Detect unusual patterns, outliers, and anomalies',
    },
  ];

  const activeCapabilityData = capabilities.find((c) => c.id === activeCapability);

  const handleProcess = async () => {
    if (!analysisQuery.trim()) {
      toast.error('Please enter an analysis query or parameter');
      return;
    }

    if (!userProfile?.id || !userProfile?.enterprise_id) {
      toast.error('User profile not loaded');
      return;
    }

    setProcessing(true);
    setResult({ status: 'processing' });

    try {
      const task = await agentsAPI.createAgentTask({
        type: 'analytics',
        data: {
          capability: activeCapability,
          query: analysisQuery.trim(),
        },
        priority: 7,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
        swarmMode: true, // Enable swarm orchestration
      });

      toast.success('Analytics task created');

      const pollInterval = setInterval(async () => {
        try {
          const taskStatus = await agentsAPI.getTaskStatus(task.id);

          if (taskStatus.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              status: 'success',
              data: taskStatus.result,
              processingTime: taskStatus.processing_time_ms ?? undefined,
            });
            setProcessing(false);
            toast.success('Analysis completed');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              status: 'error',
              error: taskStatus.error || 'Analysis failed',
            });
            setProcessing(false);
            toast.error('Analysis failed');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

      setTimeout(() => {
        if (processing) {
          clearInterval(pollInterval);
          setProcessing(false);
          setResult({
            status: 'error',
            error: 'Analysis timeout - taking longer than expected',
          });
          toast.error('Analysis timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Analytics error:', error);
      setProcessing(false);
      setResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process analytics',
      });
      toast.error('Failed to start analysis');
    }
  };

  const handleDownload = () => {
    if (!result?.data) return;

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${activeCapability}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMetrics = (metrics: AnalysisMetric[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="text-sm text-ghost-600 font-mono mb-1">{metric.name}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-900 font-mono">
              {metric.value}
              {metric.unit && <span className="text-base ml-1">{metric.unit}</span>}
            </span>
            {metric.trend && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  metric.trend === 'up'
                    ? 'border-green-500 text-green-700'
                    : metric.trend === 'down'
                    ? 'border-red-500 text-red-700'
                    : 'border-ghost-400 text-ghost-600'
                }`}
              >
                {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                {metric.change && ` ${Math.abs(metric.change)}%`}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecommendations = (recommendations: Recommendation[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        RECOMMENDATIONS
      </h4>
      {recommendations.map((rec, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <h5 className="font-semibold text-purple-900">{rec.title}</h5>
            <Badge
              variant="outline"
              className={`text-xs ${
                rec.impact === 'high'
                  ? 'border-purple-500 text-purple-700 bg-purple-50'
                  : rec.impact === 'medium'
                  ? 'border-purple-400 text-purple-600'
                  : 'border-ghost-400 text-ghost-600'
              }`}
            >
              {rec.impact.toUpperCase()} IMPACT
            </Badge>
          </div>
          <p className="text-sm text-ghost-600 mb-2">{rec.description}</p>
          {rec.savings && (
            <div className="text-sm font-mono text-green-700">
              Potential Savings: ${rec.savings.toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderAnomalies = (anomalies: Anomaly[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        DETECTED ANOMALIES
      </h4>
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 ${
                  anomaly.severity === 'critical'
                    ? 'text-red-600'
                    : anomaly.severity === 'high'
                    ? 'text-orange-600'
                    : anomaly.severity === 'medium'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }`}
              />
              <h5 className="font-semibold text-purple-900">{anomaly.type}</h5>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                anomaly.severity === 'critical'
                  ? 'border-red-500 text-red-700 bg-red-50'
                  : anomaly.severity === 'high'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : anomaly.severity === 'medium'
                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                  : 'border-blue-500 text-blue-700 bg-blue-50'
              }`}
            >
              {anomaly.severity.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-ghost-600 mb-2">{anomaly.description}</p>
          <div className="flex items-center gap-4 text-xs font-mono text-ghost-500">
            <span>Detected: {new Date(anomaly.detectedAt).toLocaleString()}</span>
            {anomaly.value !== undefined && anomaly.expected !== undefined && (
              <span>
                Value: {anomaly.value} (Expected: {anomaly.expected})
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderForecast = (data: any) => (
    <div className="space-y-4 mb-6">
      <div className="border border-ghost-300 bg-white p-6">
        <h4 className="text-sm font-semibold text-purple-900 font-mono mb-4">
          FORECAST SUMMARY
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-ghost-600 font-mono mb-1">PREDICTED VALUE</div>
            <div className="text-2xl font-bold text-purple-900 font-mono">
              ${data.predictedValue?.toLocaleString() || '0'}
            </div>
          </div>
          <div>
            <div className="text-xs text-ghost-600 font-mono mb-1">CONFIDENCE</div>
            <div className="text-2xl font-bold text-purple-900 font-mono">
              {data.confidence || '0'}%
            </div>
          </div>
          <div>
            <div className="text-xs text-ghost-600 font-mono mb-1">TREND</div>
            <Badge
              variant="outline"
              className={`text-xs ${
                data.trend === 'increasing'
                  ? 'border-green-500 text-green-700'
                  : data.trend === 'decreasing'
                  ? 'border-red-500 text-red-700'
                  : 'border-ghost-400 text-ghost-600'
              }`}
            >
              {data.trend?.toUpperCase() || 'STABLE'}
            </Badge>
          </div>
        </div>
        {data.confidenceInterval && (
          <div className="pt-4 border-t border-ghost-200">
            <div className="text-xs text-ghost-600 font-mono mb-2">
              CONFIDENCE INTERVAL (95%)
            </div>
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className="text-ghost-600">
                Lower: ${data.confidenceInterval.lower?.toLocaleString() || '0'}
              </span>
              <span className="text-ghost-400">|</span>
              <span className="text-ghost-600">
                Upper: ${data.confidenceInterval.upper?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderKPIDashboard = (data: any) => (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.kpis?.map((kpi: any, index: number) => (
          <div
            key={index}
            className="border border-ghost-300 bg-white p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-purple-900">{kpi.name}</h5>
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-purple-900 font-mono">
                {kpi.current}
                {kpi.unit && <span className="text-base ml-1">{kpi.unit}</span>}
              </div>
            </div>
            {kpi.target && (
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-ghost-600">Target: {kpi.target}</span>
                <Badge
                  variant="outline"
                  className={`${
                    kpi.onTrack
                      ? 'border-green-500 text-green-700'
                      : 'border-red-500 text-red-700'
                  }`}
                >
                  {kpi.onTrack ? 'ON TRACK' : 'OFF TRACK'}
                </Badge>
              </div>
            )}
            {kpi.trend && (
              <div className="mt-2 pt-2 border-t border-ghost-200">
                <div className="text-xs text-ghost-600 font-mono">
                  {kpi.trend.direction === 'up' ? '↑' : '↓'} {kpi.trend.change}%{' '}
                  {kpi.trend.period}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!result) return null;

    if (result.status === 'processing') {
      return (
        <div className="border border-ghost-300 bg-white p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-ghost-600 font-mono text-sm">Analyzing data...</p>
        </div>
      );
    }

    if (result.status === 'error') {
      return (
        <div className="border border-red-300 bg-red-50 p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Analysis Failed</span>
          </div>
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      );
    }

    if (result.status === 'success' && result.data) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-green-300 bg-green-50">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Analysis Completed</span>
            </div>
            {result.processingTime && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-mono">
                <Clock className="w-3 h-3" />
                {result.processingTime}ms
              </div>
            )}
          </div>

          <div className="border border-ghost-300 bg-ghost-50 p-6">
            {/* Spending Patterns Results */}
            {activeCapability === 'spending-patterns' && result.data.metrics && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Spending Pattern Analysis
                </h3>
                {renderMetrics(result.data.metrics)}
                {result.data.trends && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
                      KEY TRENDS
                    </h4>
                    <ul className="space-y-2">
                      {result.data.trends.map((trend: string, index: number) => (
                        <li
                          key={index}
                          className="text-sm text-ghost-600 flex items-start gap-2"
                        >
                          <TrendingUp className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Cost Optimization Results */}
            {activeCapability === 'cost-optimization' && result.data.recommendations && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Cost Optimization Opportunities
                </h3>
                {result.data.totalPotentialSavings && (
                  <div className="border border-green-300 bg-green-50 p-4 mb-6">
                    <div className="text-xs text-green-600 font-mono mb-1">
                      TOTAL POTENTIAL SAVINGS
                    </div>
                    <div className="text-3xl font-bold text-green-700 font-mono">
                      ${result.data.totalPotentialSavings.toLocaleString()}
                    </div>
                  </div>
                )}
                {renderRecommendations(result.data.recommendations)}
              </>
            )}

            {/* Predictive Forecast Results */}
            {activeCapability === 'predictive-forecast' && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Predictive Forecast
                </h3>
                {renderForecast(result.data)}
              </>
            )}

            {/* KPI Dashboard Results */}
            {activeCapability === 'kpi-dashboard' && result.data.kpis && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Key Performance Indicators
                </h3>
                {renderKPIDashboard(result.data)}
              </>
            )}

            {/* Anomaly Detection Results */}
            {activeCapability === 'anomaly-detection' && result.data.anomalies && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Anomaly Detection Report
                </h3>
                {result.data.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">
                        TOTAL ANOMALIES
                      </div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.total || 0}
                      </div>
                    </div>
                    <div className="border border-red-300 bg-red-50 p-4">
                      <div className="text-xs text-red-600 font-mono mb-1">CRITICAL</div>
                      <div className="text-2xl font-bold text-red-700 font-mono">
                        {result.data.summary.critical || 0}
                      </div>
                    </div>
                    <div className="border border-orange-300 bg-orange-50 p-4">
                      <div className="text-xs text-orange-600 font-mono mb-1">HIGH</div>
                      <div className="text-2xl font-bold text-orange-700 font-mono">
                        {result.data.summary.high || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderAnomalies(result.data.anomalies)}
              </>
            )}

            {/* Raw JSON fallback */}
            {!result.data.metrics &&
              !result.data.recommendations &&
              !result.data.predictedValue &&
              !result.data.kpis &&
              !result.data.anomalies && (
                <>
                  <h3 className="text-lg font-bold text-purple-900 mb-4">
                    Analysis Results
                  </h3>
                  <pre className="bg-white border border-ghost-300 p-4 text-xs font-mono overflow-auto max-h-96 text-ghost-700">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </>
              )}
          </div>

          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Results (JSON)
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(210, 209, 222) 1px, transparent 1px),
            linear-gradient(90deg, rgb(210, 209, 222) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div className="relative">
        <div className="container mx-auto px-6 py-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/agents')}
            className="mb-6 text-purple-900 hover:text-purple-700 hover:bg-ghost-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-purple-900 mb-2 tracking-tight">
                  Analytics Engine
                </h1>
                <p className="text-ghost-600 text-lg">
                  Data analysis, trend identification, and predictive insights generation
                </p>
              </div>
              <div className="text-6xl">📊</div>
            </div>

            {/* USE WHEN panel */}
            <Card className="border-purple-500 bg-white p-6">
              <h3 className="text-sm font-semibold text-purple-900 font-mono mb-2">
                USE WHEN
              </h3>
              <p className="text-ghost-600 leading-relaxed">
                The Analytics Engine runs continuously 24/7, monitoring all contract, vendor,
                and financial data to identify patterns, trends, and anomalies. It
                automatically generates insights, forecasts, and recommendations to help you
                make data-driven decisions. Use this agent when you need deep analysis of your
                data, predictive insights, or want to track key performance indicators across
                your organization.
              </p>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Capabilities */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <button
                      key={capability.id}
                      onClick={() => {
                        setActiveCapability(capability.id);
                        setResult(null);
                      }}
                      className={`w-full text-left border p-4 transition-all ${
                        activeCapability === capability.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-ghost-300 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            activeCapability === capability.id
                              ? 'text-purple-600'
                              : 'text-ghost-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold mb-1 ${
                              activeCapability === capability.id
                                ? 'text-purple-900'
                                : 'text-ghost-700'
                            }`}
                          >
                            {capability.name}
                          </h3>
                          <p className="text-xs text-ghost-600 leading-relaxed">
                            {capability.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column - Input and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Input section */}
              <Card className="border-ghost-300 bg-white p-6">
                <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                  ANALYSIS PARAMETERS
                </h2>
                {activeCapabilityData && (
                  <div className="mb-4 p-4 bg-ghost-50 border border-ghost-200">
                    <div className="flex items-start gap-3">
                      {React.createElement(activeCapabilityData.icon, {
                        className: 'w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0',
                      })}
                      <div>
                        <h3 className="font-semibold text-purple-900 mb-1">
                          {activeCapabilityData.name}
                        </h3>
                        <p className="text-sm text-ghost-600">
                          {activeCapabilityData.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ghost-700 mb-2">
                      Analysis Query or Parameter
                    </label>
                    <input
                      type="text"
                      value={analysisQuery}
                      onChange={(e) => setAnalysisQuery(e.target.value)}
                      placeholder="e.g., last 90 days, vendor category, budget allocation"
                      className="w-full px-4 py-3 border border-ghost-300 bg-white text-ghost-900 placeholder-ghost-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      disabled={processing}
                    />
                    <p className="text-xs text-ghost-500 mt-2">
                      Enter the scope, timeframe, or specific parameters for the analysis
                    </p>
                  </div>

                  <Button
                    onClick={handleProcess}
                    disabled={processing || !analysisQuery.trim()}
                    className="w-full bg-purple-900 hover:bg-purple-800 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Analysis
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Results section */}
              {result && (
                <Card className="border-ghost-300 bg-white p-6">
                  <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                    RESULTS
                  </h2>
                  {renderResults()}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <SwarmDebugPanel />
    </div>
  );
}
