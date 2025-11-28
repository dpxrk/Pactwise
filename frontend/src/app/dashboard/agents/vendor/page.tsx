'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  TrendingUp,
  Clock,
  Award,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Download,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface ProcessingResult {
  taskId: string;
  status: 'processing' | 'completed' | 'error';
  result?: {
    scorecard?: {
      vendorName: string;
      overallScore: number;
      category: string;
      metrics: Array<{ name: string; score: number; trend: string }>;
    };
    sla?: {
      compliance: number;
      violations: Array<{ metric: string; target: number; actual: number; severity: string }>;
      history: Array<{ period: string; compliance: number }>;
    };
    health?: {
      status: string;
      score: number;
      indicators: Array<{ indicator: string; status: string; value: string; description: string }>;
    };
    performance?: {
      metrics: Array<{ name: string; current: number; previous: number; change: number; unit: string }>;
      ranking: { position: number; total: number; percentile: number };
    };
    renewals?: Array<{
      contractName: string;
      vendor: string;
      renewalDate: string;
      daysUntil: number;
      status: string;
      value: number;
    }>;
  };
  error?: string;
}

export default function VendorAgentPage() {
  const { userProfile } = useAuth();
  const [vendorIdentifier, setVendorIdentifier] = useState<string>('');
  const [activeCapability, setActiveCapability] = useState<string>('vendor-scorecard');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'vendor-scorecard',
      name: 'Vendor Scorecard',
      icon: Award,
      description: 'Generate comprehensive vendor performance scorecard',
    },
    {
      id: 'sla-monitoring',
      name: 'SLA Monitoring',
      icon: Clock,
      description: 'Track SLA compliance and identify violations',
    },
    {
      id: 'health-assessment',
      name: 'Health Assessment',
      icon: CheckCircle2,
      description: 'Assess vendor health, stability, and financial status',
    },
    {
      id: 'performance-tracking',
      name: 'Performance Tracking',
      icon: TrendingUp,
      description: 'Monitor vendor performance metrics and trends',
    },
    {
      id: 'renewal-tracking',
      name: 'Renewal Tracking',
      icon: AlertCircle,
      description: 'Track upcoming contract renewals and expirations',
    },
  ];

  const handleProcess = async () => {
    if (!vendorIdentifier.trim() || !userProfile?.enterprise_id) {
      toast.error('Please enter a vendor name or ID');
      return;
    }

    setProcessing(true);
    setResult({ taskId: '', status: 'processing' });

    try {
      // Create agent task
      const task = await agentsAPI.createAgentTask({
        type: 'vendor',
        data: {
          capability: activeCapability,
          vendorIdentifier: vendorIdentifier.trim(),
        },
        priority: 7,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
      });

      setResult({
        taskId: task.id,
        status: 'processing',
      });

      // Poll for task completion
      const pollInterval = setInterval(async () => {
        try {
          const taskStatus = await agentsAPI.getTaskStatus(task.id);

          if (taskStatus.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'completed',
              result: taskStatus.result as ProcessingResult['result'],
            });
            setProcessing(false);
            toast.success('Vendor analysis completed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Analysis failed',
            });
            setProcessing(false);
            toast.error('Vendor analysis failed');
          }
        } catch (error) {
          clearInterval(pollInterval);
          setProcessing(false);
          toast.error('Failed to check task status');
        }
      }, 2000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          toast.error('Processing timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessing(false);
      setResult({
        taskId: '',
        status: 'error',
        error: 'Failed to start analysis',
      });
      toast.error('Failed to process vendor analysis');
    }
  };

  const currentCapability = capabilities.find((c) => c.id === activeCapability);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-error';
    return 'text-ghost-600';
  };

  const formatResult = () => {
    if (!result?.result) return null;

    switch (activeCapability) {
      case 'vendor-scorecard':
        return (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-1">
                    Vendor: {result.result.scorecard?.vendorName}
                  </div>
                  <div className="text-4xl font-bold text-purple-900 font-mono">
                    {result.result.scorecard?.overallScore || 0}/100
                  </div>
                </div>
                <Badge
                  className={`${
                    (result.result.scorecard?.overallScore || 0) >= 80
                      ? 'bg-success/20 text-success border-success/30'
                      : (result.result.scorecard?.overallScore || 0) >= 60
                      ? 'bg-warning/20 text-warning border-warning/30'
                      : 'bg-error/20 text-error border-error/30'
                  } font-mono text-lg px-4 py-2`}
                >
                  {result.result.scorecard?.category || 'UNKNOWN'}
                </Badge>
              </div>
            </div>

            {/* Metrics Breakdown */}
            {result.result.scorecard?.metrics && result.result.scorecard.metrics.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Performance Metrics
                </div>
                {result.result.scorecard.metrics.map((metric, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-sm font-semibold text-purple-900">{metric.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-mono ${getTrendColor(metric.trend)}`}>
                          {getTrendIcon(metric.trend)}
                        </span>
                        <span className="text-xl font-bold text-purple-900 font-mono">{metric.score}/100</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'sla-monitoring':
        return (
          <div className="space-y-4">
            {/* SLA Compliance Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                SLA Compliance Rate
              </div>
              <div className="text-4xl font-bold text-purple-900 font-mono">
                {result.result.sla?.compliance || 0}%
              </div>
            </div>

            {/* Violations */}
            {result.result.sla?.violations && result.result.sla.violations.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  SLA Violations ({result.result.sla.violations.length})
                </div>
                {result.result.sla.violations.map((violation, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-purple-900 mb-1">{violation.metric}</div>
                        <div className="flex items-center gap-3 text-xs text-ghost-600 font-mono">
                          <span>
                            Target: <span className="text-purple-900 font-semibold">{violation.target}%</span>
                          </span>
                          <span className="text-ghost-400">•</span>
                          <span>
                            Actual: <span className="text-error font-semibold">{violation.actual}%</span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          violation.severity.toLowerCase() === 'critical'
                            ? 'bg-error/20 text-error border-error/30'
                            : violation.severity.toLowerCase() === 'high'
                            ? 'bg-warning/20 text-warning border-warning/30'
                            : 'bg-purple-500/20 text-purple-900 border-purple-500/30'
                        } font-mono text-xs`}
                      >
                        {violation.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Compliance History */}
            {result.result.sla?.history && result.result.sla.history.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Compliance History
                </div>
                <div className="p-4 bg-white border border-ghost-300">
                  <div className="space-y-2">
                    {result.result.sla.history.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-ghost-700 font-mono">{entry.period}</span>
                        <span className="text-purple-900 font-semibold font-mono">{entry.compliance}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'health-assessment':
        return (
          <div className="space-y-4">
            {/* Health Status */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-1">
                    Vendor Health Status
                  </div>
                  <div className="text-2xl font-bold text-purple-900 font-mono mb-2">
                    {result.result.health?.status || 'UNKNOWN'}
                  </div>
                  <div className="text-sm text-ghost-600">
                    Health Score: {result.result.health?.score || 0}/100
                  </div>
                </div>
                <CheckCircle2
                  className={`w-12 h-12 ${
                    (result.result.health?.score || 0) >= 80
                      ? 'text-success'
                      : (result.result.health?.score || 0) >= 60
                      ? 'text-warning'
                      : 'text-error'
                  }`}
                />
              </div>
            </div>

            {/* Health Indicators */}
            {result.result.health?.indicators && result.result.health.indicators.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Health Indicators
                </div>
                {result.result.health.indicators.map((indicator, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-purple-900 mb-1">{indicator.indicator}</div>
                        <div className="text-xs text-ghost-600 font-mono mb-1">Value: {indicator.value}</div>
                        <div className="text-xs text-ghost-700 leading-relaxed">{indicator.description}</div>
                      </div>
                      <Badge
                        className={`${
                          indicator.status.toLowerCase() === 'healthy'
                            ? 'bg-success/20 text-success border-success/30'
                            : indicator.status.toLowerCase() === 'warning'
                            ? 'bg-warning/20 text-warning border-warning/30'
                            : 'bg-error/20 text-error border-error/30'
                        } font-mono text-xs ml-3`}
                      >
                        {indicator.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'performance-tracking':
        return (
          <div className="space-y-4">
            {/* Ranking */}
            {result.result.performance?.ranking && (
              <div className="p-6 bg-purple-500/5 border border-purple-500/20">
                <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-3">
                  Vendor Ranking
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase mb-1">Position</div>
                    <div className="text-2xl font-bold text-purple-900 font-mono">
                      #{result.result.performance.ranking.position}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase mb-1">Out of</div>
                    <div className="text-2xl font-bold text-ghost-700 font-mono">
                      {result.result.performance.ranking.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase mb-1">Percentile</div>
                    <div className="text-2xl font-bold text-success font-mono">
                      {result.result.performance.ranking.percentile}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {result.result.performance?.metrics && result.result.performance.metrics.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Performance Metrics
                </div>
                {result.result.performance.metrics.map((metric, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-purple-900">{metric.name}</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono ${
                            metric.change > 0 ? 'text-success' : metric.change < 0 ? 'text-error' : 'text-ghost-600'
                          }`}
                        >
                          {metric.change > 0 ? '↑' : metric.change < 0 ? '↓' : '→'} {Math.abs(metric.change)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ghost-600 font-mono">
                      <span>
                        Current:{' '}
                        <span className="text-purple-900 font-semibold">
                          {metric.current}
                          {metric.unit}
                        </span>
                      </span>
                      <span className="text-ghost-400">•</span>
                      <span>
                        Previous:{' '}
                        <span className="text-ghost-700 font-semibold">
                          {metric.previous}
                          {metric.unit}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'renewal-tracking':
        return (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider mb-3">
              Upcoming Renewals ({result.result.renewals?.length || 0})
            </div>
            {result.result.renewals?.map((renewal, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-purple-900 mb-1">{renewal.contractName}</div>
                    <div className="text-xs text-ghost-600 font-mono">Vendor: {renewal.vendor}</div>
                  </div>
                  <Badge
                    className={`${
                      renewal.daysUntil <= 30
                        ? 'bg-error/20 text-error border-error/30'
                        : renewal.daysUntil <= 90
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-success/20 text-success border-success/30'
                    } font-mono text-xs`}
                  >
                    {renewal.daysUntil} DAYS
                  </Badge>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-ghost-200 text-xs font-mono">
                  <span className="text-ghost-600">
                    Renewal Date: <span className="text-purple-900 font-semibold">{renewal.renewalDate}</span>
                  </span>
                  <span className="text-ghost-400">•</span>
                  <span className="text-ghost-600">
                    Value: <span className="text-purple-900 font-semibold">${renewal.value.toLocaleString()}</span>
                  </span>
                  <span className="text-ghost-400">•</span>
                  <span className="text-ghost-600">
                    Status: <span className="text-purple-900 font-semibold">{renewal.status}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="p-4 bg-ghost-50 border border-ghost-300">
            <pre className="text-xs text-ghost-700 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(210, 209, 222) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, rgb(210, 209, 222) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1920px] mx-auto px-6 py-6">
        {/* Back Button */}
        <Link href="/dashboard/agents">
          <Button variant="ghost" className="mb-4 text-ghost-600 hover:text-purple-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </Link>

        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-300/5 border-purple-500/20 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20">
              <Users className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">VENDOR MANAGER</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                24/7 vendor lifecycle management with performance tracking, SLA monitoring, health assessment, and
                contract renewal tracking.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Monitoring vendor performance, tracking SLA compliance, assessing vendor health, managing
                      renewals, or comparing vendor effectiveness.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Capabilities */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => (
                  <button
                    key={capability.id}
                    onClick={() => setActiveCapability(capability.id)}
                    className={`w-full p-4 text-left border transition-all ${
                      activeCapability === capability.id
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-ghost-300 hover:border-purple-500/50 hover:bg-ghost-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <capability.icon
                        className={`w-5 h-5 mt-0.5 ${
                          activeCapability === capability.id ? 'text-purple-500' : 'text-ghost-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-semibold mb-1 font-mono ${
                            activeCapability === capability.id ? 'text-purple-900' : 'text-ghost-700'
                          }`}
                        >
                          {capability.name}
                        </div>
                        <div className="text-xs text-ghost-600 leading-relaxed">{capability.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Processing Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor Input */}
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                {currentCapability?.name}
              </h2>
              <p className="text-sm text-ghost-700 mb-6">{currentCapability?.description}</p>

              {/* Vendor Identifier Input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                  Vendor Name or ID
                </label>
                <Input
                  type="text"
                  placeholder="Enter vendor name, ID, or contract reference..."
                  value={vendorIdentifier}
                  onChange={(e) => setVendorIdentifier(e.target.value)}
                  className="border-ghost-300 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleProcess();
                    }
                  }}
                />
                <p className="text-xs text-ghost-600 mt-2">Press Enter or click Analyze to process</p>
              </div>

              {/* Process Button */}
              <Button
                onClick={handleProcess}
                disabled={!vendorIdentifier.trim() || processing}
                className="w-full bg-purple-900 hover:bg-purple-800 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Analyze Vendor
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  VENDOR ANALYSIS RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Analyzing vendor data...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few moments</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">VENDOR ANALYSIS COMPLETE</span>
                    </div>

                    {formatResult()}

                    <Button variant="outline" className="border-ghost-300 hover:border-purple-500 w-full mt-4">
                      <Download className="w-4 h-4 mr-2" />
                      Download Vendor Report
                    </Button>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Vendor Analysis Failed</p>
                    <p className="text-xs text-ghost-600">{result.error}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
