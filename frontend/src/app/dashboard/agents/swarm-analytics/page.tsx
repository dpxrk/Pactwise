/**
 * Swarm Analytics Dashboard
 *
 * Real-time monitoring and visualization of swarm intelligence performance.
 * Displays PSO convergence, ACO pheromone trails, consensus voting stats,
 * and agent collaboration patterns.
 *
 * Route: /dashboard/agents/swarm-analytics
 */

'use client';

import {
  Activity,
  TrendingUp,
  GitBranch,
  Users,
  Zap,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Network,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { SwarmDebugPanel } from '@/components/agents/SwarmDebugPanel';
import { useSwarmMetrics } from '@/hooks/useSwarmMetrics';

/**
 * Analytics capability definition
 */
interface Capability {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

/**
 * Available analytics views
 */
const capabilities: Capability[] = [
  {
    id: 'health',
    name: 'Swarm Health',
    icon: <Activity className="w-5 h-5" />,
    description: 'Overall swarm performance metrics',
  },
  {
    id: 'pso',
    name: 'PSO Analysis',
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'Particle convergence tracking',
  },
  {
    id: 'aco',
    name: 'ACO Analytics',
    icon: <GitBranch className="w-5 h-5" />,
    description: 'Pheromone trail strength',
  },
  {
    id: 'consensus',
    name: 'Consensus Stats',
    icon: <Users className="w-5 h-5" />,
    description: 'Agreement rate analysis',
  },
  {
    id: 'collaboration',
    name: 'Agent Patterns',
    icon: <Network className="w-5 h-5" />,
    description: 'Inter-agent collaboration',
  },
];

/**
 * SwarmAnalyticsPage - Main dashboard component
 */
export default function SwarmAnalyticsPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [activeCapability, setActiveCapability] = useState('health');

  const {
    data: metrics,
    isLoading,
    error,
  } = useSwarmMetrics({
    enterpriseId: userProfile?.enterprise_id,
    capability: activeCapability,
    timeRange: '24h',
  });

  /**
   * Render health status badge
   */
  const getHealthBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          Optimal
        </Badge>
      );
    } else if (value >= thresholds.warning) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          Good
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          Needs Attention
        </Badge>
      );
    }
  };

  return (
    <div className="min-h-screen bg-ghost-100 relative">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #d1d0d6 1px, transparent 1px),
            linear-gradient(to bottom, #d1d0d6 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/agents')}
            className="mb-4 hover:bg-purple-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 border border-purple-500">
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-purple-900 tracking-tight">
                Swarm Analytics Dashboard
              </h1>
              <p className="text-sm text-ghost-600 mt-1 font-mono">
                Real-time swarm intelligence performance monitoring
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Capabilities Sidebar */}
          <div className="space-y-3">
            <Card className="border-purple-500 bg-purple-50 p-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-purple-900 mb-2">
                Analytics Capabilities
              </h3>
              <p className="text-xs text-purple-700">
                Select an analytics view to explore swarm metrics
              </p>
            </Card>

            {capabilities.map(cap => (
              <Card
                key={cap.id}
                className={`p-4 cursor-pointer transition-all ${
                  activeCapability === cap.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-ghost-300 hover:border-purple-300 bg-white'
                }`}
                onClick={() => setActiveCapability(cap.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`${activeCapability === cap.id ? 'text-purple-500' : 'text-ghost-500'}`}
                  >
                    {cap.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-purple-900">{cap.name}</h4>
                    <p className="text-xs text-ghost-600 mt-1">{cap.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error State */}
            {error && (
              <Card className="border-red-300 bg-red-50 p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Failed to load metrics</p>
                    <p className="text-sm mt-1">Please try again later</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && (
              <Card className="border-ghost-300 bg-white p-12">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                  <p className="text-sm text-ghost-600 font-mono">Loading metrics...</p>
                </div>
              </Card>
            )}

            {/* Content */}
            {!isLoading && !error && metrics && (
              <>
                {/* Health Overview */}
                {activeCapability === 'health' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          AVG OPTIMIZATION TIME
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {metrics.averageOptimizationTime.toFixed(1)}ms
                        </p>
                        {getHealthBadge(100 - metrics.averageOptimizationTime, {
                          good: 50,
                          warning: 20,
                        })}
                        <p className="text-xs text-ghost-500 mt-2 font-mono">
                          Target: &lt;100ms (P95)
                        </p>
                      </Card>

                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          CONSENSUS SUCCESS
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {(metrics.consensusSuccessRate * 100).toFixed(1)}%
                        </p>
                        {getHealthBadge(metrics.consensusSuccessRate * 100, {
                          good: 85,
                          warning: 70,
                        })}
                        <p className="text-xs text-ghost-500 mt-2 font-mono">
                          Target: &gt;90%
                        </p>
                      </Card>

                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          PATTERN REUSE
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {(metrics.patternReuseRate * 100).toFixed(1)}%
                        </p>
                        {getHealthBadge(metrics.patternReuseRate * 100, {
                          good: 40,
                          warning: 20,
                        })}
                        <p className="text-xs text-ghost-500 mt-2 font-mono">
                          Growing over time
                        </p>
                      </Card>

                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          TOTAL OPTIMIZATIONS
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {metrics.totalOptimizations}
                        </p>
                        <Badge variant="outline" className="mt-2 bg-purple-50 text-purple-700 border-purple-300">
                          Last {metrics.timeRange}
                        </Badge>
                        <p className="text-xs text-ghost-500 mt-2 font-mono">
                          {metrics.dataPoints} data points
                        </p>
                      </Card>
                    </div>

                    {/* System Status */}
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        System Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center justify-between p-3 bg-ghost-50 border border-ghost-200">
                          <span className="text-ghost-600 font-mono">PSO Convergence</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-ghost-50 border border-ghost-200">
                          <span className="text-ghost-600 font-mono">ACO Path Quality</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-ghost-50 border border-ghost-200">
                          <span className="text-ghost-600 font-mono">Consensus Mechanism</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-ghost-50 border border-ghost-200">
                          <span className="text-ghost-600 font-mono">Pattern Learning</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* PSO Analysis */}
                {activeCapability === 'pso' && (
                  <div className="space-y-4">
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        PSO Performance Metrics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">AVG ITERATIONS</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {metrics.psoMetrics.averageIterations.toFixed(1)}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">AVG CONVERGENCE</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {metrics.psoMetrics.averageConvergenceTime.toFixed(1)}ms
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">PARTICLE COUNT</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {metrics.psoMetrics.particleCount}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">SUCCESS RATE</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {(metrics.consensusSuccessRate * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Convergence History */}
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        Convergence History
                      </h3>
                      <div className="space-y-3">
                        {metrics.psoMetrics.convergenceHistory.map((point, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-3 bg-ghost-50 border border-ghost-200"
                          >
                            <div className="flex-1">
                              <p className="text-xs text-ghost-500 font-mono">
                                {new Date(point.timestamp).toLocaleTimeString()}
                              </p>
                              <p className="text-sm text-purple-900 font-mono mt-1">
                                {point.iterations} iterations
                              </p>
                            </div>
                            <div className="flex-1">
                              <div className="h-2 bg-ghost-200 overflow-hidden">
                                <div
                                  className="h-full bg-purple-500"
                                  style={{ width: `${point.fitness * 100}%` }}
                                />
                              </div>
                              <p className="text-xs text-ghost-500 font-mono mt-1">
                                Fitness: {point.fitness.toFixed(3)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* ACO Analytics */}
                {activeCapability === 'aco' && (
                  <div className="space-y-4">
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        Pheromone Trails
                      </h3>
                      <div className="space-y-3">
                        {metrics.acoMetrics.pheromoneTrails.map((trail, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-ghost-50 border border-ghost-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-mono text-purple-900">{trail.path}</p>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                {trail.successCount} successes
                              </Badge>
                            </div>
                            <div className="h-2 bg-ghost-200 overflow-hidden mb-2">
                              <div
                                className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                                style={{ width: `${trail.strength * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-ghost-500 font-mono">
                              Strength: {(trail.strength * 100).toFixed(1)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        ACO Metrics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">AVG PATH LENGTH</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {metrics.acoMetrics.averagePathLength.toFixed(1)}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200">
                          <p className="text-xs text-purple-600 font-mono mb-1">BEST PATH QUALITY</p>
                          <p className="text-2xl font-bold text-purple-900 font-mono">
                            {(metrics.acoMetrics.bestPathQuality * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Consensus Stats */}
                {activeCapability === 'consensus' && (
                  <div className="space-y-4">
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        Consensus Distribution
                      </h3>
                      <div className="space-y-2">
                        {metrics.consensusMetrics.consensusDistribution.map((dist, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-3 bg-ghost-50 border border-ghost-200"
                          >
                            <div className="w-24 text-sm font-mono text-ghost-600">
                              {dist.agreementRange}
                            </div>
                            <div className="flex-1">
                              <div className="h-6 bg-ghost-200 overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 flex items-center justify-end pr-2"
                                  style={{
                                    width: `${(dist.count / metrics.totalOptimizations) * 100}%`,
                                  }}
                                >
                                  <span className="text-xs text-white font-mono font-bold">
                                    {dist.count}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          AVG AGREEMENT
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {(metrics.consensusMetrics.averageAgreementScore * 100).toFixed(1)}%
                        </p>
                      </Card>
                      <Card className="border-ghost-300 bg-white p-6">
                        <p className="text-xs font-mono text-ghost-600 mb-2 uppercase tracking-wide">
                          MINORITY OPINIONS
                        </p>
                        <p className="text-3xl font-bold text-purple-900 font-mono">
                          {(metrics.consensusMetrics.minorityOpinionRate * 100).toFixed(1)}%
                        </p>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Collaboration Patterns */}
                {activeCapability === 'collaboration' && (
                  <div className="space-y-4">
                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        Most Frequent Agent Pairs
                      </h3>
                      <div className="space-y-3">
                        {metrics.collaborationPatterns.mostFrequentPairs.map((pair, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-4 bg-ghost-50 border border-ghost-200"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-mono text-purple-900">
                                {pair.agents[0]} ↔ {pair.agents[1]}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              {pair.frequency} times
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="border-ghost-300 bg-white p-6">
                      <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wide">
                        Collaboration Strength
                      </h3>
                      <div className="space-y-3">
                        {metrics.collaborationPatterns.edges.map((edge, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-ghost-50 border border-ghost-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-mono text-purple-900">
                                {edge.fromAgent} → {edge.toAgent}
                              </p>
                              <span className="text-xs text-ghost-500 font-mono">
                                {(edge.successRate * 100).toFixed(0)}% success
                              </span>
                            </div>
                            <div className="h-2 bg-ghost-200 overflow-hidden">
                              <div
                                className="h-full bg-purple-500"
                                style={{ width: `${edge.strength * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <SwarmDebugPanel />
    </div>
  );
}
